import "server-only";

import { answerCallbackQuery, editMessageText } from "@/lib/telegram/client";
import {
  getTelegramConfig,
  getTelegramConfigJson,
  renderTelegramTemplate,
  requireTelegramConfig,
} from "@/lib/telegram/config";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TelegramUpdate } from "@/lib/telegram/types";

type ContactResult = { slug: string; rotulo: string; encerra: boolean };
type ReturnDate = { dias: number; rotulo: string };

export async function handleContatoStart(
  userId: string,
  leadId: string,
  update: TelegramUpdate,
) {
  const callback = update.callback_query!;
  const admin = createAdminClient();
  const lead = await activeLead(leadId);
  if (!lead) return unavailable(callback.id);
  await cleanupConversation(callback.message?.chat.id, callback.from.id);
  const chatId = callback.message?.chat.id;
  if (!chatId) return unavailable(callback.id);
  const timeout = boundedNumber(
    await getTelegramConfig("telegram_conversation_timeout_min"),
    10,
  );
  const { error } = await admin.from("telegram_conversations").upsert(
    {
      telegram_chat_id: chatId,
      telegram_user_id: callback.from.id,
      fluxo: "contato_realizado",
      estado: "aguardando_resultado",
      contexto: { lead_id: leadId, user_id: userId },
      expira_em: new Date(Date.now() + timeout * 60_000).toISOString(),
    },
    { onConflict: "telegram_chat_id,telegram_user_id,fluxo" },
  );
  if (error) throw new Error(`Falha ao iniciar contato: ${error.code}`);
  const options = await getTelegramConfigJson<ContactResult>(
    "telegram_contato_resultados",
  );
  await answerCallbackQuery(callback.id);
  await editMessageText(
    chatId,
    callback.message!.message_id,
    await requireTelegramConfig("telegram_msg_contato_resultado"),
    {
      reply_markup: {
        inline_keyboard: options.filter(validContactResult).map((option) => [
          {
            text: option.rotulo,
            callback_data: `cr:${leadId}:${option.slug}`,
          },
        ]),
      },
    },
  );
}

export async function handleContatoResultado(
  userId: string,
  leadId: string,
  resultSlug: string,
  update: TelegramUpdate,
) {
  const callback = update.callback_query!;
  const conversation = await validConversation(callback, leadId);
  if (!conversation) return expired(callback.id);
  if (!(await activeLead(leadId))) {
    await deleteConversation(conversation.id);
    return unavailable(callback.id);
  }
  const options = await getTelegramConfigJson<ContactResult>(
    "telegram_contato_resultados",
  );
  const selected = options.find(
    (option) => validContactResult(option) && option.slug === resultSlug,
  );
  if (!selected) return unavailable(callback.id);
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin
    .from("leads")
    .update({ ultimo_contato_em: now, updated_by: userId })
    .eq("id", leadId)
    .eq("status_ativacao", "ativo")
    .is("deleted_at", null);
  await admin.from("atividades").insert({
    ref_tipo: "lead",
    ref_id: leadId,
    tipo: "contato",
    descricao: `Contato realizado via Telegram — ${selected.rotulo}`,
    autor_id: userId,
    metadata_json: { canal: "telegram", resultado: selected.slug },
  });
  if (selected.encerra) {
    await deleteConversation(conversation.id);
    await answerCallbackQuery(callback.id);
    await editMessageText(
      callback.message!.chat.id,
      callback.message!.message_id,
      renderTelegramTemplate(
        await requireTelegramConfig("telegram_msg_contato_concluido"),
        { resultado: selected.rotulo },
      ),
    );
    return;
  }
  const dates = await getTelegramConfigJson<ReturnDate>(
    "telegram_contato_datas_retomar",
  );
  await admin
    .from("telegram_conversations")
    .update({
      estado: "aguardando_data",
      contexto: { lead_id: leadId, user_id: userId, resultado: selected.slug },
    })
    .eq("id", conversation.id);
  await answerCallbackQuery(callback.id);
  await editMessageText(
    callback.message!.chat.id,
    callback.message!.message_id,
    await requireTelegramConfig("telegram_msg_contato_data"),
    {
      reply_markup: {
        inline_keyboard: dates.filter(validReturnDate).map((date) => [
          {
            text: date.rotulo,
            callback_data: `cd:${leadId}:${date.dias}`,
          },
        ]),
      },
    },
  );
}

