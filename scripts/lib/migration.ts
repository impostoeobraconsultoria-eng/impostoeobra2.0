import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type CliOptions = {
  commit: boolean;
  overwrite: boolean;
};

export function parseCliOptions(): CliOptions {
  return {
    commit: process.argv.includes("--commit"),
    overwrite: process.argv.includes("--overwrite"),
  };
}

export function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), filename);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim();
      const raw = trimmed.slice(separator + 1).trim();
      if (process.env[key] === undefined)
        process.env[key] = raw.replace(/^(["'])(.*)\1$/, "$2");
    }
  }
}

export function createMigrationClient(): SupabaseClient {
  loadLocalEnv();
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

export function deterministicUuid(scope: string, legacyId: string) {
  const bytes = Buffer.from(
    createHash("sha256")
      .update(`${scope}:${legacyId}`)
      .digest()
      .subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function chunks<T>(values: T[], size = 500) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size)
    result.push(values.slice(index, index + size));
  return result;
}

export function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function emptyToNull(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "string" ? value.trim() || null : value;
}

export function numberOrNull(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let normalized = String(value)
    .trim()
    .replace(/R\$\s?/i, "")
    .replace(/\s/g, "");
  if (normalized.includes(","))
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  const number = Number(normalized.replace(/%$/, ""));
  return Number.isFinite(number) ? number : null;
}

export function booleanValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = normalizeHeader(value);
  if (
    ["sim", "true", "verdadeiro", "ativo", "publicado", "1"].includes(
      normalized,
    )
  )
    return true;
  if (
    ["nao", "false", "falso", "inativo", "rascunho", "0"].includes(normalized)
  )
    return false;
  return fallback;
}

export function dateValue(value: unknown, withTime = false) {
  const raw = emptyToNull(value);
  if (raw === null) return null;
  if (raw instanceof Date)
    return withTime ? raw.toISOString() : raw.toISOString().slice(0, 10);
  const text = String(raw);
  const brazilian = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (brazilian) {
    const [, day, month, year, hour = "00", minute = "00", second = "00"] =
      brazilian;
    const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return withTime
      ? `${isoDate}T${hour.padStart(2, "0")}:${minute}:${second}-03:00`
      : isoDate;
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return withTime ? parsed.toISOString() : parsed.toISOString().slice(0, 10);
}

export async function upsertBatches(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
) {
  for (const batch of chunks(rows)) {
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict, ignoreDuplicates: false });
    if (error) throw new Error(`${table}: ${error.code} ${error.message}`);
  }
}

export function printPlan(label: string, rows: unknown[]) {
  console.log(`${label}: ${rows.length} registro(s)`);
}
