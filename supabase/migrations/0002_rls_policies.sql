-- RLS policies for single-user authenticated access
-- Tables already have RLS enabled (via "Run and enable RLS" in SQL editor).
-- Since this is a single-user setup, any authenticated user can do anything.

create policy "authenticated full access on refs"
  on refs for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated full access on collections"
  on collections for all
  to authenticated
  using (true)
  with check (true);

-- Storage policies for media bucket
create policy "authenticated can read media"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'media');

create policy "authenticated can upload media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media');

create policy "authenticated can delete media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media');
