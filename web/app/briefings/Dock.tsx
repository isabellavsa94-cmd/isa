'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { Briefing, BriefingFormat } from '@/lib/types';

type Comment = {
  id: string;
  briefing_id: string;
  field_name: string;
  selected_text: string;
  comment: string;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
};

const FIELD_LABELS: Record<string, string> = {
  conceito: 'Conceito',
  descricao_peca: 'Descrição da peça',
  legenda: 'Legenda',
  referencia_arte: 'Referência de arte',
};

const FORMAT_COLORS: Record<string, string> = {
  Feed:      '#3B82F6',
  Carrossel: '#22C55E',
  Reels:     '#F97316',
  Stories:   '#A855F7',
};

type Panel = 'comments' | 'formats' | null;

// ── Magnified dock item ──────────────────────────────────────────────────────

function DockItem({
  mouseX,
  label,
  onClick,
  active,
  children,
}: {
  mouseX: ReturnType<typeof useMotionValue<number>>;
  label: string;
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useMotionValue(Infinity);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const unsubscribe = mouseX.on('change', (mx) => {
      const rect = el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      distance.set(Math.abs(mx - center));
    });

    return unsubscribe;
  }, [mouseX, distance]);

  const size = useSpring(
    useTransform(distance, [0, 80, 160], [68, 52, 44]),
    { stiffness: 350, damping: 28 }
  );

  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative flex flex-col items-center" ref={ref}>
      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 4 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-full mb-2 px-2.5 py-1 bg-neutral-800/90 backdrop-blur-md border border-neutral-700/60 rounded-lg text-[11px] font-medium text-white whitespace-nowrap shadow-lg pointer-events-none"
      >
        {label}
      </motion.div>

      <motion.button
        style={{ width: size, height: size }}
        onClick={onClick}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        className={`relative flex items-center justify-center rounded-2xl transition-colors cursor-pointer select-none ${
          active
            ? 'bg-white/20 ring-1 ring-white/30'
            : 'bg-white/10 hover:bg-white/15'
        }`}
      >
        {children}
        {/* Active dot */}
        {active && (
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
        )}
      </motion.button>
    </div>
  );
}

// ── Main Dock ────────────────────────────────────────────────────────────────

const SHOW_THRESHOLD = 80; // px from bottom edge to trigger reveal

