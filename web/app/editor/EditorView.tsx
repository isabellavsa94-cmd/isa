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
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setHtml(saved);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, html); } catch {}
  }, [html]);

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

  const generateWithAI = async () => {
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

  const exportPNG = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(previewRef.current, {
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
          {generating ? (
            <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Gerando…</>
          ) : '✦ Gerar com IA'}
        </button>

        {refsUsed !== null && (
          <span className="text-[10px] text-neutral-400">
            {refsUsed > 0 ? `${refsUsed} referência${refsUsed > 1 ? 's' : ''} usada${refsUsed > 1 ? 's' : ''}` : 'sem refs'}
          </span>
        )}

        {aiError && <span className="text-xs text-red-500">{aiError}</span>}

        <div className="w-px h-5 bg-neutral-200 mx-1" />

        <button
          onClick={fitToScreen}
          className="text-[10px] px-2 h-7 border border-neutral-200 rounded hover:bg-neutral-50 tabular-nums"
        >
          {Math.round(scale * 100)}%
        </button>

        <button
          onClick={() => setScale(s => Math.min(2, s * 1.2))}
          className="text-xs w-7 h-7 border border-neutral-200 rounded hover:bg-neutral-50"
        >+</button>
        <button
          onClick={() => setScale(s => Math.max(0.05, s / 1.2))}
          className="text-xs w-7 h-7 border border-neutral-200 rounded hover:bg-neutral-50"
        >−</button>

        <div className="w-px h-5 bg-neutral-200 mx-1" />

        <button
          onClick={() => setShowCode(v => !v)}
          className={`text-xs px-2 py-1 border rounded transition-colors ${showCode ? 'border-violet-400 text-violet-600 bg-violet-50' : 'border-neutral-200 hover:bg-neutral-50'}`}
        >
          {showCode ? 'Fechar código' : '&lt;/&gt; Código'}
        </button>

        <button onClick={reset} className="text-xs px-2 py-1 text-neutral-400 hover:text-neutral-700">
          Resetar
        </button>

        <div className="ml-auto" />

        <button
          onClick={exportPNG}
          disabled={exporting}
          className="text-xs px-3 py-1.5 bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50"
        >
          {exporting ? 'Exportando…' : 'Exportar PNG'}
        </button>
      </header>

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
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>

        {/* Code panel */}
        {showCode && (
          <div className="w-96 bg-neutral-950 flex flex-col border-l border-neutral-800 shrink-0">
            <div className="px-3 py-2 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-[10px] text-neutral-500 font-mono">HTML</span>
              <button
                onClick={() => navigator.clipboard.writeText(html)}
                className="text-[10px] text-neutral-500 hover:text-white"
              >
                copiar
              </button>
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
