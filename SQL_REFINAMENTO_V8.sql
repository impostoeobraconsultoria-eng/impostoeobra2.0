-- =============================================================================
-- SQL de suporte ao pacote de refinamento V8 (Cadência comercial + SLA)
-- Rodar UMA vez no SQL Editor do Supabase antes de iniciar a branch v8/1.
-- Idempotente (create if not exists, drop policy if exists, on conflict do nothing).
--
-- Contém:
--   V8.1 — Colunas novas em leads (cadência + rastreio de contato)
--   V8.2 — Tabela lead_tentativas_contato (log de cada tentativa)
--   V8.3 — Função auxiliar add_business_days (soma dias úteis, ignora fim de semana)
--   V8.4 — Chaves em config (SLA, cadência, alertas, copy)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- V8.1 — Colunas novas em leads
-- -----------------------------------------------------------------------------

alter table public.leads
  add column if not exists contato_inicial_em        timestamptz,  -- quando o consultor marcou "contato inicial"
  add column if not exists contato_inicial_por       uuid references public.users(id) on delete set null,
  add column if not exists tentativa_atual           integer not null default 0,       -- 0 = ainda não houve contato; 1..N depois
  add column if not exists proxima_tentativa_em      date,                              -- data prevista da próxima tentativa (dias úteis)
  add column if not exists ultima_tentativa_em       timestamptz,                       -- timestamp da última tentativa registrada
  add column if not exists cadencia_finalizada_em    timestamptz,                       -- setado quando esgotam 3 tentativas ou lead vira cliente/inativo
  add column if not exists ultimo_alerta_cobertura_h integer;                           -- rastreia qual "hora sem cobertura" já foi alertada (1, 2, 3...)

comment on column public.leads.contato_inicial_em is
  'Timestamp em que o consultor marcou "contato inicial realizado". Zera a contagem de SLA de cobertura e inicia a cadência de follow-up (tentativa 1).';

comment on column public.leads.tentativa_atual is
  '0 = sem contato ainda. 1..N = número da última tentativa registrada. Ao chegar em followup_max_tentativas sem sucesso, sistema exige decisão (converter ou inativar).';

comment on column public.leads.proxima_tentativa_em is
  'Data (não timestamp) da próxima tentativa prevista, calculada por add_business_days(). Cron matinal alerta os leads que têm proxima_tentativa_em = today.';

comment on column public.leads.ultimo_alerta_cobertura_h is
  'Última "hora de descoberto" alertada. Ex: se lead está há 3h sem consultor e sem contato inicial, este campo vale 3. Evita alertar 2x na mesma hora.';

-- Índices auxiliares
create index if not exists idx_leads_sem_cobertura
  on public.leads(data_hora)
  where deleted_at is null
    and convertido_em is null
    and status_ativacao = 'ativo'
    and responsavel_id is null
    and contato_inicial_em is null;

create index if not exists idx_leads_followup_hoje
  on public.leads(proxima_tentativa_em)
  where deleted_at is null
    and convertido_em is null
    and status_ativacao = 'ativo'
    and cadencia_finalizada_em is null;

create index if not exists idx_leads_por_responsavel
  on public.leads(responsavel_id)
  where deleted_at is null
    and convertido_em is null
    and status_ativacao = 'ativo';

-- -----------------------------------------------------------------------------
-- V8.2 — Tabela lead_tentativas_contato (log de cada tentativa)
-- -----------------------------------------------------------------------------

