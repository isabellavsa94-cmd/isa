import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/Sidebar';
import { SearchBar } from '@/components/SearchBar';
import { RefCard } from '@/components/RefCard';
import type { RefWithCollection } from '@/lib/types';

type SearchParams = Promise<{ collection?: string; tag?: string; q?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { collection, tag, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('refs')
    .select('*, collections(name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (collection) {
    const { data: col } = await supabase
      .from('collections')
      .select('id')
      .eq('name', collection)
      .maybeSingle();
    if (col) query = query.eq('collection_id', col.id);
  }

  if (tag) query = query.contains('tags', [tag]);

  if (q) {
    const pattern = `%${q}%`;
    query = query.or(
      `title.ilike.${pattern},content.ilike.${pattern},notes.ilike.${pattern}`,
    );
  }

  const { data } = await query;
  const refs = (data ?? []) as RefWithCollection[];

  return (
    <div className="flex">
      <Sidebar activeCollection={collection} />

      <main className="flex-1 min-h-screen">
        <header className="sticky top-0 z-10 bg-neutral-50/80 backdrop-blur border-b border-neutral-200 px-6 py-3 flex items-center gap-3">
          <SearchBar />
          {tag && (
            <a
              href="/"
              className="text-xs text-neutral-600 hover:text-neutral-900 whitespace-nowrap"
            >
              clear tag: {tag} ✕
            </a>
          )}
        </header>

        <div className="p-6">
          <div className="mb-4 text-xs text-neutral-500">
            {refs.length} ref{refs.length === 1 ? '' : 's'}
            {collection && ` em "${collection}"`}
            {q && ` com "${q}"`}
          </div>

          {refs.length === 0 ? (
            <div className="text-center py-20 text-sm text-neutral-500">
              Nada aqui ainda. Use a extensão Chrome ou{' '}
              <a href="/new" className="text-neutral-900 underline">
                crie manualmente
              </a>
              .
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {refs.map((r) => (
                <RefCard key={r.id} item={r} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
