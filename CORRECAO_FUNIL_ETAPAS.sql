-- Correção necessária para a Branch 2 (Config remodelado + funil dinâmico).
-- Idempotente: pode ser executada novamente sem duplicar etapas ou policies.

begin;

create table if not exists public.funil_etapas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  ordem      integer not null check (ordem >= 0),
  cor        text,
  e_fechada  boolean not null default false,
  criado_em  timestamptz not null default now(),
  constraint funil_etapas_nome_not_blank check (length(btrim(nome)) between 1 and 100),
  constraint funil_etapas_cor_hex check (
    cor is null or cor = '' or cor ~ '^#[0-9A-Fa-f]{6}$'
  )
);

create index if not exists idx_funil_etapas_ordem
  on public.funil_etapas (ordem, criado_em);

alter table public.funil_etapas enable row level security;

revoke all on table public.funil_etapas from anon;
grant select, insert, update, delete on table public.funil_etapas to authenticated;

drop policy if exists funil_etapas_select_active on public.funil_etapas;
create policy funil_etapas_select_active on public.funil_etapas
  for select to authenticated
  using (public.is_active_user());

drop policy if exists funil_etapas_insert_admin on public.funil_etapas;
create policy funil_etapas_insert_admin on public.funil_etapas
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists funil_etapas_update_admin on public.funil_etapas;
create policy funil_etapas_update_admin on public.funil_etapas
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists funil_etapas_delete_admin on public.funil_etapas;
create policy funil_etapas_delete_admin on public.funil_etapas
  for delete to authenticated
  using (public.is_admin());

-- Migração inicial do valor legado. Só executa quando a tabela está vazia.
insert into public.funil_etapas (nome, ordem, cor, e_fechada)
select
  btrim(etapa.nome),
  etapa.posicao::integer - 1,
  case ((etapa.posicao - 1) % 8)
    when 0 then '#0B76C6'
    when 1 then '#2563EB'
    when 2 then '#7C3AED'
    when 3 then '#D97706'
    when 4 then '#EA580C'
    when 5 then '#3AB97A'
    when 6 then '#D93025'
    else '#5B6265'
  end,
  lower(btrim(etapa.nome)) in (
    'fechado — ganho',
    'fechado - ganho',
    'fechado — perdido',
    'fechado - perdido'
  )
from regexp_split_to_table(
  coalesce(
    (select valor from public.config where chave = 'etapas_funil'),
    'Novo Lead,Contato iniciado,Em negociação,Proposta enviada,Aguardando resposta,Fechado — ganho,Fechado — perdido,Sem retorno'
  ),
  '\s*,\s*'
) with ordinality as etapa(nome, posicao)
where btrim(etapa.nome) <> ''
  and not exists (select 1 from public.funil_etapas);

commit;

-- Verificação recomendada após executar:
select id, nome, ordem, cor, e_fechada, criado_em
from public.funil_etapas
order by ordem, criado_em;

