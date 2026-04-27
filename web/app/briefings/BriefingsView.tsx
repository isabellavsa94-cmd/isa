'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Briefing, BriefingFormat, Client } from '@/lib/types';
import { CLIENT_UIKITS } from '@/lib/uikit';
import { ThemeToggle } from '@/app/ThemeToggle';
import { BriefingEditor } from './BriefingEditor';
import { createClient } from '@/lib/supabase/client';
import { Dock } from './Dock';

const SUPABASE_URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

type TeamMember = { nome: string; foto: string | null };

const CLIENT_TEAM_MEMBERS: Record<string, TeamMember[]> = {
  'reportei-flux': [
    { nome: 'Renan Caixeiro', foto: 'uploads/renan-caixeiro.jpeg' },
    { nome: 'Livia',          foto: null },
  ],
};

const FORMAT_TABS: Array<BriefingFormat | 'Todos'> = ['Todos', 'Feed', 'Carrossel', 'Reels', 'Stories'];

const PT_MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function parseMonthKey(dateStr: string | null): string {
  if (!dateStr) return 'sem-data';
  const match = dateStr.match(/\d{2}\/(\d{2})(?:\/(\d{4}))?/);
  if (!match) return 'sem-data';
  const year = match[2] ?? new Date().getFullYear().toString();
  return `${year}-${match[1]}`;
}

function monthKeyLabel(key: string): string {
  if (key === 'sem-data') return 'Sem data';
  const [year, month] = key.split('-');
  return `${PT_MONTHS_FULL[parseInt(month) - 1]} ${year}`;
}

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

function ClientLogo({ clientId, clientName, size, interactive = false }: {
  clientId: string;
  clientName: string;
  size: number;
  interactive?: boolean;
}) {
  const supabase = createClient();
  const [hasLogo, setHasLogo] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cacheBust, setCacheBust] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const logoUrl = `${SUPABASE_URL_BASE}/storage/v1/object/public/media/client-logos/${clientId}/logo${cacheBust ? `?v=${cacheBust}` : ''}`;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { error } = await supabase.storage
      .from('media')
      .upload(`client-logos/${clientId}/logo`, file, { upsert: true, contentType: file.type });
    if (!error) { setHasLogo(true); setCacheBust(Date.now().toString()); }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div
      className="relative shrink-0 rounded-md overflow-hidden"
      style={{ width: size, height: size }}
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => interactive && setHovered(false)}
    >
      {hasLogo ? (
        <img src={logoUrl} alt={clientName} className="w-full h-full object-cover" onError={() => setHasLogo(false)} />
      ) : (
        <div className="w-full h-full bg-neutral-700 flex items-center justify-center text-white font-bold uppercase" style={{ fontSize: Math.max(8, size * 0.4) }}>
          {clientName.charAt(0)}
        </div>
      )}

      {interactive && (hovered || uploading) && (
        <button
          onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
          className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer"
        >
          {uploading ? (
            <svg className="animate-spin" width={Math.max(10, size * 0.4)} height={Math.max(10, size * 0.4)} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width={Math.max(10, size * 0.4)} height={Math.max(10, size * 0.4)} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
        </button>
      )}
      {interactive && <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />}
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

type TaggedSegment = { tag: string; label: string; color: string; icon: React.ReactNode; content: string } | { tag: null; content: string };

const TAG_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  visual: {
    label: 'Visual', color: '#60A5FA',
    icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  },
  tela: {
    label: 'Tela', color: '#A78BFA',
    icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>,
  },
  'texto na tela': {
    label: 'Tela', color: '#A78BFA',
    icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>,
  },
  fala: {
    label: 'Fala', color: '#34D399',
    icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
  },
  audio: {
    label: 'Áudio', color: '#FB923C',
    icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>,
  },
};

function normalizeTag(raw: string) {
  return raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function parseTaggedContent(text: string): TaggedSegment[] {
  const TAG_RE = /\[([^\]]+):\]/g;
  const matches: Array<{ index: number; raw: string; key: string }> = [];
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(text)) !== null) {
    matches.push({ index: m.index, raw: m[0], key: m[1] });
  }
  if (matches.length === 0) return [{ tag: null, content: text }];

  const segments: TaggedSegment[] = [];
  if (matches[0].index > 0) {
    const before = text.slice(0, matches[0].index).trim();
    if (before) segments.push({ tag: null, content: before });
  }
  for (let i = 0; i < matches.length; i++) {
    const { raw, key } = matches[i];
    const tagEnd = matches[i].index + raw.length;
    const contentEnd = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const content = text.slice(tagEnd, contentEnd).trim();
    const normalized = normalizeTag(key);
    const meta = TAG_META[normalized];
    if (meta) {
      segments.push({ tag: normalized, label: meta.label, color: meta.color, icon: meta.icon, content });
    } else {
      // Label desconhecido — trata como texto puro junto ao conteúdo
      const prev = segments[segments.length - 1];
      const raw = `[${key}:] ${content}`;
      if (prev && prev.tag === null) {
        segments[segments.length - 1] = { tag: null, content: prev.content + '\n' + raw };
      } else {
        segments.push({ tag: null, content: raw });
      }
    }
  }
  return segments;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hasTaggedContent(text: string) {
  return /\[[^\]]+:\]/.test(stripHtml(text));
}