export async function handleContatoData(
  userId: string,
  leadId: string,
  daysRaw: string,
  update: TelegramUpdate,
) {
  const callback = update.callback_query!;
  const conversation = await validConversation(
    callback,
    leadId,
    "aguardando_data",
  );
  if (!conversation) return expired(callback.id);
  if (!(await activeLead(leadId))) {
    await deleteConversation(conversation.id);
    return unavailable(callback.id);
  }
  const dates = await getTelegramConfigJson<ReturnDate>(
    "telegram_contato_datas_retomar",
  );
  const selected = dates.find(
    (date) => validReturnDate(date) && String(date.dias) === daysRaw,
  );
  if (!selected) return unavailable(callback.id);
  const start = new Date(Date.now() + selected.dias * 86_400_000);
  start.setUTCHours(12, 0, 0, 0);
  const admin = createAdminClient();
  const reminder = boundedNumber(
    await getTelegramConfig("agenda_lembrete_default_min"),
    1440,
  );
  const { error } = await admin.from("eventos_agenda").insert({
    titulo: "Follow-up de lead",
    descricao: "Retorno agendado pelo fluxo de contato do Telegram",
    tipo: "follow_up",
    data_hora_inicio: start.toISOString(),
    lembrete_minutos: reminder,
    ref_tipo: "lead",
    ref_id: leadId,
    criado_por: userId,
    responsavel_id: userId,
    status: "agendado",
  });
  if (error) throw new Error(`Falha ao criar follow-up: ${error.code}`);
  await deleteConversation(conversation.id);
  const date = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(start);
  await answerCallbackQuery(callback.id);
  await editMessageText(
    callback.message!.chat.id,
    callback.message!.message_id,
    renderTelegramTemplate(
      await requireTelegramConfig("telegram_msg_followup_marcado"),
      { data: date },
    ),
  );
}

async function activeLead(id: string) {
  const { data } = await createAdminClient()
    .from("leads")
    .select("id")
    .eq("id", id)
    .eq("status_ativacao", "ativo")
    .is("deleted_at", null)
    .is("convertido_em", null)
    .maybeSingle();
  return data;
}

async function validConversation(
  callback: NonNullable<TelegramUpdate["callback_query"]>,
  leadId: string,
  state = "aguardando_resultado",
) {
  const { data } = await createAdminClient()
    .from("telegram_conversations")
    .select("id,contexto")
    .eq("telegram_chat_id", callback.message?.chat.id)
    .eq("telegram_user_id", callback.from.id)
    .eq("fluxo", "contato_realizado")
    .eq("estado", state)
    .gt("expira_em", new Date().toISOString())
    .maybeSingle();
  const context = data?.contexto as { lead_id?: string } | undefined;
  return context?.lead_id === leadId ? data : null;
}

async function cleanupConversation(chatId?: number, telegramUserId?: number) {
  if (!chatId || !telegramUserId) return;
  await createAdminClient()
    .from("telegram_conversations")
    .delete()
    .eq("telegram_chat_id", chatId)
    .eq("telegram_user_id", telegramUserId)
    .lt("expira_em", new Date().toISOString());
}

async function deleteConversation(id: string) {
  await createAdminClient()
    .from("telegram_conversations")
    .delete()
    .eq("id", id);
}

async function unavailable(callbackId: string) {
  await answerCallbackQuery(
    callbackId,
    await requireTelegramConfig("telegram_msg_lead_indisponivel"),
  );
}

async function expired(callbackId: string) {
  await answerCallbackQuery(
    callbackId,
    await requireTelegramConfig("telegram_msg_fluxo_expirado"),
  );
}

function validContactResult(value: ContactResult) {
  return Boolean(
    /^[a-z0-9_]{1,20}$/.test(value?.slug ?? "") &&
      value?.rotulo &&
      typeof value.encerra === "boolean",
  );
}

function validReturnDate(value: ReturnDate) {
  return Boolean(
    value?.rotulo && Number.isInteger(value.dias) && value.dias > 0,
  );
}

function boundedNumber(value: string, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= 100_000
    ? number
    : fallback;
}
