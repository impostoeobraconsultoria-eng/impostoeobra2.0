import "server-only";

import { answerCallbackQuery, editMessageText } from "@/lib/telegram/client";
import {
  escapeTelegramHtml,
  getTelegramConfigJson,
  renderTelegramTemplate,
  requireTelegramConfig,
} from "@/lib/telegram/config";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TelegramUpdate } from "@/lib/telegram/types";

type AuthorizedUser = { id: string; nome: string | null };
type LossReason = { slug: string; rotulo: string };

export async function handleReativar(
  user: AuthorizedUser,
  leadId: string,
  update: TelegramUpdate,
) {
  const callback = update.callback_query!;
  const admin = createAdminClient();
  const { data: lead } = await admin
    .from("leads")
    .select("id,ultima_etapa_kanban,status")
    .eq("id", leadId)
    .eq("status_ativacao", "inativo")
    .is("deleted_at", null)
    .is("convertido_em", null)
    .maybeSingle();
  if (!lead) return unavailable(callback.id);
  const stage = lead.ultima_etapa_kanban || lead.status;
  const { data: validStage } = await admin
    .from("funil_etapas")
    .select("nome")
    .eq("nome", stage)
    .maybeSingle();
  if (!validStage) return unavailable(callback.id);

  const { data: updated, error } = await admin
    .from("leads")
    .update({
      status_ativacao: "ativo",
      status: validStage.nome,
      motivo_inativacao_id: null,
      detalhamento_inativacao: null,
      inativado_em: null,
      inativado_por: null,
      contato_futuro: null,
      data_contato_futuro: null,
      updated_by: user.id,
    })
    .eq("id", leadId)
    .eq("status_ativacao", "inativo")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Falha ao reativar lead: ${error.code}`);
  if (!updated) return unavailable(callback.id);

  await Promise.all([
    admin
      .from("eventos_agenda")
      .update({ status: "cancelado" })
      .eq("ref_tipo", "lead")
      .eq("ref_id", leadId)
      .eq("tipo", "follow_up")
      .eq("status", "agendado")
      .is("deleted_at", null),
    admin.from("atividades").insert({
      ref_tipo: "lead",
      ref_id: leadId,
      tipo: "lead_reativado",
      descricao: `${user.nome || "Usuário"} reativou o lead via Telegram`,
      autor_id: user.id,
      metadata_json: { canal: "telegram", etapa: validStage.nome },
    }),
  ]);
  const confirmation = renderTelegramTemplate(
    await requireTelegramConfig("telegram_msg_followup_reativado"),
    { nome: user.nome || "—", etapa: validStage.nome },
  );
  await finish(callback, confirmation);
}

export async function handleAdiar(
  user: AuthorizedUser,
  leadId: string,
  daysRaw: string,
  update: TelegramUpdate,
) {
  const callback = update.callback_query!;
  const days = Number(daysRaw);
  if (!Number.isInteger(days) || days < 1 || days > 365)
    return unavailable(callback.id);
  const admin = createAdminClient();
  const futureDate = addDaysSaoPaulo(days);
  const { data: updated, error } = await admin
    .from("leads")
    .update({
      data_contato_futuro: futureDate,
      telegram_follow_up_enviado_em: null,
      updated_by: user.id,
    })
    .eq("id", leadId)
    .eq("status_ativacao", "inativo")
    .eq("contato_futuro", true)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Falha ao adiar lead: ${error.code}`);
  if (!updated) return unavailable(callback.id);

  const start = await agendaDate(futureDate);
  await Promise.all([
    admin
      .from("eventos_agenda")
      .update({ data_hora_inicio: start, lembrete_enviado_em: null })
      .eq("ref_tipo", "lead")
      .eq("ref_id", leadId)
      .eq("tipo", "follow_up")
      .eq("status", "agendado")
      .is("deleted_at", null),
    admin.from("atividades").insert({
      ref_tipo: "lead",
      ref_id: leadId,
      tipo: "edicao_contato_futuro",
      descricao: `Retomada adiada em ${days} dias via Telegram`,
      autor_id: user.id,
      metadata_json: { canal: "telegram", dias: days, data: futureDate },
    }),
  ]);
  const confirmation = renderTelegramTemplate(
    await requireTelegramConfig("telegram_msg_followup_adiado"),
    { dias: days, data: formatDate(futureDate), nome: user.nome || "—" },
  );
  await finish(callback, confirmation);
}

