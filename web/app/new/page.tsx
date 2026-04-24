import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Collection } from '@/lib/types';
import { createRef } from '@/app/actions';

export default async function NewRefPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('collections').select('*').order('name');
  const collections = (data ?? []) as Collection[];

  const inputCls =
    'w-full px-3 py-2 text-sm border border-neutral-300 rounded bg-white outline-none focus:border-neutral-900';

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
        <h1 className="text-lg font-semibold mb-4">Novo ref</h1>
        <form
          action={createRef}
          className="space-y-4 bg-white border border-neutral-200 rounded-lg p-6"
        >
          <div>
            <label className="block text-xs text-neutral-600 mb-1">Título</label>
            <input name="title" required className={inputCls} autoFocus />
          </div>

          <div>
            <label className="block text-xs text-neutral-600 mb-1">URL</label>
            <input name="url" type="url" className={inputCls} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-neutral-600 mb-1">Tipo</label>
              <select name="type" defaultValue="note" className={inputCls}>
                <option value="note">note</option>
                <option value="page">page</option>
                <option value="selection">selection</option>
                <option value="image">image</option>
                <option value="video">video</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">Collection</label>
              <select name="collection_id" className={inputCls}>
                <option value="">— nenhuma —</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">Tags</label>
              <input name="tags" placeholder="a, b, c" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-600 mb-1">Notas</label>
            <textarea name="notes" rows={3} className={`${inputCls} resize-y`} />
          </div>

          <div>
            <label className="block text-xs text-neutral-600 mb-1">
              Conteúdo <span className="text-neutral-400">(markdown)</span>
            </label>
            <textarea
              name="content"
              rows={8}
              className={`${inputCls} resize-y font-mono text-xs`}
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-neutral-200">
            <button
              type="submit"
              className="bg-black text-white text-sm px-4 py-2 rounded hover:bg-neutral-800"
            >
              Criar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
