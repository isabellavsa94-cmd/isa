-- Schema que faltava nas migrations: clients, prompts, briefing_comments e as
-- colunas de briefings adicionadas depois do 0003.
--
-- Contexto: o banco original (projeto uhhxiodufwwdhgqreypy) foi criado direto
-- pelo SQL Editor e nao existe mais. Este arquivo reconstroi o schema a partir
-- do que o codigo em web/ realmente le e escreve, pra que o app possa ser
-- levantado num projeto novo do zero.

-- ---------------------------------------------------------------- clients
-- Só é lido pelo app (web/app/briefings/page.tsx) — nunca inserido pela UI.
-- Cadastrar clientes na mão pelo SQL Editor / dashboard.
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------- colunas novas de briefings
-- Usadas em web/lib/types.ts (type Briefing) e na BriefingsView, mas ausentes
-- da migration 0003.
alter table briefings add column if not exists client_id    uuid references clients(id) on delete set null;
alter table briefings add column if not exists reels_visual text;
alter table briefings add column if not exists reels_tela   text;
alter table briefings add column if not exists reels_fala   text;
alter table briefings add column if not exists reels_audio  text;
alter table briefings add column if not exists sort_order   integer;

create index if not exists briefings_client_idx on briefings(client_id);
create index if not exists briefings_sort_idx   on briefings(client_id, sort_order);

-- ------------------------------------------------------- briefing_comments
-- Comentarios ancorados num trecho de texto de um campo do briefing
-- (web/app/briefings/BriefingEditor.tsx). O id vem do crypto.randomUUID() do
-- browser e casa com o commentId da mark do TipTap — por isso text, nao uuid
-- com default: quem gera e o cliente.
create table if not exists briefing_comments (
  id            text primary key,
  briefing_id   text not null references briefings(id) on delete cascade,
  field_name    text not null,
  start_offset  integer,
  end_offset    integer,
  selected_text text,
  comment       text not null,
  resolved      boolean not null default false,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists briefing_comments_briefing_idx on briefing_comments(briefing_id);
create index if not exists briefing_comments_pending_idx  on briefing_comments(resolved, created_at desc);

-- ---------------------------------------------------------------- prompts
-- ATENCAO: o type Prompt em web/lib/types.ts declara `content`, mas o unico
-- lugar que escreve (PromptsView.tsx:119) usa `prompt_text`, e nada le
-- `.content` de um prompt. A coluna real e prompt_text; o type esta desatualizado.
create table if not exists prompts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  prompt_text text not null,
  category    text,
  image_url   text,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists prompts_created_idx on prompts(created_at desc);

-- ------------------------------------------------------------------- RLS
-- O middleware (web/lib/supabase/middleware.ts) so renova a sessao, nao
-- redireciona pro login — o app e navegado como `anon`. Policies so pra
-- `authenticated` deixariam todas as telas vazias.
--
-- Este e um ambiente de DEV e a unica protecao real e o basic auth do Traefik
-- na frente (kontent2.koko.ag). Nao replicar isso em producao.
alter table clients            enable row level security;
alter table briefing_comments  enable row level security;
alter table prompts            enable row level security;

do $$
declare t text;
begin
  foreach t in array array['clients','briefings','briefing_comments','prompts','refs','collections'] loop
    execute format('drop policy if exists "dev full access" on %I', t);
    execute format(
      'create policy "dev full access" on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- storage
-- O app monta URL publica de logo de cliente
-- (`/storage/v1/object/public/media/client-logos/...`) e usa getPublicUrl nos
-- prompts — o bucket precisa ser publico. O 0001 criou com public = false.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "dev read media"   on storage.objects;
drop policy if exists "dev write media"  on storage.objects;
drop policy if exists "dev delete media" on storage.objects;

create policy "dev read media"   on storage.objects for select to anon, authenticated using (bucket_id = 'media');
create policy "dev write media"  on storage.objects for insert to anon, authenticated with check (bucket_id = 'media');
create policy "dev delete media" on storage.objects for delete to anon, authenticated using (bucket_id = 'media');
