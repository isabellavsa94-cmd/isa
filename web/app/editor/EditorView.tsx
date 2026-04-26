'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { EditorLayer, RectLayer, TextLayer, ImageLayer } from '@/lib/types';

const ART_W = 1080;
const ART_H = 1350;
const STORAGE_KEY = 'myplatform_editor_layout';

function getDefaultLayers(): EditorLayer[] {
  return [
    { id: 'bg', name: 'Fundo', type: 'rect', x: 0, y: 0, w: ART_W, h: ART_H, fill: '#1a1a2e', rx: 0, angle: 0, visible: true, locked: true },
    { id: 'accent', name: 'Forma de destaque', type: 'rect', x: 80, y: 200, w: 240, h: 60, fill: '#e94560', rx: 30, angle: 0, visible: true },
    { id: 'title', name: 'Título', type: 'text', x: 540, y: 520, text: 'SEU TÍTULO', fill: '#ffffff', fontSize: 130, fontWeight: 900, anchor: 'middle', letterSpacing: -2, angle: 0, visible: true },
    { id: 'subtitle', name: 'Subtítulo', type: 'text', x: 540, y: 640, text: 'Subtítulo aqui', fill: '#e94560', fontSize: 56, fontWeight: 400, anchor: 'middle', letterSpacing: 0, angle: 0, visible: true },
    { id: 'cta', name: 'CTA', type: 'text', x: 540, y: 1240, text: 'CHAMADA PARA AÇÃO', fill: '#ffffff', fontSize: 32, fontWeight: 700, anchor: 'middle', letterSpacing: 4, angle: 0, visible: true },
  ];
}

function loadLayers(): EditorLayer[] {
  if (typeof window === 'undefined') return getDefaultLayers();
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return getDefaultLayers();
}

function LayerSVG({ layer }: { layer: EditorLayer }) {
  if (!layer.visible) return null;

  const transform = (() => {
    if (!layer.angle) return undefined;
    if (layer.type === 'rect') {
      const r = layer as RectLayer;
      return `rotate(${layer.angle}, ${r.x + r.w / 2}, ${r.y + r.h / 2})`;
    }
    if (layer.type === 'image') {
      const i = layer as ImageLayer;
      const w = i.w * (i.scale || 1);
      const h = i.h * (i.scale || 1);
      return `rotate(${layer.angle}, ${i.x + w / 2}, ${i.y + h / 2})`;
    }
    return `rotate(${layer.angle}, ${layer.x}, ${layer.y})`;
  })();

  switch (layer.type) {
    case 'rect':
      return (
        <rect
          x={layer.x}
          y={layer.y}
          width={layer.w}
          height={layer.h}
          rx={layer.rx || 0}
          fill={layer.fill}
          transform={transform}
        />
      );
    case 'text':
      return (
        <text
          x={layer.x}
          y={layer.y}
          textAnchor={layer.anchor}
          fontSize={layer.fontSize}
          fontWeight={layer.fontWeight}
          fill={layer.fill}
          letterSpacing={layer.letterSpacing}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Arial, sans-serif"
          transform={transform}
        >
          {layer.text}
        </text>
      );
    case 'image': {
      const w = layer.w * (layer.scale || 1);
      const h = layer.h * (layer.scale || 1);
      return (
        <image
          x={layer.x}
          y={layer.y}
          width={w}
          height={h}
          href={layer.src}
          preserveAspectRatio="xMidYMid slice"
          transform={transform}
        />
      );
    }
  }
}

function SelectionOverlay({
  layer,
  svgRef,
  onMove,
  onRotate,
}: {
  layer: EditorLayer | undefined;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onMove: (e: React.MouseEvent, l: EditorLayer) => void;
  onRotate: (e: React.MouseEvent, l: EditorLayer) => void;
}) {
  if (!layer || layer.locked) return null;

  const el = svgRef.current?.getElementById(`layer-${layer.id}`);
  if (!el) return null;
  let bb;
  try {
    bb = (el as SVGGraphicsElement).getBBox();
  } catch {
    return null;
  }
  if (!bb || bb.width === 0) return null;

  const pad = 6;
  const x = bb.x - pad;
  const y = bb.y - pad;
  const w = bb.width + pad * 2;
  const h = bb.height + pad * 2;
  const cx = x + w / 2;
  const rotY = y - 30;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="1.5"
        strokeDasharray="6,3"
        pointerEvents="none"
      />
      <line x1={cx} y1={y} x2={cx} y2={rotY} stroke="#3b82f6" strokeWidth="1.5" />
      <circle
        cx={cx}
        cy={rotY}
        r={8}
        fill="#3b82f6"
        stroke="#fff"
        strokeWidth="1.5"
        style={{ cursor: 'grab' }}
        onMouseDown={(e) => onRotate(e, layer)}
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="transparent"
        style={{ cursor: 'move' }}
        onMouseDown={(e) => onMove(e, layer)}
      />
    </g>
  );
}

