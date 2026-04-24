'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Collection } from '@/lib/types';
import {
  createCollection,
  updateCollection,
  deleteCollection,
} from '@/app/actions';

type CollectionWithCount = Collection & { count: number };

export function CollectionsList({
  collections,
}: {
  collections: CollectionWithCount[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  const inputCls =
    'px-2 py-1 text-sm border border-neutral-300 rounded bg-white outline-none focus:border-neutral-900';

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      await createCollection(form);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  async function handleUpdate(id: string, form: FormData) {
    startTransition(async () => {
      await updateCollection(id, form);
      setEditingId(null);
      router.refresh();
    });
  }

  async function handleDelete(c: CollectionWithCount) {
    if (
      !confirm(
        `Deletar "${c.name}"? Os ${c.count} ref${c.count === 1 ? '' : 's'} dentro vão perder a collection (não são deletados).`,
      )
    )
      return;
    startTransition(async () => {
      await deleteCollection(c.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="bg-white border border-neutral-200 rounded-lg p-4 flex gap-2 items-end"
      >
        <div className="flex-1">
          <label className="block text-xs text-neutral-600 mb-1">Nome</label>
          <input name="name" required className={`${inputCls} w-full`} />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-neutral-600 mb-1">
            Descrição <span className="text-neutral-400">(opcional)</span>
          </label>
          <input name="description" className={`${inputCls} w-full`} />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-black text-white text-sm px-3 py-1.5 rounded hover:bg-neutral-800 disabled:opacity-50"
        >
          Criar
        </button>
      </form>

      <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-200">
        {collections.length === 0 && (
          <p className="p-4 text-sm text-neutral-500">Nenhuma collection ainda.</p>
        )}

        {collections.map((c) => {
          const editing = editingId === c.id;
          return (
            <div key={c.id} className="p-4">
              {editing ? (
                <form
                  action={(fd) => handleUpdate(c.id, fd)}
                  className="flex gap-2 items-end"
                >
                  <div className="flex-1">
                    <input
                      name="name"
                      defaultValue={c.name}
                      className={`${inputCls} w-full`}
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      name="description"
                      defaultValue={c.description ?? ''}
                      className={`${inputCls} w-full`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="bg-black text-white text-xs px-3 py-1.5 rounded"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-neutral-500"
                  >
                    cancelar
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-medium text-sm">{c.name}</h3>
                      <span className="text-xs text-neutral-400">
                        {c.count} ref{c.count === 1 ? '' : 's'}
                      </span>
                    </div>
                    {c.description && (
                      <p className="text-xs text-neutral-500">{c.description}</p>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs">
                    <button
                      onClick={() => setEditingId(c.id)}
                      className="text-neutral-600 hover:text-neutral-900"
                    >
                      editar
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="text-red-600 hover:text-red-800"
                    >
                      deletar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
