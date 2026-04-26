'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const ART_W = 1024;
const STORAGE_KEY = 'myplatform_editor_html';

const DEFAULT_HTML = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
</style>
<div style="width:1024px;height:1536px;position:relative;overflow:hidden;background:#fff2fa;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:32px;padding:80px;">
  <h1 style="font-family:'Niveau Grotesk',sans-serif;font-weight:700;font-size:96px;color:#492775;text-align:center;line-height:1.1;word-wrap:break-word;width:100%;">
    Gere um layout com IA
  </h1>
  <p style="font-family:Poppins,sans-serif;font-size:42px;color:#492775;text-align:center;word-wrap:break-word;width:100%;">
    Abra um briefing e clique em Gerar layout.
  </p>
</div>`;

type ElProps = {
  text: string;
  color: string;
  backgroundColor: string;
  fontSize: number;
  fontWeight: string;
  textAlign: string;
  borderRadius: number;
  top: number;
  left: number;
  width: number;
  height: number;
  opacity: number;
  letterSpacing: number;
  lineHeight: string;
  padding: string;
  rotation: number;
};

function rgbToHex(rgb: string): string {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return '#000000';
  return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

function isTransparent(color: string) {
  return !color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)';
}

function getRotation(el: HTMLElement): number {
  const t = el.style.transform;
  if (!t) return 0;
  const m = t.match(/rotate\((-?[\d.]+)deg\)/);
  return m ? Math.round(parseFloat(m[1])) : 0;
}

export function EditorView() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [artH, setArtH] = useState(1536);
  const [scale, setScale] = useState(0.35);
  const [generating, setGenerating] = useState<null | 'image' | 'layout'>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refsUsed, setRefsUsed] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
  const [elProps, setElProps] = useState<ElProps | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragData = useRef({ mx: 0, my: 0, elTop: 0, elLeft: 0 });

  useEffect(() => {
    if (previewRef.current) previewRef.current.innerHTML = html;
  }, [html]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setHtml(saved);
  }, []);

  const saveToStorage = useCallback(() => {
    if (!previewRef.current) return;
    try { localStorage.setItem(STORAGE_KEY, previewRef.current.innerHTML); } catch {}
  }, []);

  const fitToScreen = useCallback(() => {
    const area = document.querySelector('.canvas-area') as HTMLElement | null;
    if (!area) return;
    const { width: aw, height: ah } = area.getBoundingClientRect();
    setScale(Math.max(0.1, Math.min((aw - 80) / ART_W, (ah - 80) / artH) * 0.9));
  }, [artH]);

  useEffect(() => {
    fitToScreen();
    window.addEventListener('resize', fitToScreen);
    return () => window.removeEventListener('resize', fitToScreen);
  }, [fitToScreen]);

  const readElProps = useCallback((el: HTMLElement) => {
    const cs = window.getComputedStyle(el);
    const artDiv = previewRef.current?.querySelector('div') as HTMLElement | null;
    const parentRect = artDiv?.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setElProps({
      text: el.innerText ?? '',
      color: isTransparent(cs.color) ? '#000000' : rgbToHex(cs.color),
      backgroundColor: isTransparent(cs.backgroundColor) ? 'transparent' : rgbToHex(cs.backgroundColor),
      fontSize: Math.round(parseFloat(cs.fontSize) / scale),
      fontWeight: cs.fontWeight,
      textAlign: cs.textAlign || 'left',
      borderRadius: Math.round(parseFloat(cs.borderRadius) / scale) || 0,
      top: parentRect ? Math.round((elRect.top - parentRect.top) / scale) : 0,
      left: parentRect ? Math.round((elRect.left - parentRect.left) / scale) : 0,
      width: Math.round(parseFloat(cs.width) / scale),
      height: Math.round(parseFloat(cs.height) / scale),
      opacity: parseFloat(cs.opacity) ?? 1,
      letterSpacing: Math.round(parseFloat(cs.letterSpacing)) || 0,
      lineHeight: cs.lineHeight,
      padding: el.style.padding || '',
      rotation: getRotation(el),
    });
  }, [scale]);

  const updateStyle = useCallback((prop: string, value: string) => {
    if (!selectedEl) return;
    (selectedEl.style as unknown as Record<string, string>)[prop] = value;
    readElProps(selectedEl);
    saveToStorage();
  }, [selectedEl, readElProps, saveToStorage]);

  const updateText = useCallback((text: string) => {
    if (!selectedEl) return;
    selectedEl.innerText = text;
    setElProps(p => p ? { ...p, text } : p);
    saveToStorage();
  }, [selectedEl, saveToStorage]);

  const alignToArtboard = useCallback((dir: 'left'|'centerH'|'right'|'top'|'centerV'|'bottom') => {
    if (!selectedEl || !elProps) return;
    let l = elProps.left, t = elProps.top;
    if (dir === 'left') l = 0;
    else if (dir === 'centerH') l = Math.round((ART_W - elProps.width) / 2);
    else if (dir === 'right') l = ART_W - elProps.width;
    else if (dir === 'top') t = 0;
    else if (dir === 'centerV') t = Math.round((artH - elProps.height) / 2);
    else if (dir === 'bottom') t = artH - elProps.height;
    selectedEl.style.position = 'absolute';
    selectedEl.style.left = `${l}px`;
    selectedEl.style.top = `${t}px`;
    readElProps(selectedEl);
    saveToStorage();
  }, [selectedEl, elProps, artH, readElProps, saveToStorage]);

  const centerElement = useCallback(() => {
    if (!selectedEl || !elProps) return;
    selectedEl.style.position = 'absolute';
    selectedEl.style.left = `${Math.round((ART_W - elProps.width) / 2)}px`;
    selectedEl.style.top = `${Math.round((artH - elProps.height) / 2)}px`;
    readElProps(selectedEl);
    saveToStorage();
  }, [selectedEl, elProps, artH, readElProps, saveToStorage]);

  const removeRotation = useCallback(() => {
    if (!selectedEl) return;
    const t = selectedEl.style.transform || '';
    selectedEl.style.transform = t.replace(/rotate\([^)]+\)/g, '').trim();
    readElProps(selectedEl);
    saveToStorage();
  }, [selectedEl, readElProps, saveToStorage]);

  // ── Click to select ──────────────────────────────────────────────────────
  const handlePreviewClick = useCallback((e: MouseEvent) => {
    if (!editMode) return;
    const target = e.target as HTMLElement;
    const artDiv = previewRef.current?.querySelector('div');
    if (!artDiv || target === artDiv || target === previewRef.current) {
      selectedEl?.style.setProperty('outline', '');
      setSelectedEl(null); setElProps(null);
      return;
    }
    e.stopPropagation();
    selectedEl?.style.setProperty('outline', '');
    target.style.outline = '2px solid #8b5cf6';
    target.style.outlineOffset = '2px';
    setSelectedEl(target);
    readElProps(target);
  }, [editMode, selectedEl, readElProps]);

  // ── Drag to move ─────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!editMode || !selectedEl) return;
    if ((e.target as HTMLElement) !== selectedEl) return;
    e.preventDefault();
    isDragging.current = true;
    const artDiv = previewRef.current?.querySelector('div') as HTMLElement;
    const parentRect = artDiv?.getBoundingClientRect();
    const elRect = selectedEl.getBoundingClientRect();
    dragData.current = {
      mx: e.clientX, my: e.clientY,
      elTop: (elRect.top - parentRect.top) / scale,
      elLeft: (elRect.left - parentRect.left) / scale,
    };
  }, [editMode, selectedEl, scale]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !selectedEl) return;
      const dx = (e.clientX - dragData.current.mx) / scale;
      const dy = (e.clientY - dragData.current.my) / scale;
      selectedEl.style.position = 'absolute';
      selectedEl.style.top = `${Math.round(dragData.current.elTop + dy)}px`;
      selectedEl.style.left = `${Math.round(dragData.current.elLeft + dx)}px`;
    };
    const onUp = () => {
      if (isDragging.current && selectedEl) {
        isDragging.current = false;
        readElProps(selectedEl);
        saveToStorage();
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [selectedEl, scale, readElProps, saveToStorage]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    if (editMode) {
      el.addEventListener('click', handlePreviewClick);
      el.addEventListener('mousedown', handleMouseDown);
      el.style.cursor = 'default';
    } else {
      el.removeEventListener('click', handlePreviewClick);
      el.removeEventListener('mousedown', handleMouseDown);
      el.style.cursor = '';
      selectedEl?.style.setProperty('outline', '');
      setSelectedEl(null); setElProps(null);
      saveToStorage();
    }
    return () => {
      el.removeEventListener('click', handlePreviewClick);
      el.removeEventListener('mousedown', handleMouseDown);
    };
  }, [editMode, handlePreviewClick, handleMouseDown, selectedEl, saveToStorage]);

  // ── AI generation ────────────────────────────────────────────────────────
  const generate = async (mode: 'image' | 'layout') => {
    if (editMode) setEditMode(false);
    setSelectedEl(null); setElProps(null);
    setGenerating(mode); setAiError(null); setRefsUsed(null);
    try {
      const briefing = JSON.parse(localStorage.getItem('myplatform_active_briefing') ?? '{}');
      setArtH(1536);
      const endpoint = mode === 'image' ? '/api/generate-layout' : '/api/generate-html';
      const res = await fetch(endpoint, {
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
      if (!data.html) throw new Error('IA não retornou resultado');
      setHtml(data.html);
      setRefsUsed(data.refsUsed ?? 0);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erro ao gerar');
    } finally {
      setGenerating(null);
    }
  };

  const exportPNG = async () => {
    if (!previewRef.current) return;
    setEditMode(false); setExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const artEl = (previewRef.current.querySelector('div') ?? previewRef.current) as HTMLElement;
      const dataUrl = await toPng(artEl, { width: ART_W, height: artH, pixelRatio: 2, style: { transform: 'none' } });
      const a = document.createElement('a');
      a.download = `arte-${Date.now()}.png`;
      a.href = dataUrl; a.click();
    } catch (err) { console.error(err); }
    finally { setExporting(false); }
  };

  const reset = () => {
    if (!confirm('Resetar o canvas?')) return;
    setEditMode(false); setSelectedEl(null); setElProps(null);
    setHtml(DEFAULT_HTML); setArtH(1536);
  };

  const elLabel = elProps?.text?.trim().slice(0, 22) || 'Elemento';
  const hasBackground = elProps && elProps.backgroundColor !== 'transparent';

  return (
    <main className="flex-1 min-h-screen flex flex-col bg-neutral-100">
      {/* Toolbar */}
      <header className="shrink-0 border-b border-neutral-200 bg-white px-4 py-2 flex items-center gap-2 flex-wrap">
        <h1 className="text-sm font-medium mr-1">Editor</h1>

        <button onClick={() => generate('layout')} disabled={generating !== null}
          className="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5">
          {generating === 'layout'
            ? <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Gerando…</>
            : '✦ Gerar layout'}
        </button>

        <button onClick={() => generate('image')} disabled={generating !== null}
          className="text-xs px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5">
          {generating === 'image'
            ? <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Gerando…</>
            : '🖼 Gerar imagem'}
        </button>

        {aiError && <span className="text-xs text-red-500 max-w-xs truncate">{aiError}</span>}
        {refsUsed !== null && !aiError && refsUsed > 0 && (
          <span className="text-[10px] text-neutral-400">{refsUsed} ref{refsUsed > 1 ? 's' : ''}</span>
        )}

        <div className="w-px h-5 bg-neutral-200" />

        <button onClick={() => setEditMode(v => !v)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${editMode ? 'bg-amber-50 border-amber-400 text-amber-700 font-semibold' : 'border-neutral-200 hover:bg-neutral-50'}`}>
          {editMode ? '✦ Modo edição ativo' : '✦ Editar'}
        </button>

        <div className="w-px h-5 bg-neutral-200" />

        <button onClick={fitToScreen} className="text-[10px] px-2 h-7 border border-neutral-200 rounded hover:bg-neutral-50 tabular-nums">{Math.round(scale * 100)}%</button>
        <button onClick={() => setScale(s => Math.min(2, s * 1.2))} className="text-xs w-7 h-7 border border-neutral-200 rounded hover:bg-neutral-50">+</button>
        <button onClick={() => setScale(s => Math.max(0.05, s / 1.2))} className="text-xs w-7 h-7 border border-neutral-200 rounded hover:bg-neutral-50">−</button>

        <div className="w-px h-5 bg-neutral-200" />
        <button onClick={() => { if (previewRef.current) setHtml(previewRef.current.innerHTML); setShowCode(v => !v); }}
          className={`text-xs px-2 py-1 border rounded ${showCode ? 'border-violet-400 text-violet-600 bg-violet-50' : 'border-neutral-200 hover:bg-neutral-50'}`}>
          &lt;/&gt; HTML
        </button>
        <button onClick={reset} className="text-xs px-2 py-1 text-neutral-400 hover:text-neutral-700">Resetar</button>
        <div className="ml-auto" />
        <button onClick={exportPNG} disabled={exporting}
          className="text-xs px-3 py-1.5 bg-black text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50">
          {exporting ? 'Exportando…' : 'Exportar PNG'}
        </button>
      </header>

      {editMode && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-700">
          Clique em qualquer elemento para selecioná-lo · Arraste para mover · Edite as propriedades no painel lateral
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="canvas-area flex-1 flex items-center justify-center overflow-auto bg-neutral-300 p-8">
          <div style={{ width: ART_W * scale, height: artH * scale, flexShrink: 0 }}>
            <div ref={previewRef}
              style={{ width: ART_W, height: artH, transform: `scale(${scale})`, transformOrigin: 'top left' }}
            />
          </div>
        </div>

        {/* Properties panel */}
        {editMode && (
          <div className="w-64 bg-[#111] border-l border-neutral-800 flex flex-col shrink-0 overflow-y-auto text-white">
            {/* Panel header */}
            <div className="px-4 pt-4 pb-3 border-b border-neutral-800">
              <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-semibold">Propriedades</p>
              {elProps && (
                <p className="text-[11px] text-neutral-300 mt-0.5 truncate">{elLabel}</p>
              )}
            </div>

            {!elProps ? (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <p className="text-xs text-neutral-600 leading-relaxed">Clique em um elemento no canvas para editar suas propriedades.</p>
              </div>
            ) : (
              <>
                {/* Fields */}
                <div className="px-4 py-1 flex flex-col">

                  <Row label="X">
                    <NumInput value={elProps.left}
                      onChange={v => { updateStyle('position', 'absolute'); updateStyle('left', v + 'px'); }} />
                  </Row>
                  <Row label="Y">
                    <NumInput value={elProps.top}
                      onChange={v => { updateStyle('position', 'absolute'); updateStyle('top', v + 'px'); }} />
                  </Row>
                  <Row label="Rotação">
                    <NumInput value={elProps.rotation}
                      onChange={v => {
                        const t = selectedEl?.style.transform ?? '';
                        const clean = t.replace(/rotate\([^)]+\)/g, '').trim();
                        updateStyle('transform', `${clean} rotate(${v}deg)`.trim());
                      }} />
                  </Row>

                  <Divider />

                  <Row label="Texto">
                    <input type="text" value={elProps.text} onChange={e => updateText(e.target.value)}
                      className="w-full bg-neutral-800 text-[11px] text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                  </Row>
                  <Row label="Tamanho">
                    <NumInput value={elProps.fontSize} min={8} max={400}
                      onChange={v => updateStyle('fontSize', v + 'px')} />
                  </Row>
                  <Row label="Peso">
                    <select value={elProps.fontWeight} onChange={e => updateStyle('fontWeight', e.target.value)}
                      className="w-full bg-neutral-800 text-[11px] text-white rounded-lg px-2.5 py-1.5 focus:outline-none appearance-none cursor-pointer">
                      <option value="400">400 — Regular</option>
                      <option value="500">500 — Medium</option>
                      <option value="600">600 — SemiBold</option>
                      <option value="700">700 — Bold</option>
                      <option value="800">800 — ExtraBold</option>
                      <option value="900">900 — Black</option>
                    </select>
                  </Row>
                  <Row label="Espaçamento">
                    <NumInput value={elProps.letterSpacing}
                      onChange={v => updateStyle('letterSpacing', v + 'px')} />
                  </Row>
                  <Row label="Alinhamento">
                    <select value={elProps.textAlign} onChange={e => updateStyle('textAlign', e.target.value)}
                      className="w-full bg-neutral-800 text-[11px] text-white rounded-lg px-2.5 py-1.5 focus:outline-none appearance-none cursor-pointer">
                      <option value="left">Esquerda</option>
                      <option value="center">Centro</option>
                      <option value="right">Direita</option>
                      <option value="justify">Justificado</option>
                    </select>
                  </Row>

                  <Divider />

                  <Row label="Cor">
                    <ColorInput value={elProps.color} onChange={v => updateStyle('color', v)} />
                  </Row>
                  <Row label="Fundo">
                    <div className="flex items-center gap-1.5">
                      <ColorInput
                        value={hasBackground ? elProps.backgroundColor : '#ffffff'}
                        onChange={v => updateStyle('backgroundColor', v)}
                      />
                      {hasBackground && (
                        <button onClick={() => updateStyle('backgroundColor', 'transparent')}
                          className="text-[9px] text-neutral-600 hover:text-neutral-400 whitespace-nowrap shrink-0">×</button>
                      )}
                    </div>
                  </Row>
                  <Row label="Opacidade">
                    <input type="range" min={0} max={100} value={Math.round(elProps.opacity * 100)}
                      onChange={e => updateStyle('opacity', String(parseInt(e.target.value) / 100))}
                      className="w-full h-1.5 rounded-full accent-blue-500 cursor-pointer" />
                  </Row>

                  <Divider />

                  <Row label="Arredond.">
                    <NumInput value={elProps.borderRadius} min={0}
                      onChange={v => updateStyle('borderRadius', v + 'px')} />
                  </Row>
                  <Row label="Padding">
                    <input type="text" value={elProps.padding} placeholder="16px 32px"
                      onChange={e => updateStyle('padding', e.target.value)}
                      className="w-full bg-neutral-800 text-[11px] text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                  </Row>
                </div>

                {/* Alinhar no Artboard */}
                <div className="px-4 pt-3 pb-2 border-t border-neutral-800 mt-2">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-semibold mb-2">Alinhar no Artboard</p>
                  <div className="grid grid-cols-3 gap-1 mb-1.5">
                    {([
                      ['left',    '←', 'Alinhar à esquerda'],
                      ['centerH', '↔', 'Centralizar horizontal'],
                      ['right',   '→', 'Alinhar à direita'],
                      ['top',     '↑', 'Alinhar ao topo'],
                      ['centerV', '↕', 'Centralizar vertical'],
                      ['bottom',  '↓', 'Alinhar à base'],
                    ] as [Parameters<typeof alignToArtboard>[0], string, string][]).map(([dir, icon, title]) => (
                      <button key={dir} title={title} onClick={() => alignToArtboard(dir)}
                        className="h-9 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm flex items-center justify-center transition-colors">
                        {icon}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button onClick={centerElement}
                      className="h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-300 transition-colors">
                      Centralizar
                    </button>
                    <button onClick={removeRotation}
                      className="h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-300 transition-colors">
                      Sem rotação
                    </button>
                  </div>
                </div>

                {/* Resetar camada */}
                <div className="px-4 py-3 border-t border-neutral-800">
                  <button
                    onClick={() => { selectedEl?.remove(); setSelectedEl(null); setElProps(null); saveToStorage(); }}
                    className="w-full text-sm text-red-500 hover:text-red-400 font-medium py-1 transition-colors">
                    Resetar camada
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* HTML code panel */}
        {showCode && (
          <div className="w-80 bg-neutral-950 flex flex-col border-l border-neutral-800 shrink-0">
            <div className="px-3 py-2 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-[10px] text-neutral-500 font-mono">HTML</span>
              <div className="flex gap-3">
                <button onClick={() => navigator.clipboard.writeText(html)} className="text-[10px] text-neutral-500 hover:text-white">copiar</button>
                <button onClick={() => { if (previewRef.current) setHtml(previewRef.current.innerHTML); }}
                  className="text-[10px] text-violet-400 hover:text-violet-300">DOM→estado</button>
              </div>
            </div>
            <textarea value={html} onChange={e => setHtml(e.target.value)}
              className="flex-1 bg-transparent text-xs text-neutral-300 p-3 font-mono resize-none focus:outline-none leading-relaxed"
              spellCheck={false} />
          </div>
        )}
      </div>
    </main>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-[11px] text-neutral-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-neutral-800/60 my-1" />;
}

function NumInput({ value, onChange, min, max }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <input type="number" value={value} min={min} max={max}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full bg-neutral-800 text-[11px] text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 tabular-nums" />
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hex = value.startsWith('#') ? value : '#000000';
  return (
    <div className="flex items-center gap-2">
      <label className="w-7 h-7 rounded-md border border-neutral-700 cursor-pointer shrink-0 overflow-hidden"
        style={{ backgroundColor: hex }}>
        <input type="color" value={hex} onChange={e => onChange(e.target.value)}
          className="opacity-0 w-full h-full cursor-pointer" />
      </label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="flex-1 bg-neutral-800 text-[11px] text-white rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500" />
    </div>
  );
}
