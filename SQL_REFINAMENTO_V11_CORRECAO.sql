-- =============================================================================
-- Correção complementar V11 — idempotência dos lembretes da agenda
-- Executar UMA vez depois de SQL_REFINAMENTO_V11.sql.
-- Não altera nem exclui notificações existentes.
-- =============================================================================

alter table public.notificacoes
  add column if not exists dedupe_key text;

comment on column public.notificacoes.dedupe_key is
  'Chave opcional de idempotência. Impede que crons criem a mesma notificação mais de uma vez.';

create unique index if not exists idx_notificacoes_dedupe_key
  on public.notificacoes(dedupe_key)
  where dedupe_key is not null;

alter table public.notificacoes
  drop constraint if exists notificacoes_tipo_check;

alter table public.notificacoes
  add constraint notificacoes_tipo_check
  check (
    tipo in (
      'lead_novo',
      'lead_parado',
      'vau_desatualizada',
      'evento_agenda',
      'agenda_lembrete',
      'sistema'
    )
  ) not valid;

alter table public.notificacoes
  validate constraint notificacoes_tipo_check;

-- Verificação esperada: duas linhas, ambas true.
select
  exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'notificacoes'
       and column_name = 'dedupe_key'
  ) as dedupe_key_criada,
  exists (
    select 1
      from pg_indexes
     where schemaname = 'public'
       and tablename = 'notificacoes'
       and indexname = 'idx_notificacoes_dedupe_key'
  ) as indice_dedupe_criado;
