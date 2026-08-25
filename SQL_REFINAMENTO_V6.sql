-- =============================================================================
-- SQL de suporte ao pacote de refinamento V6 (Telegram Bot — operação interna)
-- Rodar UMA vez no SQL Editor do Supabase antes de iniciar a branch v6/1.
-- Idempotente (add column if not exists, create if not exists, drop policy if exists).
--
-- Contém:
--   V6.1 — Vínculo Telegram ↔ usuário do CRM
--        - Colunas telegram_user_id / telegram_username / telegram_vinculado_em em users
--        - Índice único em telegram_user_id
--        - Coluna telegram_chat_id em users (chat privado com o bot, opcional)
--   V6.2 — Tabela telegram_conversations (estado de multi-step callbacks)
--   V6.3 — Tabela telegram_callbacks_log (auditoria + idempotência)
--   V6.4 — Chaves em config para o bot
-- =============================================================================

-- -----------------------------------------------------------------------------
-- V6.1 — Vínculo Telegram ↔ usuário do CRM
-- -----------------------------------------------------------------------------

alter table public.users
  add column if not exists telegram_user_id     bigint,       -- ID numérico permanente do Telegram (imutável)
  add column if not exists telegram_username    text,         -- @handle (opcional, muda no Telegram)
  add column if not exists telegram_chat_id     bigint,       -- chat privado 1-a-1 (para DMs do bot; opcional)
  add column if not exists telegram_vinculado_em timestamptz;

-- telegram_user_id precisa ser único para evitar dois usuários do CRM apontando pro mesmo Telegram
create unique index if not exists uq_users_telegram_user_id
  on public.users(telegram_user_id)
  where telegram_user_id is not null;

comment on column public.users.telegram_user_id is
  'ID numérico permanente do usuário no Telegram (imutável). É a única forma segura de autenticar callbacks — @username pode mudar. Cadastrado via fluxo /vincular no bot.';
comment on column public.users.telegram_chat_id is
  'Chat privado 1-a-1 entre usuário e bot (para DMs). Opcional — bot também funciona só em grupo.';

-- -----------------------------------------------------------------------------
-- V6.2 — Tabela telegram_conversations (estado multi-step)
-- -----------------------------------------------------------------------------
-- Guarda estado transitório de fluxos como "Contato realizado → resultado? → quando retornar?".
-- Chave é (chat_id + user_id do Telegram) — cada usuário tem no máximo 1 conversa ativa por chat.

create table if not exists public.telegram_conversations (
  id                uuid primary key default gen_random_uuid(),
  telegram_chat_id  bigint not null,
  telegram_user_id  bigint not null,
  fluxo             text not null,          -- ex: 'contato_realizado', 'follow_up_lead_inativo'
  estado            text not null,          -- ex: 'aguardando_resultado', 'aguardando_data'
  contexto          jsonb not null default '{}'::jsonb, -- ex: { lead_id: '...', resultado: 'interessado' }
  expira_em         timestamptz not null default (now() + interval '10 minutes'),
  criado_em         timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (telegram_chat_id, telegram_user_id, fluxo)
);

create index if not exists idx_tg_conv_expira
  on public.telegram_conversations(expira_em);

drop trigger if exists trg_tg_conv_updated on public.telegram_conversations;
create trigger trg_tg_conv_updated
  before update on public.telegram_conversations
  for each row execute function public.set_updated_at();

comment on table public.telegram_conversations is
  'Estado transitório de fluxos multi-step iniciados no Telegram. Expira em 10min por padrão. Cleanup via cron ou lazy (checar expira_em antes de usar).';

-- Só service_role escreve/lê. RLS ligada apenas por segurança.
alter table public.telegram_conversations enable row level security;

drop policy if exists tg_conv_admin_all on public.telegram_conversations;
create policy tg_conv_admin_all on public.telegram_conversations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on table public.telegram_conversations from anon, authenticated;
-- INSERT/SELECT/UPDATE/DELETE fica só no service_role (webhook do bot)

-- -----------------------------------------------------------------------------
-- V6.3 — Tabela telegram_callbacks_log (auditoria + idempotência)
-- -----------------------------------------------------------------------------
-- Registra cada callback processado. Serve para:
--   - Idempotência (Telegram pode reenviar o mesmo callback se webhook demorar)
--   - Auditoria (quem clicou o quê e quando)
--   - Debugging

create table if not exists public.telegram_callbacks_log (
  id                uuid primary key default gen_random_uuid(),
  telegram_update_id bigint not null unique,        -- ID único do update do Telegram (dedup)
  telegram_user_id   bigint,
  user_id            uuid references public.users(id) on delete set null,
  tipo               text not null,                 -- 'message' | 'callback_query' | 'command'
  acao               text,                          -- ex: 'assumir_lead', 'contato_realizado', '/vincular'
  ref_tipo           text,                          -- 'lead' | 'cliente' | 'evento'
  ref_id             uuid,
  payload            jsonb,                         -- callback_data ou body da mensagem
  resultado          text,                          -- 'ok' | 'ignorado' | 'nao_autorizado' | 'erro'
  erro_detalhe       text,
  criado_em          timestamptz not null default now()
);

