-- =============================================================================
-- SQL de suporte ao pacote de refinamento V7 (Área de Operação interna — /operacao)
-- Rodar UMA vez no SQL Editor do Supabase antes de iniciar a branch v7/1.
-- Idempotente (create if not exists, drop policy if exists, on conflict do nothing).
--
-- Contém:
--   V7.1 — Tabela operacao_partes (11 Partes do manual, seed)
--   V7.2 — Tabela operacao_paginas (páginas individuais)
--   V7.3 — Tabela operacao_faqs (FAQ por página, opcional)
--   V7.4 — Chaves em config
-- =============================================================================

-- -----------------------------------------------------------------------------
-- V7.1 — Partes do manual (categorias top-level)
-- -----------------------------------------------------------------------------

create table if not exists public.operacao_partes (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,        -- 'parte-i', 'parte-ii'...
  numero      text not null,               -- 'I', 'II', 'III'...
  titulo      text not null,               -- 'Visão Geral e Classificação do Caso'
  descricao   text,                        -- resumo curto (opcional)
  ordem       integer not null default 100,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_operacao_partes_ativas
  on public.operacao_partes(ordem)
  where ativo = true;

drop trigger if exists trg_operacao_partes_updated on public.operacao_partes;
create trigger trg_operacao_partes_updated
  before update on public.operacao_partes
  for each row execute function public.set_updated_at();

alter table public.operacao_partes enable row level security;

drop policy if exists operacao_partes_select_active on public.operacao_partes;
create policy operacao_partes_select_active on public.operacao_partes
  for select to authenticated
  using (public.is_active_user());

drop policy if exists operacao_partes_write_active on public.operacao_partes;
create policy operacao_partes_write_active on public.operacao_partes
  for insert to authenticated
  with check (public.is_active_user());

drop policy if exists operacao_partes_update_active on public.operacao_partes;
create policy operacao_partes_update_active on public.operacao_partes
  for update to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

drop policy if exists operacao_partes_delete_admin on public.operacao_partes;
create policy operacao_partes_delete_admin on public.operacao_partes
  for delete to authenticated
  using (public.is_admin());

revoke all on table public.operacao_partes from anon;
grant select, insert, update, delete
  on table public.operacao_partes to authenticated;

-- Seed das 11 Partes (nomes conforme manual atual)
insert into public.operacao_partes (slug, numero, titulo, ordem) values
  ('parte-i',    'I',    'Visão Geral e Classificação do Caso',                 10),
  ('parte-ii',   'II',   'Diagnóstico Inicial',                                  20),
  ('parte-iii',  'III',  'Cadastro Nacional de Obras — CNO',                     30),
  ('parte-iv',   'IV',   'Obra em Andamento',                                    40),
  ('parte-v',    'V',    'Obra Concluída',                                       50),
  ('parte-vi',   'VI',   'Aferição no SERO',                                     60),
  ('parte-vii',  'VII',  'DCTFWeb Aferição e Regularização do Débito',           70),
  ('parte-viii', 'VIII', 'Certidão e Encerramento',                              80),
  ('parte-ix',   'IX',   'Matrizes e Checklists',                                90),
  ('parte-x',    'X',    'Casos Especiais e Solução de Problemas',              100),
  ('parte-xi',   'XI',   'Referências Operacionais',                            110)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- V7.2 — Páginas do manual
-- -----------------------------------------------------------------------------

create table if not exists public.operacao_paginas (
  id              uuid primary key default gen_random_uuid(),
  parte_id        uuid not null references public.operacao_partes(id) on delete restrict,
  slug            text not null,                 -- 'matriz-inicial-fluxo', 'checklist-mensal'...
  titulo          text not null,
  resumo          text,                          -- opcional, aparece no índice
  conteudo        jsonb not null default '{}'::jsonb,  -- Tiptap JSON
  ordem           integer not null default 100,
  ativo           boolean not null default true,
  criado_por      uuid references public.users(id) on delete set null,
  atualizado_por  uuid references public.users(id) on delete set null,
  criado_em       timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (parte_id, slug)                        -- slug único dentro da parte
);

create index if not exists idx_operacao_paginas_parte
  on public.operacao_paginas(parte_id, ordem)
  where ativo = true;

create index if not exists idx_operacao_paginas_recentes
  on public.operacao_paginas(updated_at desc)
  where ativo = true;

drop trigger if exists trg_operacao_paginas_updated on public.operacao_paginas;
create trigger trg_operacao_paginas_updated
  before update on public.operacao_paginas
  for each row execute function public.set_updated_at();

alter table public.operacao_paginas enable row level security;

drop policy if exists operacao_paginas_select_active on public.operacao_paginas;
create policy operacao_paginas_select_active on public.operacao_paginas
  for select to authenticated
  using (public.is_active_user());

drop policy if exists operacao_paginas_insert_active on public.operacao_paginas;
create policy operacao_paginas_insert_active on public.operacao_paginas
  for insert to authenticated
  with check (public.is_active_user());

drop policy if exists operacao_paginas_update_active on public.operacao_paginas;
create policy operacao_paginas_update_active on public.operacao_paginas
  for update to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

drop policy if exists operacao_paginas_delete_admin on public.operacao_paginas;
create policy operacao_paginas_delete_admin on public.operacao_paginas
  for delete to authenticated
  using (public.is_admin());

revoke all on table public.operacao_paginas from anon;
grant select, insert, update, delete
  on table public.operacao_paginas to authenticated;

comment on column public.operacao_paginas.conteudo is
  'Documento JSON do Tiptap. Estrutura: { type: "doc", content: [...] }. Renderizado no client pelo Tiptap ou HTML gerado no server via generateHTML.';

comment on column public.operacao_paginas.atualizado_por is
  'Último usuário que editou a página. Usado no rodapé "Editado por Fulano em <data>". Sem histórico de versões — só o último autor.';

-- -----------------------------------------------------------------------------
-- V7.3 — FAQ por página (opcional, seguindo padrão dos artigos públicos)
-- -----------------------------------------------------------------------------

create table if not exists public.operacao_faqs (
  id          uuid primary key default gen_random_uuid(),
  pagina_id   uuid not null references public.operacao_paginas(id) on delete cascade,
  pergunta    text not null,
  resposta    text not null,                    -- markdown ou HTML simples
  ordem       integer not null default 100,
  criado_em   timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_operacao_faqs_pagina
  on public.operacao_faqs(pagina_id, ordem);

drop trigger if exists trg_operacao_faqs_updated on public.operacao_faqs;
create trigger trg_operacao_faqs_updated
  before update on public.operacao_faqs
  for each row execute function public.set_updated_at();

alter table public.operacao_faqs enable row level security;

drop policy if exists operacao_faqs_select_active on public.operacao_faqs;
create policy operacao_faqs_select_active on public.operacao_faqs
  for select to authenticated
  using (public.is_active_user());

drop policy if exists operacao_faqs_write_active on public.operacao_faqs;
create policy operacao_faqs_write_active on public.operacao_faqs
  for all to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

revoke all on table public.operacao_faqs from anon;
grant select, insert, update, delete
  on table public.operacao_faqs to authenticated;

-- -----------------------------------------------------------------------------
-- V7.4 — Chaves em config
-- -----------------------------------------------------------------------------

insert into public.config (chave, valor, descricao) values
  ('operacao_titulo',
   'Manual Operacional',
   'Título principal exibido no topo da wiki (/operacao). Editável.'),

  ('operacao_subtitulo',
   'Procedimentos internos de regularização previdenciária de obras.',
   'Subtítulo exibido abaixo do título principal.'),

  ('operacao_msg_rodape',
   'Documento interno. Não compartilhar externamente.',
   'Mensagem de rodapé em todas as páginas da wiki (aviso de confidencialidade).'),

  ('operacao_habilitar_faq',
   'true',
   'Se true, cada página pode ter seção de FAQ ao final. Se false, FAQ fica oculto globalmente.'),

  ('operacao_habilitar_criacao_paginas',
   'true',
   'Se true, botão "Nova página" fica visível para usuários ativos. Se false, só admin cria páginas.')
on conflict (chave) do nothing;

-- -----------------------------------------------------------------------------
-- Verificação
-- -----------------------------------------------------------------------------
-- select numero, titulo from public.operacao_partes order by ordem;
-- select p.titulo, parte.numero from public.operacao_paginas p
--   join public.operacao_partes parte on parte.id = p.parte_id
--   order by parte.ordem, p.ordem;
-- select chave, valor from public.config where chave like 'operacao_%' order by chave;
