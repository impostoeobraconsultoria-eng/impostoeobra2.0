-- Correção de autoria e permissões da tabela public.cliente_notas.
-- Execute uma vez no SQL Editor do Supabase antes de publicar a Branch 4.

begin;

-- Helper restrito: retorna o id do usuário ativo correspondente ao e-mail
-- autenticado. SECURITY DEFINER é necessário porque a consulta ocorre na
-- própria tabela users, que também possui RLS.
create or replace function public.current_active_user_id()
returns uuid
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select id
    from public.users
   where email = auth.jwt()->>'email'
     and ativo = true
   limit 1;
$$;

revoke execute on function public.current_active_user_id() from public;
grant execute on function public.current_active_user_id() to authenticated;

-- Impede que um usuário ativo atribua uma nota a outro autor por meio de uma
-- chamada direta à Data API.
drop policy if exists cliente_notas_insert_active on public.cliente_notas;
create policy cliente_notas_insert_own
  on public.cliente_notas
  for insert
  to authenticated
  with check (
    autor_id = public.current_active_user_id()
  );

-- Consultores editam somente notas próprias. Administradores podem editar
-- qualquer nota. USING protege a linha existente; WITH CHECK protege o estado
-- resultante da atualização.
drop policy if exists cliente_notas_update_active on public.cliente_notas;
drop policy if exists cliente_notas_update_author_or_admin on public.cliente_notas;
create policy cliente_notas_update_author_or_admin
  on public.cliente_notas
  for update
  to authenticated
  using (
    autor_id = public.current_active_user_id()
    or public.is_admin()
  )
  with check (
    autor_id = public.current_active_user_id()
    or public.is_admin()
  );

commit;

-- Verificação esperada: quatro policies (select, insert, update e delete).
select policyname, cmd, roles, qual, with_check
  from pg_policies
 where schemaname = 'public'
   and tablename = 'cliente_notas'
 order by cmd, policyname;
