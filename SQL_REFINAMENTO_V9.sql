-- =============================================================================
-- SQL de suporte ao pacote de refinamento V9 (Diagnóstico Preliminar)
-- Rodar UMA vez no SQL Editor do Supabase antes de iniciar a branch v9/1.
-- Idempotente (create if not exists, drop policy if exists, on conflict do nothing).
--
-- Contém:
--   V9.1 — Sequence para numeração pública dos diagnósticos
--   V9.2 — Tabela diagnosticos_preliminares (metadados + trilha)
--   V9.3 — Chaves em config (kill switch, limite de "sem redução", templates)
--   V9.4 — Nota sobre bucket de Storage (a criar via UI do Supabase)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- V9.1 — Sequence para numeração pública
-- Formato final: "2026-08-31/1042" — data + número sequencial diário
-- -----------------------------------------------------------------------------

create sequence if not exists public.diagnostico_seq;

comment on sequence public.diagnostico_seq is
  'Sequence sequencial global para numeração pública dos diagnósticos preliminares. Cada diagnóstico recebe um número único; a data é adicionada como prefixo na apresentação (ex: "2026-08-31/1042" onde 1042 vem desta sequence).';

-- PostgREST não expõe nextval() diretamente. Esta RPC é restrita ao service_role
-- e permite obter o próximo número sem abrir a sequence ao cliente público.
create or replace function public.proximo_numero_diagnostico()
returns bigint
language sql
security definer
volatile
set search_path = public, pg_temp
as $$
  select nextval('public.diagnostico_seq');
$$;

revoke execute on function public.proximo_numero_diagnostico() from public, anon, authenticated;
grant execute on function public.proximo_numero_diagnostico() to service_role;

-- -----------------------------------------------------------------------------
-- V9.2 — Tabela diagnosticos_preliminares
-- -----------------------------------------------------------------------------

create table if not exists public.diagnosticos_preliminares (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references public.leads(id) on delete cascade,
  numero_publico    text not null,                              -- "2026-08-31/1042" (armazenado montado pra evitar recalcular)
  variante          text not null check (variante in ('com_reducao', 'sem_reducao')),
  economia_pct      numeric(5,2),                               -- snapshot no momento da geração
  economia_valor    numeric(14,2),                              -- snapshot
  inss_apurado      numeric(14,2),                              -- snapshot
  inss_reduzido     numeric(14,2),                              -- snapshot
  storage_path      text not null,                              -- ex: 'diagnosticos/{lead_id}/v1.pdf'
  storage_bucket    text not null default 'diagnosticos-preliminares',
  versao_template   text,                                       -- ex: 'v1.0' — pra rastrear que template foi usado
  gerado_em         timestamptz not null default now(),
  regenerado_em     timestamptz,                                -- setado quando é regerado por atualização de lead ou mudança de template
  regeracoes_count  integer not null default 0,
  criado_em         timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (lead_id)                                              -- 1 diagnóstico ativo por lead (regenerar sobrescreve)
);

create index if not exists idx_diagnosticos_por_lead
  on public.diagnosticos_preliminares(lead_id);

create index if not exists idx_diagnosticos_recentes
  on public.diagnosticos_preliminares(gerado_em desc);

drop trigger if exists trg_diagnosticos_updated on public.diagnosticos_preliminares;
create trigger trg_diagnosticos_updated
  before update on public.diagnosticos_preliminares
  for each row execute function public.set_updated_at();

alter table public.diagnosticos_preliminares enable row level security;

-- SELECT: usuário ativo (consultor / admin) vê todos
drop policy if exists diag_select_active on public.diagnosticos_preliminares;
create policy diag_select_active on public.diagnosticos_preliminares
  for select to authenticated
  using (public.is_active_user());

-- INSERT/UPDATE/DELETE: apenas service_role (endpoint server-side com puppeteer/react-pdf)
-- authenticated não deve manipular diretamente — só via API
drop policy if exists diag_admin_manage on public.diagnosticos_preliminares;
create policy diag_admin_manage on public.diagnosticos_preliminares
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on table public.diagnosticos_preliminares from anon;
grant select on table public.diagnosticos_preliminares to authenticated;
-- INSERT/UPDATE/DELETE via service_role apenas

comment on column public.diagnosticos_preliminares.numero_publico is
  'Formato "YYYY-MM-DD/NNNN" — data de geração + número sequencial global via diagnostico_seq.';

comment on column public.diagnosticos_preliminares.variante is
  'com_reducao = economia_pct > config.diagnostico_limite_reducao_baixa_pct (default 5%). sem_reducao = economia baixa ou zero.';

comment on column public.diagnosticos_preliminares.storage_path is
  'Path no bucket Supabase Storage. Cliente acessa via signed URL gerada sob demanda (não é URL pública).';

