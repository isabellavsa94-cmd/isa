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
  borderRadius: number;
  top: number;
  left: number;
  width: number;
  height: number;
  opacity: number;
  letterSpacing: number;
  lineHeight: string;
  padding: string;
};

function rgbToHex(rgb: string): string {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return '#000000';
  return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

function isTransparent(color: string) {
  return !color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)';
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

  // Inject HTML into DOM directly (not via React state, to preserve edits)
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

  // ── Read element properties ──────────────────────────────────────────────
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
      borderRadius: Math.round(parseFloat(cs.borderRadius) / scale) || 0,
      top: parentRect ? Math.round((elRect.top - parentRect.top) / scale) : 0,
      left: parentRect ? Math.round((elRect.left - parentRect.left) / scale) : 0,
      width: Math.round(parseFloat(cs.width) / scale),
      height: Math.round(parseFloat(cs.height) / scale),
      opacity: parseFloat(cs.opacity) ?? 1,
      letterSpacing: Math.round(parseFloat(cs.letterSpacing)) || 0,
      lineHeight: cs.lineHeight,
      padding: el.style.padding || '',
    });
  }, [scale]);

  // ── Update element style ─────────────────────────────────────────────────
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

  // ── Click to select ──────────────────────────────────────────────────────
  const handlePreviewClick = useCallback((e: MouseEvent) => {
    if (!editMode) return;
    const target = e.target as HTMLElement;
    const artDiv = previewRef.current?.querySelector('div');
    if (!artDiv || target === artDiv || target === previewRef.current) {
      selectedEl?.style.setProperty('outline', '');
      setSelectedEl(null);
      setElProps(null);
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
    const target = e.target as HTMLElement;
    if (target !== selectedEl) return;
    e.preventDefault();
    isDragging.current = true;
    const artDiv = previewRef.current?.querySelector('div') as HTMLElement;
    const parentRect = artDiv?.getBoundingClientRect();
    const elRect = selectedEl.getBoundingClientRect();
    dragData.current = {
      mx: e.clientX,
      my: e.clientY,
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

  // Attach/detach click handlers when editMode changes
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
      setSelectedEl(null);
      setElProps(null);
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
    setEditMode(false);
    setExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const artEl = (previewRef.current.querySelector('div') ?? previewRef.current) as HTMLElement;
      const dataUrl = await toPng(artEl, { width: ART_W, height: artH, pixelRatio: 2, style: { transform: 'none' } });
      const a = document.createElement('a');
      a.download = `arte-${Date.now()}.png`;
      a.href = dataUrl;
      a.click();
    } catch (err) { console.error(err); }
    finally { setExporting(false); }
  };

  const reset = () => {
    if (!confirm('Resetar o canvas?')) return;
    setEditMode(false); setSelectedEl(null); setElProps(null);
    setHtml(DEFAULT_HTML); setArtH(1536);
  };

  // ── Properties panel ─────────────────────────────────────────────────────
  const hasBackground = elProps && elProps.backgroundColor !== 'transparent';

  return (
    <main className="flex-1 min-h-screen flex flex-col bg-neutral-100">
      {/* Toolbar */}
      <header className="shrink-0 border-b border-neutral-200 bg-white px-4 py-2 flex items-center gap-2 flex-wrap">
        <h1 className="text-sm font-medium mr-1">Editor</h1>

        <button onClick={() => generate('layout')} disabled={generating !== null}
          className="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5"
          title="Claude gera HTML/CSS editável">
          {generating === 'layout'
            ? <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Gerando…</>
            : '✦ Gerar layout'}
        </button>

        <button onClick={() => generate('image')} disabled={generating !== null}
          className="text-xs px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5"
          title="GPT Image 2 gera imagem pixel-perfect">
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
          <div className="w-64 bg-neutral-950 border-l border-neutral-800 flex flex-col shrink-0 overflow-y-auto">
            {!elProps ? (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <p className="text-xs text-neutral-600 leading-relaxed">Clique em um elemento no canvas para editar suas propriedades.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0 divide-y divide-neutral-800">
                {/* Text */}
                <Section label="Texto">
                  <textarea
                    value={elProps.text}
                    onChange={e => updateText(e.target.value)}
                    rows={3}
                    className="w-full bg-neutral-900 text-xs text-white rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </Section>

                {/* Typography */}
                <Section label="Tipografia">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Tamanho">
                      <input type="number" value={elProps.fontSize} min={8} max={300}
                        onChange={e => updateStyle('fontSize', e.target.value + 'px')}
                        className="w-full bg-neutral-900 text-xs text-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                    </Field>
                    <Field label="Peso">
                      <select value={elProps.fontWeight}
                        onChange={e => updateStyle('fontWeight', e.target.value)}
                        className="w-full bg-neutral-900 text-xs text-white rounded px-2 py-1 focus:outline-none">
                        <option value="400">400</option>
                        <option value="500">500</option>
                        <option value="600">600</option>
                        <option value="700">700</option>
                        <option value="800">800</option>
                        <option value="900">900</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Espaçamento letras">
                    <input type="number" value={elProps.letterSpacing}
                      onChange={e => updateStyle('letterSpacing', e.target.value + 'px')}
                      className="w-full bg-neutral-900 text-xs text-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                  </Field>
                </Section>

                {/* Colors */}
                <Section label="Cores">
                  <Field label="Cor do texto">
                    <ColorInput value={elProps.color} onChange={v => updateStyle('color', v)} />
                  </Field>
                  <Field label="Fundo">
                    <div className="flex gap-1.5 items-center">
                      <ColorInput
                        value={hasBackground ? elProps.backgroundColor : '#ffffff'}
                        onChange={v => updateStyle('backgroundColor', v)}
                      />
                      {hasBackground && (
                        <button onClick={() => updateStyle('backgroundColor', 'transparent')}
                          className="text-[10px] text-neutral-500 hover:text-white whitespace-nowrap">remover</button>
                      )}
                    </div>
                  </Field>
                </Section>

                {/* Position & Size */}
                <Section label="Posição">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Top">
                      <input type="number" value={elProps.top}
                        onChange={e => { updateStyle('position', 'absolute'); updateStyle('top', e.target.value + 'px'); }}
                        className="w-full bg-neutral-900 text-xs text-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                    </Field>
                    <Field label="Left">
                      <input type="number" value={elProps.left}
                        onChange={e => { updateStyle('position', 'absolute'); updateStyle('left', e.target.value + 'px'); }}
                        className="w-full bg-neutral-900 text-xs text-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                    </Field>
                    <Field label="Largura">
                      <input type="number" value={elProps.width}
                        onChange={e => updateStyle('width', e.target.value + 'px')}
                        className="w-full bg-neutral-900 text-xs text-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                    </Field>
                    <Field label="Altura">
                      <input type="number" value={elProps.height}
                        onChange={e => updateStyle('height', e.target.value + 'px')}
                        className="w-full bg-neutral-900 text-xs text-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                    </Field>
                  </div>
                </Section>

                {/* Shape */}
                <Section label="Forma">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Arredond.">
                      <input type="number" value={elProps.borderRadius} min={0}
                        onChange={e => updateStyle('borderRadius', e.target.value + 'px')}
                        className="w-full bg-neutral-900 text-xs text-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                    </Field>
                    <Field label="Opacidade">
                      <input type="number" value={Math.round(elProps.opacity * 100)} min={0} max={100}
                        onChange={e => updateStyle('opacity', String(parseInt(e.target.value) / 100))}
                        className="w-full bg-neutral-900 text-xs text-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                    </Field>
                  </div>
                  <Field label="Padding">
                    <input type="text" value={elProps.padding} placeholder="ex: 16px 32px"
                      onChange={e => updateStyle('padding', e.target.value)}
                      className="w-full bg-neutral-900 text-xs text-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                  </Field>
                </Section>

                <div className="p-3">
                  <button
                    onClick={() => { selectedEl?.remove(); setSelectedEl(null); setElProps(null); saveToStorage(); }}
                    className="w-full text-xs text-red-500 hover:text-red-400 border border-red-900 hover:border-red-700 rounded py-1.5 transition-colors"
                  >
                    Remover elemento
                  </button>
                </div>
              </div>
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

// ── Sub-components ─────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-3 flex flex-col gap-2">
      <p className="text-[9px] uppercase tracking-widest text-neutral-600 font-semibold">{label}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] text-neutral-600">{label}</span>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="color" value={value.startsWith('#') ? value : '#000000'}
        onChange={e => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0" />
      <input type="text" value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-neutral-900 text-xs text-white rounded px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500" />
    </div>
  );
}