create index if not exists idx_tg_log_recente
  on public.telegram_callbacks_log(criado_em desc);

create index if not exists idx_tg_log_user
  on public.telegram_callbacks_log(user_id, criado_em desc)
  where user_id is not null;

comment on table public.telegram_callbacks_log is
  'Log de todos os callbacks/mensagens recebidos do Telegram. update_id único garante idempotência (Telegram pode reenviar).';

alter table public.telegram_callbacks_log enable row level security;

drop policy if exists tg_log_admin_read on public.telegram_callbacks_log;
create policy tg_log_admin_read on public.telegram_callbacks_log
  for select to authenticated
  using (public.is_admin());

revoke all on table public.telegram_callbacks_log from anon, authenticated;
grant select on table public.telegram_callbacks_log to authenticated;
-- INSERT fica só no service_role (webhook)

-- -----------------------------------------------------------------------------
-- V6.4 — Chaves em config
-- -----------------------------------------------------------------------------

insert into public.config (chave, valor, descricao) values
  -- Kill switch global
  ('telegram_habilitado',
   'true',
   'Habilita o bot do Telegram. Se "false", nenhuma mensagem é enviada e webhook responde 200 mas ignora updates.'),

  -- Chat ID do grupo interno (onde alertas de lead novo são enviados)
  ('telegram_chat_id_grupo_operacao',
   '',
   'Chat ID (negativo, ex: -1001234567890) do grupo interno "Imposto & Obra — Operação". Descobrir enviando /chatid no grupo depois de adicionar o bot. Vazio = não envia alertas em grupo.'),

  -- Toggle por tipo de alerta (segue o mesmo padrão do push V5)
  ('telegram_notificar_lead_novo',
   'true',
   'Envia mensagem no grupo quando novo lead entra. Recomendado true.'),
  ('telegram_notificar_lead_parado',
   'true',
   'Envia mensagem no grupo quando lead fica parado além do limite.'),
  ('telegram_notificar_follow_up_inativo',
   'true',
   'Envia mensagem no grupo quando chegar data de contato futuro de lead inativado.'),

  -- Timeout de conversas multi-step
  ('telegram_conversation_timeout_min',
   '10',
   'Timeout (minutos) para fluxos multi-step (ex: "Contato realizado → resultado? → quando retornar?"). Após timeout, o usuário precisa reiniciar o fluxo.'),

  -- Domínio público do CRM (usado pra montar links "Ver no CRM")
  ('telegram_link_base_crm',
   'https://impostoeobra.com.br',
   'Domínio base para montar links "Ver no CRM" nas mensagens do Telegram.'),

  -- Mensagem de boas-vindas do fluxo /vincular
  ('telegram_msg_vincular_inicio',
   'Olá! Para vincular este Telegram ao seu usuário do CRM, envie o código de vínculo que aparece em /admin/configuracoes/telegram.',
   'Mensagem enviada quando alguém envia /vincular ao bot.'),

  ('telegram_msg_vincular_sucesso',
   '✅ Vinculado com sucesso. Agora você recebe alertas e pode agir nos leads pelo Telegram.',
   'Mensagem enviada ao vincular o Telegram com sucesso.'),

  ('telegram_msg_vincular_erro',
   '❌ Código inválido ou expirado. Gere um novo em /admin/configuracoes/telegram',
   'Mensagem enviada quando código de vínculo é inválido ou expirado.'),

  ('telegram_msg_nao_autorizado',
   '🚫 Você não está autorizado. Peça pro admin vincular seu Telegram.',
   'Resposta a callbacks/mensagens vindas de telegram_user_id não mapeado em users.'),

  ('telegram_msg_ajuda',
   'Bot interno da Imposto & Obra. Você recebe alertas de leads e pode agir direto por aqui.\n\nComandos:\n/vincular — vincular ao CRM\n/chatid — descobrir o ID deste chat (para configuração inicial)\n/ajuda — este texto',
   'Resposta ao comando /ajuda.'),

  ('telegram_msg_fluxo_expirado',
   '⏱️ Esta ação expirou (mais de 10 minutos). Clique novamente no botão do lead para começar de novo.',
   'Mensagem enviada quando conversa multi-step expira.'),

  ('telegram_msg_inicio_generico',
   'Envie /vincular para começar.',
   'Resposta genérica para usuários ainda não vinculados, sem revelar funções internas.'),

  ('telegram_msg_codigo_apenas_privado',
   'Por segurança, envie o código somente no chat privado com o bot.',
   'Aviso ao tentar vincular uma conta publicando o código em grupo.'),

  ('telegram_msg_acao_indisponivel',
   'Esta ação ainda não está disponível.',
   'Resposta temporária para callbacks desconhecidos ou de uma versão futura.'),

  -- Templates de mensagens de alerta (usam placeholders {campo})
  ('telegram_template_lead_novo',
   '🆕 <b>Novo lead</b>\n<b>{primeiro_nome}</b> — {uf}\nDestinação: {destinacao_legivel}\nÁrea equivalente: {area_m2} m²\nINSS estimado: R$ {inss_estimado}\nEconomia potencial: R$ {economia_potencial}',
   'Template HTML da mensagem de alerta de lead novo no grupo. Placeholders suportados: {primeiro_nome}, {uf}, {destinacao_legivel}, {area_m2}, {inss_estimado}, {economia_potencial}. Não incluir telefone/CPF/email.'),

  ('telegram_template_follow_up_inativo',
   '⏰ <b>Retomar contato</b>\nLead: <b>{primeiro_nome}</b> — {uf}\nInativado em: {inativado_em} ({dias_desde} dias atrás)\nMotivo: {motivo}\nData marcada para retomar: hoje',
   'Template HTML da mensagem de follow-up de lead inativo. Placeholders: {primeiro_nome}, {uf}, {inativado_em}, {dias_desde}, {motivo}.'),

  -- Rótulos dos botões (Codex lê do config em vez de hardcode)
  ('telegram_btn_assumir',                 '🙋 Assumir',              'Rótulo do botão "Assumir" no alerta de lead novo.'),
  ('telegram_btn_contato_realizado',       '✅ Contato realizado',    'Rótulo do botão "Contato realizado" no alerta de lead novo.'),
  ('telegram_btn_whatsapp',                '💬 WhatsApp',             'Rótulo do botão que abre WhatsApp do lead.'),
  ('telegram_btn_ver_no_crm',              '🔗 Ver no CRM',           'Rótulo do botão que abre o lead no CRM.'),
  ('telegram_btn_reativar',                '📞 Retomar contato',      'Rótulo do botão de reativar lead inativo.'),
  ('telegram_btn_adiar',                   '📅 Adiar 7 dias',         'Rótulo do botão de adiar contato futuro.'),
  ('telegram_btn_perder',                  '❌ Perder de vez',        'Rótulo do botão de marcar lead como perdido definitivamente.'),

  -- Opções configuráveis do fluxo "Contato realizado"
  ('telegram_contato_resultados',
   '[{"slug":"interessado","rotulo":"👍 Interessado","encerra":true},{"slug":"vai_pensar","rotulo":"🤔 Vai pensar","encerra":false},{"slug":"sem_interesse","rotulo":"❌ Sem interesse","encerra":true},{"slug":"sem_resposta","rotulo":"📵 Sem resposta","encerra":false}]',
   'JSON array de opções de resultado do fluxo "Contato realizado". encerra=true finaliza sem pedir data de retomar. encerra=false pede data via telegram_contato_datas_retomar.'),

  ('telegram_contato_datas_retomar',
   '[{"dias":1,"rotulo":"Amanhã"},{"dias":3,"rotulo":"3 dias"},{"dias":7,"rotulo":"1 semana"}]',
   'JSON array de opções de "quando retomar" após resultado que não encerra o fluxo.'),

  ('telegram_perder_motivos',
   '[{"slug":"contratou_outro","rotulo":"Contratou outro fornecedor"},{"slug":"sem_orcamento","rotulo":"Sem orçamento"},{"slug":"fora_escopo","rotulo":"Fora do escopo"},{"slug":"decidiu_nao_realizar","rotulo":"Decidiu não realizar"}]',
   'JSON array de motivos de perda mostrados no fluxo "Perder de vez" (deve corresponder a slugs válidos em motivos_inativacao).'),

  -- Horário do cron de follow-up (documentação; o schedule real fica no vercel.json)
  ('telegram_cron_follow_up_horario',
   '08:00',
   'Horário de disparo (Brasília) do cron de follow-up de leads inativos. Meramente informativo — schedule real fica em vercel.json e precisa deploy pra mudar.')