create table if not exists public.lead_tentativas_contato (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references public.leads(id) on delete cascade,
  numero            integer not null,                     -- 1, 2, 3... corresponde ao tentativa_atual do lead nesse momento
  tipo              text not null check (tipo in ('contato_inicial', 'follow_up')),
  resultado         text not null check (resultado in ('sem_resposta', 'ocupado', 'nao_atende', 'interessado', 'sem_interesse', 'retornar_depois', 'outro')),
  observacoes       text,                                 -- nota livre do consultor
  criado_por        uuid not null references public.users(id) on delete restrict,
  criado_em         timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_lead_tent_por_lead
  on public.lead_tentativas_contato(lead_id, numero);

create unique index if not exists uq_lead_tent_numero
  on public.lead_tentativas_contato(lead_id, numero);

create index if not exists idx_lead_tent_por_autor
  on public.lead_tentativas_contato(criado_por, criado_em desc);

drop trigger if exists trg_lead_tent_updated on public.lead_tentativas_contato;
create trigger trg_lead_tent_updated
  before update on public.lead_tentativas_contato
  for each row execute function public.set_updated_at();

alter table public.lead_tentativas_contato enable row level security;

-- SELECT: usuário ativo vê todas (transparência entre time)
drop policy if exists lead_tent_select_active on public.lead_tentativas_contato;
create policy lead_tent_select_active on public.lead_tentativas_contato
  for select to authenticated
  using (public.is_active_user());

-- INSERT: usuário ativo registra tentativas (nas próprias interações)
drop policy if exists lead_tent_insert_active on public.lead_tentativas_contato;
create policy lead_tent_insert_active on public.lead_tentativas_contato
  for insert to authenticated
  with check (
    public.is_active_user()
    and criado_por = public.current_active_user_id()
  );

-- UPDATE/DELETE: só quem criou pode editar/apagar (correção rápida); admin pode tudo
drop policy if exists lead_tent_update_own on public.lead_tentativas_contato;
create policy lead_tent_update_own on public.lead_tentativas_contato
  for update to authenticated
  using (
    public.is_active_user()
    and (
      public.is_admin()
      or (
        criado_por = public.current_active_user_id()
        and criado_em >= now() - interval '15 minutes'
      )
    )
  )
  with check (
    public.is_active_user()
    and (
      public.is_admin()
      or (
        criado_por = public.current_active_user_id()
        and criado_em >= now() - interval '15 minutes'
      )
    )
  );

drop policy if exists lead_tent_delete_admin on public.lead_tentativas_contato;
create policy lead_tent_delete_admin on public.lead_tentativas_contato
  for delete to authenticated
  using (public.is_admin());

revoke all on table public.lead_tentativas_contato from anon;
grant select, insert, update, delete
  on table public.lead_tentativas_contato to authenticated;

-- -----------------------------------------------------------------------------
-- V8.3 — Função add_business_days (soma dias úteis, ignora fim de semana)
-- MVP: só desconsidera sábado e domingo. Feriados serão plugados no futuro.
-- -----------------------------------------------------------------------------

create or replace function public.add_business_days(start_date date, num_days integer)
returns date
language plpgsql immutable
set search_path = public, pg_temp as $$
declare
  result_date date := start_date;
  days_added integer := 0;
  step integer := case when num_days >= 0 then 1 else -1 end;
begin
  while days_added < abs(num_days) loop
    result_date := result_date + step;
    -- extract(dow ...) = 0 (domingo) ou 6 (sábado) → pula
    if extract(dow from result_date) not in (0, 6) then
      days_added := days_added + 1;
    end if;
  end loop;
  return result_date;
end;
$$;

comment on function public.add_business_days(date, integer) is
  'Soma N dias úteis a uma data (ignora sábados e domingos). MVP não considera feriados nacionais/estaduais — futuro pode plugar tabela de feriados.';

revoke execute on function public.add_business_days(date, integer) from public;
grant execute on function public.add_business_days(date, integer) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- V8.4 — Chaves em config
-- -----------------------------------------------------------------------------

insert into public.config (chave, valor, descricao) values
  -- SLA de cobertura (lead sem consultor + sem contato inicial)
  ('cadencia_sla_cobertura_horas_inicial',
   '1',
   'Horas após criação do lead antes do primeiro alerta "sem cobertura" (lead ativo, sem responsável, sem contato inicial). Default 1.'),
  ('cadencia_sla_cobertura_recorrencia_horas',
   '1',
   'Recorrência (em horas) dos alertas subsequentes enquanto o lead continua sem cobertura. Default 1 (alerta de hora em hora após atingir o inicial).'),

  -- Cadência de follow-up após contato inicial
  ('cadencia_followup_dias_uteis',
   '2',
   'Intervalo (em dias úteis) entre tentativas de follow-up após contato inicial. Default 2.'),
  ('cadencia_followup_max_tentativas',
   '3',
   'Número máximo de tentativas de follow-up antes de forçar decisão (converter ou inativar). Default 3.'),

  -- Kill switches
  ('cadencia_habilitada',
   'true',
   'Habilita cron de alertas de cadência (sem cobertura + follow-up). Se false, cron responde 200 mas não dispara nada.'),

  -- Toggles por tipo de notificação
  ('notif_lead_sem_cobertura',
   'true',
   'Ativa notificações de lead sem cobertura (sem responsável + sem contato inicial) nos 3 canais.'),
  ('notif_followup_hoje',
   'true',
   'Ativa notificação matinal "Você tem X follow-ups hoje" para cada consultor com leads elegíveis.'),
  ('notif_followup_atrasado',
   'true',
   'Ativa notificação de follow-up atrasado (proxima_tentativa_em passou e ninguém registrou).'),
  ('notif_decidir_lead',
   'true',
   'Ativa notificação quando lead esgota tentativas e precisa de decisão final.'),

  -- Templates de mensagem (com placeholders {campo})
  ('template_alerta_sem_cobertura',
   '⏳ Lead <b>{primeiro_nome}</b> ({uf}) há {horas}h sem consultor. Alguém assume?',
   'Template HTML da notificação de lead sem cobertura. Placeholders: {primeiro_nome}, {uf}, {horas}.'),

  ('template_followup_hoje',
   '📞 Você tem <b>{quantidade}</b> follow-up(s) hoje. Abra o CRM para ver quem contatar.',
   'Template HTML da notificação matinal individual de follow-ups.'),

  ('template_followup_atrasado',
   '🔴 Follow-up de <b>{primeiro_nome}</b> ({uf}) estava previsto para {data}. Já se passaram {dias} dia(s).',
   'Template HTML de follow-up atrasado.'),

  ('template_decidir_lead',
   '⚖️ Lead <b>{primeiro_nome}</b> já teve {tentativas} tentativas. Hoje precisa de decisão: converter ou inativar.',
   'Template HTML de decisão final após esgotar tentativas.'),

  -- Cron
  ('cron_cadencia_horario_matinal',
   '11:00',
   'Horário UTC do cron matinal que dispara "follow-up hoje" (11 UTC = 8h Brasília). Meramente informativo — schedule real fica em vercel.json.'),

  -- Ordenação padrão do dashboard
  ('dashboard_cards_ordem',
   '["sem_consultor","followup_hoje","followup_atrasado","decidir_hoje","meus_leads"]',
   'JSON array com a ordem dos cards no dashboard. Reordenar aqui muda a ordem exibida.')
on conflict (chave) do nothing;

-- -----------------------------------------------------------------------------
-- V8.5 — Cron horário via Supabase Cron + Vault
-- -----------------------------------------------------------------------------
-- Antes de executar este bloco, crie no Supabase Vault:
--   Nome: cadencia_cron_url
--   Segredo: https://impostoeobra.com.br/api/cron/cadencia
--
--   Nome: cadencia_cron_secret
--   Segredo: o MESMO valor de CRON_SECRET configurado na Vercel
--
-- Nunca grave o valor de CRON_SECRET neste arquivo.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.invoke_cadencia_comercial()
returns bigint
language plpgsql
security definer
volatile
set search_path = private, vault, net, pg_temp
as $$
declare
  endpoint text;
  bearer_secret text;
begin
  select decrypted_secret into endpoint
    from vault.decrypted_secrets where name = 'cadencia_cron_url' limit 1;
  select decrypted_secret into bearer_secret
    from vault.decrypted_secrets where name = 'cadencia_cron_secret' limit 1;
  if endpoint is null or bearer_secret is null then
    raise exception 'Vault incompleto: cadencia_cron_url/cadencia_cron_secret ausentes';
  end if;
  return net.http_get(
    url := endpoint,
    headers := jsonb_build_object('Authorization', 'Bearer ' || bearer_secret),
    timeout_milliseconds := 30000
  );
end;
$$;

revoke execute on function private.invoke_cadencia_comercial() from public, anon, authenticated;
grant execute on function private.invoke_cadencia_comercial() to postgres, service_role;

do $$
begin
  if exists (select 1 from vault.decrypted_secrets where name = 'cadencia_cron_url')
     and exists (select 1 from vault.decrypted_secrets where name = 'cadencia_cron_secret') then
    perform cron.schedule(
      'cadencia-comercial-horaria',
      '0 * * * *',
      'select private.invoke_cadencia_comercial()'
    );
  else
    raise notice 'Cron não agendado: crie os dois segredos no Vault e execute novamente o bloco V8.5.';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Verificação
-- -----------------------------------------------------------------------------
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='leads'
--     and column_name in ('contato_inicial_em','contato_inicial_por','tentativa_atual','proxima_tentativa_em','ultima_tentativa_em','cadencia_finalizada_em','ultimo_alerta_cobertura_h');
-- select * from public.lead_tentativas_contato order by criado_em desc limit 10;
-- select public.add_business_days(current_date, 2);  -- deve pular fim de semana
-- select jobid, jobname, schedule, active from cron.job where jobname = 'cadencia-comercial-horaria';
-- select chave, valor from public.config where chave like 'cadencia_%' or chave like 'notif_%' or chave like 'template_%' order by chave;
