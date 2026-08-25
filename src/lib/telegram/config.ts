import "server-only";

import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

const loadTelegramConfig = unstable_cache(
  async () => {
    const { data, error } = await createAdminClient()
      .from("config")
      .select("chave,valor")
      .like("chave", "telegram_%");
    if (error)
      throw new Error(`Falha ao consultar config Telegram: ${error.code}`);
    return Object.fromEntries(
      (data ?? []).map(({ chave, valor }) => [chave, valor ?? ""]),
    );
  },
  ["telegram-config"],
  { revalidate: 60, tags: ["config", "telegram-config"] },
);

export async function getTelegramConfig(key: string) {
  const config = await loadTelegramConfig();
  return config[key] ?? "";
}

export async function requireTelegramConfig(key: string) {
  const value = await getTelegramConfig(key);
  if (!value) throw new Error(`Config Telegram ausente: ${key}`);
  return value;
}
