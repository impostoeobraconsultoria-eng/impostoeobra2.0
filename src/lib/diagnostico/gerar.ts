import "server-only";

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

import { getDiagnosticoConfig } from "@/lib/diagnostico/config";
import { DiagnosticoPreliminar } from "@/lib/diagnostico/pdf/DiagnosticoPreliminar";
import type {
  DiagnosticoDocumento,
  DiagnosticoLead,
  DiagnosticoVariante,
} from "@/lib/diagnostico/types";
import { criarNotificacao } from "@/lib/notificacoes/criar";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResultadoGeracaoDiagnostico = {
  ok: boolean;
  storage_path?: string;
  numero_publico?: string;
  variante?: DiagnosticoVariante;
  error?: string;
};

export async function gerarDiagnosticoPreliminar(
  leadId: string,
): Promise<ResultadoGeracaoDiagnostico> {
  const startedAt = performance.now();
  try {
    const config = await getDiagnosticoConfig();
    if (!config.habilitado) return { ok: false, error: "desabilitado" };

    const admin = createAdminClient();
    const [
      { data: lead, error: leadError },
      { data: current, error: currentError },
    ] = await Promise.all([
      admin
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .is("deleted_at", null)
        .maybeSingle(),
      admin
        .from("diagnosticos_preliminares")
        .select("id,numero_publico,regeracoes_count,storage_path")
        .eq("lead_id", leadId)
        .maybeSingle(),
    ]);
    if (leadError || !lead)
      throw new Error(`Lead indisponível: ${leadError?.code ?? "not_found"}`);
    if (currentError)
      throw new Error(`Diagnóstico indisponível: ${currentError.code}`);

    const economia = Math.max(0, number(lead.economia));
    const inssDireto = Math.max(0, number(lead.inss_direto));
    const inssReduzido = Math.max(0, number(lead.inss_reduzido));
    const economiaPct = inssDireto > 0 ? (economia / inssDireto) * 100 : 0;
    const variante: DiagnosticoVariante =
      economiaPct > config.limiteReducaoPct ? "com_reducao" : "sem_reducao";
    const generatedAt = new Date();
    const numeroPublico =
      current?.numero_publico || (await nextPublicNumber(generatedAt));
    const nextRegenerationCount = current
      ? Number(current.regeracoes_count ?? 0) + 1
      : 0;
    // Uma única versão física por lead: upsert substitui v1.pdf e evita histórico residual.
    const storagePath = `${leadId}/v1.pdf`;
    const document: DiagnosticoDocumento = {
      lead: lead as DiagnosticoLead,
      config,
      variante,
      numeroPublico,
      dataGeracao: generatedAt,
    };
    const pdf = await renderToBuffer(
      React.createElement(
        DiagnosticoPreliminar,
        document,
      ) as unknown as Parameters<typeof renderToBuffer>[0],
    );
    const { error: uploadError } = await admin.storage
      .from(config.bucket)
      .upload(storagePath, pdf, {
        contentType: "application/pdf",
        cacheControl: "0",
        upsert: true,
      });
    if (uploadError) throw new Error(`Upload recusado: ${uploadError.message}`);

    const metadata = {
      lead_id: leadId,
      numero_publico: numeroPublico,
      variante,
      economia_pct: round(economiaPct),
      economia_valor: economia,
      inss_apurado: inssDireto,
      inss_reduzido: inssReduzido,
      storage_path: storagePath,
      storage_bucket: config.bucket,
      versao_template: "v3.0",
      gerado_em: generatedAt.toISOString(),
      regenerado_em: current ? generatedAt.toISOString() : null,
      regeracoes_count: nextRegenerationCount,
    };
    const { error: metadataError } = await admin
      .from("diagnosticos_preliminares")
      .upsert(metadata, { onConflict: "lead_id" });
    if (metadataError) {
      await admin.storage.from(config.bucket).remove([storagePath]);
      throw new Error(`Metadados recusados: ${metadataError.code}`);
    }

    if (config.enviarEmail && lead.email) {
      await sendDiagnosticEmail({
        email: lead.email,
        name: lead.nome,
        leadId,
        title: config.titulo,
        fromEmail: config.resendFromEmail,
        fromName: config.resendFromName,
      }).catch((emailError) => {
        console.error("[diagnostico] PDF gerado, mas email falhou", {
          leadId,
          error:
            emailError instanceof Error
              ? emailError.message
              : "erro desconhecido",
        });
      });
    }
    const timelineMessage = `Diagnóstico Nº ${numeroPublico} gerado (${variantLabel(variante)}).`;
    const { error: activityError } = await admin.from("atividades").insert({
      ref_tipo: "lead",
      ref_id: leadId,
      tipo: current ? "diagnostico_regerado" : "diagnostico_gerado",
      descricao: timelineMessage,
      metadata_json: {
        numero_publico: numeroPublico,
        variante,
        regeracoes_count: nextRegenerationCount,
      },
    });
    if (activityError)
      console.error("[diagnostico] PDF gerado, mas timeline falhou", {
        leadId,
        code: activityError.code,
      });

    await criarNotificacao({
      destinatario_id: lead.responsavel_id ?? null,
      tipo: "sistema",
      titulo: config.titulo,
      mensagem: timelineMessage,
      link: `/admin/leads/${leadId}`,
      ref_tipo: "lead",
      ref_id: leadId,
    }).catch((notificationError) => {
      console.error("[diagnostico] PDF gerado, mas notificação falhou", {
        leadId,
        error:
          notificationError instanceof Error
            ? notificationError.message
            : "erro desconhecido",
      });
    });
    console.info("[diagnostico] gerado", {
      leadId,
      variante,
      bytes: pdf.byteLength,
      durationMs: Math.round(performance.now() - startedAt),
    });
    return {
      ok: true,
      storage_path: storagePath,
      numero_publico: numeroPublico,
      variante,
    };
  } catch (error) {
    console.error("[diagnostico] falha ao gerar", {
      leadId,
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return { ok: false, error: "falha_geracao" };
  }
}

async function nextPublicNumber(generatedAt: Date) {
  const { data, error } = await createAdminClient().rpc(
    "proximo_numero_diagnostico",
  );
  if (error || data == null)
    throw new Error(`Numeração indisponível: ${error?.code ?? "empty"}`);
  const date = generatedAt.toLocaleDateString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  });
  return `${date}/${String(data).padStart(4, "0")}`;
}

async function sendDiagnosticEmail(input: {
  email: string;
  name: string;
  leadId: string;
  title: string;
  fromEmail: string;
  fromName: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[diagnostico] email ignorado: RESEND_API_KEY ausente");
    return;
  }
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://impostoeobra.com.br"
  ).replace(/\/$/, "");
  const downloadUrl = `${siteUrl}/api/diagnosticos/${input.leadId}/download`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${input.fromName} <${input.fromEmail}>`,
      to: [input.email],
      subject: input.title,
      html: `<p>Olá, ${escapeHtml(firstName(input.name))}.</p><p>${escapeHtml(input.title)} está disponível.</p><p><a href="${downloadUrl}">Baixar diagnóstico preliminar</a></p>`,
    }),
  });
  if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
}

function variantLabel(value: DiagnosticoVariante) {
  return value === "com_reducao" ? "com redução" : "sem redução";
}
function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || value;
}
function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function round(value: number) {
  return Math.round(value * 100) / 100;
}
function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}