export function EditorView() {
  const supabase = createClient();
  const [layers, setLayers] = useState<EditorLayer[]>(getDefaultLayers());
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [, forceRender] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = layers.find((l) => l.id === selectedId);

  useEffect(() => {
    setLayers(loadLayers());
    setHydrated(true);
  }, []);

  const fitToScreen = useCallback(() => {
    const area = document.querySelector('.canvas-area');
    if (!area) return;
    const { width: aw, height: ah } = area.getBoundingClientRect();
    const s = Math.min((aw - 120) / ART_W, (ah - 120) / ART_H) * 0.7;
    setScale(Math.max(0.05, s));
  }, []);

  useEffect(() => {
    fitToScreen();
    window.addEventListener('resize', fitToScreen);
    return () => window.removeEventListener('resize', fitToScreen);
  }, [fitToScreen]);

  const zoomIn = () => setScale((s) => Math.min(4, s * 1.2));
  const zoomOut = () => setScale((s) => Math.max(0.05, s / 1.2));

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layers));
    } catch {}
    forceRender((n) => n + 1);
  }, [layers, hydrated]);

  const updateLayer = (id: string, updates: Partial<EditorLayer>) => {
    setLayers((ls) => ls.map((l) => (l.id === id ? ({ ...l, ...updates } as EditorLayer) : l)));
  };

  const deleteLayer = (id: string) => {
    if (id === 'bg') return;
    setLayers((ls) => ls.filter((l) => l.id !== id));
    setSelectedId(null);
  };

  const screenToSVG = (e: React.MouseEvent | MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const handleMoveStart = (e: React.MouseEvent, layer: EditorLayer) => {
    e.stopPropagation();
    e.preventDefault();
    const start = screenToSVG(e);
    const origX = layer.x;
    const origY = layer.y;
    const onMove = (ev: MouseEvent) => {
      const cur = screenToSVG(ev);
      updateLayer(layer.id, { x: origX + (cur.x - start.x), y: origY + (cur.y - start.y) });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleRotateStart = (e: React.MouseEvent, layer: EditorLayer) => {
    e.stopPropagation();
    e.preventDefault();
    const el = svgRef.current?.getElementById(`layer-${layer.id}`);
    if (!el) return;
    let bb;
    try {
      bb = (el as SVGGraphicsElement).getBBox();
    } catch {
      return;
    }
    const cx = bb.x + bb.width / 2;
    const cy = bb.y + bb.height / 2;
    const origAngle = layer.angle || 0;
    const startPt = screenToSVG(e);
    const startAngle = (Math.atan2(startPt.y - cy, startPt.x - cx) * 180) / Math.PI;

    const onMove = (ev: MouseEvent) => {
      const cur = screenToSVG(ev);
      const curAngle = (Math.atan2(cur.y - cy, cur.x - cx) * 180) / Math.PI;
      updateLayer(layer.id, { angle: origAngle + (curAngle - startAngle) });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleSVGClick = (e: React.MouseEvent) => {
    const target = e.target as Element;
    const el = target.closest('[data-lid]');
    if (el) setSelectedId(el.getAttribute('data-lid'));
    else setSelectedId(null);
  };

  const addText = () => {
    const id = `text-${Date.now()}`;
    setLayers((ls) => [
      ...ls,
      {
        id,
        name: 'Texto',
        type: 'text',
        x: ART_W / 2,
        y: ART_H / 2,
        text: 'Novo texto',
        fill: '#ffffff',
        fontSize: 64,
        fontWeight: 700,
        anchor: 'middle',
        letterSpacing: 0,
        angle: 0,
        visible: true,
      },
    ]);
    setSelectedId(id);
  };

  const addRect = () => {
    const id = `rect-${Date.now()}`;
    setLayers((ls) => [
      ...ls,
      {
        id,
        name: 'Retângulo',
        type: 'rect',
        x: ART_W / 2 - 150,
        y: ART_H / 2 - 75,
        w: 300,
        h: 150,
        fill: '#e94560',
        rx: 12,
        angle: 0,
        visible: true,
      },
    ]);
    setSelectedId(id);
  };

  const addImage = () => fileRef.current?.click();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = `editor/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file);
    if (error) {
      alert('Erro ao fazer upload: ' + error.message);
      return;
    }
    const { data } = supabase.storage.from('media').getPublicUrl(path);
    const id = `img-${Date.now()}`;
    setLayers((ls) => [
      ...ls,
      {
        id,
        name: 'Imagem',
        type: 'image',
        x: ART_W / 2 - 200,
        y: ART_H / 2 - 200,
        w: 400,
        h: 400,
        src: data.publicUrl,
        scale: 1,
        angle: 0,
        visible: true,
      },
    ]);
    setSelectedId(id);
    e.target.value = '';
  };

  const exportSVG = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const str = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([str], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `design-${Date.now()}.svg`;
    a.click();
  };

  const exportPNG = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const str = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = ART_W;
      canvas.height = ART_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `design-${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  };

  const reset = () => {
    if (!confirm('Resetar para o layout inicial? Suas mudanças serão perdidas.')) return;
    setLayers(getDefaultLayers());
    setSelectedId(null);
  };

  const generateWithAI = async () => {
    setGenerating(true);
    setAiError(null);
    try {
      const savedBriefing = localStorage.getItem('myplatform_active_briefing');
      const briefing = savedBriefing ? JSON.parse(savedBriefing) : {};
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
      if (Array.isArray(data.layers) && data.layers.length > 0) {
        setLayers(data.layers as EditorLayer[]);
        setSelectedId(null);
      } else {
        throw new Error('A IA não retornou layers válidos');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erro ao gerar');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="flex-1 min-h-screen flex flex-col bg-neutral-100">
      <header className="border-b border-neutral-200 bg-white px-4 py-2 flex items-center justify-between gap-3">
        <h1 className="text-sm font-medium">Editor de arte</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={generateWithAI}
            disabled={generating}
            className="text-xs px-3 py-1 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5"
          >
            {generating ? (
              <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Gerando...</>
            ) : '✦ Gerar com IA'}
          </button>
          {aiError && <span className="text-xs text-red-500">{aiError}</span>}
          <div className="w-px h-5 bg-neutral-200 mx-1" />
          <button onClick={addText} className="text-xs px-2 py-1 border border-neutral-200 rounded hover:bg-neutral-50">+ Texto</button>
          <button onClick={addRect} className="text-xs px-2 py-1 border border-neutral-200 rounded hover:bg-neutral-50">+ Forma</button>
          <button onClick={addImage} className="text-xs px-2 py-1 border border-neutral-200 rounded hover:bg-neutral-50">+ Imagem</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          <div className="w-px h-5 bg-neutral-200 mx-1" />
          <button onClick={zoomOut} className="text-xs w-7 h-7 border border-neutral-200 rounded hover:bg-neutral-50" title="Diminuir zoom">−</button>
          <button onClick={fitToScreen} className="text-[10px] px-2 h-7 border border-neutral-200 rounded hover:bg-neutral-50 tabular-nums" title="Ajustar à tela">
            {Math.round(scale * 100)}%
          </button>
          <button onClick={zoomIn} className="text-xs w-7 h-7 border border-neutral-200 rounded hover:bg-neutral-50" title="Aumentar zoom">+</button>
          <div className="w-px h-5 bg-neutral-200 mx-1" />
          <button onClick={reset} className="text-xs px-2 py-1 text-neutral-500 hover:text-neutral-900">Resetar</button>
          <button onClick={exportSVG} className="text-xs px-2 py-1 border border-neutral-200 rounded hover:bg-neutral-50">SVG</button>
          <button onClick={exportPNG} className="text-xs px-3 py-1 bg-black text-white rounded hover:bg-neutral-800">Exportar PNG</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="canvas-area flex-1 flex items-center justify-center overflow-auto bg-neutral-200">
          <div
            style={{ width: ART_W * scale, height: ART_H * scale, position: 'relative' }}
            className="bg-white shadow-lg"
          >
            <svg
              ref={svgRef}
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`0 0 ${ART_W} ${ART_H}`}
              width={ART_W * scale}
              height={ART_H * scale}
              onClick={handleSVGClick}
              style={{ display: 'block' }}
            >
              {layers.map((layer) => (
                <g
                  key={layer.id}
                  id={`layer-${layer.id}`}
                  data-lid={layer.id}
                  style={{ cursor: layer.locked ? 'default' : 'pointer' }}
                >
                  <LayerSVG layer={layer} />
                </g>
              ))}
              <SelectionOverlay
                layer={selected}
                svgRef={svgRef}
                onMove={handleMoveStart}
                onRotate={handleRotateStart}
              />
            </svg>
          </div>
        </div>

        <aside className="w-72 border-l border-neutral-200 bg-white flex flex-col overflow-hidden">
          <div className="p-3 border-b border-neutral-200">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Camadas</div>
            <div className="space-y-0.5 max-h-64 overflow-y-auto">
              {[...layers].reverse().map((layer) => (
                <div
                  key={layer.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs ${
                    selectedId === layer.id ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
                  }`}
                  onClick={() => setSelectedId(layer.id)}
                >
                  <span className="text-[10px] opacity-60 w-4 text-center">
                    {layer.type === 'text' ? 'T' : layer.type === 'rect' ? '■' : '🖼'}
                  </span>
                  <span className="flex-1 truncate">{layer.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateLayer(layer.id, { visible: !layer.visible });
                    }}
                    className="text-[10px] opacity-60 hover:opacity-100"
                  >
                    {layer.visible ? '👁' : '○'}
                  </button>
                  {!layer.locked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(layer.id);
                      }}
                      className="text-[10px] opacity-60 hover:opacity-100"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {selected ? (
            <div className="p-3 flex-1 overflow-y-auto">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">
                Propriedades — {selected.name}
              </div>
              <PropertyPanel layer={selected} onUpdate={(u) => updateLayer(selected.id, u)} />
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-neutral-400 flex-1">
              Selecione uma camada para editar
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function PropertyPanel({
  layer,
  onUpdate,
}: {
  layer: EditorLayer;
  onUpdate: (u: Partial<EditorLayer>) => void;
}) {
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-2">
      <label className="text-[10px] text-neutral-500 w-20 shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );

  const numInput = (value: number, key: string, step = 1) => (
    <input
      type="number"
      step={step}
      value={Math.round(value * 100) / 100}
      onChange={(e) => onUpdate({ [key]: Number(e.target.value) } as Partial<EditorLayer>)}
      className="w-full border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-neutral-400"
    />
  );

  return (
    <div>
      <Row label="X">{numInput(layer.x, 'x')}</Row>
      <Row label="Y">{numInput(layer.y, 'y')}</Row>
      <Row label="Rotação">{numInput(layer.angle, 'angle')}</Row>

      {layer.type === 'rect' && !layer.locked && (
        <>
          <Row label="Largura">{numInput(layer.w, 'w')}</Row>
          <Row label="Altura">{numInput(layer.h, 'h')}</Row>
          <Row label="Raio">{numInput(layer.rx, 'rx')}</Row>
          <Row label="Cor">
            <ColorPicker
              value={layer.fill}
              onChange={(v) => onUpdate({ fill: v } as Partial<RectLayer>)}
            />
          </Row>
        </>
      )}

      {layer.type === 'rect' && layer.locked && (
        <Row label="Cor">
          <ColorPicker
            value={layer.fill}
            onChange={(v) => onUpdate({ fill: v } as Partial<RectLayer>)}
          />
        </Row>
      )}

      {layer.type === 'text' && (
        <>
          <Row label="Texto">
            <textarea
              value={layer.text}
              onChange={(e) => onUpdate({ text: e.target.value } as Partial<TextLayer>)}
              rows={2}
              className="w-full border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-neutral-400 resize-none"
            />
          </Row>
          <Row label="Tamanho">{numInput(layer.fontSize, 'fontSize')}</Row>
          <Row label="Peso">
            <select
              value={layer.fontWeight}
              onChange={(e) => onUpdate({ fontWeight: Number(e.target.value) } as Partial<TextLayer>)}
              className="w-full border border-neutral-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-neutral-400"
            >
              <option value={300}>300 — Light</option>
              <option value={400}>400 — Regular</option>
              <option value={500}>500 — Medium</option>
              <option value={700}>700 — Bold</option>
              <option value={900}>900 — Black</option>
            </select>
          </Row>
          <Row label="Espaçamento">{numInput(layer.letterSpacing, 'letterSpacing', 0.5)}</Row>
          <Row label="Alinhamento">
            <select
              value={layer.anchor}
              onChange={(e) => onUpdate({ anchor: e.target.value as TextLayer['anchor'] } as Partial<TextLayer>)}
              className="w-full border border-neutral-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-neutral-400"
            >
              <option value="start">Esquerda</option>
              <option value="middle">Centro</option>
              <option value="end">Direita</option>
            </select>
          </Row>
          <Row label="Cor">
            <ColorPicker
              value={layer.fill}
              onChange={(v) => onUpdate({ fill: v } as Partial<TextLayer>)}
            />
          </Row>
        </>
      )}

      {layer.type === 'image' && (
        <>
          <Row label="Largura">{numInput(layer.w, 'w')}</Row>
          <Row label="Altura">{numInput(layer.h, 'h')}</Row>
          <Row label="Escala">{numInput(layer.scale ?? 1, 'scale', 0.05)}</Row>
        </>
      )}
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isHex = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <div className="flex items-center gap-1">
      <input
        type="color"
        value={isHex ? value : '#ffffff'}
        onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 border border-neutral-200 rounded cursor-pointer p-0"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 border border-neutral-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-neutral-400"
      />
    </div>
  );
}
