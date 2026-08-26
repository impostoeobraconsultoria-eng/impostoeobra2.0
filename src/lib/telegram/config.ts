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

export async function getTelegramConfigBoolean(key: string) {
  return (await getTelegramConfig(key)).toLowerCase() === "true";
}

export async function getTelegramConfigJson<T>(key: string): Promise<T[]> {
  const raw = await getTelegramConfig(key);
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.warn("Config Telegram com JSON inválido", {
      key,
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return [];
  }
}

export function renderTelegramTemplate(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/{(\w+)}/g, (_, key: string) =>
    Object.hasOwn(values, key) ? escapeTelegramHtml(String(values[key])) : "—",
  );
}

export function escapeTelegramHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
