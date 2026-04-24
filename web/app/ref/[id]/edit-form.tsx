'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Collection, Ref } from '@/lib/types';
import { updateRef, deleteRef } from '@/app/actions';

export function EditForm({
  item,
  collections,
}: {
  item: Ref;
  collections: Collection[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateRef(item.id, formData);
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!confirm('Deletar este ref? Essa ação é irreversível.')) return;
    startTransition(async () => {
      await deleteRef(item.id);
    });
  }

  const inputCls =
    'w-full px-3 py-2 text-sm border border-neutral-300 rounded bg-white outline-none focus:border-neutral-900';

  return (
    <form action={handleSubmit} className="space-y-4 bg-white border border-neutral-200 rounded-lg p-6">
      <div>
        <label className="block text-xs text-neutral-600 mb-1">Título</label>
        <input
          name="title"
          defaultValue={item.title ?? ''}
          className={`${inputCls} text-base font-medium`}
        />
      </div>

      <div>
        <label className="block text-xs text-neutral-600 mb-1">URL</label>
        <input name="url" defaultValue={item.url ?? ''} className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-neutral-600 mb-1">Collection</label>
          <select
            name="collection_id"
            defaultValue={item.collection_id ?? ''}
            className={inputCls}
          >
            <option value="">— nenhuma —</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-neutral-600 mb-1">
            Tags <span className="text-neutral-400">(vírgula separa)</span>
          </label>
          <input
            name="tags"
            defaultValue={item.tags.join(', ')}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-neutral-600 mb-1">Notas</label>
        <textarea
          name="notes"
          defaultValue={item.notes ?? ''}
          rows={4}
          className={`${inputCls} resize-y`}
        />
      </div>

      <div>
        <label className="block text-xs text-neutral-600 mb-1">
          Conteúdo <span className="text-neutral-400">(markdown)</span>
        </label>
        <textarea
          name="content"
          defaultValue={item.content ?? ''}
          rows={12}
          className={`${inputCls} resize-y font-mono text-xs`}
        />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          Deletar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="bg-black text-white text-sm px-4 py-2 rounded hover:bg-neutral-800 disabled:opacity-50"
        >
          {isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
