'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { Briefing, BriefingFormat } from '@/lib/types';
import { BriefingEditor } from './BriefingEditor';
import { createClient } from '@/lib/supabase/client';
import { Dock } from './Dock';

const SUPABASE_URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

type TeamMember = { nome: string; foto: string | null };

const TEAM_MEMBERS: TeamMember[] = [
  { nome: 'Renan Caixeiro', foto: 'uploads/pasted-1777003256892-0.png' },
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold mb-0.5">
      {children}
    </p>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-neutral-800 last:border-0">
      <Label>{title}</Label>
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

function BriefingCard({ briefing, index }: { briefing: Briefing; index: number }) {
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

  return (
    <div className="flex-none w-72 flex flex-col bg-neutral-900 rounded-xl overflow-hidden shadow-lg">
      {/* Visual header */}
      <div
        className="relative h-52 shrink-0 flex flex-col justify-between p-3 overflow-hidden cursor-pointer"
        style={{
          background: hasImage ? undefined : color,
          backgroundImage: hasImage ? `url(${imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onMouseEnter={() => setHeaderHover(true)}
        onMouseLeave={() => { setHeaderHover(false); setUploadError(null); }}
      >
        {hasImage && <div className="absolute inset-0 bg-black/40" />}

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
        {briefing.referencia_arte && (
          <Section title="Referência de arte">
            <BriefingEditor briefingId={briefing.id} field="referencia_arte" initialContent={briefing.referencia_arte} />
          </Section>
        )}
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
        <div className="py-3 text-[10px] text-neutral-600">Editado agora</div>
      </div>
    </div>
  );
}

export function BriefingsView({ briefings }: { briefings: Briefing[] }) {
  const [activeFormat, setActiveFormat] = useState<BriefingFormat | 'Todos'>('Todos');
  const [search, setSearch] = useState('');

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

  const legendasCount = briefings.filter((b) => b.legenda).length;
  const arteCount = briefings.filter((b) => b.image && !b.image.startsWith('data:')).length;
  const topFormat = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0] ?? null;

  return (
    <div className="flex flex-col h-screen min-h-0 bg-neutral-950">
      {/* Top bar */}
      <nav className="shrink-0 bg-neutral-900 border-b border-neutral-800 px-5 h-12 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-bold text-white tracking-tight">
            myplatform
          </Link>
          <div className="flex items-center gap-0.5">
            <Link
              href="/briefings"
              className="text-xs font-medium px-3 py-1.5 rounded-md bg-neutral-800 text-white flex items-center gap-1.5"
            >
              Briefings
              <span className="text-[10px] text-neutral-400">{briefings.length}</span>
            </Link>
            <Link
              href="/"
              className="text-xs px-3 py-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Refs
            </Link>
            <Link
              href="/collections"
              className="text-xs px-3 py-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Collections
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          <a
            href="/briefings/new"
            className="text-xs bg-white text-neutral-900 font-medium px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors whitespace-nowrap"
          >
            + Novo briefing
          </a>
          <form action="/logout" method="post">
            <button type="submit" className="text-xs text-neutral-500 hover:text-neutral-300 px-2 transition-colors">
              Sair
            </button>
          </form>
        </div>
      </nav>

      {/* Sub-header: title + filter tabs */}
      <header className="shrink-0 bg-neutral-900 border-b border-neutral-800 px-6 pt-4 pb-0">
        <div className="mb-3">
          <h1 className="text-base font-semibold text-white">Briefings de conteúdo</h1>
          <p className="text-xs text-neutral-500 mt-0.5">{briefings.length} no workspace</p>
        </div>

        <div className="flex gap-0">
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
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeFormat === tab
                      ? 'bg-white text-neutral-900'
                      : 'bg-neutral-800 text-neutral-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Card columns */}
      <div className="flex-1 min-h-0 flex overflow-x-auto overflow-y-hidden gap-3 px-4 py-4">
        {filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-neutral-600">
            Nenhum briefing{activeFormat !== 'Todos' ? ` em ${activeFormat}` : ''} ainda.
          </div>
        ) : (
          filtered.map((b, i) => (
            <BriefingCard key={b.id} briefing={b} index={i} />
          ))
        )}
      </div>

      <Dock briefings={briefings} />
    </div>
  );
}
