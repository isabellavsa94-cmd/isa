'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Mark, mergeAttributes, Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

// Dim text inside [ ] brackets
const BracketDim = Extension.create({
  name: 'bracketDim',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('bracketDim'),
        props: {
          decorations(state) {
            const decos: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              const regex = /\[[^\]]*\]/g;
              let match;
              while ((match = regex.exec(node.text)) !== null) {
                decos.push(
                  Decoration.inline(
                    pos + match.index,
                    pos + match.index + match[0].length,
                    { style: 'opacity: 0.1' },
                  ),
                );
              }
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});

// Inline comment mark
const CommentMark = Mark.create({
  name: 'comment',
  addAttributes() {
    return {
      commentId: { default: null },
      commentText: { default: null },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'briefing-comment',
        'data-comment': HTMLAttributes.commentText,
        'data-comment-id': HTMLAttributes.commentId,
      }),
      0,
    ];
  },
  parseHTML() {
    return [{ tag: 'span[data-comment]' }];
  },
});

function plainToHtml(text: string | null) {
  if (!text) return '';
  if (text.trimStart().startsWith('<')) return text;
  return text
    .split('\n\n')
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

type ToolbarPos = { x: number; y: number } | null;
type TooltipState = { text: string; commentId: string | null; x: number; y: number } | null;

export function BriefingEditor({
  briefingId,
  field,
  initialContent,
}: {
  briefingId: string;
  field: string;
  initialContent: string | null;
}) {
  const supabase = createClient();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipHideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [toolbar, setToolbar] = useState<ToolbarPos>(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentOpen, setCommentOpen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const commentOpenRef = useRef(false);
  useEffect(() => { commentOpenRef.current = commentOpen; }, [commentOpen]);

  const editor = useEditor({
    extensions: [StarterKit, Underline, CommentMark, BracketDim],
    content: plainToHtml(initialContent),
    editorProps: {
      attributes: {
        class: 'outline-none leading-relaxed text-xs text-neutral-300 min-h-[1.5em]',
        spellcheck: 'false',
      },
    },
    onUpdate({ editor }) {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await supabase
          .from('briefings')
          .update({ [field]: editor.getHTML() })
          .eq('id', briefingId);
      }, 1500);
    },
  });

  useEffect(() => {
    if (!editor) return;

    const onSelection = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        if (!commentOpenRef.current) setToolbar(null);
        return;
      }
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      setToolbar({
        x: (start.left + end.right) / 2,
        y: Math.min(start.top, end.top),
      });
    };

    const onBlur = () => {
      setTimeout(() => {
        if (!commentOpenRef.current) setToolbar(null);
      }, 200);
    };

    editor.on('selectionUpdate', onSelection);
    editor.on('blur', onBlur);
    return () => {
      editor.off('selectionUpdate', onSelection);
      editor.off('blur', onBlur);
    };
  }, [editor]);

  // Tooltip on comment spans — with 100ms buffer so mouse can reach the tooltip
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;
    const onOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.briefing-comment');
      if (target instanceof HTMLElement) {
        clearTimeout(tooltipHideTimer.current);
        const rect = target.getBoundingClientRect();
        setTooltip({
          text: target.getAttribute('data-comment') ?? '',
          commentId: target.getAttribute('data-comment-id'),
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      } else {
        tooltipHideTimer.current = setTimeout(() => setTooltip(null), 120);
      }
    };
    dom.addEventListener('mouseover', onOver);
    return () => dom.removeEventListener('mouseover', onOver);
  }, [editor]);

  const applyComment = async () => {
    if (!editor || !commentInput.trim()) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    const commentId = crypto.randomUUID();

    editor
      .chain()
      .focus()
      .setMark('comment', { commentId, commentText: commentInput.trim() })
      .run();

    await supabase.from('briefing_comments').insert({
      id: commentId,
      briefing_id: briefingId,
      field_name: field,
      start_offset: from,
      end_offset: to,
      selected_text: selectedText,
      comment: commentInput.trim(),
    });

    // Notify Dock to reload
    document.dispatchEvent(new CustomEvent('briefing-comment-added'));

    setCommentInput('');
    setCommentOpen(false);
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
  };

  const resolveComment = async (commentId: string) => {
    setTooltip(null);

    // Remove the mark from the editor
    editor?.state.doc.descendants((node, pos) => {
      node.marks.forEach((mark) => {
        if (mark.type.name === 'comment' && mark.attrs.commentId === commentId) {
          editor
            .chain()
            .setTextSelection({ from: pos, to: pos + node.nodeSize })
            .unsetMark('comment')
            .run();
        }
      });
    });

    // Update DB
    await supabase
      .from('briefing_comments')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', commentId);

    document.dispatchEvent(new CustomEvent('briefing-comment-added'));
  };

  if (!editor) return null;

  const isActive = (mark: string) => editor.isActive(mark);

  return (
    <div className="relative" ref={containerRef}>
      <EditorContent editor={editor} />

      {/* Floating toolbar */}
      {toolbar && (
        <div
          className="fixed z-[100] flex items-center gap-0.5 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl px-1 py-1"
          style={{ left: toolbar.x, top: toolbar.y - 8, transform: 'translate(-50%, -100%)' }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <FormatBtn active={isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} className="font-bold">B</FormatBtn>
          <FormatBtn active={isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} className="italic">I</FormatBtn>
          <FormatBtn active={isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} className="underline">U</FormatBtn>
          <div className="w-px h-3.5 bg-neutral-600 mx-0.5" />
          <button
            onClick={() => setCommentOpen((v) => !v)}
            title="Adicionar comentário"
            onMouseDown={(e) => e.preventDefault()}
            className={`p-1.5 rounded transition-colors ${
              commentOpen ? 'bg-yellow-400/20 text-yellow-400' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {commentOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl p-2.5 flex flex-col gap-2">
              <textarea
                autoFocus
                placeholder="Adicionar comentário..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); applyComment(); }
                  if (e.key === 'Escape') setCommentOpen(false);
                }}
                className="text-xs bg-neutral-700 border border-neutral-600 text-neutral-100 placeholder-neutral-500 rounded-lg p-2 resize-none outline-none focus:border-neutral-500 w-full"
                rows={2}
              />
              <div className="flex items-center justify-between">
                <button onClick={() => setCommentOpen(false)} className="text-[10px] text-neutral-500 hover:text-neutral-300">Cancelar</button>
                <button
                  onClick={applyComment}
                  disabled={!commentInput.trim()}
                  className="text-[10px] bg-white text-neutral-900 font-semibold px-2.5 py-1 rounded-lg disabled:opacity-40 hover:bg-neutral-100"
                >
                  Comentar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comment hover tooltip with resolve button */}
      {tooltip && (
        <div
          className="fixed z-[200] bg-neutral-800 border border-neutral-700 text-white text-xs rounded-xl px-3 py-2 shadow-xl max-w-56"
          style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}
          onMouseEnter={() => clearTimeout(tooltipHideTimer.current)}
          onMouseLeave={() => setTooltip(null)}
        >
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5 shrink-0">💬</span>
            <span className="flex-1 leading-snug">{tooltip.text}</span>
            {tooltip.commentId && (
              <button
                onClick={() => resolveComment(tooltip.commentId!)}
                title="Concluir comentário"
                className="shrink-0 w-5 h-5 rounded-full border border-neutral-600 hover:border-green-500 hover:bg-green-500/20 flex items-center justify-center transition-colors ml-1"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 hover:text-green-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        .briefing-comment {
          background: rgba(250, 204, 21, 0.18);
          border-bottom: 1.5px solid rgba(250, 204, 21, 0.5);
          border-radius: 2px;
          cursor: default;
        }
        .briefing-comment:hover { background: rgba(250, 204, 21, 0.28); }
        .tiptap p { margin: 0.2em 0; }
        .tiptap p:first-child { margin-top: 0; }
        .tiptap p:last-child { margin-bottom: 0; }
        .tiptap strong { color: #f5f5f5; }
        .tiptap em { color: #d4d4d4; }
      `}</style>
    </div>
  );
}

function FormatBtn({
  children,
  active,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      className={`px-1.5 py-1 rounded text-xs min-w-[22px] transition-colors ${className} ${
        active ? 'bg-white text-neutral-900' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
      }`}
    >
      {children}
    </button>
  );
}
