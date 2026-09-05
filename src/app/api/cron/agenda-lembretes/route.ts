import { NextRequest, NextResponse } from "next/server";

import { criarNotificacao } from "@/lib/notificacoes/criar";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarAlertaCadenciaUsuarios } from "@/lib/telegram/envio";
import { escapeTelegramHtml } from "@/lib/telegram/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONFIG_KEYS = [
  "agenda_habilitada",
  "agenda_lembrete_canais",
  "agenda_notificacao_titulo_lembrete",
  "agenda_notificacao_body_template",
] as const;

function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{(\w+)}}/g, (_, key: string) => values[key] ?? "—");
}

export async function GET(request: NextRequest) {
  const secret = process.env.AGENDA_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: configRows, error: configError } = await admin
    .from("config")
    .select("chave,valor")
    .in("chave", [...CONFIG_KEYS]);
  if (configError)
    return NextResponse.json({ error: configError.message }, { status: 500 });
  const config = Object.fromEntries(
    (configRows ?? []).map((item) => [item.chave, item.valor ?? ""]),
  );
  if (config.agenda_habilitada?.toLowerCase() !== "true")
    return NextResponse.json({ skipped: true, reason: "disabled" });
  const channels = new Set<string>(
    (config.agenda_lembrete_canais || "")
      .split(",")
      .map((item: string) => item.trim())
      .filter(Boolean),
  );
  if (!channels.size)
    return NextResponse.json({ skipped: true, reason: "no channels" });

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const { data: events, error } = await admin
    .from("eventos_agenda")
    .select(
      "id,titulo,tipo,inicio,dia_inteiro,lead_id,cliente_id,eventos_participantes(user_id)",
    )
    .not("lembrete_minutos_antes", "is", null)
    .eq("lembrete_enviado", false)
    .lte("lembrete_disparar_em", now.toISOString())
    .gte("lembrete_disparar_em", oneHourAgo.toISOString())
    .order("inicio")
    .limit(100);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  let processed = 0;
  let notified = 0;
  const errors: Array<{ evento_id: string; erro: string }> = [];
  for (const event of events ?? []) {
    try {
      const participants = (event.eventos_participantes ?? []).map(
        (participant) => participant.user_id,
      );
      const start = new Date(event.inicio);
      const values = {
        titulo: event.titulo,
        inicio_hora: event.dia_inteiro
          ? "dia inteiro"
          : start.toLocaleTimeString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              hour: "2-digit",
              minute: "2-digit",
            }),
        inicio_data: start.toLocaleDateString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        }),
        tipo: event.tipo.replaceAll("_", " "),
        lead_nome: "—",
        cliente_nome: "—",
      };
      const title = config.agenda_notificacao_titulo_lembrete || "Lembrete de compromisso";
      const body = renderTemplate(
        config.agenda_notificacao_body_template || "{{titulo}} — {{inicio_hora}}",
        values,
      );
      if (channels.has("sininho") || channels.has("push")) {
        for (const userId of participants) {
          await criarNotificacao({
            destinatario_id: userId,
            tipo: "agenda_lembrete",
            titulo: title,
            mensagem: body,
            link: `/admin/agenda?evento=${event.id}`,
            ref_tipo: "evento_agenda",
            ref_id: event.id,
            dedupe_key: `agenda:${event.id}:${userId}`,
            enviar_push: channels.has("push"),
            push_titulo: title,
            push_mensagem: body,
          });
          notified += 1;
        }
      }
      if (channels.has("telegram") && participants.length) {
        await enviarAlertaCadenciaUsuarios(
          participants,
          `<b>${escapeTelegramHtml(title)}</b>\n${escapeTelegramHtml(body)}`,
          `/admin/agenda?evento=${event.id}`,
        );
      }
      const { error: updateError } = await admin
        .from("eventos_agenda")
        .update({
          lembrete_enviado: true,
          lembrete_enviado_em: now.toISOString(),
        })
        .eq("id", event.id)
        .eq("lembrete_enviado", false);
      if (updateError) throw updateError;
      processed += 1;
      console.info("Lembrete da agenda disparado", {
        eventoId: event.id,
        participantes: participants.length,
        canais: Array.from(channels),
      });
    } catch (eventError) {
      const message =
        eventError instanceof Error ? eventError.message : "Erro desconhecido";
      errors.push({ evento_id: event.id, erro: message });
      console.error("Falha no lembrete da agenda", {
        eventoId: event.id,
        error: message,
      });
    }
  }

  return NextResponse.json({
    processados: processed,
    notificados: notified,
    erros: errors,
  });
}
