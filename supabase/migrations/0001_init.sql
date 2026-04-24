-- myplatform schema v1
-- Personal reference platform: collections + refs with full-text search

create extension if not exists "pgcrypto";

create table collections (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table refs (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references collections(id) on delete set null,
  url text,
  title text,
  content text,
  type text not null default 'page' check (type in ('page', 'selection', 'image', 'video', 'note')),
  tags text[] not null default '{}',
  notes text,
  media_path text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index refs_collection_idx on refs(collection_id);
create index refs_tags_idx on refs using gin(tags);
create index refs_search_idx on refs using gin (
  to_tsvector('portuguese',
    coalesce(title, '') || ' ' ||
    coalesce(content, '') || ' ' ||
    coalesce(notes, '')
  )
);

-- Storage bucket for screenshots / images (create via dashboard if this fails)
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

-- Seed collection for quick testing
insert into collections (name, description)
values ('inbox', 'Default collection for unsorted refs')
on conflict (name) do nothing;
