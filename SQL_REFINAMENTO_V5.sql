-- =============================================================================
-- SQL de suporte ao pacote de refinamento V5 (Web Push Notifications)
-- Rodar UMA vez no SQL Editor do Supabase antes de iniciar a branch v5/1.
-- Idempotente (create if not exists, drop policy if exists, on conflict do nothing).
--
-- Contém:
--   V5.1 — Tabela push_subscriptions (uma linha por dispositivo/navegador)
--        - Índices, trigger de updated_at, RLS
--        - Cada usuário ativo pode registrar N dispositivos
--        - Endpoint único (unique constraint) — mesmo device não duplica
--   V5.2 — Chaves em config para controle do sistema de push
--        - Kill switch global (push_habilitado)
--        - Toggle por tipo (push_notificar_lead_novo, push_notificar_lead_parado, etc)
--        - Copy visível ao usuário no botão de ativação
--   V5.3 — Preferências individuais por usuário (opcional, ligado a users)
--        - Coluna preferencias_push jsonb em users
-- =============================================================================

-- -----------------------------------------------------------------------------
-- V5.1 — Tabela push_subscriptions
-- -----------------------------------------------------------------------------

create table if not exists public.push_subscriptions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  endpoint       text not null unique,          -- URL do FCM/APNs/Mozilla
  p256dh         text not null,                 -- chave pública do dispositivo (base64url)
  auth           text not null,                 -- segredo de autenticação (base64url)
  device_label   text,                          -- inferido no client: "iPhone Safari", "Chrome Windows", etc
  user_agent     text,                          -- navigator.userAgent completo (debug)
  ativo          boolean not null default true, -- desativar em falhas 410/404 antes de deletar
  ultimo_envio_em  timestamptz,                 -- última vez que enviamos push com sucesso
  ultimo_erro      text,                        -- último erro reportado pelo push service
  ultimo_erro_em   timestamptz,
  criado_em      timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.push_subscriptions is 'Assinaturas de Web Push por dispositivo/navegador. Um mesmo usuário pode ter várias (celular, desktop, tablet). Endpoint é único — reinscrição no mesmo device faz upsert.';
comment on column public.push_subscriptions.device_label is 'Rótulo humano do device, inferido no client via navigator.userAgent. Ex: "Chrome no Windows", "Safari no iPhone".';
comment on column public.push_subscriptions.ativo is 'Marcar false quando push service devolve 410 Gone ou 404 Not Found (subscription expirada). Endpoint fica no banco pra troubleshooting mas não recebe mais push.';

create index if not exists idx_push_sub_user_ativas
  on public.push_subscriptions(user_id)
  where ativo = true;

create index if not exists idx_push_sub_ultimo_envio
  on public.push_subscriptions(ultimo_envio_em desc nulls last);

drop trigger if exists trg_push_subscriptions_updated on public.push_subscriptions;
create trigger trg_push_subscriptions_updated
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

-- SELECT: usuário vê apenas suas próprias assinaturas
drop policy if exists push_sub_select_own on public.push_subscriptions;
create policy push_sub_select_own on public.push_subscriptions
  for select to authenticated using (
    public.is_active_user()
    and user_id = public.current_active_user_id()
  );

-- INSERT: usuário registra suas próprias assinaturas
drop policy if exists push_sub_insert_own on public.push_subscriptions;
create policy push_sub_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (
    public.is_active_user()
    and user_id = public.current_active_user_id()
  );

-- UPDATE: usuário atualiza (ex: renomear device) apenas as suas
drop policy if exists push_sub_update_own on public.push_subscriptions;
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

-- DELETE: usuário remove suas próprias assinaturas (revogar acesso do device)
drop policy if exists push_sub_delete_own on public.push_subscriptions;
create policy push_sub_delete_own on public.push_subscriptions
  for delete to authenticated
  using (
    public.is_active_user()
    and user_id = public.current_active_user_id()
  );

-- Admin vê e gerencia tudo (troubleshooting)
drop policy if exists push_sub_admin_all on public.push_subscriptions;
create policy push_sub_admin_all on public.push_subscriptions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A tabela fica exposta ao Data API somente para usuários autenticados.
-- RLS continua sendo a barreira de autorização por linha.
revoke all on table public.push_subscriptions from anon;
grant select, insert, update, delete
  on table public.push_subscriptions to authenticated;

-- -----------------------------------------------------------------------------
-- V5.2 — Chaves de config
-- -----------------------------------------------------------------------------

insert into public.config (chave, valor, descricao) values
  -- Kill switch global
  ('push_habilitado',
   'true',
   'Habilita o envio de Web Push notifications. Se "false", nenhum push é enviado (sininho continua funcionando normalmente).'),

  -- Toggle por tipo (para diminuir barulho se algum tipo ficar spammy)
  ('push_notificar_lead_novo',
   'true',
   'Envia push quando um novo lead é criado. Recomendado true para todos os sócios.'),
  ('push_notificar_lead_parado',
   'true',
   'Envia push quando um lead fica parado além do limite (config notif_lead_parado_dias).'),
  ('push_notificar_vau_desatualizada',
   'true',
   'Envia push quando a tabela VAU passa do limite (config notif_vau_max_dias).'),
  ('push_notificar_evento_agenda',
   'true',
   'Envia push para lembretes de eventos da agenda (complementa o email diário).'),
  ('push_notificar_sistema',
   'true',
   'Envia push para notificações do tipo "sistema" (alertas gerais da plataforma).'),

  -- Copy visível na tela de ativação
  ('push_titulo_ativar',
   'Ativar notificações neste dispositivo',
   'Título do botão/card de ativação de push notifications no /admin.'),
  ('push_descricao_ativar',
   'Você recebe alertas de novos leads, prazos e lembretes direto no celular, mesmo com o app fechado. Não usamos para nada além disso.',
   'Descrição mostrada ao usuário antes de pedir permissão para push.'),

  -- Ícone padrão nas notificações (URL absoluta, precisa existir em /public)
  ('push_icone_padrao',
   '/icons/icon-192.png',
   'Ícone padrão exibido nas notificações push. Deve existir em public/icons/. Recomendado 192x192px PNG.'),
  ('push_badge_padrao',
   '/icons/badge-72.png',
   'Ícone monocromático mostrado na barra de status do Android. Deve existir em public/icons/. Recomendado 72x72px PNG.')
on conflict (chave) do nothing;

-- -----------------------------------------------------------------------------
-- V5.3 — Preferências individuais por usuário (opcional)
-- -----------------------------------------------------------------------------
-- Cada usuário pode desligar tipos específicos para si mesmo sem afetar os outros.
-- Formato: {"lead_novo": true, "lead_parado": false, "vau_desatualizada": true, ...}
-- Ausência de chave = usa o padrão da tabela config (opt-in).

alter table public.users
  add column if not exists preferencias_push jsonb not null default '{}'::jsonb;

comment on column public.users.preferencias_push is
  'Preferências individuais de push por tipo. Se ausente, herda do config global (push_notificar_<tipo>). Formato: {"lead_novo": true|false, "lead_parado": true|false, ...}';

-- -----------------------------------------------------------------------------
-- Verificação (opcional — rode pra conferir)
-- -----------------------------------------------------------------------------
-- select * from public.push_subscriptions order by criado_em desc;
-- select chave, valor from public.config where chave like 'push_%' order by chave;
-- select id, email, preferencias_push from public.users where deleted_at is null;
