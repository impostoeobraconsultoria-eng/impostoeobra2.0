import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const CADENCIA_CONFIG_KEYS = [
  "cadencia_sla_cobertura_horas_inicial",
  "cadencia_sla_cobertura_recorrencia_horas",
  "cadencia_followup_dias_uteis",
  "cadencia_followup_max_tentativas",
  "cadencia_habilitada",
  "notif_lead_sem_cobertura",
  "notif_followup_hoje",
  "notif_followup_atrasado",
  "notif_decidir_lead",
  "template_alerta_sem_cobertura",
  "template_followup_hoje",
  "template_followup_atrasado",
  "template_decidir_lead",
  "dashboard_cards_ordem",
] as const;

export type CadenciaConfig = {
  slaInicialHoras: number;
  slaRecorrenciaHoras: number;
  followupDiasUteis: number;
  maxTentativas: number;
  habilitada: boolean;
  notificarSemCobertura: boolean;
  notificarFollowupHoje: boolean;
  notificarFollowupAtrasado: boolean;
  notificarDecidir: boolean;
  templateSemCobertura: string;
  templateFollowupHoje: string;
  templateFollowupAtrasado: string;
  templateDecidir: string;
  dashboardCardsOrdem: string[];
};

export async function getCadenciaConfig(): Promise<CadenciaConfig> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("config")
    .select("chave,valor")
    .in("chave", [...CADENCIA_CONFIG_KEYS]);
  if (error) throw error;
  const values = Object.fromEntries(
    (data ?? []).map((row) => [row.chave, row.valor ?? ""]),
  );
  return {
    slaInicialHoras: positiveInteger(
      values.cadencia_sla_cobertura_horas_inicial,
      1,
      168,
    ),
    slaRecorrenciaHoras: positiveInteger(
      values.cadencia_sla_cobertura_recorrencia_horas,
      1,
      168,
    ),
    followupDiasUteis: positiveInteger(
      values.cadencia_followup_dias_uteis,
      2,
      30,
    ),
    maxTentativas: positiveInteger(
      values.cadencia_followup_max_tentativas,
      3,
      20,
    ),
    habilitada: values.cadencia_habilitada === "true",
    notificarSemCobertura: values.notif_lead_sem_cobertura === "true",
    notificarFollowupHoje: values.notif_followup_hoje === "true",
    notificarFollowupAtrasado: values.notif_followup_atrasado === "true",
    notificarDecidir: values.notif_decidir_lead === "true",
    templateSemCobertura:
      values.template_alerta_sem_cobertura ||
      "Lead {primeiro_nome} ({uf}) há {horas}h sem consultor.",
    templateFollowupHoje:
      values.template_followup_hoje ||
      "Você tem {quantidade} follow-up(s) hoje.",
    templateFollowupAtrasado:
      values.template_followup_atrasado ||
      "Follow-up de {primeiro_nome} ({uf}) previsto para {data} está atrasado há {dias} dia(s).",
    templateDecidir:
      values.template_decidir_lead ||
      "Lead {primeiro_nome} precisa de decisão após {tentativas} tentativas.",
    dashboardCardsOrdem: parseCardOrder(values.dashboard_cards_ordem),
  };
}

export function renderCadenciaTemplate(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) =>
    escapeHtml(String(values[key] ?? "—")),
  );
}

export function plainTextFromTemplate(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function saoPauloDateKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function saoPauloDayStartIso(value = new Date()) {
  return `${saoPauloDateKey(value)}T03:00:00.000Z`;
}

export function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "—";
}

export function datePtBr(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${value}T12:00:00-03:00`));
}

export function daysBetweenDateKeys(earlier: string, later: string) {
  const start = Date.parse(`${earlier}T12:00:00Z`);
  const end = Date.parse(`${later}T12:00:00Z`);
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

function positiveInteger(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= max
    ? parsed
    : fallback;
}

function parseCardOrder(value: string | undefined) {
  const fallback = [
    "sem_consultor",
    "followup_hoje",
    "followup_atrasado",
    "decidir_hoje",
    "meus_leads",
  ];
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
