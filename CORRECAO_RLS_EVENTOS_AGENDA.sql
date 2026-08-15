-- Hardening da tabela public.eventos_agenda.
-- Execute uma vez no SQL Editor do Supabase antes de publicar a Branch 5.

begin;

-- Todo evento criado pela Data API precisa registrar o usuário autenticado
-- como autor. A helper current_active_user_id() foi criada pela correção da
-- Branch 4 e só pode ser executada por authenticated.
drop policy if exists eventos_insert_active on public.eventos_agenda;
drop policy if exists eventos_insert_own on public.eventos_agenda;
create policy eventos_insert_own
  on public.eventos_agenda
  for insert
  to authenticated
  with check (
    criado_por = public.current_active_user_id()
  );

-- Exclusão física é exclusiva de administradores.
drop policy if exists eventos_delete_active on public.eventos_agenda;
drop policy if exists eventos_delete_admin on public.eventos_agenda;
create policy eventos_delete_admin
  on public.eventos_agenda
  for delete
  to authenticated
  using (public.is_admin());

-- Impede contornar a policy de DELETE com UPDATE deleted_at e protege campos
-- de auditoria/cron contra escrita direta por usuários autenticados.
-- A service_role não é afetada e continua apta a preencher
-- lembrete_enviado_em no endpoint do cron.
revoke update on table public.eventos_agenda from authenticated;
grant update (
  titulo,
  descricao,
  tipo,
  data_hora_inicio,
  data_hora_fim,
  dia_inteiro,
  lembrete_minutos,
  ref_tipo,
  ref_id,
  responsavel_id,
  status
) on table public.eventos_agenda to authenticated;

commit;

-- Verificação das policies.
select policyname, cmd, roles, qual, with_check
  from pg_policies
 where schemaname = 'public'
   and tablename = 'eventos_agenda'
 order by cmd, policyname;

-- Verificação dos privilégios por coluna. deleted_at, criado_por e
-- lembrete_enviado_em não devem aparecer com UPDATE para authenticated.
select grantee, privilege_type, column_name
  from information_schema.column_privileges
 where table_schema = 'public'
   and table_name = 'eventos_agenda'
   and grantee = 'authenticated'
   and privilege_type = 'UPDATE'
 order by column_name;
