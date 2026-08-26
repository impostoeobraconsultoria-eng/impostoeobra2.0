import "server-only";

import { answerCallbackQuery, editMessageText } from "@/lib/telegram/client";
import {
  escapeTelegramHtml,
  renderTelegramTemplate,
  requireTelegramConfig,
} from "@/lib/telegram/config";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TelegramUpdate } from "@/lib/telegram/types";

export async function handleAssumir(
  user: { id: string; nome: string | null },
  leadId: string,
  update: TelegramUpdate,
) {
  const callback = update.callback_query!;
  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("leads")
    .update({ responsavel_id: user.id, updated_by: user.id })
    .eq("id", leadId)
    .is("responsavel_id", null)
    .is("deleted_at", null)
    .is("convertido_em", null)
    .eq("status_ativacao", "ativo")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Falha ao assumir lead: ${error.code}`);

  if (!updated) {
    const { data: lead } = await admin
      .from("leads")
      .select("responsavel:users!leads_responsavel_id_fkey(nome)")
      .eq("id", leadId)
      .maybeSingle();
    const owner = relationName(lead?.responsavel);
    const text = renderTelegramTemplate(
      await requireTelegramConfig("telegram_msg_lead_ja_assumido"),
      { nome: owner || "—" },
    );
    await answerCallbackQuery(callback.id, text);
    return;
  }

  await admin.from("atividades").insert({
    ref_tipo: "lead",
    ref_id: leadId,
    tipo: "lead_assumido",
    descricao: `${user.nome || "Usuário"} assumiu via Telegram`,
    autor_id: user.id,
    metadata_json: { canal: "telegram" },
  });
  const confirmation = renderTelegramTemplate(
    await requireTelegramConfig("telegram_msg_lead_assumido"),
    { nome: user.nome || "—" },
  );
  await answerCallbackQuery(callback.id, confirmation);
  if (callback.message)
    await editMessageText(
      callback.message.chat.id,
      callback.message.message_id,
      `${escapeTelegramHtml(callback.message.text || "")}

${confirmation}`,
      { parse_mode: "HTML" },
    );
}

function relationName(value: unknown) {
  if (Array.isArray(value)) return value[0]?.nome as string | undefined;
  if (value && typeof value === "object" && "nome" in value)
    return String(value.nome ?? "");
  return "";
}
