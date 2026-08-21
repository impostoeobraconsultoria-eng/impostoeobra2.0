-- =============================================================================
-- SQL de suporte ao pacote de refinamento V4 (8 branches)
-- Rodar UMA vez no SQL Editor do Supabase antes de iniciar as branches.
-- Idempotente (add column if not exists, drop policy if exists, on conflict do nothing).
--
-- Contém:
--   V4.1 — Ciclo de vida de leads (inativação):
--     - Colunas em leads (status_ativacao, motivo_inativacao_id, detalhamento_inativacao,
--       contato_futuro, data_contato_futuro, ultima_etapa_kanban, ultimo_contato_em)
--     - Tabela motivos_inativacao (com admin)
--     - Seed de 14 motivos iniciais
--     - View/Índice pra Leads Inativos
--   V4.2 — Recorrência: telefone normalizado e índices para busca server-side
--   V4.4 — UTMs no CRM: colunas utm_* em leads
--   Chaves novas em config (motivos, ga4 events, etc)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- V4.1 — Motivos de inativação (tabela + seed)
-- -----------------------------------------------------------------------------

create table if not exists public.motivos_inativacao (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,       -- ex: 'sem_resposta'
  rotulo              text not null,              -- ex: 'Sem resposta após tentativas de contato'
  ordem               integer not null default 100,
  reativavel_padrao   boolean not null default true, -- se true, ao inativar já sugere "vale contato futuro"
  ativo               boolean not null default true,
  criado_em           timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_motivos_ativos on public.motivos_inativacao(ordem)
  where ativo = true;

drop trigger if exists trg_motivos_inativacao_updated on public.motivos_inativacao;
create trigger trg_motivos_inativacao_updated
  before update on public.motivos_inativacao
  for each row execute function public.set_updated_at();

alter table public.motivos_inativacao enable row level security;

drop policy if exists motivos_select_active on public.motivos_inativacao;
create policy motivos_select_active on public.motivos_inativacao
  for select using (public.is_active_user());

drop policy if exists motivos_write_admin on public.motivos_inativacao;
create policy motivos_write_admin on public.motivos_inativacao
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed de motivos padrão
insert into public.motivos_inativacao (slug, rotulo, ordem, reativavel_padrao) values
  ('sem_resposta',          'Sem resposta após tentativas de contato',        10,  true),
  ('desistiu_contratacao',  'Desistiu da contratação',                        20,  true),
  ('proposta_preco',        'Proposta não aceita — preço',                    30,  true),
  ('proposta_condicoes',    'Proposta não aceita — condições comerciais',     40,  true),
  ('contratou_outro',       'Contratou outro fornecedor',                     50,  false),
  ('decidiu_nao_realizar',  'Decidiu não realizar o serviço',                 60,  false),
  ('adiou_decisao',         'Adiou a decisão / sem previsão',                 70,  true),
  ('sem_orcamento',         'Sem orçamento no momento',                       80,  true),
  ('fora_escopo',           'Demanda fora do escopo',                         90,  false),
  ('nao_qualificado',       'Lead não qualificado',                          100,  false),
  ('contato_invalido',      'Contato inválido / não localizado',             110,  false),
  ('duplicado',             'Duplicado',                                     120,  false),
  ('ja_era_cliente',        'Já era cliente',                                130,  false),
  ('outro',                 'Outro',                                         900,  true)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- V4.1 — Colunas novas em leads (ciclo de vida)
-- -----------------------------------------------------------------------------

alter table public.leads
  add column if not exists status_ativacao text not null default 'ativo'
    check (status_ativacao in ('ativo', 'inativo'));

alter table public.leads
  add column if not exists motivo_inativacao_id uuid references public.motivos_inativacao(id) on delete set null;

alter table public.leads
  add column if not exists detalhamento_inativacao text;

alter table public.leads
  add column if not exists inativado_em timestamptz;

alter table public.leads
  add column if not exists inativado_por uuid references public.users(id) on delete set null;

alter table public.leads
  add column if not exists contato_futuro boolean;

alter table public.leads
  add column if not exists data_contato_futuro date;

alter table public.leads
  add column if not exists ultima_etapa_kanban text;   -- congela status ao inativar

alter table public.leads
  add column if not exists ultimo_contato_em timestamptz;

comment on column public.leads.status_ativacao is 'Ciclo de vida comercial: ativo (aparece no Kanban) ou inativo (some do Kanban, aparece em /admin/leads/inativos). Não confundir com deleted_at (lixeira) ou convertido_em (virou cliente).';

-- Ajustar índice do Kanban para considerar também status_ativacao
drop index if exists idx_leads_ativos_kanban;
create index idx_leads_ativos_kanban on public.leads(status)
  where deleted_at is null and convertido_em is null and status_ativacao = 'ativo';

create index if not exists idx_leads_inativos on public.leads(inativado_em desc)
  where deleted_at is null and status_ativacao = 'inativo';

create index if not exists idx_leads_contato_futuro on public.leads(data_contato_futuro)
  where deleted_at is null and status_ativacao = 'inativo' and contato_futuro = true;

-- -----------------------------------------------------------------------------
-- V4.2 — Recorrência: normalização de telefone + função de busca
-- -----------------------------------------------------------------------------

-- Coluna auxiliar com telefone normalizado (só dígitos, E.164 sem +)
-- Ex: (61) 99398-2653 -> 5561993982653
alter table public.leads
  add column if not exists telefone_normalizado text;

alter table public.clientes
  add column if not exists telefone_normalizado text;

create index if not exists idx_leads_tel_norm on public.leads(telefone_normalizado)
  where deleted_at is null;

create index if not exists idx_clientes_tel_norm on public.clientes(telefone_normalizado)
  where deleted_at is null;

-- Função helper: normaliza um telefone em qualquer formato para E.164 sem "+"
-- Ex: '(61) 99398-2653', '61999999999', '+55 61 99999-9999' -> '5561993982653'
create or replace function public.normalizar_telefone_br(input text) returns text
language plpgsql immutable
set search_path = public, pg_temp as $$
declare
  digits text;
begin
  if input is null or length(trim(input)) = 0 then return null; end if;
  digits := regexp_replace(input, '\D', '', 'g');
  -- Se começar sem 55, adiciona
  if length(digits) = 10 or length(digits) = 11 then
    digits := '55' || digits;
  end if;
  -- Ignora se ficou com tamanho incompatível
  if length(digits) not in (12, 13) then return null; end if;
  return digits;
end;
$$;

revoke execute on function public.normalizar_telefone_br(text) from public;
grant execute on function public.normalizar_telefone_br(text) to anon, authenticated;

-- Backfill: normaliza telefones existentes
update public.leads
   set telefone_normalizado = public.normalizar_telefone_br(coalesce(ddd,'') || coalesce(whatsapp,''))
 where telefone_normalizado is null and (ddd is not null or whatsapp is not null);

update public.clientes
   set telefone_normalizado = public.normalizar_telefone_br(coalesce(ddd,'') || coalesce(telefone,''))
 where telefone_normalizado is null and (ddd is not null or telefone is not null);

-- -----------------------------------------------------------------------------
-- V4.4 — UTMs no CRM (rastreio de origem)
-- -----------------------------------------------------------------------------

alter table public.leads
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content  text,
  add column if not exists utm_term     text,
  add column if not exists gclid        text,   -- Google Ads click id
  add column if not exists fbclid       text,   -- Facebook click id (opcional)
  add column if not exists referrer     text;   -- document.referrer no momento da simulação

create index if not exists idx_leads_utm_source on public.leads(utm_source)
  where utm_source is not null and deleted_at is null;

create index if not exists idx_leads_utm_campaign on public.leads(utm_campaign)
  where utm_campaign is not null and deleted_at is null;

-- -----------------------------------------------------------------------------
-- Novas chaves em config
-- -----------------------------------------------------------------------------

insert into public.config (chave, valor, descricao) values
  -- V4.1
  ('inativacao_reativar_horario_padrao',
   '09:00',
   'Hora padrão (24h) usada no evento de agenda gerado por inativação com contato futuro.'),

  -- V4.4
  ('ga4_event_simulacao_iniciada',
   'simulacao_iniciada',
   'Nome do evento GA4 quando usuário começa a simulação (foco no 1º campo da Etapa 1). Não renomear.'),
  ('ga4_event_generate_lead',
   'generate_lead',
   'Nome do evento GA4 quando lead é persistido com sucesso no backend. Padrão oficial do GA4 pra E-commerce/Lead Gen.'),
  ('ga4_event_qualify_lead',
   'qualify_lead',
   'Nome do evento GA4 disparado quando consultor marca lead como qualificado.'),
  ('ga4_event_close_convert_lead',
   'close_convert_lead',
   'Nome do evento GA4 disparado quando lead vira cliente no CRM.'),
  ('ga4_traffic_type_internal',
   'internal',
   'Valor do parâmetro traffic_type enviado ao GA4 quando visitante é interno (dev/equipe). Usado no filtro de tráfego interno do GA4.'),

  -- V4.5
  ('lcp_meta_ms',
   '2500',
   'Meta de LCP mobile em milissegundos. Alertas quando ultrapassado nas medições.'),

  -- V4.6
  ('landing_calculadora_slug',
   'calculadora-inss-de-obra',
   'Slug da landing dedicada da calculadora. Aparece também na home.')
on conflict (chave) do nothing;

-- -----------------------------------------------------------------------------
-- Verificação (opcional — rode pra conferir)
-- -----------------------------------------------------------------------------
-- select * from public.motivos_inativacao order by ordem;
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='leads' and column_name like '%_inativacao%';
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='leads' and column_name like 'utm_%';
