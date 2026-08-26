import "server-only";

import { sendMessage } from "@/lib/telegram/client";
import {
  getTelegramConfig,
  getTelegramConfigBoolean,
  renderTelegramTemplate,
  requireTelegramConfig,
} from "@/lib/telegram/config";
import { getSiteConfig } from "@/lib/site-config";

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
