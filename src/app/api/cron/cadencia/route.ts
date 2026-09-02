import { NextRequest, NextResponse } from "next/server";

import {
  datePtBr,
  daysBetweenDateKeys,
  firstName,
  getCadenciaConfig,
  plainTextFromTemplate,
  renderCadenciaTemplate,
  saoPauloDateKey,
  saoPauloDayStartIso,
} from "@/lib/cadencia/config";
import { criarNotificacao } from "@/lib/notificacoes/criar";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enviarAlertaCadenciaGrupo,
  enviarAlertaCadenciaUsuarios,
} from "@/lib/telegram/envio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CadenceLead = {
  id: string;
  nome: string;
  uf: string | null;
  data_hora: string;
  responsavel_id: string | null;
  tentativa_atual: number;
  proxima_tentativa_em: string | null;
  cadencia_finalizada_em: string | null;
  ultimo_alerta_cobertura_h: number | null;
};

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const config = await getCadenciaConfig();
  if (!config.habilitada)
    return NextResponse.json({
      ok: true,
      desabilitado: true,
      cobertura_alertados: 0,
      followup_alertados: 0,
      decidir_alertados: 0,
      erros: 0,
    });

  const now = new Date();
  const today = saoPauloDateKey(now);
  const startOfDay = saoPauloDayStartIso(now);
  const { data: admins } = await admin
    .from("users")
    .select("id")
    .eq("ativo", true)
    .eq("perfil", "admin");
  const adminIds = (admins ?? []).map((user) => user.id);
  let coberturaAlertados = 0;
  let followupAlertados = 0;
  let decidirAlertados = 0;
  let erros = 0;

  if (config.notificarSemCobertura) {
    const threshold = new Date(
      now.getTime() - config.slaInicialHoras * 3_600_000,
    ).toISOString();
    const { data: uncovered, error } = await admin
      .from("leads")
      .select(
        "id,nome,uf,data_hora,responsavel_id,tentativa_atual,proxima_tentativa_em,cadencia_finalizada_em,ultimo_alerta_cobertura_h",
      )
      .is("deleted_at", null)
      .is("convertido_em", null)
      .eq("status_ativacao", "ativo")
      .is("responsavel_id", null)
      .is("contato_inicial_em", null)
      .lte("data_hora", threshold)
      .limit(500);
    if (error) throw error;
    for (const lead of (uncovered ?? []) as CadenceLead[]) {
      const hours = Math.max(
        0,
        Math.floor((now.getTime() - Date.parse(lead.data_hora)) / 3_600_000),
      );
      const last = lead.ultimo_alerta_cobertura_h;
      if (
        hours < config.slaInicialHoras ||
        (last != null && hours - last < config.slaRecorrenciaHoras)
      )
        continue;
      const html = renderCadenciaTemplate(config.templateSemCobertura, {
        primeiro_nome: firstName(lead.nome),
        uf: lead.uf || "—",
        horas: hours,
      });
      try {
        await criarNotificacao({
          tipo: "sistema",
          titulo: "Lead sem cobertura",
          mensagem: plainTextFromTemplate(html),
          link: `/admin/leads/${lead.id}`,
          ref_tipo: "cadencia_sem_cobertura",
          ref_id: lead.id,
        });
        await enviarAlertaCadenciaGrupo(html, lead.id).catch((telegramError) =>
          console.error("Falha no Telegram de cobertura", {
            leadId: lead.id,
            error:
              telegramError instanceof Error
                ? telegramError.message
                : "erro desconhecido",
          }),
        );
        const { error: updateError } = await admin
          .from("leads")
          .update({ ultimo_alerta_cobertura_h: hours })
          .eq("id", lead.id)
          .or(
            last == null
              ? "ultimo_alerta_cobertura_h.is.null"
              : `ultimo_alerta_cobertura_h.eq.${last}`,
          );
        if (updateError) throw updateError;
        coberturaAlertados += 1;
      } catch (notificationError) {
        erros += 1;
        console.error("Falha no alerta de cobertura", {
          leadId: lead.id,
          error:
            notificationError instanceof Error
              ? notificationError.message
              : "erro desconhecido",
        });
      }
    }
  }

  const { data: recentNotifications } = await admin
    .from("notificacoes")
    .select("destinatario_id,ref_tipo,ref_id")
    .in("ref_tipo", ["cadencia_followup_atrasado", "cadencia_decidir"])
    .gte("criado_em", startOfDay);
  const sentKeys = new Set(
    (recentNotifications ?? []).map(
      (item) =>
        `${item.ref_tipo}:${item.ref_id}:${item.destinatario_id ?? "todos"}`,
    ),
  );

  if (config.notificarFollowupAtrasado) {
    const { data: overdue, error } = await admin
      .from("leads")
      .select(
        "id,nome,uf,data_hora,responsavel_id,tentativa_atual,proxima_tentativa_em,cadencia_finalizada_em,ultimo_alerta_cobertura_h",
      )
      .is("deleted_at", null)
      .is("convertido_em", null)
      .eq("status_ativacao", "ativo")
      .is("cadencia_finalizada_em", null)
      .not("responsavel_id", "is", null)
      .lt("proxima_tentativa_em", today)
      .limit(500);
    if (error) throw error;
    for (const lead of (overdue ?? []) as CadenceLead[]) {
      if (!lead.responsavel_id || !lead.proxima_tentativa_em) continue;
      const recipients = Array.from(
        new Set([lead.responsavel_id, ...adminIds]),
      );
      const html = renderCadenciaTemplate(config.templateFollowupAtrasado, {
        primeiro_nome: firstName(lead.nome),
        uf: lead.uf || "—",
        data: datePtBr(lead.proxima_tentativa_em),
        dias: daysBetweenDateKeys(lead.proxima_tentativa_em, today),
      });
      const unsent = recipients.filter(
        (id) => !sentKeys.has(`cadencia_followup_atrasado:${lead.id}:${id}`),
      );
      if (!unsent.length) continue;
      try {
        await Promise.all(
          unsent.map((recipientId) =>
            criarNotificacao({
              destinatario_id: recipientId,
              tipo: "sistema",
              titulo: "Follow-up atrasado",
              mensagem: plainTextFromTemplate(html),
              link: `/admin/leads/${lead.id}`,
              ref_tipo: "cadencia_followup_atrasado",
              ref_id: lead.id,
            }),
          ),
        );
        await enviarAlertaCadenciaUsuarios(
          unsent,
          html,
          `/admin/leads/${lead.id}`,
        ).catch((telegramError) =>
          console.error("Falha no Telegram de follow-up atrasado", {
            leadId: lead.id,
            error:
              telegramError instanceof Error
                ? telegramError.message
                : "erro desconhecido",
          }),
        );
        followupAlertados += 1;
      } catch (notificationError) {
        erros += 1;
        console.error("Falha no alerta de follow-up atrasado", {
          leadId: lead.id,
          error:
            notificationError instanceof Error
              ? notificationError.message
              : "erro desconhecido",
        });
      }
    }
  }

  if (config.notificarDecidir) {
    const { data: decisions, error } = await admin
      .from("leads")
      .select(
        "id,nome,uf,data_hora,responsavel_id,tentativa_atual,proxima_tentativa_em,cadencia_finalizada_em,ultimo_alerta_cobertura_h",
      )
      .is("deleted_at", null)
      .is("convertido_em", null)
      .eq("status_ativacao", "ativo")
      .not("cadencia_finalizada_em", "is", null)
      .gte("tentativa_atual", config.maxTentativas)
      .limit(500);
    if (error) throw error;
    for (const lead of (decisions ?? []) as CadenceLead[]) {
      const recipients = Array.from(
        new Set([
          ...(lead.responsavel_id ? [lead.responsavel_id] : []),
          ...adminIds,
        ]),
      );
      const html = renderCadenciaTemplate(config.templateDecidir, {
        primeiro_nome: firstName(lead.nome),
        uf: lead.uf || "—",
        tentativas: lead.tentativa_atual,
      });
      const unsent = recipients.filter(
        (id) => !sentKeys.has(`cadencia_decidir:${lead.id}:${id}`),
      );
      if (!unsent.length) continue;
      try {
        await Promise.all(
          unsent.map((recipientId) =>
            criarNotificacao({
              destinatario_id: recipientId,
              tipo: "sistema",
              titulo: "Lead aguardando decisão",
              mensagem: plainTextFromTemplate(html),
              link: `/admin/leads/${lead.id}`,
              ref_tipo: "cadencia_decidir",
              ref_id: lead.id,
            }),
          ),
        );
        await enviarAlertaCadenciaUsuarios(
          unsent,
          html,
          `/admin/leads/${lead.id}`,
        ).catch((telegramError) =>
          console.error("Falha no Telegram de decisão", {
            leadId: lead.id,
            error:
              telegramError instanceof Error
                ? telegramError.message
                : "erro desconhecido",
          }),
        );
        decidirAlertados += 1;
      } catch (notificationError) {
        erros += 1;
        console.error("Falha no alerta de decisão", {
          leadId: lead.id,
          error:
            notificationError instanceof Error
              ? notificationError.message
              : "erro desconhecido",
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    cobertura_alertados: coberturaAlertados,
    followup_alertados: followupAlertados,
    decidir_alertados: decidirAlertados,
    erros,
  });
}
