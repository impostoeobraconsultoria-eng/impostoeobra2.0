import { NextRequest, NextResponse } from "next/server";

import { enviarAlertaFollowUpInativo } from "@/lib/telegram/envio";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const today = saoPauloDate();
  const todayStart = `${today}T03:00:00.000Z`;
  const { data: leads, error } = await admin
    .from("leads")
    .select(
      "id,nome,uf,inativado_em,motivo:motivos_inativacao(rotulo),telegram_follow_up_enviado_em",
    )
    .is("deleted_at", null)
    .is("convertido_em", null)
    .eq("status_ativacao", "inativo")
    .eq("contato_futuro", true)
    .lte("data_contato_futuro", today)
    .or(
      `telegram_follow_up_enviado_em.is.null,telegram_follow_up_enviado_em.lt.${todayStart}`,
    )
    .order("data_contato_futuro")
    .limit(500);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  let enviados = 0;
  let erros = 0;
  for (const lead of leads ?? []) {
    try {
      const sent = await enviarAlertaFollowUpInativo(lead);
      if (!sent) continue;
      const { error: updateError } = await admin
        .from("leads")
        .update({ telegram_follow_up_enviado_em: new Date().toISOString() })
        .eq("id", lead.id)
        .eq("status_ativacao", "inativo")
        .eq("contato_futuro", true);
      if (updateError) throw updateError;
      enviados += 1;
    } catch (sendError) {
      erros += 1;
      console.error("Falha no follow-up inativo via Telegram", {
        leadId: lead.id,
        error:
          sendError instanceof Error ? sendError.message : "erro desconhecido",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    eventos_processados: leads?.length ?? 0,
    enviados,
    erros,
  });
}

function saoPauloDate() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}
