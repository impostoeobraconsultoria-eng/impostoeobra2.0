import "server-only";

import { sendMessage } from "@/lib/telegram/client";
import { requireTelegramConfig } from "@/lib/telegram/config";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TelegramUpdate } from "@/lib/telegram/types";

export async function handleVincularStart(update: TelegramUpdate) {
  const message = update.message;
  if (!message) return;
  const text = await requireTelegramConfig("telegram_msg_vincular_inicio");
  await sendMessage(message.chat.id, text);
}

export async function handleTextoLivre(update: TelegramUpdate) {
  const message = update.message;
  const telegramUser = message?.from;
  const codigo = message?.text?.trim();
  if (!message || !telegramUser || !codigo) return false;
  if (!/^\d{6}$/.test(codigo)) return false;
  if (message.chat.type !== "private") {
    await sendMessage(
      message.chat.id,
      await requireTelegramConfig("telegram_msg_codigo_apenas_privado"),
    );
    return true;
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data: consumed, error: consumeError } = await supabase
    .from("telegram_codigos_vinculo")
    .update({ usado_em: now })
    .eq("codigo", codigo)
    .is("usado_em", null)
    .gt("expira_em", now)
    .select("user_id")
    .maybeSingle();

  if (consumeError || !consumed) {
    const text = await requireTelegramConfig("telegram_msg_vincular_erro");
    await sendMessage(message.chat.id, text);
    return true;
  }

  const { error: userError } = await supabase
    .from("users")
    .update({
      telegram_user_id: telegramUser.id,
      telegram_username: telegramUser.username ?? null,
      telegram_chat_id: message.chat.id,
      telegram_vinculado_em: now,
    })
    .eq("id", consumed.user_id)
    .eq("ativo", true);

  if (userError) {
    await supabase
      .from("telegram_codigos_vinculo")
      .update({ usado_em: null })
      .eq("codigo", codigo)
      .eq("user_id", consumed.user_id);
    throw new Error(`Falha ao vincular Telegram: ${userError.code}`);
  }

  const text = await requireTelegramConfig("telegram_msg_vincular_sucesso");
  await sendMessage(message.chat.id, text);
  return true;
}
