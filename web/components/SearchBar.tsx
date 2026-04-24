'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, type FormEvent } from 'react';

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    setValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('q', value);
    else params.delete('q');
    router.push(`/?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1">
      <input
        type="search"
        placeholder="Buscar no título, conteúdo, notas…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded bg-white outline-none focus:border-neutral-900"
      />
    </form>
  );
}
