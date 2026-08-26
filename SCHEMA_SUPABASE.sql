-- =============================================================================
-- SCHEMA SUPABASE — Plataforma Imposto & Obra
-- Execute este arquivo no SQL Editor do Supabase (dashboard.supabase.com)
-- Ordem: extensões → tabelas → triggers → RLS policies → seeds
-- =============================================================================

-- =============================================================================
-- 1. EXTENSÕES
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================================================
-- 2. TABELA users (equipe interna)
-- =============================================================================

create table public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  nome          text,
  perfil        text not null check (perfil in ('admin', 'consultor')),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  ultimo_acesso timestamptz,
  preferencias_push jsonb not null default '{}'::jsonb,
  telegram_user_id bigint,
  telegram_username text,
  telegram_chat_id bigint,
  telegram_vinculado_em timestamptz
);

create index idx_users_email on public.users(email);
create index idx_users_ativo on public.users(ativo) where ativo = true;
create unique index uq_users_telegram_user_id on public.users(telegram_user_id)
  where telegram_user_id is not null;

-- =============================================================================
-- 3. TABELA vau (tabela por UF/destinação)
-- =============================================================================

create table public.vau (
  uf           text primary key,
  casa_popular numeric(10,2),
  comercial    numeric(10,2),
  conj_pop     numeric(10,2),
  galpao       numeric(10,2),
  res_multi    numeric(10,2),
  res_uni      numeric(10,2),
  garagens     numeric(10,2),
  vigencia     text,
  updated_at   timestamptz not null default now()
);

-- =============================================================================
-- 4. TABELA config (chave/valor)
-- =============================================================================

create table public.config (
  chave     text primary key,
  valor     text,
  descricao text,
  updated_at timestamptz not null default now()
);

-- Etapas dinâmicas do Kanban (substitui funcionalmente config.etapas_funil)
create table public.funil_etapas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  ordem      integer not null check (ordem >= 0),
  cor        text,
  e_fechada  boolean not null default false,
  criado_em  timestamptz not null default now(),
  constraint funil_etapas_nome_not_blank check (length(btrim(nome)) between 1 and 100),
  constraint funil_etapas_cor_hex check (cor is null or cor = '' or cor ~ '^#[0-9A-Fa-f]{6}$')
);
create index idx_funil_etapas_ordem on public.funil_etapas (ordem, criado_em);

