-- Leituras individuais para notificacoes globais e destinadas.
-- Execute uma vez no SQL Editor do Supabase antes de validar a branch v3.4.

create table if not exists public.notificacoes_leituras (
  notificacao_id uuid not null references public.notificacoes(id) on delete cascade,
  usuario_id uuid not null references public.users(id) on delete cascade,
  lida_em timestamptz not null default now(),
  primary key (notificacao_id, usuario_id)
);

create index if not exists idx_notificacoes_leituras_usuario
  on public.notificacoes_leituras(usuario_id, lida_em desc);

alter table public.notificacoes_leituras enable row level security;

-- A coluna lida da notificacao global não pode ser alterada diretamente,
-- pois isso marcaria como lida para toda a equipe.
drop policy if exists notif_update_own on public.notificacoes;
revoke update on public.notificacoes from authenticated;

drop policy if exists notif_leituras_select_own on public.notificacoes_leituras;
create policy notif_leituras_select_own on public.notificacoes_leituras
  for select to authenticated
  using (usuario_id = public.current_active_user_id());

drop policy if exists notif_leituras_insert_own on public.notificacoes_leituras;
create policy notif_leituras_insert_own on public.notificacoes_leituras
  for insert to authenticated
  with check (usuario_id = public.current_active_user_id());

drop policy if exists notif_leituras_update_own on public.notificacoes_leituras;
create policy notif_leituras_update_own on public.notificacoes_leituras
  for update to authenticated
  using (usuario_id = public.current_active_user_id())
  with check (usuario_id = public.current_active_user_id());

grant select, insert, update on public.notificacoes_leituras to authenticated;
