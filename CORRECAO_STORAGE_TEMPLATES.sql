-- V4.3 — permite substituição segura de templates DOCX por administradores.
-- O upsert do Supabase Storage exige SELECT + INSERT + UPDATE.

update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
 where id = 'templates';

drop policy if exists templates_admin_select on storage.objects;
drop policy if exists templates_admin_insert on storage.objects;
drop policy if exists templates_admin_update on storage.objects;

create policy templates_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'templates' and public.is_admin());

create policy templates_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'templates' and public.is_admin());

create policy templates_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'templates' and public.is_admin())
  with check (bucket_id = 'templates' and public.is_admin());
