'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Briefing, BriefingFormat, Client } from '@/lib/types';
import { BriefingEditor } from './BriefingEditor';
import { createClient } from '@/lib/supabase/client';
import { Dock } from './Dock';

const SUPABASE_URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

type TeamMember = { nome: string; foto: string | null };

const TEAM_MEMBERS: TeamMember[] = [
  { nome: 'Renan Caixeiro', foto: 'uploads/renan-caixeiro.jpeg' },
  { nome: 'Livia',           foto: null },
];

const FORMAT_TABS: Array<BriefingFormat | 'Todos'> = ['Todos', 'Feed', 'Carrossel', 'Reels', 'Stories'];

function storageUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${SUPABASE_URL_BASE}/storage/v1/object/public/media/${path}`;
}

const FORMAT_STYLES: Record<string, { bg: string; text: string }> = {
  Feed:      { bg: '#3B82F6', text: '#fff' },
  Carrossel: { bg: '#22C55E', text: '#fff' },
  Reels:     { bg: '#F97316', text: '#fff' },
  Stories:   { bg: '#A855F7', text: '#fff' },
};

function LinkField({ briefingId, field, initialValue }: { briefingId: string; field: string; initialValue: string | null }) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = async () => {
    setEditing(false);
    await supabase.from('briefings').update({ [field]: value || null }).eq('id', briefingId);
  };

  const isUrl = value.startsWith('http://') || value.startsWith('https://');

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setValue(initialValue ?? ''); setEditing(false); } }}
        placeholder="https://..."
        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5 group">
      {value ? (
        isUrl ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 truncate flex-1">
            {value}
          </a>
        ) : (
          <span className="text-xs text-neutral-300 flex-1">{value}</span>
        )
      ) : (
        <span className="text-xs text-neutral-600 italic flex-1">Sem link</span>
      )}
      <button
        onClick={() => setEditing(true)}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-neutral-300"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
    </div>
  );
}

function Avatar({ member, size }: { member: { nome: string; foto: string | null }; size: number }) {
  const url = storageUrl(member.foto);
  const px = size * 4;
  return (
    <div
      className="rounded-full overflow-hidden shrink-0 ring-1 ring-neutral-700 bg-neutral-700 flex items-center justify-center"
      style={{ width: px, height: px }}
    >
      {url ? (
        <img src={url} alt={member.nome} className="w-full h-full object-cover" />
      ) : (
        <span className="text-[9px] font-bold text-white bg-neutral-600 w-full h-full flex items-center justify-center">
          {member.nome.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-neutral-800 last:border-0">
      <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold mb-0.5">{title}</p>
      {children}
    </div>
  );
}

const FORMAT_DIMENSIONS: Record<string, { w: number; h: number }> = {
  Stories:   { w: 1080, h: 1920 },
  Reels:     { w: 1080, h: 1920 },
  Feed:      { w: 1080, h: 1350 },
  Carrossel: { w: 1080, h: 1350 },
};

function BriefingCard({ briefing, index, onEdit }: { briefing: Briefing; index: number; onEdit: () => void }) {
  const supabase = createClient();
  const color = briefing.accent_color ?? 'oklch(0.65 0.15 250)';
  const fmtStyle = FORMAT_STYLES[briefing.format ?? ''] ?? { bg: '#6B7280', text: '#fff' };

  const [currentImagePath, setCurrentImagePath] = useState(briefing.image);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [headerHover, setHeaderHover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [responsavel, setResponsavel] = useState<TeamMember | null>(briefing.responsavel ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickerOpen]);

  const assignResponsavel = async (member: TeamMember) => {
    setResponsavel(member);
    setPickerOpen(false);
    await supabase.from('briefings').update({ responsavel: member }).eq('id', briefing.id);
  };

  const imageUrl = storageUrl(currentImagePath);
  const hasImage = !!imageUrl && !currentImagePath?.startsWith('data:');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);

    // Validate dimensions
    const dims = FORMAT_DIMENSIONS[briefing.format ?? ''];
    if (dims) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          if (img.width !== dims.w || img.height !== dims.h) {
            setUploadError(`Tamanho incorreto. ${briefing.format} precisa ser ${dims.w}×${dims.h}px (enviado: ${img.width}×${img.height}px)`);
            setUploading(false);
          }
          URL.revokeObjectURL(url);
          resolve();
        };
        img.src = url;
      });
      if (uploadError !== null || !file) { setUploading(false); return; }
    }

    const path = `uploads/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
    if (error) { setUploadError('Erro no upload. Tente novamente.'); setUploading(false); return; }

    await supabase.from('briefings').update({ image: path }).eq('id', briefing.id);
    setCurrentImagePath(path);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const aspectRatio =
    briefing.format === 'Reels' || briefing.format === 'Stories' ? '9 / 16' : '4 / 5';

  return (
    <div className="flex-none w-72 flex flex-col bg-neutral-900 rounded-xl overflow-hidden shadow-lg">
      {/* Visual header — correct aspect ratio, full image visible */}
      <div
        className="relative shrink-0 flex flex-col justify-between p-3 overflow-hidden cursor-pointer"
        style={{
          aspectRatio,
          background: color,
          backgroundImage: hasImage ? `url(${imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onMouseEnter={() => setHeaderHover(true)}
        onMouseLeave={() => { setHeaderHover(false); setUploadError(null); }}
      >
        {hasImage && <div className="absolute inset-0 bg-black/30" />}

        {/* Upload overlay on hover */}
        {headerHover && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-20 transition-opacity">
            {uploading ? (
              <div className="text-white text-xs flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Enviando…
              </div>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 text-white hover:text-white/80 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-medium">
                    {hasImage ? 'Trocar imagem' : 'Adicionar imagem'}
                  </span>
                  {briefing.format && FORMAT_DIMENSIONS[briefing.format] && (
                    <span className="text-[10px] text-white/50">
                      {FORMAT_DIMENSIONS[briefing.format].w}×{FORMAT_DIMENSIONS[briefing.format].h}px
                    </span>
                  )}
                </button>
                {uploadError && (
                  <p className="mt-2 text-[10px] text-red-400 text-center px-4 leading-tight">{uploadError}</p>
                )}
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Top: format tag + number */}
        <div className="relative flex items-center justify-between z-10">
          {briefing.format && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: fmtStyle.bg, color: fmtStyle.text }}
            >
              {briefing.format}
            </span>
          )}
          <span className="ml-auto text-[10px] font-bold text-white/60">
            #{index + 1}
          </span>
        </div>

        {/* Bottom: title */}
        <div className="relative z-10">
          <p className="text-sm font-semibold text-white leading-snug line-clamp-2 drop-shadow">
            {briefing.nome_demanda}
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 text-xs text-neutral-300">
        {briefing.canal && (
          <Section title="Canal">
            <p>{briefing.canal}</p>
          </Section>
        )}
        {briefing.etapa_funil && (
          <Section title="Etapa do funil">
            <p>{briefing.etapa_funil}</p>
          </Section>
        )}
        {briefing.format === 'Reels' && (
        <Section title="Responsável">
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity w-full text-left"
            >
              {responsavel ? (
                <>
                  <Avatar member={responsavel} size={6} />
                  <span className="text-xs text-neutral-300">{responsavel.nome}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-neutral-600 ml-auto shrink-0">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </>
              ) : (
                <span className="text-xs text-neutral-600 italic flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-600">
                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                  Alocar responsável
                </span>
              )}
            </button>

            {pickerOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-30 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden w-48">
                {TEAM_MEMBERS.map((m) => (
                  <button
                    key={m.nome}
                    onClick={() => assignResponsavel(m)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-neutral-700 transition-colors ${
                      responsavel?.nome === m.nome ? 'bg-neutral-700/60 text-white' : 'text-neutral-300'
                    }`}
                  >
                    <Avatar member={m} size={6} />
                    {m.nome}
                    {responsavel?.nome === m.nome && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-400 ml-auto">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Section>
        )}
        {briefing.conceito && (
          <Section title="Conceito">
            <BriefingEditor briefingId={briefing.id} field="conceito" initialContent={briefing.conceito} />
          </Section>
        )}
        {briefing.data_publicacao && (
          <Section title="Publicação">
            <p>{briefing.data_publicacao}</p>
          </Section>
        )}
        {briefing.descricao_peca && (
          <Section title="Descrição da peça">
            <BriefingEditor briefingId={briefing.id} field="descricao_peca" initialContent={briefing.descricao_peca} />
          </Section>
        )}
        <Section title="Referência de arte / Link">
          <LinkField briefingId={briefing.id} field="referencia_arte" initialValue={briefing.referencia_arte} />
        </Section>
        {briefing.legenda && (
          <Section title="Texto da legenda">
            <BriefingEditor briefingId={briefing.id} field="legenda" initialContent={briefing.legenda} />
          </Section>
        )}
        {briefing.hashtags && briefing.hashtags.length > 0 && (
          <Section title="Hashtags">
            <p className="text-neutral-500">{briefing.hashtags.join(' ')}</p>
          </Section>
        )}
        <div className="py-3 flex items-center justify-between">
          <span className="text-[10px] text-neutral-700">Editado agora</span>
          <button
            onClick={onEdit}
            className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-neutral-800"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}

const ACCENT_PRESETS = [
  'oklch(0.65 0.15 250)',
  'oklch(0.72 0.18 155)',
  'oklch(0.68 0.18 340)',
  'oklch(0.70 0.18 30)',
  'oklch(0.70 0.15 300)',
  'oklch(0.68 0.12 210)',
];

function NewBriefingModal({ onClose, onCreated, clientId }: { onClose: () => void; onCreated: (b: Briefing) => void; clientId: string | null }) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome_demanda: '',
    format: '' as BriefingFormat | '',
    canal: '',
    etapa_funil: '',
    data_publicacao: '',
    conceito: '',
    accent_color: ACCENT_PRESETS[0],
  });
  const [responsavel, setResponsavel] = useState<TeamMember | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_demanda.trim()) return;
    setSaving(true);
    const payload = {
      nome_demanda: form.nome_demanda.trim(),
      format: form.format || null,
      canal: form.canal || null,
      etapa_funil: form.etapa_funil || null,
      data_publicacao: form.data_publicacao || null,
      conceito: form.conceito || null,
      accent_color: form.accent_color,
      responsavel: responsavel ?? null,
      hashtags: [],
      client_id: clientId,
    };
    const { data, error } = await supabase.from('briefings').insert(payload).select().single();
    setSaving(false);
    if (!error && data) onCreated(data as Briefing);
  };

  return (
    <div className="fixed inset-0 z-[200] flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative ml-auto h-full w-[400px] bg-neutral-900 border-l border-neutral-800 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Novo briefing</span>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Nome da demanda *</label>
            <input
              autoFocus
              required
              value={form.nome_demanda}
              onChange={(e) => set('nome_demanda', e.target.value)}
              placeholder="Ex: Stitch Mosseri — Alcance"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
            />
          </div>

          {/* Format */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Formato</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['Feed', 'Carrossel', 'Reels', 'Stories'] as BriefingFormat[]).map((fmt) => {
                const style = FORMAT_STYLES[fmt];
                const active = form.format === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => set('format', active ? '' : fmt)}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      active ? 'border-transparent' : 'border-neutral-700 bg-neutral-800 text-neutral-400'
                    }`}
                    style={active ? { background: style.bg, color: style.text } : {}}
                  >
                    {fmt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Canal + Funil */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Canal</label>
              <input
                value={form.canal}
                onChange={(e) => set('canal', e.target.value)}
                placeholder="Instagram"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Etapa do funil</label>
              <select
                value={form.etapa_funil}
                onChange={(e) => set('etapa_funil', e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 outline-none focus:border-neutral-500 appearance-none"
              >
                <option value="">—</option>
                <option>Topo</option>
                <option>Meio</option>
                <option>Fundo</option>
              </select>
            </div>
          </div>

          {/* Data publicação */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Data de publicação</label>
            <input
              value={form.data_publicacao}
              onChange={(e) => set('data_publicacao', e.target.value)}
              placeholder="Ex: 20/05/2026 · 09h00"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
            />
          </div>

          {/* Conceito */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Conceito</label>
            <textarea
              value={form.conceito}
              onChange={(e) => set('conceito', e.target.value)}
              placeholder="Descreva o conceito do conteúdo..."
              rows={3}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500 resize-none"
            />
          </div>

          {/* Responsável */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Responsável</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                className="flex items-center gap-2 w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-left hover:border-neutral-600 transition-colors"
              >
                {responsavel ? (
                  <>
                    <Avatar member={responsavel} size={5} />
                    <span className="text-neutral-200">{responsavel.nome}</span>
                  </>
                ) : (
                  <span className="text-neutral-500">Alocar responsável</span>
                )}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-neutral-600 ml-auto">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {pickerOpen && (
                <div className="absolute left-0 top-full mt-1 z-10 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden w-full">
                  <button
                    type="button"
                    onClick={() => { setResponsavel(null); setPickerOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-neutral-500 hover:bg-neutral-700 transition-colors"
                  >
                    Nenhum
                  </button>
                  {TEAM_MEMBERS.map((m) => (
                    <button
                      key={m.nome}
                      type="button"
                      onClick={() => { setResponsavel(m); setPickerOpen(false); }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-neutral-700 transition-colors ${responsavel?.nome === m.nome ? 'bg-neutral-700/60 text-white' : 'text-neutral-300'}`}
                    >
                      <Avatar member={m} size={5} />
                      {m.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Accent color */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Cor do card</label>
            <div className="flex gap-2">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('accent_color', c)}
                  className={`w-6 h-6 rounded-full transition-all ${form.accent_color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-neutral-800 flex items-center justify-between">
          <button onClick={onClose} className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={saving || !form.nome_demanda.trim()}
            className="text-xs bg-white text-neutral-900 font-semibold px-4 py-2 rounded-lg disabled:opacity-40 hover:bg-neutral-100 transition-colors flex items-center gap-1.5"
          >
            {saving ? 'Criando…' : 'Criar briefing'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditBriefingModal({ briefing, onClose, onUpdated }: { briefing: Briefing; onClose: () => void; onUpdated: (b: Briefing) => void }) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome_demanda: briefing.nome_demanda,
    format: (briefing.format ?? '') as BriefingFormat | '',
    canal: briefing.canal ?? '',
    etapa_funil: briefing.etapa_funil ?? '',
    data_publicacao: briefing.data_publicacao ?? '',
    conceito: briefing.conceito ?? '',
    descricao_peca: briefing.descricao_peca ?? '',
    referencia_arte: briefing.referencia_arte ?? '',
    legenda: briefing.legenda ?? '',
    hashtags: (briefing.hashtags ?? []).join(', '),
    accent_color: briefing.accent_color ?? ACCENT_PRESETS[0],
  });
  const [responsavel, setResponsavel] = useState<TeamMember | null>(briefing.responsavel ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nome_demanda.trim()) return;
    setSaving(true);
    const hashtags = form.hashtags
      ? form.hashtags.split(',').map((h) => h.trim()).filter(Boolean)
      : [];
    const payload = {
      nome_demanda: form.nome_demanda.trim(),
      format: form.format || null,
      canal: form.canal || null,
      etapa_funil: form.etapa_funil || null,
      data_publicacao: form.data_publicacao || null,
      conceito: form.conceito || null,
      descricao_peca: form.descricao_peca || null,
      referencia_arte: form.referencia_arte || null,
      legenda: form.legenda || null,
      hashtags,
      accent_color: form.accent_color,
      responsavel: responsavel ?? null,
    };
    const { data, error } = await supabase
      .from('briefings').update(payload).eq('id', briefing.id).select().single();
    setSaving(false);
    if (!error && data) onUpdated(data as Briefing);
  };

  return (
    <div className="fixed inset-0 z-[200] flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-[420px] bg-neutral-900 border-l border-neutral-800 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Editar briefing</span>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Nome da demanda *</label>
            <input
              autoFocus
              value={form.nome_demanda}
              onChange={(e) => set('nome_demanda', e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
            />
          </div>

          {/* Format */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Formato</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['Feed', 'Carrossel', 'Reels', 'Stories'] as BriefingFormat[]).map((fmt) => {
                const style = FORMAT_STYLES[fmt];
                const active = form.format === fmt;
                return (
                  <button key={fmt} type="button" onClick={() => set('format', active ? '' : fmt)}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all border ${active ? 'border-transparent' : 'border-neutral-700 bg-neutral-800 text-neutral-400'}`}
                    style={active ? { background: style.bg, color: style.text } : {}}>
                    {fmt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Canal + Funil */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Canal</label>
              <input value={form.canal} onChange={(e) => set('canal', e.target.value)} placeholder="Instagram"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Etapa do funil</label>
              <select value={form.etapa_funil} onChange={(e) => set('etapa_funil', e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 outline-none focus:border-neutral-500 appearance-none">
                <option value="">—</option>
                <option>Topo</option><option>Meio</option><option>Fundo</option>
              </select>
            </div>
          </div>

          {/* Data publicação */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Data de publicação</label>
            <input value={form.data_publicacao} onChange={(e) => set('data_publicacao', e.target.value)} placeholder="Ex: 20/05/2026 · 09h00"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500" />
          </div>

          {/* Conceito */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Conceito</label>
            <textarea value={form.conceito} onChange={(e) => set('conceito', e.target.value)} rows={3}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500 resize-none" />
          </div>

          {/* Descrição da peça */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Descrição da peça</label>
            <textarea value={form.descricao_peca} onChange={(e) => set('descricao_peca', e.target.value)} rows={5}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500 resize-none" />
          </div>

          {/* Referência */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Referência de arte / Link</label>
            <input value={form.referencia_arte} onChange={(e) => set('referencia_arte', e.target.value)} placeholder="https://..."
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500" />
          </div>

          {/* Legenda */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Texto da legenda</label>
            <textarea value={form.legenda} onChange={(e) => set('legenda', e.target.value)} rows={4}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500 resize-none" />
          </div>

          {/* Hashtags */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Hashtags</label>
            <input value={form.hashtags} onChange={(e) => set('hashtags', e.target.value)} placeholder="#socialmedia, #reels"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500" />
          </div>

          {/* Responsável */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Responsável</label>
            <div className="relative">
              <button type="button" onClick={() => setPickerOpen((v) => !v)}
                className="flex items-center gap-2 w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-left hover:border-neutral-600 transition-colors">
                {responsavel ? (<><Avatar member={responsavel} size={5} /><span className="text-neutral-200">{responsavel.nome}</span></>) : <span className="text-neutral-500">Sem responsável</span>}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-neutral-600 ml-auto"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              {pickerOpen && (
                <div className="absolute left-0 top-full mt-1 z-10 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden w-full">
                  <button type="button" onClick={() => { setResponsavel(null); setPickerOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-neutral-500 hover:bg-neutral-700 transition-colors">Nenhum</button>
                  {TEAM_MEMBERS.map((m) => (
                    <button key={m.nome} type="button" onClick={() => { setResponsavel(m); setPickerOpen(false); }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-neutral-700 transition-colors ${responsavel?.nome === m.nome ? 'bg-neutral-700/60 text-white' : 'text-neutral-300'}`}>
                      <Avatar member={m} size={5} />{m.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cor */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Cor do card</label>
            <div className="flex gap-2">
              {ACCENT_PRESETS.map((c) => (
                <button key={c} type="button" onClick={() => set('accent_color', c)}
                  className={`w-6 h-6 rounded-full transition-all ${form.accent_color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-neutral-800 flex items-center justify-between">
          <button onClick={onClose} className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.nome_demanda.trim()}
            className="text-xs bg-white text-neutral-900 font-semibold px-5 py-2 rounded-lg disabled:opacity-40 hover:bg-neutral-100 transition-colors">
            {saving ? 'Salvando…' : 'Ok'}
          </button>
        </div>
      </div>
    </div>
  );
}

type ClientTab = 'briefings' | 'uikit';

export function BriefingsView({
  briefings: initialBriefings,
  clients,
  activeClientId,
}: {
  briefings: Briefing[];
  clients: Client[];
  activeClientId: string | null;
}) {
  const router = useRouter();
  const [briefings, setBriefings] = useState(initialBriefings);
  const [activeFormat, setActiveFormat] = useState<BriefingFormat | 'Todos'>('Todos');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBriefing, setEditingBriefing] = useState<Briefing | null>(null);
  const [clientTab, setClientTab] = useState<ClientTab>('briefings');

  const activeClient = clients.find((c) => c.id === activeClientId) ?? null;

  const handleCreated = (b: Briefing) => {
    setBriefings((prev) => [b, ...prev]);
    setModalOpen(false);
  };

  const handleUpdated = (updated: Briefing) => {
    setBriefings((prev) => prev.map((b) => b.id === updated.id ? updated : b));
    setEditingBriefing(null);
  };

  const formatCounts = briefings.reduce<Record<string, number>>((acc, b) => {
    if (b.format) acc[b.format] = (acc[b.format] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = briefings
    .filter((b) => activeFormat === 'Todos' || b.format === activeFormat)
    .filter(
      (b) =>
        !search ||
        b.nome_demanda.toLowerCase().includes(search.toLowerCase()) ||
        (b.conceito ?? '').toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <div className="flex flex-col h-screen min-h-0 bg-neutral-950">
      {/* Top bar */}
      <nav className="shrink-0 bg-neutral-900 border-b border-neutral-800 px-5 h-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-bold text-white tracking-tight shrink-0">
            myplatform
          </Link>

          {/* Client switcher */}
          {clients.length > 0 && (
            <div className="flex items-center gap-0.5">
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/briefings?client=${c.id}`)}
                  className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                    c.id === activeClientId
                      ? 'bg-neutral-800 text-white font-medium'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div className="w-px h-4 bg-neutral-700" />

          <div className="flex items-center gap-0.5">
            <Link href="/" className="text-xs px-3 py-1.5 rounded-md text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors">
              Refs
            </Link>
            <Link href="/collections" className="text-xs px-3 py-1.5 rounded-md text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors">
              Collections
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {clientTab === 'briefings' && (
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">#</span>
              <input
                type="text"
                placeholder="Buscar briefings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-6 pr-3 py-1.5 text-xs bg-neutral-800 border border-neutral-700 text-neutral-200 placeholder-neutral-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-500 w-44"
              />
            </div>
          )}
          {clientTab === 'briefings' && (
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs bg-white text-neutral-900 font-medium px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors whitespace-nowrap"
            >
              + Novo briefing
            </button>
          )}
          <form action="/logout" method="post">
            <button type="submit" className="text-xs text-neutral-500 hover:text-neutral-300 px-2 transition-colors">
              Sair
            </button>
          </form>
        </div>
      </nav>

      {/* Sub-header: client name + inner tabs + format filter */}
      <header className="shrink-0 bg-neutral-900 border-b border-neutral-800 px-6 pt-4 pb-0">
        <div className="mb-3 flex items-baseline gap-3">
          <h1 className="text-base font-semibold text-white">
            {activeClient?.name ?? 'Briefings'}
          </h1>
          {activeClient && (
            <p className="text-xs text-neutral-500">{briefings.length} briefings</p>
          )}
        </div>

        {/* Inner client tabs: Briefings | UI Kit */}
        <div className="flex gap-0 mb-0">
          <button
            onClick={() => setClientTab('briefings')}
            className={`px-3 py-1.5 text-xs border-b-2 transition-colors -mb-px ${
              clientTab === 'briefings'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Briefings
          </button>
          <button
            onClick={() => setClientTab('uikit')}
            className={`px-3 py-1.5 text-xs border-b-2 transition-colors -mb-px ${
              clientTab === 'uikit'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            UI Kit
          </button>

          {clientTab === 'briefings' && (
            <>
              <div className="w-px h-4 bg-neutral-700 self-center mx-2" />
              {FORMAT_TABS.map((tab) => {
                const count = tab === 'Todos' ? briefings.length : (formatCounts[tab] ?? 0);
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveFormat(tab)}
                    className={`px-3 py-1.5 text-xs border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                      activeFormat === tab
                        ? 'border-white text-white font-semibold'
                        : 'border-transparent text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {tab}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeFormat === tab ? 'bg-white text-neutral-900' : 'bg-neutral-800 text-neutral-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </header>

      {/* Content area */}
      {clientTab === 'briefings' ? (
        <div className="flex-1 min-h-0 flex overflow-x-auto gap-5 px-6 py-5 items-start">
          {filtered.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-sm text-neutral-600">
              Nenhum briefing{activeFormat !== 'Todos' ? ` em ${activeFormat}` : ''} ainda.
            </div>
          )}
          {filtered.map((b, i) => (
            <BriefingCard key={b.id + '_' + b.updated_at} briefing={b} index={i} onEdit={() => setEditingBriefing(b)} />
          ))}

          {/* Add briefing card */}
          <button
            onClick={() => setModalOpen(true)}
            className="flex-none w-72 min-h-[480px] rounded-xl border border-dashed border-neutral-700 flex flex-col items-center justify-center gap-3 group transition-all duration-300 hover:border-green-500/50 hover:bg-green-500/[0.04] cursor-pointer"
          >
            <span className="text-3xl font-light text-neutral-600 group-hover:text-green-500 transition-colors duration-300">+</span>
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-600 group-hover:text-green-400 transition-colors duration-300">Novo briefing</p>
              <p className="text-xs text-neutral-700 mt-0.5 group-hover:text-neutral-500 transition-colors duration-300">Criar do zero</p>
            </div>
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-8">
          <div className="max-w-2xl">
            <p className="text-xs text-neutral-500 mb-6">UI Kit de <span className="text-white">{activeClient?.name}</span></p>
            <div className="flex flex-col gap-6">
              {/* Colors placeholder */}
              <div>
                <p className="text-[9px] uppercase tracking-widest text-neutral-600 font-semibold mb-3">Cores</p>
                <div className="flex gap-3">
                  {['#111111', '#FFFFFF', '#F5F5F5', '#E5E5E5'].map((c) => (
                    <div key={c} className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-lg border border-neutral-800" style={{ background: c }} />
                      <span className="text-[9px] text-neutral-600 font-mono">{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Typography placeholder */}
              <div>
                <p className="text-[9px] uppercase tracking-widest text-neutral-600 font-semibold mb-3">Tipografia</p>
                <div className="space-y-2 text-neutral-400">
                  <p className="text-2xl font-bold text-white">Título principal</p>
                  <p className="text-base font-medium">Subtítulo</p>
                  <p className="text-sm">Corpo do texto</p>
                  <p className="text-xs text-neutral-500">Legenda / auxiliar</p>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-800">
                <p className="text-xs text-neutral-600">Em breve: upload de assets, guia de voz e componentes visuais.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dock briefings={briefings} />

      {modalOpen && <NewBriefingModal onClose={() => setModalOpen(false)} onCreated={handleCreated} clientId={activeClientId} />}
      {editingBriefing && <EditBriefingModal briefing={editingBriefing} onClose={() => setEditingBriefing(null)} onUpdated={handleUpdated} />}
    </div>
  );
}
