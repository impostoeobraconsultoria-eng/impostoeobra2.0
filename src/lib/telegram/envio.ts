import "server-only";

import { sendMessage } from "@/lib/telegram/client";
import {
  getTelegramConfig,
  getTelegramConfigBoolean,
  renderTelegramTemplate,
  requireTelegramConfig,
} from "@/lib/telegram/config";
import { getSiteConfig } from "@/lib/site-config";
import { createAdminClient } from "@/lib/supabase/admin";

export type TelegramLead = {
  id: string;
  nome: string;
  uf?: string | null;
  dest?: string | null;
  area_total_calculo?: number | string | null;
  inss_direto?: number | string | null;
  economia?: number | string | null;
  ddd?: string | null;
  whatsapp?: string | null;
};

export type TelegramInactiveLead = {
  id: string;
  nome: string;
  uf?: string | null;
  inativado_em?: string | null;
  motivo?: { rotulo?: string | null } | { rotulo?: string | null }[] | null;
};

export type TelegramStalledLead = {
  id: string;
  nome: string;
  uf?: string | null;
  status?: string | null;
  updated_at: string;
  dias_parado: number;
  ddd?: string | null;
  whatsapp?: string | null;
};

export async function enviarAlertaLeadNovo(lead: TelegramLead) {
  const [enabled, notify, chatIdRaw] = await Promise.all([
    getTelegramConfigBoolean("telegram_habilitado"),
    getTelegramConfigBoolean("telegram_notificar_lead_novo"),
    getTelegramConfig("telegram_chat_id_grupo_operacao"),
  ]);
  const chatId = Number(chatIdRaw);
  if (!enabled || !notify || !Number.isSafeInteger(chatId)) return false;

  const [template, assume, contact, whatsapp, crm, baseUrl, siteConfig] =
    await Promise.all([
      requireTelegramConfig("telegram_template_lead_novo"),
      requireTelegramConfig("telegram_btn_assumir"),
      requireTelegramConfig("telegram_btn_contato_realizado"),
      requireTelegramConfig("telegram_btn_whatsapp"),
      requireTelegramConfig("telegram_btn_ver_no_crm"),
      requireTelegramConfig("telegram_link_base_crm"),
      getSiteConfig(),
    ]);
  const text = renderTelegramTemplate(template, {
    primeiro_nome: firstName(lead.nome),
    uf: lead.uf || "—",
    destinacao_legivel: lead.dest || "—",
    area_m2: numberPtBr(lead.area_total_calculo),
    inss_estimado: moneyPtBr(lead.inss_direto),
    economia_potencial: moneyPtBr(lead.economia),
  });
  const phone = `${lead.ddd ?? ""}${lead.whatsapp ?? ""}`.replace(/\D/g, "");
  const message = (siteConfig.whatsapp_msg_lead_captura || "").replace(
    /{nome}/g,
    firstName(lead.nome),
  );
  const whatsappUrl = `https://wa.me/55${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  const crmUrl = `${baseUrl.replace(/\/$/, "")}/admin/leads/${lead.id}`;

  await sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: assume, callback_data: `assumir:${lead.id}` },
          { text: contact, callback_data: `contato:${lead.id}` },
        ],
        [
          { text: whatsapp, url: whatsappUrl },
          { text: crm, url: crmUrl },
        ],
      ],
    },
  });
  return true;
}

export async function enviarAlertaFollowUpInativo(lead: TelegramInactiveLead) {
  const [enabled, notify, chatIdRaw] = await Promise.all([
    getTelegramConfigBoolean("telegram_habilitado"),
    getTelegramConfigBoolean("telegram_notificar_follow_up_inativo"),
    getTelegramConfig("telegram_chat_id_grupo_operacao"),
  ]);
  const chatId = Number(chatIdRaw);
  if (!enabled || !notify || !Number.isSafeInteger(chatId)) return false;

  const [template, reactivate, postpone, lose, crm, baseUrl, postponeRaw] =
    await Promise.all([
      requireTelegramConfig("telegram_template_follow_up_inativo"),
      requireTelegramConfig("telegram_btn_reativar"),
      requireTelegramConfig("telegram_btn_adiar"),
      requireTelegramConfig("telegram_btn_perder"),
      requireTelegramConfig("telegram_btn_ver_no_crm"),
      requireTelegramConfig("telegram_link_base_crm"),
      getTelegramConfig("telegram_adiar_dias"),
    ]);
  const postponeDays = positiveInteger(postponeRaw, 7);
  const inactiveAt = lead.inativado_em ? new Date(lead.inativado_em) : null;
  const reason = Array.isArray(lead.motivo) ? lead.motivo[0] : lead.motivo;
  const text = renderTelegramTemplate(template, {
    primeiro_nome: firstName(lead.nome),
    uf: lead.uf || "—",
    inativado_em: inactiveAt ? datePtBr(inactiveAt) : "—",
    dias_desde: inactiveAt
      ? Math.max(
          0,
          Math.floor((Date.now() - inactiveAt.getTime()) / 86_400_000),
        )
      : "—",
    motivo: reason?.rotulo || "—",
  });
  const crmUrl = `${baseUrl.replace(/\/$/, "")}/admin/leads/${lead.id}`;

  await sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: reactivate, callback_data: `reativar:${lead.id}` },
          { text: postpone, callback_data: `adiar:${lead.id}:${postponeDays}` },
        ],
        [
          { text: lose, callback_data: `perder:${lead.id}` },
          { text: crm, url: crmUrl },
        ],
      ],
    },
  });
  return true;
}

export async function enviarAlertaLeadParado(lead: TelegramStalledLead) {
  const [enabled, notify, chatIdRaw] = await Promise.all([
    getTelegramConfigBoolean("telegram_habilitado"),
    getTelegramConfigBoolean("telegram_notificar_lead_parado"),
    getTelegramConfig("telegram_chat_id_grupo_operacao"),
  ]);
  const chatId = Number(chatIdRaw);
  if (!enabled || !notify || !Number.isSafeInteger(chatId)) return false;

  const [template, contact, whatsapp, crm, baseUrl, siteConfig] =
    await Promise.all([
      requireTelegramConfig("telegram_template_lead_parado"),
      requireTelegramConfig("telegram_btn_contato_realizado"),
      requireTelegramConfig("telegram_btn_whatsapp"),
      requireTelegramConfig("telegram_btn_ver_no_crm"),
      requireTelegramConfig("telegram_link_base_crm"),
      getSiteConfig(),
    ]);
  const text = renderTelegramTemplate(template, {
    primeiro_nome: firstName(lead.nome),
    uf: lead.uf || "—",
    status: lead.status || "—",
    dias_parado: lead.dias_parado,
    ultima_atualizacao: datePtBr(new Date(lead.updated_at)),
  });
  const phone = `${lead.ddd ?? ""}${lead.whatsapp ?? ""}`.replace(/\D/g, "");
  const message = (siteConfig.whatsapp_msg_lead_captura || "").replace(
    /{nome}/g,
    firstName(lead.nome),
  );
  const whatsappUrl = `https://wa.me/55${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  const crmUrl = `${baseUrl.replace(/\/$/, "")}/admin/leads/${lead.id}`;

  await sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: contact, callback_data: `contato:${lead.id}` }],
        [
          { text: whatsapp, url: whatsappUrl },
          { text: crm, url: crmUrl },
        ],
      ],
    },
  });
  return true;
}

