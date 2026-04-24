import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Collection, Ref } from '@/lib/types';
import { EditForm } from './edit-form';

export default async function RefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [refRes, colsRes] = await Promise.all([
    supabase.from('refs').select('*').eq('id', id).maybeSingle(),
    supabase.from('collections').select('*').order('name'),
  ]);

  if (!refRes.data) notFound();

  const item = refRes.data as Ref;
  const collections = (colsRes.data ?? []) as Collection[];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="text-xs text-neutral-500 hover:text-neutral-900"
          >
            ← Voltar
          </Link>
          <span className="text-xs text-neutral-400">
            {new Date(item.created_at).toLocaleString('pt-BR')}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <EditForm item={item} collections={collections} />
      </main>
    </div>
  );
}
