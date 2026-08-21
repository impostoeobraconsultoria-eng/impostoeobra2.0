-- =============================================================================
-- Correção de RLS — rodar UMA vez no SQL Editor do Supabase antes de feat/auth
-- Resolve 3 pontos de segurança encontrados pelo Codex:
--   (1) Funções SECURITY DEFINER sem SET search_path e sem EXECUTE restrito
--   (2) atividades_insert_active com auth.role() deprecated e permissão anon ampla
--   (3) leads_insert_public com WITH CHECK (true) permitindo inserts diretos via Data API
-- =============================================================================

-- ------------------------------------------------------------------------------
-- Correção 1: hardening das funções SECURITY DEFINER
-- ------------------------------------------------------------------------------

create or replace function public.is_active_user() returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where email = auth.jwt()->>'email' and ativo = true
  );
end;
$$ language plpgsql
   security definer
   stable
   set search_path = public, pg_temp;

create or replace function public.is_admin() returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where email = auth.jwt()->>'email' and ativo = true and perfil = 'admin'
  );
end;
$$ language plpgsql
   security definer
   stable
   set search_path = public, pg_temp;

-- Restringe EXECUTE: só authenticated e anon (não PUBLIC)
revoke execute on function public.is_active_user() from public;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_active_user() to authenticated, anon;
grant execute on function public.is_admin() to authenticated, anon;

-- ------------------------------------------------------------------------------
-- Correção 2: atividades — remover auth.role() e permissão anon ampla
-- ------------------------------------------------------------------------------

drop policy if exists atividades_insert_active on public.atividades;
create policy atividades_insert_active on public.atividades
  for insert to authenticated
  with check (public.is_active_user());

-- ------------------------------------------------------------------------------
-- Correção 3: leads — remover INSERT anon direto na Data API
-- ------------------------------------------------------------------------------
-- Todos os inserts em leads passarão pelo endpoint /api/leads (Next.js)
-- que valida com Zod e usa SUPABASE_SERVICE_ROLE_KEY (bypassa RLS).

drop policy if exists leads_insert_public on public.leads;

-- Opcional: policy explícita permitindo INSERT só via service_role
-- (não é necessária porque service_role bypassa RLS por padrão, mas
-- documenta a intenção)
-- create policy leads_insert_service on public.leads
--   for insert to service_role with check (true);