export async function enviarAlertaCadenciaGrupo(html: string, leadId: string) {
  const [enabled, chatIdRaw, crm, baseUrl] = await Promise.all([
    getTelegramConfigBoolean("telegram_habilitado"),
    getTelegramConfig("telegram_chat_id_grupo_operacao"),
    requireTelegramConfig("telegram_btn_ver_no_crm"),
    requireTelegramConfig("telegram_link_base_crm"),
  ]);
  const chatId = Number(chatIdRaw);
  if (!enabled || !Number.isSafeInteger(chatId)) return false;
  await sendMessage(chatId, html, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: crm,
            url: `${baseUrl.replace(/\/$/, "")}/admin/leads/${leadId}`,
          },
        ],
      ],
    },
  });
  return true;
}

export async function enviarAlertaCadenciaUsuarios(
  userIds: string[],
  html: string,
  link = "/admin/leads",
) {
  if (!userIds.length) return 0;
  const [enabled, crm, baseUrl] = await Promise.all([
    getTelegramConfigBoolean("telegram_habilitado"),
    requireTelegramConfig("telegram_btn_ver_no_crm"),
    requireTelegramConfig("telegram_link_base_crm"),
  ]);
  if (!enabled) return 0;
  const admin = createAdminClient();
  const { data: recipients } = await admin
    .from("users")
    .select("telegram_chat_id")
    .in("id", userIds)
    .eq("ativo", true)
    .not("telegram_chat_id", "is", null);
  let sent = 0;
  await Promise.all(
    (recipients ?? []).map(async (recipient) => {
      if (!Number.isSafeInteger(recipient.telegram_chat_id)) return;
      await sendMessage(recipient.telegram_chat_id, html, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: crm,
                url: `${baseUrl.replace(/\/$/, "")}${link}`,
              },
            ],
          ],
        },
      });
      sent += 1;
    }),
  );
  return sent;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "—";
}

function numberPtBr(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(
    Number.isFinite(number) ? number : 0,
  );
}

function moneyPtBr(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
}

function datePtBr(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

function positiveInteger(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 365
    ? parsed
    : fallback;
}
