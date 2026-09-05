-- =============================================================================
-- SQL de suporte ao pacote de refinamento V11 (Agenda / Calendário compartilhado)
-- Rodar UMA vez no SQL Editor do Supabase antes de iniciar a branch v11/1.
-- Idempotente (create if not exists, drop policy if exists, on conflict do nothing).
--
-- Contém:
--   V11.1 — Tabela eventos_agenda (evento principal, com recorrência e lembrete)
--   V11.2 — Tabela eventos_participantes (M:N com users)
--   V11.3 — Chaves em config (padrões editáveis pelo admin)
--   V11.4 — Vault + cron (executar DEPOIS de deploy da branch v11/1)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- V11.1 — Tabela eventos_agenda
-- -----------------------------------------------------------------------------

create table if not exists public.eventos_agenda (
  id                  uuid primary key default gen_random_uuid(),
  titulo              text not null,
  descricao           text,
  tipo                text not null check (tipo in ('reuniao', 'follow_up', 'prazo', 'tarefa')),

  -- Datas / duração
  dia_inteiro         boolean not null default false,
  inicio              timestamptz not null,
  fim                 timestamptz not null,
  check (fim >= inicio),

  -- Associação opcional (só um dos dois, ou nenhum)
  lead_id             uuid references public.leads(id) on delete set null,
  cliente_id          uuid references public.clientes(id) on delete set null,
  check (lead_id is null or cliente_id is null),

  -- Recorrência: cada instância vira uma linha independente, mas todas
  -- compartilham serie_id pra permitir "editar/deletar toda a série" futuro.
  -- Sem exceções — depois de gerar, cada instância é autônoma.
  serie_id            uuid,
  serie_indice        integer,
  serie_total         integer,
  check (
    (serie_id is null and serie_indice is null and serie_total is null)
    or (serie_id is not null and serie_indice is not null and serie_total is not null)
  ),

  -- Lembrete (1 por evento, opcional)
  lembrete_minutos_antes  integer check (lembrete_minutos_antes is null or lembrete_minutos_antes >= 0),
  -- Coluna preenchida por trigger (não generated — Postgres considera timestamptz - interval como STABLE).
  lembrete_disparar_em    timestamptz,
  lembrete_enviado        boolean not null default false,
  lembrete_enviado_em     timestamptz,

  -- Metadados
  criado_por          uuid not null references public.users(id) on delete restrict,
  criado_em           timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.eventos_agenda is
  'Agenda / calendário compartilhado do CRM. Todos os usuários ativos veem tudo. Recorrência é expandida em N linhas na criação (sem exceções).';

comment on column public.eventos_agenda.serie_id is
  'Todas as instâncias geradas por uma recorrência compartilham este uuid. Permite "editar/deletar toda a série" via WHERE serie_id = X.';

comment on column public.eventos_agenda.lembrete_disparar_em is
  'Timestamp calculado (inicio - lembrete_minutos_antes minutos) via trigger BEFORE INS/UPD. Não é generated column porque timestamptz - interval é STABLE (não IMMUTABLE) em Postgres.';

-- Função e trigger pra manter lembrete_disparar_em em sincronia
create or replace function public.eventos_agenda_calcular_lembrete()
returns trigger
language plpgsql
as $$
begin
  if new.lembrete_minutos_antes is not null then
    new.lembrete_disparar_em := new.inicio - (new.lembrete_minutos_antes * interval '1 minute');
  else
    new.lembrete_disparar_em := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_eventos_agenda_calcular_lembrete on public.eventos_agenda;
create trigger trg_eventos_agenda_calcular_lembrete
  before insert or update of inicio, lembrete_minutos_antes
  on public.eventos_agenda
  for each row execute function public.eventos_agenda_calcular_lembrete();

create index if not exists idx_eventos_agenda_por_inicio
  on public.eventos_agenda(inicio);

create index if not exists idx_eventos_agenda_por_lead
  on public.eventos_agenda(lead_id) where lead_id is not null;

create index if not exists idx_eventos_agenda_por_cliente
  on public.eventos_agenda(cliente_id) where cliente_id is not null;

create index if not exists idx_eventos_agenda_lembrete_pendente
  on public.eventos_agenda(lembrete_disparar_em)
  where lembrete_minutos_antes is not null and lembrete_enviado = false;

create index if not exists idx_eventos_agenda_por_serie
  on public.eventos_agenda(serie_id) where serie_id is not null;

drop trigger if exists trg_eventos_agenda_updated on public.eventos_agenda;
create trigger trg_eventos_agenda_updated
  before update on public.eventos_agenda
  for each row execute function public.set_updated_at();

alter table public.eventos_agenda enable row level security;

-- SELECT: todos usuários ativos veem tudo
drop policy if exists eventos_agenda_select_active on public.eventos_agenda;
create policy eventos_agenda_select_active on public.eventos_agenda
  for select to authenticated
  using (public.is_active_user());

-- INSERT: usuários ativos criam (criado_por deve ser eles mesmos)
drop policy if exists eventos_agenda_insert_active on public.eventos_agenda;
create policy eventos_agenda_insert_active on public.eventos_agenda
  for insert to authenticated
  with check (
    public.is_active_user()
    and criado_por = public.current_active_user_id()
  );

-- UPDATE: usuários ativos editam qualquer evento (colaboração alta)
drop policy if exists eventos_agenda_update_active on public.eventos_agenda;
create policy eventos_agenda_update_active on public.eventos_agenda
  for update to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

-- DELETE: só criado_por OU admin
drop policy if exists eventos_agenda_delete_owner_or_admin on public.eventos_agenda;
create policy eventos_agenda_delete_owner_or_admin on public.eventos_agenda
  for delete to authenticated
  using (
    public.is_active_user()
    and (
      criado_por = public.current_active_user_id()
      or public.is_admin()
    )
  );

revoke all on table public.eventos_agenda from anon;
grant select, insert, update, delete
  on table public.eventos_agenda to authenticated;

-- -----------------------------------------------------------------------------
-- V11.2 — Tabela eventos_participantes (M:N com users)
-- -----------------------------------------------------------------------------

create table if not exists public.eventos_participantes (
  evento_id           uuid not null references public.eventos_agenda(id) on delete cascade,
  user_id             uuid not null references public.users(id) on delete cascade,
  adicionado_em       timestamptz not null default now(),
  primary key (evento_id, user_id)
);

comment on table public.eventos_participantes is
  'M:N entre eventos_agenda e users. Um evento pode ter N participantes internos.';

create index if not exists idx_eventos_participantes_user
  on public.eventos_participantes(user_id);

alter table public.eventos_participantes enable row level security;

-- SELECT: todos ativos veem
drop policy if exists eventos_part_select_active on public.eventos_participantes;
create policy eventos_part_select_active on public.eventos_participantes
  for select to authenticated
  using (public.is_active_user());

-- INSERT/DELETE: quem pode editar o evento pode gerenciar participantes
drop policy if exists eventos_part_insert_active on public.eventos_participantes;
create policy eventos_part_insert_active on public.eventos_participantes
  for insert to authenticated
  with check (public.is_active_user());

drop policy if exists eventos_part_delete_active on public.eventos_participantes;
create policy eventos_part_delete_active on public.eventos_participantes
  for delete to authenticated
  using (public.is_active_user());

revoke all on table public.eventos_participantes from anon;
grant select, insert, delete
  on table public.eventos_participantes to authenticated;

-- -----------------------------------------------------------------------------
-- V11.3 — Chaves em config
-- -----------------------------------------------------------------------------

-- Idempotência das notificações do cron da agenda. Mantido aqui também
-- para que uma instalação nova da V11 fique completa em uma única execução.
alter table public.notificacoes
  add column if not exists dedupe_key text;

create unique index if not exists idx_notificacoes_dedupe_key
  on public.notificacoes(dedupe_key)
  where dedupe_key is not null;

alter table public.notificacoes
  drop constraint if exists notificacoes_tipo_check;

alter table public.notificacoes
  add constraint notificacoes_tipo_check
  check (
    tipo in (
      'lead_novo', 'lead_parado', 'vau_desatualizada',
      'evento_agenda', 'agenda_lembrete', 'sistema'
    )
  ) not valid;

alter table public.notificacoes
  validate constraint notificacoes_tipo_check;

insert into public.config (chave, valor, descricao) values

  -- Kill switch
  ('agenda_habilitada',
   'true',
   'Habilita o módulo de Agenda / Calendário. Se false, /admin/agenda retorna 404, botões de Agendar somem dos cards de lead/cliente, cron de lembretes não roda.'),

  -- Lembretes — padrões
  ('agenda_lembrete_padrao_minutos',
   '15',
   'Antecedência padrão (em minutos) do lembrete ao criar novo evento. Usuário pode alterar por evento. Valores válidos comuns: 5, 15, 30, 60, 1440 (1 dia). Deixar 0 = sem lembrete padrão (usuário precisa escolher).'),

  ('agenda_lembrete_canais',
   'sininho,push,telegram',
   'Canais nos quais o lembrete é disparado. Lista CSV separada por vírgula. Valores válidos: sininho, push, telegram. Email virá em Fase 2. Vazio = sem canal (silencioso).'),

  ('agenda_lembrete_cron_frequencia_min',
   '5',
   'Frequência (em minutos) que o cron roda para disparar lembretes vencidos. Padrão 5. Impacta precisão do horário do lembrete (janela = frequência).'),

  -- Recorrência
  ('agenda_recorrencia_max_instancias',
   '52',
   'Número máximo de instâncias criadas ao gerar evento recorrente. Padrão 52 (1 ano semanal). Proteção contra explosão de linhas se usuário definir data-fim muito longa.'),

  -- Copy padrão da notificação
  ('agenda_notificacao_titulo_lembrete',
   'Lembrete de compromisso',
   'Título da notificação de lembrete. Usado em sininho, push e telegram.'),

  ('agenda_notificacao_body_template',
   '{{titulo}} — {{inicio_hora}}',
   'Template do corpo da notificação de lembrete. Placeholders disponíveis: {{titulo}}, {{inicio_hora}}, {{inicio_data}}, {{tipo}}, {{lead_nome}}, {{cliente_nome}}.'),

  -- Views
  ('agenda_view_padrao',
   'semanal',
   'View exibida ao abrir /admin/agenda. Valores válidos: mensal, semanal, lista.'),

  ('agenda_horario_inicio_dia',
   '08:00',
   'Hora exibida no topo da view semanal (HH:MM). Padrão 08:00. Eventos antes disso ainda aparecem, mas a grade começa aqui.'),

  ('agenda_horario_fim_dia',
   '20:00',
   'Hora exibida no rodapé da view semanal (HH:MM). Padrão 20:00. Eventos depois disso ainda aparecem.')

on conflict (chave) do nothing;

-- -----------------------------------------------------------------------------
-- V11.4 — Vault + Cron (executar DEPOIS de deploy da branch v11/1)
-- -----------------------------------------------------------------------------
--
-- IMPORTANTE: os passos abaixo são para rodar DEPOIS que a branch estiver
-- deployada em produção (Vercel), NÃO neste primeiro run do SQL.
--
-- 1) Gerar secret hex alfanumérico (32 chars) no PowerShell:
--    -----------------------------------------------------
--    $bytes = New-Object byte[] 16
--    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
--    ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
--    -----------------------------------------------------
--    Copiar via Set-Clipboard (não digitar). Depois:
--
--      a) Colar em Vercel → Env Vars → AGENDA_CRON_SECRET (marcar TODOS os
--         3 ambientes: Production + Preview + Development). Redeploy sem cache.
--
--      b) Criar segredos no Vault via SQL:
--
--         select vault.create_secret(
--           'https://impostoeobra.com.br/api/cron/agenda-lembretes',
--           'agenda_cron_url',
--           'URL do endpoint que dispara lembretes de agenda'
--         );
--         select vault.create_secret(
--           'COLAR_HEX_AQUI',   -- mesmo valor colado na Vercel
--           'agenda_cron_secret',
--           'Bearer secret para autenticar o cron de lembretes de agenda'
--         );
--
-- 2) Agendar cron (via GET, seguindo padrão estabelecido em V6/V8):
--
--    select cron.schedule(
--      'agenda-disparar-lembretes',
--      '*/5 * * * *',
--      $$
--      select net.http_get(
--        url := (select decrypted_secret from vault.decrypted_secrets where name = 'agenda_cron_url'),
--        headers := jsonb_build_object(
--          'Authorization',
--          'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'agenda_cron_secret')
--        )
--      );
--      $$
--    );
--
-- 3) Validar rodadas:
--    select * from cron.job where jobname = 'agenda-disparar-lembretes';
--    select * from cron.job_run_details
--      where jobname = 'agenda-disparar-lembretes'
--      order by start_time desc limit 5;
--    select status_code, content from net._http_response
--      order by created desc limit 5;   -- confirmar 200, não 405

-- -----------------------------------------------------------------------------
-- Verificação (rodar agora, após executar V11.1-V11.3)
-- -----------------------------------------------------------------------------
-- select column_name, data_type from information_schema.columns
--   where table_schema='public' and table_name='eventos_agenda'
--   order by ordinal_position;
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='eventos_participantes';
-- select chave, valor from public.config where chave like 'agenda_%' order by chave;