export function Dock({ briefings }: { briefings: Briefing[] }) {
  const supabase = createClient();
  const [panel, setPanel] = useState<Panel>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const mouseX = useMotionValue(Infinity);
  const dockRef = useRef<HTMLDivElement>(null);

  const briefingMap = Object.fromEntries(briefings.map((b) => [b.id, b]));

  const loadComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('briefing_comments')
      .select('*')
      .order('created_at', { ascending: false });
    setComments((data ?? []) as Comment[]);
    setLoading(false);
  };

  useEffect(() => {
    loadComments();
    const onVisible = () => { if (!document.hidden) loadComments(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Auto-hide: show when mouse within SHOW_THRESHOLD of bottom, hide after leaving
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const nearBottom = e.clientY >= window.innerHeight - SHOW_THRESHOLD;
      if (nearBottom) {
        clearTimeout(hideTimer.current);
        setVisible(true);
      }
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  const handleDockLeave = () => {
    // Don't hide if a panel is open
    if (panel) return;
    hideTimer.current = setTimeout(() => setVisible(false), 400);
  };

  const handleDockEnter = () => {
    clearTimeout(hideTimer.current);
    setVisible(true);
  };

  // Keep visible while panel is open; hide when panel closes and mouse is gone
  useEffect(() => {
    if (panel) {
      clearTimeout(hideTimer.current);
      setVisible(true);
    }
  }, [panel]);

  const resolveComment = async (id: string) => {
    await supabase
      .from('briefing_comments')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id);
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resolved: true, resolved_at: new Date().toISOString() } : c)),
    );
  };

  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  const pending = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  const formatCounts = briefings.reduce<Record<string, number>>((acc, b) => {
    if (b.format) acc[b.format] = (acc[b.format] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <motion.div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3"
      animate={{ y: visible ? 0 : 120, opacity: visible ? 1 : 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      onMouseEnter={handleDockEnter}
      onMouseLeave={handleDockLeave}
    >
      {/* Panel */}
      {panel && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/60 rounded-2xl shadow-2xl w-[420px] max-h-[420px] flex flex-col overflow-hidden"
        >
          {panel === 'comments' && (
            <>
              <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between shrink-0">
                <span className="text-xs font-semibold text-white">Histórico de comentários</span>
                <span className="text-[10px] text-neutral-500">{comments.length} no total</span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading && (
                  <p className="text-xs text-neutral-500 text-center py-8">Carregando…</p>
                )}
                {!loading && comments.length === 0 && (
                  <p className="text-xs text-neutral-500 text-center py-8">Nenhum comentário ainda.</p>
                )}
                {pending.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-neutral-500 px-4 pt-3 pb-1">
                      Pendentes · {pending.length}
                    </p>
                    {pending.map((c) => (
                      <CommentRow
                        key={c.id}
                        comment={c}
                        briefingName={briefingMap[c.briefing_id]?.nome_demanda ?? '—'}
                        onResolve={() => resolveComment(c.id)}
                      />
                    ))}
                  </div>
                )}
                {resolved.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-neutral-500 px-4 pt-4 pb-1">
                      Concluídos · {resolved.length}
                    </p>
                    {resolved.map((c) => (
                      <CommentRow
                        key={c.id}
                        comment={c}
                        briefingName={briefingMap[c.briefing_id]?.nome_demanda ?? '—'}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {panel === 'formats' && (
            <>
              <div className="px-4 py-3 border-b border-neutral-800 shrink-0">
                <span className="text-xs font-semibold text-white">Formatos de conteúdo</span>
              </div>
              <div className="p-4 space-y-3">
                {(['Feed', 'Carrossel', 'Reels', 'Stories'] as BriefingFormat[]).map((fmt) => {
                  const count = formatCounts[fmt] ?? 0;
                  const pct = briefings.length ? (count / briefings.length) * 100 : 0;
                  return (
                    <div key={fmt} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-300 font-medium">{fmt}</span>
                        <span className="text-neutral-500">{count}</span>
                      </div>
                      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: FORMAT_COLORS[fmt] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Dock bar */}
      <div
        ref={dockRef}
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex items-end gap-3 px-4 py-3 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl"
        style={{ background: 'rgba(20,20,20,0.7)' }}
      >
        {/* Comments */}
        <DockItem
          mouseX={mouseX}
          label="Comentários"
          active={panel === 'comments'}
          onClick={() => togglePanel('comments')}
        >
          <div className="relative flex items-center justify-center w-full h-full">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {pending.length > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] bg-yellow-400 text-neutral-900 text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {pending.length > 9 ? '9+' : pending.length}
              </span>
            )}
          </div>
        </DockItem>

        {/* Divider */}
        <div className="w-px h-7 bg-white/15 self-center" />

        {/* Formats */}
        <DockItem
          mouseX={mouseX}
          label="Formatos"
          active={panel === 'formats'}
          onClick={() => togglePanel('formats')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </DockItem>

        {/* Divider */}
        <div className="w-px h-7 bg-white/15 self-center" />

        {/* Total briefings — static counter */}
        <div className="flex flex-col items-center justify-center w-11 h-11 rounded-2xl bg-white/10 shrink-0">
          <span className="text-base font-bold text-white leading-none">{briefings.length}</span>
          <span className="text-[8px] uppercase tracking-widest text-white/50 mt-0.5">Total</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Comment row ──────────────────────────────────────────────────────────────

function CommentRow({
  comment,
  briefingName,
  onResolve,
}: {
  comment: Comment;
  briefingName: string;
  onResolve?: () => void;
}) {
  return (
    <div className={`px-4 py-3 border-b border-neutral-800/60 last:border-0 ${comment.resolved ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-neutral-500 truncate mb-0.5">
            {briefingName} · {FIELD_LABELS[comment.field_name] ?? comment.field_name}
          </p>
          <p className="text-[11px] text-neutral-400 italic mb-1 line-clamp-1">
            "{comment.selected_text}"
          </p>
          <p className="text-xs text-neutral-200">{comment.comment}</p>
        </div>
        {!comment.resolved && onResolve && (
          <button
            onClick={onResolve}
            title="Concluir"
            className="shrink-0 mt-0.5 w-6 h-6 rounded-full border border-neutral-600 hover:border-green-500 hover:bg-green-500/10 flex items-center justify-center transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        )}
        {comment.resolved && (
          <div className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
