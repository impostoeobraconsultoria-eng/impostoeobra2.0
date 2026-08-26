-- V6.3 — Follow-up de leads inativos via Telegram
-- Idempotente. Não altera RLS nem policies.

alter table public.leads
  add column if not exists telegram_follow_up_enviado_em timestamptz;

comment on column public.leads.telegram_follow_up_enviado_em is
  'Data do último alerta de retomada enviado ao Telegram; impede reenvio no mesmo dia.';

insert into public.config (chave, valor, descricao) values
  ('telegram_msg_followup_reativado', '✅ Reativado por {nome} na etapa {etapa}.', 'Confirmação de lead reativado pelo Telegram.'),
  ('telegram_msg_followup_adiado', '✅ Retomada adiada para {data} por {nome}.', 'Confirmação de follow-up adiado pelo Telegram.'),
  ('telegram_msg_perder_motivo', 'Por que este lead foi perdido definitivamente?', 'Pergunta do fluxo de perda definitiva.'),
  ('telegram_msg_lead_perdido', '✅ Lead marcado como perdido: {motivo}.', 'Confirmação de perda definitiva.'),
  ('telegram_adiar_dias', '7', 'Quantidade de dias aplicada pelo botão Adiar.'),
  ('telegram_template_lead_parado', '⚠️ <b>Lead parado há {dias_parado} dias</b>\n<b>{primeiro_nome}</b> — {uf}\nEtapa: {status}\nÚltima atualização: {ultima_atualizacao}', 'Template HTML do alerta de lead parado.')
on conflict (chave) do nothing;
