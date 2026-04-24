import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Collection } from '@/lib/types';
import { LogoutButton } from './LogoutButton';

export async function Sidebar({
  activeCollection,
  activeSection = 'refs',
}: {
  activeCollection?: string;
  activeSection?: 'refs' | 'briefings';
}) {
  const supabase = await createClient();
  const { data } = await supabase.from('collections').select('*').order('name');
  const collections = (data ?? []) as Collection[];

  const linkCls = (active: boolean) =>
    `block px-3 py-1.5 text-sm rounded ${
      active ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
    }`;

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 border-r border-neutral-200 bg-white flex flex-col">
      <div className="p-4 border-b border-neutral-200">
        <Link href="/" className="text-sm font-semibold">
          myplatform
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        <div className="space-y-0.5">
          <Link href="/" className={linkCls(activeSection === 'refs' && !activeCollection)}>
            Todas as refs
          </Link>
          <Link
            href="/briefings"
            className={linkCls(activeSection === 'briefings')}
          >
            Briefings de conteúdo
          </Link>
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500">
              Collections
            </span>
            <Link
              href="/collections"
              className="text-[10px] text-neutral-400 hover:text-neutral-700"
            >
              gerenciar
            </Link>
          </div>
          <div className="space-y-0.5">
            {collections.map((c) => (
              <Link
                key={c.id}
                href={`/?collection=${encodeURIComponent(c.name)}`}
                className={linkCls(activeCollection === c.name)}
              >
                {c.name}
              </Link>
            ))}
            {collections.length === 0 && (
              <p className="px-3 text-xs text-neutral-400">Nenhuma ainda</p>
            )}
          </div>
        </div>
      </nav>

      <div className="p-3 border-t border-neutral-200 space-y-1">
        <Link
          href="/new"
          className="block w-full text-center bg-black text-white text-sm py-1.5 rounded hover:bg-neutral-800"
        >
          + Novo ref
        </Link>
        <LogoutButton />
      </div>
    </aside>
  );
}
