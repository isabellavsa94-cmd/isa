import Link from 'next/link';
import type { RefWithCollection } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function hostname(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function RefCard({ item }: { item: RefWithCollection }) {
  const host = hostname(item.url);
  const preview = item.notes ?? item.content?.slice(0, 160);

  return (
    <Link
      href={`/ref/${item.id}`}
      className="block bg-white border border-neutral-200 rounded-lg p-4 hover:border-neutral-400 transition"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-medium text-sm leading-snug line-clamp-2">
          {item.title ?? item.url ?? 'Sem título'}
        </h3>
        <span className="text-[10px] text-neutral-400 shrink-0">
          {formatDate(item.created_at)}
        </span>
      </div>

      {host && (
        <p className="text-xs text-neutral-500 mb-2 truncate">{host}</p>
      )}

      {preview && (
        <p className="text-xs text-neutral-600 line-clamp-2 mb-3">{preview}</p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {item.collections?.name && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">
            {item.collections.name}
          </span>
        )}
        {item.tags.map((t) => (
          <span
            key={t}
            className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700"
          >
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}
