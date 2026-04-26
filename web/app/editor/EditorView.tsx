'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const ART_W = 1080;
const STORAGE_KEY = 'myplatform_editor_html';

const DEFAULT_HTML = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
</style>
<div style="width:1080px;height:1350px;position:relative;overflow:hidden;background:#fff2fa;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:32px;padding:80px;">
  <h1 style="font-family:'Niveau Grotesk',sans-serif;font-weight:700;font-size:96px;color:#492775;text-align:center;line-height:1.1;word-wrap:break-word;width:100%;">
    Clique em "Gerar com IA"
  </h1>
  <p style="font-family:Poppins,sans-serif;font-size:42px;color:#492775;text-align:center;word-wrap:break-word;width:100%;">
    Abra um briefing e clique em Gerar Arte.
  </p>
</div>`;

export function EditorView() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [scale, setScale] = useState(0.35);
  const [artH, setArtH] = useState(1350);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refsUsed, setRefsUsed] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Inject HTML into DOM directly so edits aren't wiped by React
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.innerHTML = html;
    }
  }, [html]);

  // Persist edited content (reads from DOM, not state)
  const saveFromDOM = useCallback(() => {
    if (!previewRef.current) return;
    const current = previewRef.current.innerHTML;
    try { localStorage.setItem(STORAGE_KEY, current); } catch {}
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setHtml(saved);
  }, []);

  const fitToScreen = useCallback(() => {
    const area = document.querySelector('.canvas-area') as HTMLElement | null;
    if (!area) return;
    const { width: aw, height: ah } = area.getBoundingClientRect();
    const s = Math.min((aw - 80) / ART_W, (ah - 80) / artH) * 0.9;
    setScale(Math.max(0.1, s));
  }, [artH]);

  useEffect(() => {
    fitToScreen();
    window.addEventListener('resize', fitToScreen);
    return () => window.removeEventListener('resize', fitToScreen);
  }, [fitToScreen]);

  // Toggle contenteditable on all text nodes inside the art div
  const toggleEditMode = () => {
    const el = previewRef.current;
    if (!el) return;
    const artDiv = el.querySelector('div') as HTMLElement | null;
    if (!artDiv) return;
    const next = !editMode;
    setEditMode(next);
    if (next) {
      // Make only text elements editable, not the whole canvas (preserves layout)
      artDiv.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,p,span,li,a,button,div:not(:has(*))').forEach(node => {
        node.contentEditable = 'true';
        node.style.outline = '1.5px dashed rgba(139,92,246,0.5)';
        node.style.cursor = 'text';
        node.style.minWidth = '4px';
      });
    } else {
      artDiv.querySelectorAll<HTMLElement>('[contenteditable]').forEach(node => {
        node.contentEditable = 'false';
        node.style.outline = '';
        node.style.cursor = '';
      });
      saveFromDOM();
    }
  };

  const generateWithAI = async () => {
    // Lock edit mode before regenerating
    if (editMode) toggleEditMode();
    setGenerating(true);
    setAiError(null);
    setRefsUsed(null);
    try {
      const savedBriefing = localStorage.getItem('myplatform_active_briefing');
      const briefing = savedBriefing ? JSON.parse(savedBriefing) : {};
      const isVertical = briefing.format === 'Reels' || briefing.format === 'Stories';
      const newH = isVertical ? 1920 : 1350;
      setArtH(newH);

      const res = await fetch('/api/generate-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefing,
          clientId: briefing.client_id ?? 'reportei-flux',
          clientName: briefing.client_name ?? 'Reportei Flux',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido');
      if (!data.html) throw new Error('A IA não retornou HTML');
      setHtml(data.html);
      setRefsUsed(data.refsUsed ?? 0);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erro ao gerar');
    } finally {
      setGenerating(false);
    }
  };

  const syncCodeFromDOM = () => {
    if (!previewRef.current) return;
    setHtml(previewRef.current.innerHTML);
  };

  const exportPNG = async () => {
    if (!previewRef.current) return;
    // Save edits before exporting
    if (editMode) toggleEditMode();
    setExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      // Find the art div inside the wrapper
      const artEl = (previewRef.current.querySelector('div') ?? previewRef.current) as HTMLElement;
      const dataUrl = await toPng(artEl, {
        width: ART_W,
        height: artH,
        pixelRatio: 2,
        style: { transform: 'none', transformOrigin: 'top left' },
      });
      const a = document.createElement('a');
      a.download = `arte-${Date.now()}.png`;
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error('Export error', err);
    } finally {
      setExporting(false);
    }
  };

  const reset = () => {
    if (!confirm('Resetar o canvas?')) return;
    if (editMode) toggleEditMode();
    setHtml(DEFAULT_HTML);
    setArtH(1350);
  };

  return (
    <main className="flex-1 min-h-screen flex flex-col bg-neutral-100">
      {/* Toolbar */}
      <header className="shrink-0 border-b border-neutral-200 bg-white px-4 py-2 flex items-center gap-2 flex-wrap">
        <h1 className="text-sm font-medium mr-2">Editor de arte</h1>

        <button
          onClick={generateWithAI}
          disabled={generating}
          className="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5"
        >
          {generating
            ? <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Gerando…</>
            : '✦ Gerar com IA'}
        </button>

        <div className="w-px h-5 bg-neutral-200" />

        {/* Edit mode toggle */}
        <button
          onClick={toggleEditMode}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
            editMode
              ? 'bg-amber-50 border-amber-400 text-amber-700 font-semibold'
              : 'border-neutral-200 hover:bg-neutral-50'
          }`}
        >
          {editMode ? '✎ Editando — clique para salvar' : '✎ Editar textos'}
        </button>

        {aiError && <span className="text-xs text-red-500 ml-1">{aiError}</span>}
        {refsUsed !== null && !aiError && (
          <span className="text-[10px] text-neutral-400">
            {refsUsed > 0 ? `${refsUsed} ref${refsUsed > 1 ? 's' : ''} usada${refsUsed > 1 ? 's' : ''}` : ''}
          </span>
        )}

        <div className="w-px h-5 bg-neutral-200" />

        <button onClick={fitToScreen} className="text-[10px] px-2 h-7 border border-neutral-200 rounded hover:bg-neutral-50 tabular-nums">
          {Math.round(scale * 100)}%
        </button>
        <button onClick={() => setScale(s => Math.min(2, s * 1.2))} className="text-xs w-7 h-7 border border-neutral-200 rounded hover:bg-neutral-50">+</button>
        <button onClick={() => setScale(s => Math.max(0.05, s / 1.2))} className="text-xs w-7 h-7 border border-neutral-200 rounded hover:bg-neutral-50">−</button>

        <div className="w-px h-5 bg-neutral-200" />

        <button
          onClick={() => { syncCodeFromDOM(); setShowCode(v => !v); }}
          className={`text-xs px-2 py-1 border rounded transition-colors ${showCode ? 'border-violet-400 text-violet-600 bg-violet-50' : 'border-neutral-200 hover:bg-neutral-50'}`}
        >
          &lt;/&gt; HTML
        </button>

        <button onClick={reset} className="text-xs px-2 py-1 text-neutral-400 hover:text-neutral-700">Resetar</button>

        <div className="ml-auto" />

        <button
          onClick={exportPNG}
          disabled={exporting}
          className="text-xs px-3 py-1.5 bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50"
        >
          {exporting ? 'Exportando…' : 'Exportar PNG'}
        </button>
      </header>

      {editMode && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-700 flex items-center gap-2">
          <span>✎ Modo de edição ativo — clique em qualquer texto no canvas para editar.</span>
          <span className="text-amber-500">Clique em "Editando" na toolbar para salvar.</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="canvas-area flex-1 flex items-center justify-center overflow-auto bg-neutral-300 p-10">
          <div style={{ width: ART_W * scale, height: artH * scale, flexShrink: 0 }}>
            <div
              ref={previewRef}
              style={{
                width: ART_W,
                height: artH,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            />
          </div>
        </div>

        {/* Code panel */}
        {showCode && (
          <div className="w-96 bg-neutral-950 flex flex-col border-l border-neutral-800 shrink-0">
            <div className="px-3 py-2 border-b border-neutral-800 flex items-center justify-between gap-2">
              <span className="text-[10px] text-neutral-500 font-mono">HTML</span>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard.writeText(html)} className="text-[10px] text-neutral-500 hover:text-white">copiar</button>
                <button
                  onClick={() => { if (previewRef.current) setHtml(previewRef.current.innerHTML); }}
                  className="text-[10px] text-violet-400 hover:text-violet-300"
                >aplicar DOM→</button>
              </div>
            </div>
            <textarea
              value={html}
              onChange={e => setHtml(e.target.value)}
              className="flex-1 bg-transparent text-xs text-neutral-300 p-3 font-mono resize-none focus:outline-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </main>
  );
}
