'use client';

import { useState } from 'react';
import type { Briefing, BriefingFormat } from '@/lib/types';

const FORMAT_TABS: Array<BriefingFormat | 'Todos'> = ['Todos', 'Feed', 'Carrossel', 'Reels', 'Stories'];

const FORMAT_COLORS: Record<string, string> = {
  Feed: 'bg-blue-100 text-blue-700',
  Carrossel: 'bg-violet-100 text-violet-700',
  Reels: 'bg-rose-100 text-rose-700',
  Stories: 'bg-amber-100 text-amber-700',
};

function BriefingCard({
  briefing,
  selected,
  onClick,
}: {
  briefing: Briefing;
  selected: boolean;
  onClick: () => void;
}) {
  const color = briefing.accent_color ?? 'oklch(0.7 0.1 250)';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border overflow-hidden transition-all ${
        selected
          ? 'border-neutral-900 shadow-md'
          : 'border-neutral-200 hover:border-neutral-400 hover:shadow-sm'
      } bg-white`}
    >
      <div className="h-1.5 w-full" style={{ background: color }} />
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          {briefing.format && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                FORMAT_COLORS[briefing.format] ?? 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {briefing.format}
            </span>
          )}
          {briefing.canal && (
            <span className="text-[10px] text-neutral-400">{briefing.canal}</span>
          )}
        </div>

        <p className="text-sm font-medium text-neutral-900 leading-snug line-clamp-2">
          {briefing.nome_demanda}
        </p>

        {briefing.data_publicacao && (
          <p className="text-[11px] text-neutral-400">{briefing.data_publicacao}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          {briefing.etapa_funil && (
            <span className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
              {briefing.etapa_funil}
            </span>
          )}
          <span className="text-[11px] text-neutral-400 ml-auto">
            {briefing.legenda ? '✓ legenda' : '— sem legenda'}
          </span>
        </div>
      </div>
    </button>
  );
}

function BriefingDetail({ briefing }: { briefing: Briefing }) {
  const color = briefing.accent_color ?? 'oklch(0.7 0.1 250)';

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="h-1 w-full shrink-0" style={{ background: color }} />
      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {briefing.format && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                  FORMAT_COLORS[briefing.format] ?? 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {briefing.format}
              </span>
            )}
            {briefing.canal && (
              <span className="text-xs text-neutral-400">{briefing.canal}</span>
            )}
            {briefing.etapa_funil && (
              <span className="text-xs text-neutral-400">· {briefing.etapa_funil}</span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-neutral-900 leading-snug">
            {briefing.nome_demanda}
          </h2>
          {briefing.data_publicacao && (
            <p className="text-xs text-neutral-400 mt-1">{briefing.data_publicacao}</p>
          )}
        </div>

        {briefing.conceito && (
          <Section title="Conceito">
            <p className="text-sm text-neutral-700 leading-relaxed">{briefing.conceito}</p>
          </Section>
        )}

        {briefing.descricao_peca && (
          <Section title="Descrição da peça">
            <pre className="text-xs text-neutral-700 whitespace-pre-wrap font-sans leading-relaxed">
              {briefing.descricao_peca}
            </pre>
          </Section>
        )}

        {briefing.referencia_arte && (
          <Section title="Referência de arte">
            <p className="text-sm text-neutral-700 leading-relaxed">{briefing.referencia_arte}</p>
          </Section>
        )}

        {briefing.legenda && (
          <Section title="Legenda">
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
              {briefing.legenda}
            </p>
          </Section>
        )}

        {briefing.hashtags && briefing.hashtags.length > 0 && (
          <Section title="Hashtags">
            <div className="flex flex-wrap gap-1">
              {briefing.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">{title}</p>
      {children}
    </div>
  );
}

export function BriefingsView({ briefings }: { briefings: Briefing[] }) {
  const [activeFormat, setActiveFormat] = useState<BriefingFormat | 'Todos'>('Todos');
  const [selectedId, setSelectedId] = useState<string | null>(briefings[0]?.id ?? null);

  const filtered =
    activeFormat === 'Todos'
      ? briefings
      : briefings.filter((b) => b.format === activeFormat);

  const selected = briefings.find((b) => b.id === selectedId) ?? null;

  const legendasCount = briefings.filter((b) => b.legenda).length;
  const arteCount = briefings.filter((b) => b.image).length;
  const formatCounts = briefings.reduce<Record<string, number>>((acc, b) => {
    if (b.format) acc[b.format] = (acc[b.format] ?? 0) + 1;
    return acc;
  }, {});
  const topFormat = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  return (
    <div className="flex flex-col flex-1 min-h-0 h-screen">
      {/* Header + filter tabs */}
      <header className="shrink-0 border-b border-neutral-200 bg-white px-6 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-base font-semibold text-neutral-900">Briefings de conteúdo</h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              {briefings.length} briefing{briefings.length !== 1 ? 's' : ''}
            </p>
          </div>
          <a
            href="/briefings/new"
            className="text-sm bg-neutral-900 text-white px-3 py-1.5 rounded-lg hover:bg-neutral-700 transition-colors"
          >
            + Novo briefing
          </a>
        </div>

        <div className="flex gap-1">
          {FORMAT_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFormat(tab)}
              className={`px-3 py-2 text-sm border-b-2 transition-colors -mb-px ${
                activeFormat === tab
                  ? 'border-neutral-900 text-neutral-900 font-medium'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {tab}
              {tab !== 'Todos' && formatCounts[tab] ? (
                <span className="ml-1.5 text-[10px] text-neutral-400">{formatCounts[tab]}</span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      {/* Main content: card grid + detail panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Card grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-sm text-neutral-400">
              Nenhum briefing em {activeFormat} ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {filtered.map((b) => (
                <BriefingCard
                  key={b.id}
                  briefing={b}
                  selected={b.id === selectedId}
                  onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-96 shrink-0 border-l border-neutral-200 bg-white overflow-hidden flex flex-col">
            <BriefingDetail briefing={selected} />
          </div>
        )}
      </div>

      {/* Stats bar */}
      <footer className="shrink-0 border-t border-neutral-200 bg-white px-6 py-2.5 flex items-center gap-6 text-xs text-neutral-500">
        <span>
          <span className="font-semibold text-neutral-900">{briefings.length}</span> briefings
        </span>
        <span>
          <span className="font-semibold text-neutral-900">{legendasCount}</span> legendas prontas
        </span>
        <span>
          <span className="font-semibold text-neutral-900">{arteCount}</span> arte definida
        </span>
        <span>
          formato top:{' '}
          <span className="font-semibold text-neutral-900">{topFormat}</span>
        </span>
      </footer>
    </div>
  );
}
