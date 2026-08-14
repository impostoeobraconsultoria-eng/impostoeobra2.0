-- =============================================================================
-- Correção do SCHEMA_SUPABASE.sql — rodar UMA vez no SQL Editor do Supabase
-- Resolve 2 inconsistências encontradas pelo Codex durante a revisão:
--   (1) trigger trg_users_updated chamava set_updated_at() mas tabela users não tinha coluna updated_at
--   (2) coluna conteudo_mdx no artigos era incompatível com editor Tiptap (que gera HTML)
-- =============================================================================

-- Correção 1: adicionar coluna updated_at em users (trigger já existe e vai usar)
alter table public.users
  add column if not exists updated_at timestamptz not null default now();

-- Correção 2: renomear conteudo_mdx → conteudo_html
-- (Tiptap gera HTML sanitizado, que é o formato mais simples de armazenar
-- e renderizar. Se no futuro quisermos MDX real, criamos uma coluna separada.)
alter table public.artigos
  rename column conteudo_mdx to conteudo_html;

-- Verificação (opcional — rode depois pra confirmar)
-- select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name in ('users', 'artigos')
--   order by table_name, ordinal_position;
