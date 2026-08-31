import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { criarNotificacao } from "@/lib/notificacoes/criar";
import { agendaReminderIsDue, reminderLabel } from "@/lib/agenda/lembrete-due";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const resendKey = process.env.RESEND_API_KEY;

  const supabase = createAdminClient();
  const now = new Date();
  // O cron roda às 8h. A janela de 8 dias cobre integralmente lembretes de
  // "1 semana antes", mesmo quando o evento ocorre mais tarde no dia.
  const reminderWindowEnd = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
  const [{ data: candidates, error }, { data: users }, { data: configs }] =
    await Promise.all([
      supabase
        .from("eventos_agenda")
        .select(
          "id,titulo,descricao,tipo,data_hora_inicio,data_hora_fim,dia_inteiro,lembrete_minutos,responsavel:users!eventos_agenda_responsavel_id_fkey(nome)",
        )
        .is("deleted_at", null)
        .eq("status", "agendado")
        .not("lembrete_minutos", "is", null)
        .is("lembrete_enviado_em", null)
        .gt("data_hora_inicio", now.toISOString())
        .lte("data_hora_inicio", reminderWindowEnd.toISOString())
        .order("data_hora_inicio")
        .limit(500),
      supabase.from("users").select("id,email,nome").eq("ativo", true),
      supabase
        .from("config")
        .select("chave,valor")
        .in("chave", ["resend_from_email", "resend_from_name"]),
    ]);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  const due = (candidates ?? []).filter((event) =>
    agendaReminderIsDue({
      startsAt: event.data_hora_inicio,
      reminderMinutes: Number(event.lembrete_minutos),
      now,
    }),
  );
  const config = Object.fromEntries(
    (configs ?? []).map((item) => [item.chave, item.valor ?? ""]),
  );
  const from = `${config.resend_from_name || "Imposto & Obra — Agenda"} <${config.resend_from_email || "agenda@impostoeobra.com.br"}>`;
  let emailsEnviados = 0;
  let notificacoesCriadas = 0;
  let errosEmail = 0;
  let errosNotificacao = 0;

  for (const event of due) {
    const responsible = Array.isArray(event.responsavel)
      ? event.responsavel[0]
      : event.responsavel;
    const start = new Date(event.data_hora_inicio);
    const end = event.data_hora_fim ? new Date(event.data_hora_fim) : null;
    const when = start.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "full",
      timeStyle: "short",
    });
    const duration = end
      ? ` até ${end.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}`
      : "";
    const minutes = Number(event.lembrete_minutos);
    const messages = (users ?? [])
      .filter(
        (user): user is typeof user & { email: string } =>
          typeof user.email === "string" && user.email.length > 0,
      )
      .map((user) => ({
        from,
        to: [user.email],
        subject: `📅 Lembrete: ${event.titulo} — ${reminderLabel(minutes)}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#2E3234"><h1 style="color:#0B76C6;font-size:24px">${escapeHtml(event.titulo)}</h1><p><strong>Data e hora:</strong> ${escapeHtml(when + duration)}</p><p><strong>Tipo:</strong> ${escapeHtml(event.tipo.replaceAll("_", " "))}</p>${event.descricao ? `<p>${escapeHtml(event.descricao).replaceAll("\n", "<br>")}</p>` : ""}<p><strong>Responsável:</strong> ${escapeHtml(responsible?.nome || "Equipe")}</p><p><a href="https://impostoeobra.com.br/admin/agenda?evento=${event.id}" style="display:inline-block;background:#0B76C6;color:white;padding:12px 18px;text-decoration:none">Ver no CRM</a></p><hr style="border:0;border-top:1px solid #D4D9DC"><p style="font-size:12px;color:#5B6265">Você recebeu porque está registrado como usuário ativo do CRM Imposto & Obra.</p></div>`,
      }));
    if (!(users ?? []).length) continue;
    try {
      const notificationMessage = `${start.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit" })} às ${start.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}`;
      await Promise.all(
        (users ?? []).map((user) =>
          criarNotificacao({
            destinatario_id: user.id,
            tipo: "evento_agenda",
            titulo: `Lembrete: ${event.titulo}`,
            mensagem: notificationMessage,
            link: `/admin/agenda?evento=${event.id}`,
            ref_tipo: "evento",
            ref_id: event.id,
            push_titulo: `Lembrete: ${event.titulo}`,
            push_mensagem: notificationMessage,
          }),
        ),
      );
      notificacoesCriadas += users?.length ?? 0;

      if (resendKey) {
        try {
          const response = await fetch("https://api.resend.com/emails/batch", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
              "User-Agent": "Imposto & Obra Agenda/1.0",
              "Idempotency-Key": `agenda-${event.id}-${start.toISOString()}`,
            },
            body: JSON.stringify(messages),
          });
          if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
          emailsEnviados += messages.length;
        } catch (emailError) {
          errosEmail += 1;
          console.error("Falha no email do lembrete da agenda", {
            eventId: event.id,
            error:
              emailError instanceof Error
                ? emailError.message
                : "erro desconhecido",
          });
        }
      } else {
        console.warn("Email do lembrete ignorado: RESEND_API_KEY ausente.");
      }

      const { error: updateError } = await supabase
        .from("eventos_agenda")
        .update({ lembrete_enviado_em: now.toISOString() })
        .eq("id", event.id)
        .is("lembrete_enviado_em", null);
      if (updateError) throw updateError;
    } catch (notificationError) {
      errosNotificacao += 1;
      console.error("Falha na notificação do lembrete da agenda", {
        eventId: event.id,
        error:
          notificationError instanceof Error
            ? notificationError.message
            : "erro desconhecido",
      });
    }
  }
  return NextResponse.json({
    ok: true,
    eventos_processados: due.length,
    notificacoes_criadas: notificacoesCriadas,
    emails_enviados: emailsEnviados,
    erros_notificacao: errosNotificacao,
    erros_email: errosEmail,
  });
}