-- -----------------------------------------------------------------------------
-- V9.3 — Chaves em config
-- -----------------------------------------------------------------------------

insert into public.config (chave, valor, descricao) values
  -- Kill switch
  ('diagnostico_habilitado',
   'true',
   'Habilita geração automática do Diagnóstico Preliminar após simulação. Se false, simulação continua funcionando normalmente mas nenhum PDF é gerado.'),

  -- Limite pra decidir variante do template
  ('diagnostico_limite_reducao_baixa_pct',
   '5',
   'Percentual (0-100) abaixo do qual o diagnóstico usa a variante "sem redução". Padrão 5 (economia <= 5% → template amarelo explicativo).'),

  -- URL assinada pro cliente baixar
  ('diagnostico_signed_url_dias',
   '7',
   'Validade (em dias) das URLs assinadas geradas para o cliente baixar seu diagnóstico. Padrão 7. Se expirar, backend regenera nova URL.'),

  -- Comportamento de regeração
  ('diagnostico_regerar_ao_atualizar_lead',
   'false',
   'Se true, sempre que consultor edita dados da simulação no CRM, o diagnóstico é regerado automaticamente. Padrão false — regeneração manual via botão.'),

  -- Envio por email
  ('diagnostico_enviar_email_ao_gerar',
   'true',
   'Se true, ao gerar o diagnóstico envia email pro lead com link de download. Se false, cliente só acessa pelo botão na tela de resultado.'),

  -- Templates de texto (permitem edição sem deploy)
  ('diagnostico_titulo_documento',
   'Diagnóstico Preliminar de Regularização',
   'Título principal exibido no topo do documento PDF.'),

  ('diagnostico_subtitulo_marca',
   'Consultoria em Regularização Previdenciária',
   'Subtítulo abaixo do logo (canto superior esquerdo do PDF).'),

  -- Callouts principais (aparecem logo abaixo do resumo executivo)
  ('diagnostico_callout_com_reducao',
   'A obra apresenta <strong>potencial significativo de redução</strong> do INSS mediante aplicação da metodologia prevista na IN RFB nº 2.021/2021 e no Manual do SERO da Receita Federal.',
   'Texto (HTML permitido) do callout verde na variante com redução. Aparece logo abaixo da tabela de resumo executivo.'),

  ('diagnostico_callout_sem_reducao',
   'Esta obra <strong>não apresentou potencial de redução</strong> na análise preliminar, mas <strong>ainda precisa de regularização</strong> junto à Receita Federal. Leia com atenção os itens abaixo.',
   'Texto (HTML permitido) do callout amarelo na variante sem redução.'),

  -- Rodapé e disclaimer
  ('diagnostico_disclaimer',
   'Documento com fundamento na IN RFB nº 2.021/2021 e no Manual do SERO da Receita Federal. Diagnóstico preliminar não vinculante; a apuração definitiva depende de análise documental completa e aferição via SERO/DCTFWeb.',
   'Disclaimer no rodapé do documento (não vinculante, não substitui análise completa).'),

  -- Assinatura institucional (não usar nome do sócio por decisão de 2026-08-31)
  ('diagnostico_assinatura_linha1',
   'Imposto & Obra Consultoria',
   'Primeira linha da assinatura no rodapé.'),
  ('diagnostico_assinatura_linha2',
   'CNPJ 63.382.260/0001-99',
   'Segunda linha da assinatura no rodapé.'),

  -- Bucket
  ('diagnostico_storage_bucket',
   'diagnosticos-preliminares',
   'Nome do bucket no Supabase Storage. Criar manualmente via UI antes de rodar V9 (privado, sem acesso público direto).')
on conflict (chave) do nothing;

-- -----------------------------------------------------------------------------
-- V9.4 — Storage bucket (criar via UI do Supabase, não via SQL)
-- -----------------------------------------------------------------------------
--
-- ANTES DE RODAR A BRANCH V9/1, criar o bucket manualmente:
--
--   1. Supabase Dashboard → Storage → New bucket
--   2. Nome: diagnosticos-preliminares
--   3. Public bucket: NÃO marcar (bucket privado)
--   4. File size limit: 5 MB
--   5. Allowed MIME types: application/pdf
--
-- Depois de criado, o RLS do bucket é gerenciado pelo Supabase (por default,
-- apenas service_role acessa buckets privados). O endpoint de download server-side
-- vai gerar signed URLs sob demanda.
--
-- Se preferir criar via SQL (Supabase permite via schema storage):
--
--   insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
--   values ('diagnosticos-preliminares', 'diagnosticos-preliminares', false, 5242880, array['application/pdf'])
--   on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Verificação
-- -----------------------------------------------------------------------------
-- select nextval('public.diagnostico_seq');  -- deve retornar 1, 2, 3... a cada chamada
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='diagnosticos_preliminares';
-- select chave, valor from public.config where chave like 'diagnostico_%' order by chave;
