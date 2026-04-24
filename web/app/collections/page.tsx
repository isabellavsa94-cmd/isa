import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Collection } from '@/lib/types';
import { CollectionsList } from './list';

export default async function CollectionsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('collections').select('*').order('name');
  const collections = (data ?? []) as Collection[];

  const counts = new Map<string, number>();
  for (const c of collections) {
    const { count } = await supabase
      .from('refs')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', c.id);
    counts.set(c.id, count ?? 0);
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-900">
            ← Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-lg font-semibold mb-4">Collections</h1>
        <CollectionsList
          collections={collections.map((c) => ({ ...c, count: counts.get(c.id) ?? 0 }))}
        />
      </main>
    </div>
  );
}