function renderTaggedHtml(raw: string): string {
  // Convert plain text to HTML so dangerouslySetInnerHTML renders paragraph structure
  let result = raw.trimStart().startsWith('<')
    ? raw
    : raw.split('\n\n').map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

  for (const [rawKey, meta] of Object.entries(TAG_META)) {
    const escaped = rawKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\[${escaped}:\\]`, 'gi');
    const badge = `<span style="display:inline-flex;align-items:center;gap:3px;color:${meta.color};font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:0.06em;margin-right:2px">${meta.label}</span>`;
    result = result.replace(regex, badge);
  }
  return result;
}

function TaggedSection({ briefingId, field, rawHtml }: { briefingId: string; field: string; rawHtml: string }) {
  const [editing, setEditing] = useState(false);
  const [localHtml, setLocalHtml] = useState(rawHtml);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditing(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editing]);

  return (
    <div ref={containerRef} className="py-3 border-b border-neutral-800">
      {editing ? (
        <BriefingEditor briefingId={briefingId} field={field} initialContent={localHtml} onChange={setLocalHtml} />
      ) : (
        <div
          className="cursor-text tagged-display"
          onClick={() => setEditing(true)}
          dangerouslySetInnerHTML={{ __html: renderTaggedHtml(localHtml) }}
        />
      )}
    </div>
  );
}

function TaggedText({ text }: { text: string }) {
  const segments = parseTaggedContent(text);
  return (
    <div>
      {segments.map((seg, i) => {
        if (seg.tag === null) {
          return seg.content ? <p key={i} className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">{seg.content}</p> : null;
        }
        if (!seg.content) return null;
        return (
          <div key={i} className={i > 0 ? 'mt-2.5' : ''}>
            <div className="flex items-center gap-1.5 mb-0.5" style={{ color: seg.color }}>
              {seg.icon}
              <p className="text-[9px] uppercase tracking-widest font-semibold">{seg.label}</p>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">{seg.content}</p>
          </div>
        );
      })}
    </div>
  );
}

const FORMAT_DIMENSIONS: Record<string, { w: number; h: number }> = {
  Stories:   { w: 1080, h: 1920 },
  Reels:     { w: 1080, h: 1920 },
  Feed:      { w: 1080, h: 1350 },
  Carrossel: { w: 1080, h: 1350 },
};

function BriefingCard({ briefing, index, onEdit, clientName, teamMembers, dragging, dragOver, onDragStart, onDragOver, onDrop, onDragEnd }: { briefing: Briefing; index: number; onEdit: () => void; clientName: string; teamMembers: TeamMember[]; dragging?: boolean; dragOver?: boolean; onDragStart?: () => void; onDragOver?: (e: React.DragEvent) => void; onDrop?: () => void; onDragEnd?: () => void }) {
  const supabase = createClient();
  const cardRouter = useRouter();
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

  type HumanizeIssue = { field: string; fieldLabel: string; original: string; suggestion: string; pattern: string; patternName: string };
  const [humanizing, setHumanizing] = useState(false);
  const [humanizeIssues, setHumanizeIssues] = useState<HumanizeIssue[] | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string | null>>({
    legenda: briefing.legenda,
    conceito: briefing.conceito,
    descricao_peca: briefing.descricao_peca,
    reels_fala: briefing.reels_fala,
    reels_tela: briefing.reels_tela,
  });
  const [editorKey, setEditorKey] = useState(0);

  const runHumanizer = async () => {
    setHumanizing(true);
    setHumanizeIssues(null);
    try {
      const res = await fetch('/api/humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fieldValues }),
      });
      const { issues } = await res.json();
      setHumanizeIssues(issues ?? []);
    } finally {
      setHumanizing(false);
    }
  };

  const applyHumanizeIssue = async (issue: HumanizeIssue) => {
    const rawValue = fieldValues[issue.field] ?? '';
    const updated = rawValue.replace(issue.original, issue.suggestion);
    await supabase.from('briefings').update({ [issue.field]: updated }).eq('id', briefing.id);
    setFieldValues((prev) => ({ ...prev, [issue.field]: updated }));
    setEditorKey((k) => k + 1);
    setHumanizeIssues((prev) => prev?.filter((i) => i !== issue) ?? null);
  };

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

  const isBlank = currentImagePath === 'blank';
  const imageUrl = isBlank ? null : storageUrl(currentImagePath);
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

  const aspectRatio = isBlank
    ? '1080 / 400'
    : briefing.format === 'Reels' || briefing.format === 'Stories' ? '9 / 16' : '4 / 5';

  return (
    <div
      className={`flex-none w-72 flex flex-col bg-neutral-900 rounded-xl overflow-hidden shadow-lg cursor-grab active:cursor-grabbing transition-all duration-150 ${dragging ? 'opacity-40 scale-[0.98]' : ''} ${dragOver ? 'ring-2 ring-white/30' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Visual header — correct aspect ratio, full image visible */}
      <div
        className="relative shrink-0 flex flex-col justify-between p-3 overflow-hidden cursor-pointer"
        style={{
          aspectRatio,
          background: isBlank ? '#3d3d3d' : color,
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
                <div className="flex items-center gap-3">
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

                  {(hasImage || isBlank) && (
                    <button
                      onClick={async () => {
                        await supabase.from('briefings').update({ image: null }).eq('id', briefing.id);
                        setCurrentImagePath(null);
                      }}
                      className="flex flex-col items-center gap-1.5 text-white/60 hover:text-white transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </div>
                      <span className="text-[11px] font-medium">Remover</span>
                    </button>
                  )}
                </div>
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
      <div key={editorKey} className="flex-1 overflow-y-auto px-3 text-xs text-neutral-300">
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
        {briefing.format === 'Reels' && responsavel !== null && (
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
                {teamMembers.map((m) => (
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
        {fieldValues.conceito && (
          hasTaggedContent(fieldValues.conceito) ? (
            <TaggedSection briefingId={briefing.id} field="conceito" rawHtml={fieldValues.conceito} />
          ) : (
            <Section title="Conceito">
              <BriefingEditor briefingId={briefing.id} field="conceito" initialContent={fieldValues.conceito} />
            </Section>
          )
        )}
        {briefing.data_publicacao && (
          <Section title="Publicação">
            <p>{briefing.data_publicacao}</p>
          </Section>
        )}
        {fieldValues.descricao_peca && (
          hasTaggedContent(fieldValues.descricao_peca) ? (
            <TaggedSection briefingId={briefing.id} field="descricao_peca" rawHtml={fieldValues.descricao_peca} />
          ) : (
            <Section title="Descrição da peça">
              <BriefingEditor briefingId={briefing.id} field="descricao_peca" initialContent={fieldValues.descricao_peca} />
            </Section>
          )
        )}
        <Section title="Referência de arte / Link">
          <LinkField briefingId={briefing.id} field="referencia_arte" initialValue={briefing.referencia_arte} />
        </Section>
        {fieldValues.legenda && (
          <Section title="Texto da legenda">
            <BriefingEditor briefingId={briefing.id} field="legenda" initialContent={fieldValues.legenda} />
          </Section>
        )}
        {briefing.hashtags && briefing.hashtags.length > 0 && (
          <Section title="Hashtags">
            <p className="text-neutral-500">{briefing.hashtags.join(' ')}</p>
          </Section>
        )}
        <div className="py-3 flex items-center justify-between">
          <span className="text-[10px] text-neutral-700">Editado agora</span>
          <div className="flex items-center gap-1">
            <button
              onClick={runHumanizer}
              disabled={humanizing}
              title="Humanizar texto"
              className="flex items-center gap-1 text-[10px] text-amber-500 hover:text-amber-400 disabled:opacity-50 transition-colors px-2 py-1 rounded-lg hover:bg-neutral-800"
            >
              {humanizing ? (
                <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M16,2.75c0,2.163-2.82,4.851-4.225,5.978a1.239,1.239,0,0,1-1.55,0C8.82,7.6,6,4.913,6,2.75A2.634,2.634,0,0,1,8.5,0,2.634,2.634,0,0,1,11,2.75,2.634,2.634,0,0,1,13.5,0,2.634,2.634,0,0,1,16,2.75Zm7.338,9.6-7.7,8.409A10,10,0,0,1,8.262,24H4a4,4,0,0,1-4-4V15a4,4,0,0,1,4-4h7.787a2.218,2.218,0,0,1,2.164,2.685,2.28,2.28,0,0,1-1.94,1.732L7.848,16A1,1,0,0,0,7,17.131H7a1,1,0,0,0,1.131.849l4.252-.6A4.234,4.234,0,0,0,16,13.213a4.081,4.081,0,0,0-.065-.638l3.542-3.737a2.606,2.606,0,0,1,3.671-.157A2.616,2.616,0,0,1,23.338,12.345Z"/></svg>
              )}
            </button>
            <button
              onClick={() => {
                localStorage.setItem('myplatform_active_briefing', JSON.stringify({ ...briefing, client_name: clientName }));
                cardRouter.push('/editor');
              }}
              className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors px-2 py-1 rounded-lg hover:bg-neutral-800"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Gerar arte
            </button>
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

      {/* Humanizer results modal */}
      {humanizeIssues !== null && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setHumanizeIssues(null)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-[480px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500"><path d="M16,2.75c0,2.163-2.82,4.851-4.225,5.978a1.239,1.239,0,0,1-1.55,0C8.82,7.6,6,4.913,6,2.75A2.634,2.634,0,0,1,8.5,0,2.634,2.634,0,0,1,11,2.75,2.634,2.634,0,0,1,13.5,0,2.634,2.634,0,0,1,16,2.75Zm7.338,9.6-7.7,8.409A10,10,0,0,1,8.262,24H4a4,4,0,0,1-4-4V15a4,4,0,0,1,4-4h7.787a2.218,2.218,0,0,1,2.164,2.685,2.28,2.28,0,0,1-1.94,1.732L7.848,16A1,1,0,0,0,7,17.131H7a1,1,0,0,0,1.131.849l4.252-.6A4.234,4.234,0,0,0,16,13.213a4.081,4.081,0,0,0-.065-.638l3.542-3.737a2.606,2.606,0,0,1,3.671-.157A2.616,2.616,0,0,1,23.338,12.345Z"/></svg>
                <span className="text-sm font-semibold text-white">Humanizar — {briefing.nome_demanda}</span>
              </div>
              <button onClick={() => setHumanizeIssues(null)} className="text-neutral-500 hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {humanizeIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-green-500"><polyline points="20 6 9 17 4 12"/></svg>
                  <p className="text-sm text-neutral-400">Nenhum padrão de IA detectado.</p>
                </div>
              ) : humanizeIssues.map((issue, i) => (
                <div key={i} className="bg-neutral-800 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{issue.fieldLabel} · {issue.pattern} {issue.patternName}</span>
                    <button onClick={() => setHumanizeIssues((prev) => prev?.filter((_, j) => j !== i) ?? null)} className="text-neutral-600 hover:text-neutral-400 transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-red-400/80 line-through leading-relaxed">{issue.original}</p>
                    <p className="text-xs text-green-400 leading-relaxed">{issue.suggestion}</p>
                  </div>
                  <button
                    onClick={() => applyHumanizeIssue(issue)}
                    className="self-end text-[11px] font-semibold bg-white text-neutral-900 px-3 py-1 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              ))}
            </div>

            {humanizeIssues.length > 0 && (
              <div className="px-5 py-3 border-t border-neutral-800 shrink-0 flex justify-between items-center">
                <span className="text-[10px] text-neutral-600">{humanizeIssues.length} {humanizeIssues.length === 1 ? 'sugestão' : 'sugestões'}</span>
                <button onClick={() => setHumanizeIssues(null)} className="text-[11px] text-neutral-500 hover:text-white transition-colors">Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}
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

function NewBriefingModal({ onClose, onCreated, clientId, teamMembers }: { onClose: () => void; onCreated: (b: Briefing) => void; clientId: string | null; teamMembers: TeamMember[] }) {
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

          {/* Responsável — só exibe se o cliente tiver responsáveis configurados */}
          {teamMembers.length > 0 && <div className="space-y-1.5">
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
                  {teamMembers.map((m) => (
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
          </div>}

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

function EditBriefingModal({ briefing, onClose, onUpdated, teamMembers }: { briefing: Briefing; onClose: () => void; onUpdated: (b: Briefing) => void; teamMembers: TeamMember[] }) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome_demanda: briefing.nome_demanda,
    format: (briefing.format ?? '') as BriefingFormat | '',
    canal: briefing.canal ?? '',
    etapa_funil: briefing.etapa_funil ?? '',
    data_publicacao: briefing.data_publicacao ?? '',
    conceito: stripHtml(briefing.conceito ?? ''),
    descricao_peca: stripHtml(briefing.descricao_peca ?? ''),
    referencia_arte: briefing.referencia_arte ?? '',
    legenda: stripHtml(briefing.legenda ?? ''),
    hashtags: (briefing.hashtags ?? []).join(', '),
    accent_color: briefing.accent_color ?? ACCENT_PRESETS[0],
  });
  const [responsavel, setResponsavel] = useState<TeamMember | null>(briefing.responsavel ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [noImage, setNoImage] = useState(briefing.image === 'blank');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nome_demanda.trim()) return;
    setSaving(true);
    const hashtags = form.hashtags
      ? form.hashtags.split(',').map((h) => h.trim()).filter(Boolean)
      : [];
    const imagePayload = noImage
      ? { image: 'blank' }
      : briefing.image === 'blank'
      ? { image: null }
      : {};
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
      ...imagePayload,
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

          {/* Responsável — só exibe se o cliente tiver responsáveis configurados */}
          {teamMembers.length > 0 && <div className="space-y-1.5">
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
                  {teamMembers.map((m) => (
                    <button key={m.nome} type="button" onClick={() => { setResponsavel(m); setPickerOpen(false); }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-neutral-700 transition-colors ${responsavel?.nome === m.nome ? 'bg-neutral-700/60 text-white' : 'text-neutral-300'}`}>
                      <Avatar member={m} size={5} />{m.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>}

          {/* Sem foto */}
          <button
            type="button"
            onClick={() => setNoImage((v) => !v)}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border transition-colors text-left ${
              noImage
                ? 'border-neutral-500 bg-neutral-800 text-white'
                : 'border-neutral-700 bg-neutral-800/50 text-neutral-400 hover:border-neutral-600'
            }`}
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${noImage ? 'bg-white border-white' : 'border-neutral-600'}`}>
              {noImage && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-xs font-medium">Sem foto de capa</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">Exibe um espaço em branco (1080×400px) no lugar da imagem</p>
            </div>
          </button>

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

function nextMonthKey(key: string): string {
  if (key === 'sem-data') return key;
  const [year, month] = key.split('-').map(Number);
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return `${next.y}-${String(next.m).padStart(2, '0')}`;
}

function bumpMonth(dateStr: string | null): string | null {
  if (!dateStr) return dateStr;
  // Replace the month portion in DD/MM/YYYY or DD/MM
  return dateStr.replace(/(\d{2})\/(\d{2})(\/\d{4})?/, (_, d, m, y) => {
    const month = parseInt(m);
    const nextM = month === 12 ? 1 : month + 1;
    const nextY = month === 12 && y ? `/${parseInt(y.slice(1)) + 1}` : y ?? '';
    return `${d}/${String(nextM).padStart(2, '0')}${nextY}`;
  });
}

function MonthDropdown({ availableMonths, activeMonth, onChange, briefings, clientId, onDuplicated }: {
  availableMonths: string[];
  activeMonth: string;
  onChange: (m: string) => void;
  briefings: Briefing[];
  clientId: string | null;
  onDuplicated: (newBriefings: Briefing[]) => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleDuplicate = async () => {
    if (activeMonth === 'todos' || activeMonth === 'sem-data') return;
    const target = nextMonthKey(activeMonth);
    const targetLabel = monthKeyLabel(target);
    if (!confirm(`Duplicar todos os briefings de ${monthKeyLabel(activeMonth)} para ${targetLabel}?`)) return;
    setDuplicating(true);
    setOpen(false);

    const monthBriefings = briefings.filter((b) => parseMonthKey(b.data_publicacao) === activeMonth);
    const payloads = monthBriefings.map(({ id, created_at, updated_at, ...rest }) => ({
      ...rest,
      client_id: clientId,
      data_publicacao: bumpMonth(rest.data_publicacao),
      responsavel: null,
      image: null,
    }));

    const { data, error } = await supabase.from('briefings').insert(payloads).select();
    setDuplicating(false);
    if (!error && data) {
      onDuplicated(data as Briefing[]);
      onChange(target);
    }
  };

  const label = activeMonth === 'todos' ? 'Todos os meses' : monthKeyLabel(activeMonth);
  const canDuplicate = activeMonth !== 'todos' && activeMonth !== 'sem-data';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-[11px] font-medium text-neutral-300 hover:border-neutral-500 hover:text-white transition-colors"
      >
        {duplicating ? 'Duplicando…' : label}
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-neutral-500">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden min-w-[180px]">
          {availableMonths.length > 1 && (
            <button
              onClick={() => { onChange('todos'); setOpen(false); }}
              className={`flex items-center justify-between w-full px-3 py-2 text-xs transition-colors hover:bg-neutral-700 ${activeMonth === 'todos' ? 'text-white bg-neutral-700/50' : 'text-neutral-400'}`}
            >
              Todos os meses
              {activeMonth === 'todos' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-400"><polyline points="20 6 9 17 4 12" /></svg>}
            </button>
          )}
          {availableMonths.map((key) => (
            <button
              key={key}
              onClick={() => { onChange(key); setOpen(false); }}
              className={`flex items-center justify-between w-full px-3 py-2 text-xs transition-colors hover:bg-neutral-700 ${activeMonth === key ? 'text-white bg-neutral-700/50' : 'text-neutral-400'}`}
            >
              {monthKeyLabel(key)}
              {activeMonth === key && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-400"><polyline points="20 6 9 17 4 12" /></svg>}
            </button>
          ))}
          {canDuplicate && (
            <>
              <div className="mx-2 my-1 h-px bg-neutral-700" />
              <button
                onClick={handleDuplicate}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Duplicar para {monthKeyLabel(nextMonthKey(activeMonth))}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

type ClientTab = 'briefings' | 'uikit' | 'refs';

type ClientRef = { id: string; title: string | null; media_path: string | null; notes: string | null; created_at: string };

function ClientRefs({ clientId }: { clientId: string | null }) {
  const supabase = createClient();
  const [refs, setRefs] = useState<ClientRef[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!clientId) return;
    supabase.from('refs').select('id,title,media_path,notes,created_at').eq('client_id', clientId).order('created_at', { ascending: false }).then(({ data }) => {
      setRefs((data ?? []) as ClientRef[]);
    });
  }, [clientId]);

  const getUrl = (path: string) =>
    `${SUPABASE_URL_BASE}/storage/v1/object/public/media/${path}`;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clientId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `client-refs/${clientId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('media').upload(path, file);
      if (upErr) throw upErr;
      const { data, error: dbErr } = await supabase.from('refs').insert({
        client_id: clientId,
        type: 'image',
        media_path: path,
        title: title.trim() || file.name,
        tags: [],
        metadata: {},
      }).select('id,title,media_path,notes,created_at').single();
      if (dbErr) throw dbErr;
      setRefs((r) => [data as ClientRef, ...r]);
      setTitle('');
      e.target.value = '';
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (ref: ClientRef) => {
    if (!confirm('Remover referência?')) return;
    if (ref.media_path) await supabase.storage.from('media').remove([ref.media_path]);
    await supabase.from('refs').delete().eq('id', ref.id);
    setRefs((r) => r.filter((x) => x.id !== ref.id));
  };

  if (!clientId) return <div className="flex-1 flex items-center justify-center text-sm text-neutral-600">Selecione um cliente.</div>;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-8">
      <div className="max-w-4xl">
        <div className="flex items-end gap-3 mb-6">
          <div className="flex-1">
            <p className="text-[9px] uppercase tracking-widest text-neutral-600 font-semibold mb-1.5">Título (opcional)</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Post feed roxo com texto"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
            />
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-xs px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 whitespace-nowrap"
          >
            {uploading ? 'Enviando…' : '+ Adicionar peça'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>

        {refs.length === 0 ? (
          <p className="text-xs text-neutral-600">Nenhuma referência ainda. Adicione peças aprovadas para a IA usar como base.</p>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {refs.map((ref) => (
              <div key={ref.id} className="group relative rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
                {ref.media_path && (
                  <img src={getUrl(ref.media_path)} alt={ref.title ?? ''} className="w-full aspect-[4/5] object-cover" />
                )}
                <div className="p-2">
                  <p className="text-[10px] text-neutral-400 truncate">{ref.title ?? 'Sem título'}</p>
                </div>
                <button
                  onClick={() => handleDelete(ref)}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
  const supabase = createClient();
  const [briefings, setBriefings] = useState(initialBriefings);
  const [activeFormat, setActiveFormat] = useState<BriefingFormat | 'Todos'>('Todos');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBriefing, setEditingBriefing] = useState<Briefing | null>(null);
  const [clientTab, setClientTab] = useState<ClientTab>('briefings');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<'number' | 'date'>('number');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const availableMonths = [...new Set(initialBriefings.map((b) => parseMonthKey(b.data_publicacao)))]
    .sort((a, b) => a === 'sem-data' ? 1 : b === 'sem-data' ? -1 : a.localeCompare(b));
  const defaultMonth = availableMonths.find((k) => k !== 'sem-data') ?? 'todos';
  const [activeMonth, setActiveMonth] = useState<string>(availableMonths.length > 0 ? defaultMonth : 'todos');

  useEffect(() => {
    if (!clientDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node))
        setClientDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [clientDropdownOpen]);

  useEffect(() => {
    if (!sortDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node))
        setSortDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sortDropdownOpen]);

  const activeClient = clients.find((c) => c.id === activeClientId) ?? null;

  const handleCreated = (b: Briefing) => {
    setBriefings((prev) => [b, ...prev]);
    setModalOpen(false);
  };

  const handleUpdated = (updated: Briefing) => {
    setBriefings((prev) => prev.map((b) => b.id === updated.id ? updated : b));
    setEditingBriefing(null);
  };

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (id: string) => setDraggedId(id);

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedId) setDragOverId(id);
  };

  const handleDrop = async (targetId: string) => {
    const fromId = draggedId;
    setDraggedId(null);
    setDragOverId(null);
    if (!fromId || fromId === targetId) return;

    const fromIdx = sorted.findIndex((b) => b.id === fromId);
    const toIdx = sorted.findIndex((b) => b.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...sorted];
    const [item] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, item);

    const updated = reordered.map((b, i) => ({ ...b, sort_order: i * 10 }));
    const updatedMap = new Map(updated.map((b) => [b.id, b]));
    setBriefings((prev) => prev.map((b) => updatedMap.get(b.id) ?? b));

    await Promise.all(
      updated.map((b) => supabase.from('briefings').update({ sort_order: b.sort_order }).eq('id', b.id))
    );
  };

  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null); };

  const formatCounts = briefings.reduce<Record<string, number>>((acc, b) => {
    if (b.format) acc[b.format] = (acc[b.format] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = briefings
    .filter((b) => activeMonth === 'todos' || parseMonthKey(b.data_publicacao) === activeMonth)
    .filter((b) => activeFormat === 'Todos' || b.format === activeFormat)
    .filter(
      (b) =>
        !search ||
        b.nome_demanda.toLowerCase().includes(search.toLowerCase()) ||
        (b.conceito ?? '').toLowerCase().includes(search.toLowerCase()),
    );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'number') {
      if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order;
      if (a.sort_order != null) return -1;
      if (b.sort_order != null) return 1;
      const n = (s: string) => parseInt(s.match(/#(\d+)/)?.[1] ?? '9999');
      return n(a.nome_demanda) - n(b.nome_demanda);
    }
    const parseDate = (s: string | null) => {
      if (!s) return 99999;
      const parts = s.replace(/[^0-9/]/g, '').split('/');
      const d = parseInt(parts[0] ?? '0');
      const m = parseInt(parts[1] ?? '0');
      return m * 100 + d;
    };
    return parseDate(a.data_publicacao) - parseDate(b.data_publicacao);
  });

  const downloadMonthPdf = () => {
    const monthBriefings = [...briefings]
      .filter((b) => activeMonth === 'todos' || parseMonthKey(b.data_publicacao) === activeMonth)
      .sort((a, b) => {
        if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order;
        if (a.sort_order != null) return -1;
        if (b.sort_order != null) return 1;
        return 0;
      });

    const clientName = activeClient?.name ?? 'Briefings';
    const monthLabel = activeMonth === 'todos' ? 'Todos os meses' : monthKeyLabel(activeMonth);

    const field = (label: string, value: string | null) => {
      if (!value) return '';
      const clean = stripHtml(value).trim();
      if (!clean) return '';
      return `
        <div class="field">
          <div class="field-label">${label}</div>
          <div class="field-value">${clean.replace(/\n/g, '<br>')}</div>
        </div>`;
    };

    const cards = monthBriefings.map((b, idx) => `
      <div class="card">
        <div class="card-header">
          <span class="card-num">#${idx + 1}</span>
          ${b.format ? `<span class="card-format">${b.format}</span>` : ''}
          ${b.data_publicacao ? `<span class="card-date">${b.data_publicacao}</span>` : ''}
        </div>
        <h2 class="card-title">${b.nome_demanda}</h2>
        ${b.canal || b.etapa_funil ? field('Canal / Funil', [b.canal, b.etapa_funil].filter(Boolean).join(' · ')) : ''}
        ${field('Conceito', b.conceito)}
        ${field('Descrição da peça', b.descricao_peca)}
        ${b.format === 'Reels' ? field('Fala', b.reels_fala) : ''}
        ${b.format === 'Reels' ? field('Tela', b.reels_tela) : ''}
        ${b.format === 'Reels' ? field('Visual', b.reels_visual) : ''}
        ${field('Legenda', b.legenda)}
        ${b.hashtags?.length ? field('Hashtags', b.hashtags.join(' ')) : ''}
        ${b.referencia_arte ? field('Referência', b.referencia_arte) : ''}
      </div>`).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${clientName} — ${monthLabel}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; background: #fff; color: #111; font-size: 12px; }
  .cover { height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 60px; background: #111; color: #fff; page-break-after: always; }
  .cover-client { font-size: 32px; font-weight: 700; margin-bottom: 10px; }
  .cover-month { font-size: 18px; color: #aaa; margin-bottom: 8px; }
  .cover-meta { font-size: 11px; color: #555; }
  .card { padding: 40px 48px; page-break-after: always; border-bottom: 1px solid #eee; }
  .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .card-num { font-size: 11px; font-weight: 700; color: #999; }
  .card-format { font-size: 10px; font-weight: 600; background: #f0f0f0; color: #555; padding: 2px 8px; border-radius: 20px; }
  .card-date { font-size: 10px; color: #aaa; margin-left: auto; }
  .card-title { font-size: 20px; font-weight: 700; color: #111; margin-bottom: 20px; line-height: 1.3; }
  .field { margin-bottom: 16px; }
  .field-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #999; margin-bottom: 4px; }
  .field-value { font-size: 12px; color: #333; line-height: 1.6; white-space: pre-wrap; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .cover { background: #111 !important; color: #fff !important; }
  }
</style>
</head>
<body>
  <div class="cover">
    <div class="cover-client">${clientName}</div>
    <div class="cover-month">${monthLabel}</div>
    <div class="cover-meta">${monthBriefings.length} briefing${monthBriefings.length !== 1 ? 's' : ''} · Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
  </div>
  ${cards}
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) { alert('Permita pop-ups para baixar o PDF.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  return (
    <div className="flex flex-col h-screen min-h-0 bg-neutral-950">
      {/* Top bar */}
      <nav className="shrink-0 bg-neutral-900 border-b border-neutral-800 px-5 h-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-bold text-white tracking-tight shrink-0">
            myplatform
          </Link>
          <ThemeToggle />

          {/* Client switcher */}
          {clients.length > 0 && (
            <div className="relative" ref={clientDropdownRef}>
              <button
                onClick={() => setClientDropdownOpen((v) => !v)}
                className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 text-white text-xs font-medium rounded-lg pl-2.5 pr-2.5 py-1.5 hover:border-neutral-600 transition-colors"
              >
                {activeClient && (
                  <ClientLogo clientId={activeClient.id} clientName={activeClient.name} size={18} />
                )}
                <span>{activeClient?.name}</span>
                <svg className="text-neutral-500 shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {clientDropdownOpen && (
                <div className="absolute top-full mt-1.5 left-0 z-50 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden min-w-[160px]">
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { router.push(`/briefings?client=${c.id}`); setClientDropdownOpen(false); }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors hover:bg-neutral-700 ${c.id === activeClientId ? 'text-white bg-neutral-700/50' : 'text-neutral-300'}`}
                    >
                      <ClientLogo clientId={c.id} clientName={c.name} size={18} />
                      <span className="flex-1 text-left">{c.name}</span>
                      {c.id === activeClientId && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-400 shrink-0">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
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
          {clientTab === 'briefings' && sorted.length > 0 && (
            <button
              onClick={downloadMonthPdf}
              title="Baixar PDF"
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-500 whitespace-nowrap"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              PDF
            </button>
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
        <div className="mb-3 flex items-center gap-3">
          {activeClient && (
            <ClientLogo clientId={activeClient.id} clientName={activeClient.name} size={32} interactive />
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-white">
              {activeClient?.name ?? 'Briefings'}
            </h1>
            {activeClient && (
              <p className="text-xs text-neutral-500">{filtered.length} briefings</p>
            )}
            {clientTab === 'briefings' && availableMonths.length > 0 && (
              <MonthDropdown
                availableMonths={availableMonths}
                activeMonth={activeMonth}
                onChange={setActiveMonth}
                briefings={briefings}
                clientId={activeClientId}
                onDuplicated={(newBriefings) => setBriefings((prev) => [...prev, ...newBriefings])}
              />
            )}
          </div>
        </div>

        {/* Inner client tabs: Briefings | UI Kit */}
        <div className="flex items-center gap-0 mb-0">
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
          <button
            onClick={() => setClientTab('refs')}
            className={`px-3 py-1.5 text-xs border-b-2 transition-colors -mb-px ${
              clientTab === 'refs'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Referências
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

          {clientTab === 'briefings' && (
            <div className="ml-auto relative pb-px" ref={sortDropdownRef}>
              <button
                onClick={() => setSortDropdownOpen((v) => !v)}
                title="Ordenar"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${sortDropdownOpen ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M7 12h10M11 18h2" />
                </svg>
                <span>{sortBy === 'number' ? '#' : 'Data'}</span>
              </button>

              {sortDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-50 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden w-36">
                  {([['number', 'Por número', '#'], ['date', 'Por data', '📅']] as const).map(([val, label, icon]) => (
                    <button
                      key={val}
                      onClick={() => { setSortBy(val); setSortDropdownOpen(false); }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors hover:bg-neutral-700 ${sortBy === val ? 'text-white bg-neutral-700/50' : 'text-neutral-400'}`}
                    >
                      <span className="text-neutral-500 w-4 text-center">{icon}</span>
                      {label}
                      {sortBy === val && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-400 ml-auto">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Content area */}
      {clientTab === 'briefings' ? (
        <div className="flex-1 min-h-0 flex overflow-x-auto gap-5 px-6 py-5 items-start">
          {sorted.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-sm text-neutral-600">
              Nenhum briefing{activeFormat !== 'Todos' ? ` em ${activeFormat}` : ''} ainda.
            </div>
          )}
          {sorted.map((b, i) => (
            <BriefingCard
              key={b.id + '_' + b.updated_at}
              briefing={b}
              index={i}
              onEdit={() => setEditingBriefing(b)}
              clientName={activeClient?.name ?? ''}
              teamMembers={CLIENT_TEAM_MEMBERS[activeClientId ?? ''] ?? []}
              dragging={draggedId === b.id}
              dragOver={dragOverId === b.id && draggedId !== b.id}
              onDragStart={() => handleDragStart(b.id)}
              onDragOver={(e) => handleDragOver(e, b.id)}
              onDrop={() => handleDrop(b.id)}
              onDragEnd={handleDragEnd}
            />
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
      ) : clientTab === 'refs' ? (
        <ClientRefs clientId={activeClientId} />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-8">
          {(() => {
            const uikit = activeClientId ? CLIENT_UIKITS[activeClientId] : null;
            if (!uikit) return (
              <p className="text-xs text-neutral-600">UI Kit não configurado para este cliente.</p>
            );
            return (
              <div className="max-w-3xl flex flex-col gap-8">
                <p className="text-xs text-neutral-500">UI Kit de <span className="text-white">{activeClient?.name}</span></p>

                {/* Paleta de cores */}
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-600 font-semibold mb-3">Paleta de cores</p>
                  <div className="flex flex-wrap gap-3">
                    {uikit.colors.map((c) => (
                      <div key={c.hex} className="flex flex-col items-center gap-1.5">
                        <div className="w-12 h-12 rounded-xl border border-neutral-800" style={{ background: c.hex }} />
                        <span className="text-[9px] text-neutral-500 font-mono">{c.hex}</span>
                        <span className="text-[8px] text-neutral-600">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cores de fundo */}
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-600 font-semibold mb-3">Cores de fundo</p>
                  <div className="flex flex-wrap gap-3">
                    {uikit.backgrounds.map((c) => (
                      <div key={c.hex} className="flex flex-col items-center gap-1.5">
                        <div className="w-12 h-12 rounded-xl border border-neutral-800" style={{ background: c.hex }} />
                        <span className="text-[9px] text-neutral-500 font-mono">{c.hex}</span>
                        <span className="text-[8px] text-neutral-600">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Combinações */}
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-600 font-semibold mb-3">Combinações de cores</p>
                  <div className="flex flex-wrap gap-2">
                    {uikit.colorCombos.map(([c1, c2], i) => (
                      <div key={i} className="w-10 h-10 rounded-lg overflow-hidden border border-neutral-800 flex">
                        <div className="flex-1" style={{ background: c1 }} />
                        <div className="flex-1" style={{ background: c2 }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tipografia */}
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-600 font-semibold mb-3">Tipografia</p>
                  <div className="flex flex-col gap-2">
                    {uikit.typography.map((t) => (
                      <div key={t.role} className="flex items-baseline gap-4">
                        <span className="text-[9px] text-neutral-600 w-20 shrink-0">{t.role}</span>
                        <span className="text-sm text-white font-medium">{t.fontFamily}</span>
                        <span className="text-[9px] text-neutral-600">{t.weight} · {t.sizePx}px</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Elementos gráficos */}
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-600 font-semibold mb-3">Elementos gráficos</p>
                  <div className="grid grid-cols-8 gap-2">
                    {uikit.elementos.map(({ slug, label }) => (
                      <div key={slug} title={label} className="w-12 h-12 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center p-1.5">
                        <img
                          src={`/uikit/reportei-flux/elementos/${slug}.svg`}
                          alt={label}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <Dock briefings={briefings} />

      {modalOpen && <NewBriefingModal onClose={() => setModalOpen(false)} onCreated={handleCreated} clientId={activeClientId} teamMembers={CLIENT_TEAM_MEMBERS[activeClientId ?? ''] ?? []} />}
      {editingBriefing && <EditBriefingModal briefing={editingBriefing} onClose={() => setEditingBriefing(null)} onUpdated={handleUpdated} teamMembers={CLIENT_TEAM_MEMBERS[activeClientId ?? ''] ?? []} />}
    </div>
  );
}
