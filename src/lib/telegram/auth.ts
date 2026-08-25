import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function autorizarTelegramUser(telegramUserId: number) {
  const { data, error } = await createAdminClient()
    .from("users")
    .select("id,nome,perfil")
    .eq("telegram_user_id", telegramUserId)
    .eq("ativo", true)
    .maybeSingle();
  if (error) throw new Error(`Falha ao autorizar Telegram: ${error.code}`);
  return data;
}
