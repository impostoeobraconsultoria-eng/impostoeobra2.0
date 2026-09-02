import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { DiagnosticoConfig } from "@/lib/diagnostico/types";

const DIAGNOSTICO_KEYS = [
  "diagnostico_habilitado",
  "diagnostico_limite_reducao_baixa_pct",
  "diagnostico_signed_url_dias",
  "diagnostico_enviar_email_ao_gerar",
  "diagnostico_titulo_documento",
  "diagnostico_subtitulo_marca",
  "diagnostico_callout_com_reducao",
  "diagnostico_callout_sem_reducao",
  "diagnostico_disclaimer",
  "diagnostico_assinatura_linha1",
  "diagnostico_assinatura_linha2",
  "diagnostico_storage_bucket",
  "empresa_email",
  "empresa_whatsapp_display",
  "empresa_whatsapp_e164",
  "empresa_telefone_institucional",
  "resend_from_email",
  "resend_from_name",
] as const;

export async function getDiagnosticoConfig(): Promise<DiagnosticoConfig> {
  const { data, error } = await createAdminClient()
    .from("config")
    .select("chave,valor")
    .in("chave", [...DIAGNOSTICO_KEYS]);
  if (error)
    throw new Error(`Falha ao ler config do diagnóstico: ${error.code}`);
  const values = Object.fromEntries(
    (data ?? []).map((item) => [item.chave, item.valor ?? ""]),
  );
  return {
    habilitado: bool(values.diagnostico_habilitado, true),
    limiteReducaoPct: boundedNumber(
      values.diagnostico_limite_reducao_baixa_pct,
      5,
      0,
      100,
    ),
    signedUrlDias: boundedNumber(values.diagnostico_signed_url_dias, 7, 1, 30),
    enviarEmail: bool(values.diagnostico_enviar_email_ao_gerar, true),
    bucket: required(
      values.diagnostico_storage_bucket,
      "diagnostico_storage_bucket",
    ),
    titulo: required(
      values.diagnostico_titulo_documento,
      "diagnostico_titulo_documento",
    ),
    subtituloMarca: required(
      values.diagnostico_subtitulo_marca,
      "diagnostico_subtitulo_marca",
    ),
    calloutComReducao: required(
      values.diagnostico_callout_com_reducao,
      "diagnostico_callout_com_reducao",
    ),
    calloutSemReducao: required(
      values.diagnostico_callout_sem_reducao,
      "diagnostico_callout_sem_reducao",
    ),
    disclaimer: required(
      values.diagnostico_disclaimer,
      "diagnostico_disclaimer",
    ),
    assinaturaLinha1: required(
      values.diagnostico_assinatura_linha1,
      "diagnostico_assinatura_linha1",
    ),
    assinaturaLinha2: required(
      values.diagnostico_assinatura_linha2,
      "diagnostico_assinatura_linha2",
    ),
    emailInstitucional: values.empresa_email || "contato@impostoeobra.com.br",
    whatsappDisplay:
      values.empresa_whatsapp_display ||
      values.empresa_telefone_institucional ||
      "(61) 99398-2653",
    whatsappE164:
      values.empresa_whatsapp_e164?.replace(/\D/g, "") ||
      process.env.NEXT_PUBLIC_WHATSAPP_PHONE?.replace(/\D/g, "") ||
      "",
    resendFromEmail: values.resend_from_email || "contato@impostoeobra.com.br",
    resendFromName: values.resend_from_name || "Imposto & Obra Consultoria",
  };
}

function required(value: string | undefined, key: string) {
  if (!value?.trim()) throw new Error(`Config obrigatória ausente: ${key}`);
  return value.trim();
}

function bool(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  return value.trim().toLowerCase() === "true";
}

function boundedNumber(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(max, Math.max(min, parsed))
    : fallback;
}