on conflict (chave) do nothing;

-- -----------------------------------------------------------------------------
-- V6.5 — Códigos de vínculo temporários (fluxo /vincular)
-- -----------------------------------------------------------------------------
-- Usuário loga no CRM, gera um código de 6 dígitos, envia esse código ao bot,
-- bot valida e grava telegram_user_id + telegram_chat_id na coluna users.

create table if not exists public.telegram_codigos_vinculo (
  codigo        text primary key,               -- ex: '834217' (6 dígitos)
  user_id       uuid not null references public.users(id) on delete cascade,
  expira_em     timestamptz not null default (now() + interval '10 minutes'),
  usado_em      timestamptz,                    -- não-nulo = já foi consumido
  criado_em     timestamptz not null default now()
);

create index if not exists idx_tg_cod_expira
  on public.telegram_codigos_vinculo(expira_em)
  where usado_em is null;

alter table public.telegram_codigos_vinculo enable row level security;

-- Usuário só cria/vê códigos pra si mesmo (via API que usa service_role, mas RLS por segurança)
drop policy if exists tg_cod_own on public.telegram_codigos_vinculo;
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

-- -----------------------------------------------------------------------------
-- Verificação (opcional)
-- -----------------------------------------------------------------------------
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='users' and column_name like 'telegram%';
-- select chave, valor from public.config where chave like 'telegram_%' order by chave;
-- select * from public.telegram_callbacks_log order by criado_em desc limit 20;
