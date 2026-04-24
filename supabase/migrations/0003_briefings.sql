create table if not exists briefings (
  id text primary key default gen_random_uuid()::text,
  nome_demanda text not null,
  canal text,
  etapa_funil text,
  format text,
  accent_color text,
  conceito text,
  data_publicacao text,
  referencia_arte text,
  descricao_peca text,
  legenda text,
  hashtags text[] default '{}',
  responsavel jsonb,
  image text,
  slides jsonb,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table briefings enable row level security;

create policy "authenticated users can read briefings"
  on briefings for select
  to authenticated
  using (true);

create policy "authenticated users can insert briefings"
  on briefings for insert
  to authenticated
  with check (true);

create policy "authenticated users can update briefings"
  on briefings for update
  to authenticated
  using (true);

create policy "authenticated users can delete briefings"
  on briefings for delete
  to authenticated
  using (true);