-- Motivos configuráveis para retirar oportunidades do Kanban sem excluí-las
create table public.motivos_inativacao (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  rotulo            text not null,
  ordem             integer not null default 100,
  reativavel_padrao boolean not null default true,
  ativo             boolean not null default true,
  criado_em         timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_motivos_ativos on public.motivos_inativacao(ordem)
  where ativo = true;

-- =============================================================================
-- 5. TABELA leads
-- =============================================================================

create table public.leads (
  id                       uuid primary key default gen_random_uuid(),
  data_hora                timestamptz not null default now(),
  origem                   text default 'simulador',

  -- Dados pessoais
  nome                     text not null,
  ddd                      text,
  whatsapp                 text,
  email                    text,
  uf                       text,
  cidade                   text,

  -- Comercial
  produto                  text,
  status                   text not null default 'Novo Lead',
  responsavel_id           uuid references public.users(id) on delete set null,
  valor_potencial          numeric(12,2),
  observacoes              text,

  -- Ciclo de vida comercial (inativação é diferente de soft delete)
  status_ativacao          text not null default 'ativo'
                            check (status_ativacao in ('ativo','inativo')),
  motivo_inativacao_id     uuid references public.motivos_inativacao(id) on delete set null,
  detalhamento_inativacao  text,
  inativado_em             timestamptz,
  inativado_por            uuid references public.users(id) on delete set null,
  contato_futuro           boolean,
  data_contato_futuro      date,
  ultima_etapa_kanban      text,
  ultimo_contato_em        timestamptz,
  telegram_follow_up_enviado_em timestamptz,

  -- Telefone normalizado e atribuição de campanha
  telefone_normalizado     text,
  utm_source               text,
  utm_medium               text,
  utm_campaign             text,
  utm_content              text,
  utm_term                 text,
  gclid                    text,
  fbclid                   text,
  referrer                 text,
  qualificado_em           timestamptz,

  -- Inputs da obra (simulador)
  resp                     text,
  dest                     text,
  tipo                     text,
  categoria                text,
  concreto                 text,
  prefab                   text,
  a_construcao             numeric(10,2),
  a_reforma                numeric(10,2),
  a_demolicao              numeric(10,2),
  a_pcoberta               numeric(10,2),
  a_pdescoberta            numeric(10,2),
  area_total               numeric(10,2),
  area_total_calculo       numeric(10,2),
  area_principal_bruta     numeric(10,2),
  area_principal_equiv     numeric(10,2),
  pct_equivalencia         numeric(5,2),

  -- Cálculos (outputs)
  vau                      numeric(10,2),
  co                       numeric(12,2),
  rmt                      numeric(12,2),
  cmo_pct                  numeric(5,2),
  pct_categoria            numeric(5,2),
  fator_social_pct         numeric(5,2),
  aliquota_pct             numeric(6,3),
  reducao_pre_fab_pct      numeric(5,2),
  ded_concreto_usinado     numeric(12,2),
  pct_uso_usinado          numeric(5,2),
  pct_abat_usinado_cat     numeric(5,2),
  inss_direto              numeric(12,2),
  inss_reduzido            numeric(12,2),
  economia                 numeric(12,2),

  -- Informações complementares (Fase 2B — consultor preenche)
  cmpl_folha_mensal        numeric(12,2) default 0,
  cmpl_meses_folha         numeric(5,2)  default 0,
  cmpl_nf_concreto_usinado numeric(12,2) default 0,
  cmpl_nf_prefabricado     numeric(12,2) default 0,

  -- Conversão em cliente
  cliente_id               uuid,  -- FK criada depois (referência circular)
  convertido_em            timestamptz,

  -- Sistema
  legacy_id                text,  -- id da planilha antiga (para rastrear migração)
  deleted_at               timestamptz,
  updated_at               timestamptz not null default now(),
  updated_by               uuid references public.users(id) on delete set null
);

create index idx_leads_status on public.leads(status) where deleted_at is null;
create index idx_leads_responsavel on public.leads(responsavel_id) where deleted_at is null;
create index idx_leads_data on public.leads(data_hora desc) where deleted_at is null;
create index idx_leads_uf on public.leads(uf) where deleted_at is null;
create index idx_leads_ativos_kanban on public.leads(status)
  where deleted_at is null and convertido_em is null and status_ativacao = 'ativo';
create index idx_leads_inativos on public.leads(inativado_em desc)
  where deleted_at is null and status_ativacao = 'inativo';
create index idx_leads_contato_futuro on public.leads(data_contato_futuro)
  where deleted_at is null and status_ativacao = 'inativo' and contato_futuro = true;
create index idx_leads_tel_norm on public.leads(telefone_normalizado)
  where deleted_at is null;
create index idx_leads_utm_source on public.leads(utm_source)
  where utm_source is not null and deleted_at is null;
create index idx_leads_utm_campaign on public.leads(utm_campaign)
  where utm_campaign is not null and deleted_at is null;

-- =============================================================================
-- 6. TABELA clientes
-- =============================================================================

create table public.clientes (
  id                    uuid primary key default gen_random_uuid(),
  lead_id_origem        uuid references public.leads(id) on delete set null,

  -- Identificação
  nome                  text not null,
  cpf                   text,
  cnpj                  text,
  rg                    text,
  data_nascimento       date,
  estado_civil          text,
  profissao             text,

  -- Contato
  ddd                   text,
  telefone              text,
  telefone_normalizado  text,
  email                 text,

  -- Atribuição de marketing copiada do lead de origem
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,
  utm_content           text,
  utm_term              text,
  gclid                 text,
  fbclid                text,
  referrer              text,

  -- Endereço residencial
  end_logradouro        text,
  end_bairro            text,
  end_cidade            text,
  end_uf                text,
  end_cep               text,

  -- Endereço da obra
  obra_end_logradouro   text,
  obra_end_bairro       text,
  obra_end_cidade       text,
  obra_end_uf           text,
  obra_matricula        text,
  obra_iptu             text,
  obra_tipo             text,
  obra_descricao        text,

  -- Dados bancários (para reembolsos, se aplicável)
  banco                 text,
  agencia               text,
  conta                 text,
  tipo_conta            text,
  pix                   text,

  obs_contrato          text,
  link_dossie           text,
  legacy_id             text,
  criado_em             timestamptz not null default now(),
  criado_por            uuid references public.users(id) on delete set null,
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create index idx_clientes_nome on public.clientes(nome) where deleted_at is null;
create index idx_clientes_cpf on public.clientes(cpf) where deleted_at is null;
create index idx_clientes_tel_norm on public.clientes(telefone_normalizado)
  where deleted_at is null;
create index idx_clientes_utm_source on public.clientes(utm_source)
  where utm_source is not null and deleted_at is null;
create index idx_clientes_utm_campaign on public.clientes(utm_campaign)
  where utm_campaign is not null and deleted_at is null;

-- Notas privadas da vista 360 do cliente
create table public.cliente_notas (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references public.clientes(id) on delete cascade,
  autor_id     uuid references public.users(id) on delete set null,
  conteudo     text not null,
  criado_em    timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index idx_cliente_notas_cliente
  on public.cliente_notas(cliente_id, criado_em desc)
  where deleted_at is null;

create table public.eventos_agenda (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  tipo text not null check (tipo in ('reuniao','follow_up','prazo','tarefa_interna')),
  data_hora_inicio timestamptz not null,
  data_hora_fim timestamptz,
  dia_inteiro boolean not null default false,
  lembrete_minutos integer,
  lembrete_enviado_em timestamptz,
  ref_tipo text check (ref_tipo in ('lead','cliente','contrato')),
  ref_id uuid,
  criado_por uuid references public.users(id) on delete set null,
  responsavel_id uuid references public.users(id) on delete set null,
  status text not null default 'agendado' check (status in ('agendado','concluido','cancelado')),
  criado_em timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_eventos_data on public.eventos_agenda(data_hora_inicio) where deleted_at is null;
create index idx_eventos_ref on public.eventos_agenda(ref_tipo,ref_id) where deleted_at is null;
create index idx_eventos_lembrete on public.eventos_agenda(data_hora_inicio,lembrete_minutos)
  where deleted_at is null and lembrete_minutos is not null and lembrete_enviado_em is null and status='agendado';

-- Agora que clientes existe, adiciona FK em leads
alter table public.leads
  add constraint fk_leads_cliente_id
  foreign key (cliente_id) references public.clientes(id) on delete set null;

-- =============================================================================
-- 7. TABELA contratos
-- =============================================================================

create table public.contratos (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references public.clientes(id) on delete restrict,
  numero            text,
  produto           text,
  status            text not null default 'em vigor',  -- em vigor, concluído, cancelado
  valor_total       numeric(12,2),
  valor_pago        numeric(12,2) default 0,
  forma_pagamento   text,
  parcelas          integer,
  data_assinatura   date,
  data_inicio       date,
  data_conclusao    date,
  observacoes       text,
  legacy_id         text,
  criado_em         timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create index idx_contratos_cliente on public.contratos(cliente_id) where deleted_at is null;
create index idx_contratos_status on public.contratos(status) where deleted_at is null;

-- Histórico auditável dos documentos gerados para leads, clientes e contratos
create table public.documentos_gerados (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null check (tipo in ('proposta','contrato_andamento','contrato_finalizada','material_apoio')),
  ref_tipo       text not null check (ref_tipo in ('lead','cliente','contrato')),
  ref_id         uuid not null,
  nome_arquivo   text not null,
  storage_path   text,
  storage_bucket text default 'documentos',
  mime_type      text,
  tamanho_bytes  integer,
  params_json    jsonb,
  gerado_em      timestamptz not null default now(),
  gerado_por     uuid references public.users(id) on delete set null,
  observacao     text
);
create index idx_documentos_ref on public.documentos_gerados(ref_tipo, ref_id, gerado_em desc);
create index idx_documentos_tipo on public.documentos_gerados(tipo, gerado_em desc);

-- =============================================================================
-- 7.1. TABELA produtos (catálogo dinâmico de serviços)
-- =============================================================================

create table public.produtos (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique not null,
  nome                  text not null,
  descricao             text,
  template_contrato_arq text,
  ordem                 integer default 100,
  ativo                 boolean not null default true,
  criado_em             timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_produtos_ativos on public.produtos(ordem) where ativo = true;

-- =============================================================================
-- 7.2. TABELAS notificacoes e leituras individuais
-- =============================================================================

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid references public.users(id) on delete cascade,
  tipo text not null check (tipo in ('lead_novo','lead_parado','vau_desatualizada','evento_agenda','sistema')),
  titulo text not null,
  mensagem text,
  link text,
  ref_tipo text,
  ref_id uuid,
  lida boolean not null default false,
  lida_em timestamptz,
  criado_em timestamptz not null default now()
);
create index idx_notif_destinatario_naolidas on public.notificacoes(destinatario_id, criado_em desc) where lida = false;
create index idx_notif_globais_naolidas on public.notificacoes(criado_em desc) where destinatario_id is null and lida = false;

create table public.notificacoes_leituras (
  notificacao_id uuid not null references public.notificacoes(id) on delete cascade,
  usuario_id uuid not null references public.users(id) on delete cascade,
  lida_em timestamptz not null default now(),
  primary key (notificacao_id, usuario_id)
);
create index idx_notificacoes_leituras_usuario on public.notificacoes_leituras(usuario_id, lida_em desc);

-- Assinaturas Web Push por dispositivo/navegador
create table public.push_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  endpoint          text not null unique,
  p256dh            text not null,
  auth              text not null,
  device_label      text,
  user_agent        text,
  ativo             boolean not null default true,
  ultimo_envio_em   timestamptz,
  ultimo_erro       text,
  ultimo_erro_em    timestamptz,
  criado_em         timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_push_sub_user_ativas on public.push_subscriptions(user_id)
  where ativo = true;
create index idx_push_sub_ultimo_envio on public.push_subscriptions(ultimo_envio_em desc nulls last);

-- Estado transitório dos fluxos multi-step do bot Telegram
create table public.telegram_conversations (
  id uuid primary key default gen_random_uuid(),
  telegram_chat_id bigint not null,
  telegram_user_id bigint not null,
  fluxo text not null,
  estado text not null,
  contexto jsonb not null default '{}'::jsonb,
  expira_em timestamptz not null default (now() + interval '10 minutes'),
  criado_em timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (telegram_chat_id, telegram_user_id, fluxo)
);
create index idx_tg_conv_expira on public.telegram_conversations(expira_em);

-- Auditoria e idempotência dos updates recebidos do Telegram
create table public.telegram_callbacks_log (
  id uuid primary key default gen_random_uuid(),
  telegram_update_id bigint not null unique,
  telegram_user_id bigint,
  user_id uuid references public.users(id) on delete set null,
  tipo text not null,
  acao text,
  ref_tipo text,
  ref_id uuid,
  payload jsonb,
  resultado text,
  erro_detalhe text,
  criado_em timestamptz not null default now()
);
create index idx_tg_log_recente on public.telegram_callbacks_log(criado_em desc);
create index idx_tg_log_user on public.telegram_callbacks_log(user_id, criado_em desc)
  where user_id is not null;

-- Códigos temporários para vincular um usuário autenticado ao Telegram
create table public.telegram_codigos_vinculo (
  codigo text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  expira_em timestamptz not null default (now() + interval '10 minutes'),
  usado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index idx_tg_cod_expira on public.telegram_codigos_vinculo(expira_em)
  where usado_em is null;

-- =============================================================================
-- 8. TABELA atividades (timeline unificada)
-- =============================================================================

create table public.atividades (
  id              uuid primary key default gen_random_uuid(),
  ref_tipo        text not null check (ref_tipo in ('lead', 'cliente', 'contrato', 'sistema')),
  ref_id          uuid not null,
  tipo            text not null,  -- criacao, edicao, contato, nota, mudanca_status, etc
  descricao       text,
  metadata_json   jsonb,
  data_hora       timestamptz not null default now(),
  autor_id        uuid references public.users(id) on delete set null,
  legacy_id       text
);

create index idx_atividades_ref on public.atividades(ref_tipo, ref_id, data_hora desc);
create index idx_atividades_autor on public.atividades(autor_id);

-- =============================================================================
-- 9. TABELA artigos (blog)
-- =============================================================================

create table public.artigos (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  titulo            text not null,
  subtitulo         text,
  meta_description  text,
  og_image_url      text,
  conteudo_html     text not null,  -- HTML sanitizado gerado pelo editor Tiptap
  faq               jsonb default '[]'::jsonb,  -- [{pergunta, resposta}]
  schema_type       text default 'Article',
  prioridade_seo    numeric(2,1) default 0.8,
  categoria         text,
  cluster           text,  -- arquitetura SEO: Regularização, Cobranças, Erros, Custos ou Sistemas RFB
  tags              text[] default '{}',
  publicado         boolean not null default false,
  data_publicacao   timestamptz,
  autor_id          uuid references public.users(id) on delete set null,
  criado_em         timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  updated_by        uuid references public.users(id) on delete set null
);

create index idx_artigos_slug on public.artigos(slug);
create index idx_artigos_publicado on public.artigos(publicado, data_publicacao desc);
create index idx_artigos_tags on public.artigos using gin(tags);

-- =============================================================================
-- 10. TABELA cases (casos de sucesso)
-- =============================================================================

create table public.cases (
  id                uuid primary key default gen_random_uuid(),
  cliente_display   text not null,  -- nome ou apelido pra exibir
  tipo_obra         text,
  economia_valor    numeric(12,2),
  economia_pct      numeric(5,2),
  descricao         text,
  imagem_url        text,
  publicado         boolean not null default false,
  ordem             integer default 100,
  criado_em         timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_cases_publicado on public.cases(publicado, ordem);

-- =============================================================================
-- 10.1. TABELA equipe_juridica (conteúdo institucional)
-- =============================================================================

create table public.equipe_juridica (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  oab          text,
  papel        text not null,
  descricao    text,
  foto_url     text,
  ordem        integer not null default 100,
  publicado    boolean not null default true,
  criado_em    timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_equipe_publicada on public.equipe_juridica(publicado, ordem)
  where publicado = true;

-- =============================================================================
-- 11. TABELA faq (perguntas frequentes gerais)
-- =============================================================================

create table public.faq (
  id         uuid primary key default gen_random_uuid(),
  pergunta   text not null,
  resposta   text not null,
  ordem      integer default 100,
  categoria  text,
  publicado  boolean not null default true,
  criado_em  timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_faq_publicado on public.faq(publicado, ordem);

-- =============================================================================
-- 12. TRIGGERS — updated_at automático
-- =============================================================================

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated       before update on public.users        for each row execute function public.set_updated_at();
create trigger trg_leads_updated       before update on public.leads        for each row execute function public.set_updated_at();
create trigger trg_clientes_updated    before update on public.clientes     for each row execute function public.set_updated_at();
create trigger trg_cliente_notas_updated before update on public.cliente_notas for each row execute function public.set_updated_at();
create trigger trg_eventos_agenda_updated before update on public.eventos_agenda for each row execute function public.set_updated_at();
create trigger trg_contratos_updated   before update on public.contratos    for each row execute function public.set_updated_at();
create trigger trg_produtos_updated    before update on public.produtos     for each row execute function public.set_updated_at();
create trigger trg_artigos_updated     before update on public.artigos      for each row execute function public.set_updated_at();
create trigger trg_cases_updated       before update on public.cases        for each row execute function public.set_updated_at();
create trigger trg_equipe_juridica_updated before update on public.equipe_juridica for each row execute function public.set_updated_at();
create trigger trg_faq_updated         before update on public.faq          for each row execute function public.set_updated_at();
create trigger trg_vau_updated         before update on public.vau          for each row execute function public.set_updated_at();
create trigger trg_config_updated      before update on public.config       for each row execute function public.set_updated_at();
create trigger trg_motivos_inativacao_updated before update on public.motivos_inativacao for each row execute function public.set_updated_at();
create trigger trg_push_subscriptions_updated before update on public.push_subscriptions for each row execute function public.set_updated_at();
create trigger trg_tg_conv_updated before update on public.telegram_conversations for each row execute function public.set_updated_at();

-- =============================================================================
-- 13. FUNÇÃO helper: is_admin() e is_active_user()
-- =============================================================================

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

-- EXECUTE restrito a authenticated/anon (não PUBLIC — hardening)
revoke execute on function public.is_active_user() from public;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_active_user() to authenticated, anon;
grant execute on function public.is_admin() to authenticated, anon;

create or replace function public.current_active_user_id()
returns uuid language sql security definer stable
set search_path = public, pg_temp as $$
  select id from public.users
   where email = auth.jwt()->>'email' and ativo = true
   limit 1;
$$;
revoke execute on function public.current_active_user_id() from public;
grant execute on function public.current_active_user_id() to authenticated;

-- Normaliza telefones brasileiros para E.164 sem o sinal de mais.
-- A validação de DDD/celular é feita também no servidor da aplicação.
create or replace function public.normalizar_telefone_br(input text) returns text
language plpgsql immutable
set search_path = public, pg_temp as $$
declare
  digits text;
begin
  if input is null or length(trim(input)) = 0 then return null; end if;
  digits := regexp_replace(input, '\D', '', 'g');
  if length(digits) = 10 or length(digits) = 11 then
    digits := '55' || digits;
  end if;
  if length(digits) not in (12, 13) then return null; end if;
  return digits;
end;
$$;
revoke execute on function public.normalizar_telefone_br(text) from public;
grant execute on function public.normalizar_telefone_br(text) to anon, authenticated;

-- RPCs transacionais do ciclo de vida são definidas no arquivo
-- CORRECAO_RPC_CICLO_LEADS.sql e usam SECURITY INVOKER. Mantê-las separadas
-- evita duplicar aqui mais de 200 linhas de lógica operacional, sem ocultar
-- que fazem parte do schema atual.

-- RPC para atualizar ultimo_acesso do próprio usuário (chamada no callback OAuth)
-- SECURITY DEFINER porque UPDATE em users é restrito a admin pela policy geral,
-- mas queremos permitir que qualquer usuário ativo atualize apenas o próprio
-- ultimo_acesso (nada mais).
create or replace function public.registrar_ultimo_acesso() returns void as $$
begin
  update public.users
     set ultimo_acesso = now()
   where email = auth.jwt()->>'email'
     and ativo = true;
end;
$$ language plpgsql
   security definer
   volatile
   set search_path = public, pg_temp;

revoke execute on function public.registrar_ultimo_acesso() from public;
grant execute on function public.registrar_ultimo_acesso() to authenticated;

-- Conversão atômica: preserva a atribuição de marketing no cliente.
create or replace function public.converter_lead_em_cliente(p_lead_id uuid)
returns uuid
language plpgsql
security invoker
volatile
set search_path = public, pg_temp
as $$
declare
  v_cliente_id uuid;
  v_autor_id uuid;
begin
  if not public.is_active_user() then raise exception 'Usuário não autorizado'; end if;

  select id into v_autor_id from public.users
   where email = auth.jwt()->>'email' and ativo = true;

  if exists (select 1 from public.leads where id = p_lead_id
    and deleted_at is null and cliente_id is not null) then
    raise exception 'Lead já convertido';
  end if;

  insert into public.clientes (
    lead_id_origem, nome, ddd, telefone, telefone_normalizado, email,
    obra_end_cidade, obra_end_uf, obra_tipo, criado_por,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    gclid, fbclid, referrer
  )
  select id, nome, ddd, whatsapp, telefone_normalizado, email,
    cidade, uf, tipo, v_autor_id,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    gclid, fbclid, referrer
  from public.leads where id = p_lead_id
    and deleted_at is null and cliente_id is null
  returning id into v_cliente_id;

  if v_cliente_id is null then raise exception 'Lead não encontrado ou já convertido'; end if;

  update public.leads set cliente_id = v_cliente_id, convertido_em = now(),
    status = 'Fechado — ganho', updated_by = v_autor_id
  where id = p_lead_id;

  insert into public.atividades (ref_tipo, ref_id, tipo, descricao, autor_id, metadata_json)
  values ('lead', p_lead_id, 'conversao_cliente', 'Lead convertido em cliente',
    v_autor_id, jsonb_build_object('cliente_id', v_cliente_id, 'lead_id', p_lead_id));
  insert into public.atividades (ref_tipo, ref_id, tipo, descricao, autor_id, metadata_json)
  values ('cliente', v_cliente_id, 'criacao', 'Cliente criado a partir de lead',
    v_autor_id, jsonb_build_object('lead_id', p_lead_id, 'cliente_id', v_cliente_id));
  return v_cliente_id;
end;
$$;

revoke execute on function public.converter_lead_em_cliente(uuid) from public;
revoke execute on function public.converter_lead_em_cliente(uuid) from anon;
grant execute on function public.converter_lead_em_cliente(uuid) to authenticated;

-- =============================================================================
-- 14. ROW LEVEL SECURITY
-- =============================================================================

-- Habilita RLS em todas as tabelas
alter table public.users        enable row level security;
alter table public.vau          enable row level security;
alter table public.config       enable row level security;
alter table public.funil_etapas enable row level security;
alter table public.motivos_inativacao enable row level security;
alter table public.leads        enable row level security;
alter table public.clientes     enable row level security;
alter table public.cliente_notas enable row level security;
alter table public.eventos_agenda enable row level security;
alter table public.contratos    enable row level security;
alter table public.documentos_gerados enable row level security;
alter table public.produtos     enable row level security;
alter table public.notificacoes enable row level security;
alter table public.notificacoes_leituras enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.telegram_conversations enable row level security;
alter table public.telegram_callbacks_log enable row level security;
alter table public.telegram_codigos_vinculo enable row level security;
alter table public.atividades   enable row level security;
alter table public.artigos      enable row level security;
alter table public.cases        enable row level security;
alter table public.equipe_juridica enable row level security;
alter table public.faq          enable row level security;

-- -------- USERS --------
-- Só admin pode gerenciar usuários
create policy users_select_active on public.users
  for select using (public.is_active_user());
create policy users_insert_admin on public.users
  for insert with check (public.is_admin());
create policy users_update_admin on public.users
  for update using (public.is_admin());
create policy users_delete_admin on public.users
  for delete using (public.is_admin());

-- -------- VAU --------
-- SELECT liberado para todo mundo (público lê da calculadora)
create policy vau_select_public on public.vau
  for select to anon, authenticated using (true);
-- Só admin edita
create policy vau_write_admin on public.vau
  for all using (public.is_admin()) with check (public.is_admin());

-- -------- CONFIG --------
-- SELECT só para usuários ativos; edição só admin
create policy config_select_active on public.config
  for select using (public.is_active_user());
create policy config_write_admin on public.config
  for all using (public.is_admin()) with check (public.is_admin());

-- -------- FUNIL_ETAPAS --------
create policy funil_etapas_select_active on public.funil_etapas
  for select to authenticated using (public.is_active_user());
create policy funil_etapas_insert_admin on public.funil_etapas
  for insert to authenticated with check (public.is_admin());
create policy funil_etapas_update_admin on public.funil_etapas
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy funil_etapas_delete_admin on public.funil_etapas
  for delete to authenticated using (public.is_admin());

-- -------- MOTIVOS_INATIVACAO --------
create policy motivos_select_active on public.motivos_inativacao
  for select to authenticated using (public.is_active_user());
create policy motivos_write_admin on public.motivos_inativacao
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- -------- LEADS --------
-- IMPORTANTE: inserts em leads NÃO usam RLS.
-- Todos passam pelo endpoint /api/leads (Next.js), que valida com Zod e usa
-- SUPABASE_SERVICE_ROLE_KEY (bypassa RLS). Não criamos policy INSERT anon aqui
-- pra evitar chamadas diretas à Data API sem validação.
create policy leads_select_active on public.leads
  for select using (public.is_active_user());
create policy leads_update_active on public.leads
  for update using (public.is_active_user()) with check (public.is_active_user());
create policy leads_delete_admin on public.leads
  for delete using (public.is_admin());

-- -------- CLIENTES --------
create policy clientes_select_active on public.clientes
  for select using (public.is_active_user());
create policy clientes_insert_active on public.clientes
  for insert with check (public.is_active_user());
create policy clientes_update_active on public.clientes
  for update to authenticated
  using ((select public.is_active_user()) and (deleted_at is null or (select public.is_admin())))
  with check ((select public.is_active_user()) and (deleted_at is null or (select public.is_admin())));
create policy clientes_delete_admin on public.clientes
  for delete using (public.is_admin());

-- -------- CLIENTE_NOTAS --------
create policy cliente_notas_select_active on public.cliente_notas
  for select using (public.is_active_user());
create policy cliente_notas_insert_own on public.cliente_notas
  for insert to authenticated
  with check (autor_id = public.current_active_user_id());
create policy cliente_notas_update_author_or_admin on public.cliente_notas
  for update to authenticated
  using (autor_id = public.current_active_user_id() or public.is_admin())
  with check (autor_id = public.current_active_user_id() or public.is_admin());
create policy cliente_notas_delete_admin on public.cliente_notas
  for delete using (public.is_admin());

-- -------- EVENTOS_AGENDA --------
create policy eventos_select_active on public.eventos_agenda
  for select using (public.is_active_user());
create policy eventos_insert_own on public.eventos_agenda
  for insert to authenticated with check (criado_por = public.current_active_user_id());
create policy eventos_update_active on public.eventos_agenda
  for update to authenticated using (public.is_active_user()) with check (public.is_active_user());
create policy eventos_delete_admin on public.eventos_agenda
  for delete to authenticated using (public.is_admin());
revoke update on table public.eventos_agenda from authenticated;
grant update (titulo,descricao,tipo,data_hora_inicio,data_hora_fim,dia_inteiro,lembrete_minutos,ref_tipo,ref_id,responsavel_id,status)
  on table public.eventos_agenda to authenticated;

-- -------- CONTRATOS --------
create policy contratos_select_active on public.contratos
  for select using (public.is_active_user());
create policy contratos_insert_active on public.contratos
  for insert with check (public.is_active_user());
create policy contratos_update_active on public.contratos
  for update to authenticated
  using ((select public.is_active_user()) and (deleted_at is null or (select public.is_admin())))
  with check ((select public.is_active_user()) and (deleted_at is null or (select public.is_admin())));
create policy contratos_delete_admin on public.contratos
  for delete using (public.is_admin());

-- -------- DOCUMENTOS_GERADOS --------
create policy documentos_select_active on public.documentos_gerados
  for select to authenticated using (public.is_active_user());
create policy documentos_insert_active on public.documentos_gerados
  for insert to authenticated with check (public.is_active_user());
create policy documentos_delete_admin on public.documentos_gerados
  for delete to authenticated using (public.is_admin());

-- -------- PRODUTOS --------
create policy produtos_select_active on public.produtos
  for select using (public.is_active_user());
create policy produtos_write_admin on public.produtos
  for all using (public.is_admin()) with check (public.is_admin());

-- -------- NOTIFICACOES --------
create policy notif_select_own on public.notificacoes
  for select to authenticated using (
    public.is_active_user() and (
      destinatario_id is null or destinatario_id = public.current_active_user_id()
    )
  );
create policy notif_delete_admin on public.notificacoes
  for delete to authenticated using (public.is_admin());
-- INSERT somente via service_role.

create policy notif_leituras_select_own on public.notificacoes_leituras
  for select to authenticated using (usuario_id = public.current_active_user_id());
create policy notif_leituras_insert_own on public.notificacoes_leituras
  for insert to authenticated with check (usuario_id = public.current_active_user_id());
create policy notif_leituras_update_own on public.notificacoes_leituras
  for update to authenticated
  using (usuario_id = public.current_active_user_id())
  with check (usuario_id = public.current_active_user_id());

-- -------- PUSH_SUBSCRIPTIONS --------
create policy push_sub_select_own on public.push_subscriptions
  for select to authenticated using (
    public.is_active_user()
    and user_id = public.current_active_user_id()
  );
create policy push_sub_insert_own on public.push_subscriptions
  for insert to authenticated with check (
    public.is_active_user()
    and user_id = public.current_active_user_id()
  );
create policy push_sub_update_own on public.push_subscriptions
  for update to authenticated
  using (
    public.is_active_user()
    and user_id = public.current_active_user_id()
  )
  with check (
    public.is_active_user()
    and user_id = public.current_active_user_id()
  );
create policy push_sub_delete_own on public.push_subscriptions
  for delete to authenticated using (
    public.is_active_user()
    and user_id = public.current_active_user_id()
  );
create policy push_sub_admin_all on public.push_subscriptions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
revoke all on table public.push_subscriptions from anon;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;

-- -------- TELEGRAM --------
-- Conversas são operadas exclusivamente pelo webhook com service_role.
create policy tg_conv_admin_all on public.telegram_conversations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
revoke all on table public.telegram_conversations from anon, authenticated;

-- Logs são escritos pelo webhook; administradores podem consultar auditoria.
create policy tg_log_admin_read on public.telegram_callbacks_log
  for select to authenticated using (public.is_admin());
revoke all on table public.telegram_callbacks_log from anon, authenticated;
grant select on table public.telegram_callbacks_log to authenticated;

-- Cada usuário ativo gerencia somente os próprios códigos temporários.
create policy tg_cod_own on public.telegram_codigos_vinculo
  for all to authenticated
  using (
    public.is_active_user()
    and user_id = public.current_active_user_id()
  )
  with check (
    public.is_active_user()
    and user_id = public.current_active_user_id()
  );
revoke all on table public.telegram_codigos_vinculo from anon;
grant select, insert, update, delete
  on table public.telegram_codigos_vinculo to authenticated;

-- -------- ATIVIDADES --------
create policy atividades_select_active on public.atividades
  for select using (public.is_active_user());
create policy atividades_insert_active on public.atividades
  for insert to authenticated with check (public.is_active_user());
-- Nota: inserts vindos do webhook /api/leads passam pela SUPABASE_SERVICE_ROLE_KEY
-- (bypassa RLS), então não é necessário permitir anon aqui.
create policy atividades_update_admin on public.atividades
  for update using (public.is_admin()) with check (public.is_admin());
create policy atividades_delete_admin on public.atividades
  for delete using (public.is_admin());

-- -------- ARTIGOS --------
-- SELECT: público lê só publicados; usuário ativo lê tudo
create policy artigos_select_public on public.artigos
  for select to anon using (publicado = true);
create policy artigos_select_active on public.artigos
  for select to authenticated using (public.is_active_user());
create policy artigos_write_active on public.artigos
  for all to authenticated using (public.is_active_user()) with check (public.is_active_user());

-- -------- CASES --------
create policy cases_select_public on public.cases
  for select to anon using (publicado = true);
create policy cases_select_active on public.cases
  for select to authenticated using (public.is_active_user());
create policy cases_write_active on public.cases
  for all to authenticated using (public.is_active_user()) with check (public.is_active_user());

-- -------- EQUIPE JURÍDICA --------
create policy equipe_select_public on public.equipe_juridica
  for select to anon using (publicado = true);
create policy equipe_select_active on public.equipe_juridica
  for select to authenticated using (public.is_active_user());
create policy equipe_write_admin on public.equipe_juridica
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on table public.equipe_juridica to anon;
grant select, insert, update, delete on table public.equipe_juridica to authenticated;

-- -------- FAQ --------
create policy faq_select_public on public.faq
  for select to anon using (publicado = true);
create policy faq_select_active on public.faq
  for select to authenticated using (public.is_active_user());
create policy faq_write_active on public.faq
  for all to authenticated using (public.is_active_user()) with check (public.is_active_user());

-- =============================================================================
-- 15. SEEDS — dados iniciais
-- =============================================================================

-- Usuário admin inicial (Paulo). SUBSTITUA o email pelo seu real antes de rodar.
insert into public.users (email, nome, perfil, ativo)
values ('pauloricardos@me.com', 'Paulo Ricardo', 'admin', true)
on conflict (email) do nothing;

insert into public.produtos (slug, nome, descricao, template_contrato_arq, ordem, ativo) values
  ('obra_andamento', 'Regularização de obra em andamento', 'Regularização de INSS de obra que ainda está em execução.', 'contrato_obra_andamento.docx', 10, true),
  ('obra_finalizada', 'Regularização de obra finalizada', 'Regularização de INSS de obra já concluída.', 'contrato_obra_finalizada.docx', 20, true)
on conflict (slug) do nothing;

insert into public.motivos_inativacao (slug, rotulo, ordem, reativavel_padrao) values
  ('sem_resposta', 'Sem resposta após tentativas de contato', 10, true),
  ('desistiu_contratacao', 'Desistiu da contratação', 20, true),
  ('proposta_preco', 'Proposta não aceita — preço', 30, true),
  ('proposta_condicoes', 'Proposta não aceita — condições comerciais', 40, true),
  ('contratou_outro', 'Contratou outro fornecedor', 50, false),
  ('decidiu_nao_realizar', 'Decidiu não realizar o serviço', 60, false),
  ('adiou_decisao', 'Adiou a decisão / sem previsão', 70, true),
  ('sem_orcamento', 'Sem orçamento no momento', 80, true),
  ('fora_escopo', 'Demanda fora do escopo', 90, false),
  ('nao_qualificado', 'Lead não qualificado', 100, false),
  ('contato_invalido', 'Contato inválido / não localizado', 110, false),
  ('duplicado', 'Duplicado', 120, false),
  ('ja_era_cliente', 'Já era cliente', 130, false),
  ('outro', 'Outro', 900, true)
on conflict (slug) do nothing;

-- Config default
insert into public.config (chave, valor, descricao) values
  ('etapas_funil', 'Novo Lead,Contato iniciado,Em negociacao,Proposta enviada,Aguardando resposta,Fechado — ganho,Fechado — perdido,Sem retorno', 'Etapas do Kanban (separadas por vírgula)'),
  ('msg_whatsapp_padrao', 'Ola {nome}! Sou consultor da Imposto & Obra. Vimos sua simulacao de INSS e podemos te ajudar a regularizar a obra. Posso te enviar uma proposta?', 'Mensagem padrão de WhatsApp'),
  ('produtos', 'obra_andamento,obra_finalizada', 'Produtos ativos do CRM'),
  ('vau_vigencia', 'Maio/2026', 'Vigência atual da tabela VAU'),
  ('agenda_lembrete_default_min', '1440', 'Minutos antes do evento para lembrete padrão'),
  ('resend_from_email', 'agenda@impostoeobra.com.br', 'Email remetente dos lembretes da agenda'),
  ('resend_from_name', 'Imposto & Obra — Agenda', 'Nome exibido no remetente dos lembretes'),
  ('dpo_nome', 'Paulo Ricardo da Silva Santana', 'Nome do Encarregado de Dados Pessoais (DPO)'),
  ('empresa_email_privacidade', '', 'Email do DPO; usa empresa_email quando vazio'),
  ('empresa_whatsapp_e164', '5561993982653', 'WhatsApp institucional em formato E.164, somente dígitos, usado nos links do site'),
  ('whatsapp_msg_cliente_default', '', 'Mensagem opcional ao abrir o WhatsApp de um cliente; vazia abre o chat direto'),
  ('notif_lead_parado_dias', '7', 'Dias sem atualização para alertar no sininho, Web Push e Telegram sobre lead parado'),
  ('notif_vau_max_dias', '30', 'Dias máximos sem atualização da tabela VAU'),
  ('inativacao_reativar_horario_padrao', '09:00', 'Horário padrão do follow-up criado ao inativar um lead'),
  ('ga4_event_simulacao_iniciada', 'simulacao_iniciada', 'Evento GA4 ao iniciar a simulação'),
  ('ga4_event_generate_lead', 'generate_lead', 'Evento GA4 após persistir um lead'),
  ('ga4_event_qualify_lead', 'qualify_lead', 'Evento GA4 ao qualificar um lead'),
  ('ga4_event_close_convert_lead', 'close_convert_lead', 'Evento GA4 ao converter lead em cliente'),
  ('ga4_traffic_type_internal', 'internal', 'Valor de traffic_type para navegadores internos'),
  ('lcp_meta_ms', '2500', 'Meta de LCP mobile em milissegundos'),
  ('landing_calculadora_slug', 'calculadora-inss-de-obra', 'Slug da landing dedicada da calculadora'),
  ('horario_atendimento_dias', 'Segunda a sexta', 'Dias de atendimento'),
  ('horario_atendimento_horas', 'Das 09h às 19h', 'Horas de atendimento'),
  ('horario_atendimento_fuso', 'horário de Brasília', 'Fuso do atendimento'),
  ('home_qtd_cases', '2', 'Quantidade de cases exibidos na home'),
  ('push_habilitado', 'true', 'Habilita o envio de Web Push; o sininho continua funcionando quando desabilitado'),
  ('push_notificar_lead_novo', 'true', 'Envia push para novos leads'),
  ('push_notificar_lead_parado', 'true', 'Envia push para leads parados'),
  ('push_notificar_vau_desatualizada', 'true', 'Envia push quando a tabela VAU está desatualizada'),
  ('push_notificar_evento_agenda', 'true', 'Envia push para lembretes da agenda'),
  ('push_notificar_sistema', 'true', 'Envia push para alertas gerais do sistema'),
  ('push_titulo_ativar', 'Ativar notificações neste dispositivo', 'Título do card de ativação no CRM'),
  ('push_descricao_ativar', 'Você recebe alertas de novos leads, prazos e lembretes direto no celular, mesmo com o app fechado. Não usamos para nada além disso.', 'Descrição do card de ativação no CRM'),
  ('push_icone_padrao', '/icons/icon-192.png', 'Ícone padrão das notificações push'),
  ('push_badge_padrao', '/icons/badge-72.png', 'Badge monocromático das notificações Android')
on conflict (chave) do nothing;

insert into public.config (chave, valor, descricao) values
  ('telegram_habilitado', 'true', 'Habilita o bot interno do Telegram'),
  ('telegram_chat_id_grupo_operacao', '', 'Chat ID do grupo interno de operação'),
  ('telegram_notificar_lead_novo', 'true', 'Envia alertas de novos leads ao grupo'),
  ('telegram_notificar_lead_parado', 'true', 'Envia alertas de leads parados ao grupo'),
  ('telegram_notificar_follow_up_inativo', 'true', 'Envia follow-ups de leads inativos ao grupo'),
  ('telegram_conversation_timeout_min', '10', 'Timeout dos fluxos multi-step em minutos'),
  ('telegram_link_base_crm', 'https://impostoeobra.com.br', 'Domínio base dos links para o CRM'),
  ('telegram_msg_vincular_inicio', 'Olá! Para vincular este Telegram ao seu usuário do CRM, envie o código de vínculo que aparece em /admin/configuracoes/telegram.', 'Início do fluxo de vínculo'),
  ('telegram_msg_vincular_sucesso', '✅ Vinculado com sucesso. Agora você recebe alertas e pode agir nos leads pelo Telegram.', 'Confirmação do vínculo'),
  ('telegram_msg_vincular_erro', '❌ Código inválido ou expirado. Gere um novo em /admin/configuracoes/telegram', 'Erro de vínculo'),
  ('telegram_msg_nao_autorizado', '🚫 Você não está autorizado. Peça pro admin vincular seu Telegram.', 'Resposta para usuário não autorizado'),
  ('telegram_msg_ajuda', 'Bot interno da Imposto & Obra. Comandos: /vincular, /chatid e /ajuda.', 'Ajuda do bot'),
  ('telegram_msg_fluxo_expirado', '⏱️ Esta ação expirou. Clique novamente no botão do lead.', 'Aviso de fluxo expirado'),
  ('telegram_msg_inicio_generico', 'Envie /vincular para começar.', 'Resposta genérica sem revelar funções internas'),
  ('telegram_msg_codigo_apenas_privado', 'Por segurança, envie o código somente no chat privado com o bot.', 'Aviso de código publicado em grupo'),
  ('telegram_msg_acao_indisponivel', 'Esta ação ainda não está disponível.', 'Resposta para callback desconhecido'),
  ('telegram_msg_lead_assumido', '✅ Lead assumido por {nome}.', 'Confirmação ao assumir um lead'),
  ('telegram_msg_lead_ja_assumido', 'Lead já assumido por {nome}.', 'Aviso de lead que já possui responsável'),
  ('telegram_msg_contato_resultado', 'Qual foi o resultado do contato?', 'Pergunta do fluxo de contato realizado'),
  ('telegram_msg_contato_data', 'Quando devemos retomar o contato?', 'Pergunta de data do follow-up'),
  ('telegram_msg_contato_concluido', '✅ Contato registrado: {resultado}.', 'Confirmação de contato encerrado'),
  ('telegram_msg_followup_marcado', '✅ Follow-up marcado para {data}.', 'Confirmação de follow-up criado'),
  ('telegram_msg_followup_reativado', '✅ Reativado por {nome} na etapa {etapa}.', 'Confirmação de lead reativado pelo Telegram'),
  ('telegram_msg_followup_adiado', '✅ Retomada adiada para {data} por {nome}.', 'Confirmação de follow-up adiado pelo Telegram'),
  ('telegram_msg_perder_motivo', 'Por que este lead foi perdido definitivamente?', 'Pergunta do fluxo de perda definitiva'),
  ('telegram_msg_lead_perdido', '✅ Lead marcado como perdido: {motivo}.', 'Confirmação de perda definitiva'),
  ('telegram_msg_lead_indisponivel', 'Este lead não está mais disponível para esta ação.', 'Aviso para lead indisponível'),
  ('telegram_msg_erro_generico', 'Não foi possível concluir esta ação agora.', 'Mensagem segura de erro em callbacks'),
  ('telegram_template_lead_novo', '🆕 <b>Novo lead</b>\n<b>{primeiro_nome}</b> — {uf}\nDestinação: {destinacao_legivel}\nÁrea equivalente: {area_m2} m²\nINSS estimado: R$ {inss_estimado}\nEconomia potencial: R$ {economia_potencial}', 'Template de alerta de lead novo'),
  ('telegram_template_lead_parado', '⚠️ <b>Lead parado há {dias_parado} dias</b>\n<b>{primeiro_nome}</b> — {uf}\nEtapa: {status}\nÚltima atualização: {ultima_atualizacao}', 'Template de alerta de lead parado'),
  ('telegram_template_follow_up_inativo', '⏰ <b>Retomar contato</b>\nLead: <b>{primeiro_nome}</b> — {uf}\nInativado em: {inativado_em} ({dias_desde} dias atrás)\nMotivo: {motivo}\nData marcada para retomar: hoje', 'Template de follow-up inativo'),
  ('telegram_btn_assumir', '🙋 Assumir', 'Rótulo do botão Assumir'),
  ('telegram_btn_contato_realizado', '✅ Contato realizado', 'Rótulo do botão Contato realizado'),
  ('telegram_btn_whatsapp', '💬 WhatsApp', 'Rótulo do botão WhatsApp'),
  ('telegram_btn_ver_no_crm', '🔗 Ver no CRM', 'Rótulo do botão CRM'),
  ('telegram_btn_reativar', '📞 Retomar contato', 'Rótulo do botão Reativar'),
  ('telegram_btn_adiar', '📅 Adiar 7 dias', 'Rótulo do botão Adiar'),
  ('telegram_btn_perder', '❌ Perder de vez', 'Rótulo do botão Perder'),
  ('telegram_adiar_dias', '7', 'Quantidade de dias do botão Adiar no follow-up inativo'),
  ('telegram_contato_resultados', '[{"slug":"interessado","rotulo":"👍 Interessado","encerra":true},{"slug":"vai_pensar","rotulo":"🤔 Vai pensar","encerra":false},{"slug":"sem_interesse","rotulo":"❌ Sem interesse","encerra":true},{"slug":"sem_resposta","rotulo":"📵 Sem resposta","encerra":false}]', 'Resultados do contato'),
  ('telegram_contato_datas_retomar', '[{"dias":1,"rotulo":"Amanhã"},{"dias":3,"rotulo":"3 dias"},{"dias":7,"rotulo":"1 semana"}]', 'Datas de retomada'),
  ('telegram_perder_motivos', '[{"slug":"contratou_outro","rotulo":"Contratou outro fornecedor"},{"slug":"sem_orcamento","rotulo":"Sem orçamento"},{"slug":"fora_escopo","rotulo":"Fora do escopo"},{"slug":"decidiu_nao_realizar","rotulo":"Decidiu não realizar"}]', 'Motivos de perda'),
  ('telegram_cron_follow_up_horario', '08:00', 'Horário informativo do cron Telegram')
on conflict (chave) do nothing;

insert into public.equipe_juridica (nome, oab, papel, descricao, ordem, publicado)
select 'Dr. Paulo Ricardo da Silva Santana', 'OAB/DF nº 72.326',
  'Advogado tributarista · Fundador',
  'Responsável pela estratégia jurídica da consultoria, análise de cobranças, aplicação de reduções legais e impugnações administrativas perante a Receita Federal.',
  10, true
where not exists (
  select 1 from public.equipe_juridica where nome = 'Dr. Paulo Ricardo da Silva Santana'
);

insert into public.equipe_juridica (nome, oab, papel, descricao, ordem, publicado)
select 'Dr. Wenderson Siqueira', 'OAB/DF nº 57.162',
  'Advogado tributarista · Consultor parceiro',
  'Atua em temas de direito tributário e previdenciário aplicados à construção civil, reforçando o time em casos complexos e na estratégia processual.',
  20, true
where not exists (
  select 1 from public.equipe_juridica where nome = 'Dr. Wenderson Siqueira'
);

insert into public.funil_etapas (nome, ordem, cor, e_fechada) values
  ('Novo Lead', 0, '#0B76C6', false),
  ('Contato iniciado', 1, '#2563EB', false),
  ('Em negociacao', 2, '#7C3AED', false),
  ('Proposta enviada', 3, '#D97706', false),
  ('Aguardando resposta', 4, '#EA580C', false),
  ('Fechado — ganho', 5, '#3AB97A', true),
  ('Fechado — perdido', 6, '#D93025', true),
  ('Sem retorno', 7, '#5B6265', false);

-- Tabela VAU inicial (Maio/2026)
insert into public.vau (uf, casa_popular, comercial, conj_pop, galpao, res_multi, res_uni, garagens, vigencia) values
  ('AC', 2086.46, 3865.27, 2086.46, 1786.91, 3490.36, 4129.57, 3865.27, 'Maio/2026'),
  ('AL', 1326.26, 2400.63, 1326.26, 1121.31, 2146.17, 2490.35, 2400.63, 'Maio/2026'),
  ('AM', 2086.46, 3865.27, 2086.46, 1786.91, 3490.36, 4129.57, 3865.27, 'Maio/2026'),
  ('AP', 1851.74, 3296.17, 1851.74, 1566.69, 2903.45, 3287.40, 3296.17, 'Maio/2026'),
  ('BA', 1448.29, 2572.22, 1448.29, 1167.02, 2245.86, 2679.67, 2572.22, 'Maio/2026'),
  ('CE', 1650.76, 2769.59, 1650.76, 1312.04, 2433.20, 2801.99, 2769.59, 'Maio/2026'),
  ('DF', 1546.41, 2803.27, 1546.41, 1253.78, 2449.56, 2826.93, 2803.27, 'Maio/2026'),
  ('ES', 1865.69, 3140.88, 1865.69, 1423.27, 2818.57, 3312.94, 3140.88, 'Maio/2026'),
  ('GO', 1477.94, 2633.19, 1477.94, 1230.56, 2312.98, 2770.41, 2633.19, 'Maio/2026'),
  ('MA', 1277.75, 2233.21, 1277.75, 1065.62, 2186.92, 2286.30, 2233.21, 'Maio/2026'),
  ('MG', 1680.14, 2912.20, 1680.14, 1281.12, 2593.71, 2989.71, 2912.20, 'Maio/2026'),
  ('MS', 1258.32, 2283.21, 1258.32, 1029.23, 1836.95, 2193.11, 2283.21, 'Maio/2026'),
  ('MT', 2163.37, 3852.54, 2163.37, 1694.16, 3390.30, 3901.07, 3852.54, 'Maio/2026'),
  ('PA', 1611.44, 2793.12, 1611.44, 1320.85, 2480.80, 2839.89, 2793.12, 'Maio/2026'),
  ('PB', 1105.26, 2034.41, 1105.26,  935.03, 1809.84, 2042.34, 2034.41, 'Maio/2026'),
  ('PE', 1511.88, 2586.33, 1511.88, 1183.59, 2278.99, 2725.06, 2586.33, 'Maio/2026'),
  ('PI', 1277.75, 2233.21, 1277.75, 1065.62, 1971.74, 2286.30, 2233.21, 'Maio/2026'),
  ('PR', 1778.84, 3166.84, 1778.84, 1419.42, 2769.46, 3251.41, 3166.84, 'Maio/2026'),
  ('RJ', 1685.83, 2955.88, 1685.83, 1342.15, 2598.80, 3018.81, 2955.88, 'Maio/2026'),
  ('RN', 1490.31, 2465.68, 1490.31, 1185.36, 2215.72, 2580.83, 2465.68, 'Maio/2026'),
  ('RO', 1692.90, 2964.04, 1692.90, 1321.58, 2620.71, 2880.01, 2964.04, 'Maio/2026'),
  ('RR', 1862.65, 3500.38, 1862.65, 1677.86, 3072.41, 3584.71, 3500.38, 'Maio/2026'),
  ('RS', 1805.49, 3543.36, 1805.49, 1374.90, 2987.99, 3375.12, 3543.36, 'Maio/2026'),
  ('SC', 1942.00, 3320.29, 1942.00, 1535.94, 2889.50, 3405.28, 3320.29, 'Maio/2026'),
  ('SE', 1359.52, 2516.85, 1359.52, 1157.20, 2247.24, 2480.88, 2516.85, 'Maio/2026'),
  ('SP', 1476.87, 2614.71, 1476.87, 1231.83, 2296.89, 2633.50, 2614.71, 'Maio/2026'),
  ('TO', 1477.94, 2633.19, 1477.94, 1230.56, 2312.98, 2770.41, 2633.19, 'Maio/2026')
on conflict (uf) do nothing;

-- =============================================================================
-- 16. STORAGE — bucket para imagens de artigos e OG
-- =============================================================================

-- Executar via dashboard Supabase (Storage > Create Bucket):
--   nome: og-images
--   public: true (imagens OG precisam ser públicas)
--   file size limit: 5 MB
--   allowed MIME types: image/png, image/jpeg, image/webp
--
-- Policies (SQL para depois de criar o bucket):
-- insert into storage.buckets (id, name, public) values ('og-images', 'og-images', true);
-- create policy "og_images_public_read" on storage.objects for select to anon using (bucket_id = 'og-images');
-- create policy "og_images_admin_write" on storage.objects for insert to authenticated with check (bucket_id = 'og-images' and public.is_active_user());
-- create policy "og_images_admin_update" on storage.objects for update to authenticated using (bucket_id = 'og-images' and public.is_active_user());
-- create policy "og_images_admin_delete" on storage.objects for delete to authenticated using (bucket_id = 'og-images' and public.is_active_user());

-- Bucket privado de templates DOCX. A substituição com upsert exige as três
-- permissões abaixo (SELECT + INSERT + UPDATE). Apenas administradores podem
-- ler ou alterar os arquivos-base usados na geração de documentos.
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

-- =============================================================================
-- FIM DO SCHEMA
-- =============================================================================

-- Após executar tudo, rodar no dashboard Supabase:
--   1. Authentication > Providers > Google (habilitar OAuth)
--   2. Storage > New bucket 'og-images' (público, 5MB max)
--   3. Adicionar policies do storage (comentadas acima)
--   4. Copiar SUPABASE_URL e SUPABASE_ANON_KEY para o .env do projeto Next.js