export async function handlePerderStart(
  leadId: string,
  update: TelegramUpdate,
) {
  const callback = update.callback_query!;
  if (!(await inactiveLead(leadId))) return unavailable(callback.id);
  const reasons = await getTelegramConfigJson<LossReason>(
    "telegram_perder_motivos",
  );
  const valid = reasons.filter(validLossReason);
  if (!valid.length) return unavailable(callback.id);
  await answerCallbackQuery(callback.id);
  await editMessageText(
    callback.message!.chat.id,
    callback.message!.message_id,
    await requireTelegramConfig("telegram_msg_perder_motivo"),
    {
      reply_markup: {
        inline_keyboard: valid.map((reason) => [
          {
            text: reason.rotulo,
            callback_data: `pd:${leadId}:${reason.slug}`,
          },
        ]),
      },
    },
  );
}

export async function handlePerderConfirmar(
  user: AuthorizedUser,
  leadId: string,
  reasonSlug: string,
  update: TelegramUpdate,
) {
  const callback = update.callback_query!;
  const configured = await getTelegramConfigJson<LossReason>(
    "telegram_perder_motivos",
  );
  const option = configured.find(
    (reason) => validLossReason(reason) && reason.slug === reasonSlug,
  );
  if (!option) return unavailable(callback.id);
  const admin = createAdminClient();
  const { data: reason } = await admin
    .from("motivos_inativacao")
    .select("id,rotulo")
    .eq("slug", reasonSlug)
    .eq("ativo", true)
    .maybeSingle();
  if (!reason) return unavailable(callback.id);
  const { data: updated, error } = await admin
    .from("leads")
    .update({
      motivo_inativacao_id: reason.id,
      contato_futuro: false,
      data_contato_futuro: null,
      updated_by: user.id,
    })
    .eq("id", leadId)
    .eq("status_ativacao", "inativo")
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Falha ao perder lead: ${error.code}`);
  if (!updated) return unavailable(callback.id);

  await Promise.all([
    admin
      .from("eventos_agenda")
      .update({ status: "cancelado" })
      .eq("ref_tipo", "lead")
      .eq("ref_id", leadId)
      .eq("tipo", "follow_up")
      .eq("status", "agendado")
      .is("deleted_at", null),
    admin.from("atividades").insert({
      ref_tipo: "lead",
      ref_id: leadId,
      tipo: "lead_perdido",
      descricao: `Lead marcado como perdido via Telegram — ${reason.rotulo}`,
      autor_id: user.id,
      metadata_json: { canal: "telegram", motivo: reasonSlug },
    }),
  ]);
  const confirmation = renderTelegramTemplate(
    await requireTelegramConfig("telegram_msg_lead_perdido"),
    { motivo: reason.rotulo, nome: user.nome || "—" },
  );
  await finish(callback, confirmation);
}

async function inactiveLead(id: string) {
  const { data } = await createAdminClient()
    .from("leads")
    .select("id")
    .eq("id", id)
    .eq("status_ativacao", "inativo")
    .is("deleted_at", null)
    .is("convertido_em", null)
    .maybeSingle();
  return data;
}

async function finish(
  callback: NonNullable<TelegramUpdate["callback_query"]>,
  confirmation: string,
) {
  await answerCallbackQuery(callback.id);
  await editMessageText(
    callback.message!.chat.id,
    callback.message!.message_id,
    `${escapeTelegramHtml(callback.message!.text || "")}\n\n${confirmation}`,
    { parse_mode: "HTML" },
  );
}

async function unavailable(callbackId: string) {
  await answerCallbackQuery(
    callbackId,
    await requireTelegramConfig("telegram_msg_lead_indisponivel"),
  );
}

function validLossReason(value: LossReason) {
  return Boolean(/^[a-z0-9_]{1,30}$/.test(value?.slug ?? "") && value?.rotulo);
}

function addDaysSaoPaulo(days: number) {
  const now = new Date();
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const date = new Date(`${local}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function agendaDate(date: string) {
  const raw = await createAdminClient()
    .from("config")
    .select("valor")
    .eq("chave", "inativacao_reativar_horario_padrao")
    .maybeSingle();
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.data?.valor ?? "")
    ? raw.data!.valor
    : "09:00";
  return new Date(`${date}T${time}:00-03:00`).toISOString();
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${date}T12:00:00-03:00`));
}
