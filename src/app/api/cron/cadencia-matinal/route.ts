import { NextRequest, NextResponse } from "next/server";

import {
  getCadenciaConfig,
  plainTextFromTemplate,
  renderCadenciaTemplate,
  saoPauloDateKey,
  saoPauloDayStartIso,
} from "@/lib/cadencia/config";
import { criarNotificacao } from "@/lib/notificacoes/criar";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarAlertaCadenciaUsuarios } from "@/lib/telegram/envio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const config = await getCadenciaConfig();
  if (!config.habilitada || !config.notificarFollowupHoje)
    return NextResponse.json({ ok: true, desabilitado: true, enviados: 0 });

  const admin = createAdminClient();
  const now = new Date();
  const today = saoPauloDateKey(now);
  const [
    { data: consultants, error: usersError },
    { data: leads, error: leadsError },
  ] = await Promise.all([
    admin
      .from("users")
      .select("id")
      .eq("ativo", true)
      .eq("perfil", "consultor"),
    admin
      .from("leads")
      .select("id,responsavel_id")
      .is("deleted_at", null)
      .is("convertido_em", null)
      .eq("status_ativacao", "ativo")
      .is("cadencia_finalizada_em", null)
      .eq("proxima_tentativa_em", today),
  ]);
  if (usersError || leadsError)
    return NextResponse.json(
      { error: usersError?.message || leadsError?.message },
      { status: 500 },
    );

  const { data: alreadySent } = await admin
    .from("notificacoes")
    .select("destinatario_id")
    .eq("ref_tipo", "cadencia_followup_hoje")
    .gte("criado_em", saoPauloDayStartIso(now));
  const sentIds = new Set(
    (alreadySent ?? []).map((notification) => notification.destinatario_id),
  );
  let sent = 0;
  for (const consultant of consultants ?? []) {
    const count = (leads ?? []).filter(
      (lead) => lead.responsavel_id === consultant.id,
    ).length;
    if (!count || sentIds.has(consultant.id)) continue;
    const html = renderCadenciaTemplate(config.templateFollowupHoje, {
      quantidade: count,
    });
    try {
      await criarNotificacao({
        destinatario_id: consultant.id,
        tipo: "sistema",
        titulo: "Follow-ups de hoje",
        mensagem: plainTextFromTemplate(html),
        link: "/admin/leads?filtro=followup_hoje",
        ref_tipo: "cadencia_followup_hoje",
        ref_id: consultant.id,
      });
      await enviarAlertaCadenciaUsuarios(
        [consultant.id],
        html,
        "/admin/leads?filtro=followup_hoje",
      ).catch((telegramError) =>
        console.error("Falha no Telegram matinal", {
          userId: consultant.id,
          error:
            telegramError instanceof Error
              ? telegramError.message
              : "erro desconhecido",
        }),
      );
      sent += 1;
    } catch (notificationError) {
      console.error("Falha no resumo matinal", {
        userId: consultant.id,
        error:
          notificationError instanceof Error
            ? notificationError.message
            : "erro desconhecido",
      });
    }
  }
  return NextResponse.json({ ok: true, enviados: sent });
}
