import { NextResponse, type NextRequest } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase/admin";
import { leadSchema } from "@/lib/validation/lead";
import { parseBrazilianMobile } from "@/lib/ddds-brasileiros";
import { criarNotificacao } from "@/lib/notificacoes/criar";
import { enviarAlertaLeadNovo } from "@/lib/telegram/envio";
import { gerarDiagnosticoPreliminar } from "@/lib/diagnostico/gerar";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Payload muito grande." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido." },
      { status: 400 },
    );
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Dados inválidos.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const phone = parseBrazilianMobile(parsed.data.telefone);
  if (!phone.ok)
    return NextResponse.json(
      { ok: false, error: phone.error, fields: { telefone: [phone.error] } },
      { status: 422 },
    );
  const {
    timestamp: _timestamp,
    website: _website,
    telefone: _telefone,
    ...lead
  } = parsed.data;
  void _timestamp;
  void _website;
  void _telefone;
  const admin = createAdminClient();
  const matches = await findRecurrences(
    admin,
    phone.data.telefoneNormalizado,
    lead.email,
  );
  const { data, error } = await admin
    .from("leads")
    .insert({
      ...lead,
      ddd: phone.data.ddd,
      whatsapp: phone.data.whatsapp,
      telefone_normalizado: phone.data.telefoneNormalizado,
      origem: "simulador",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Falha ao persistir lead", { code: error.code });
    return NextResponse.json(
      { ok: false, error: "Não foi possível registrar a simulação." },
      { status: 500 },
    );
  }

  const location = lead.uf ? ` da UF ${lead.uf}` : "";
  try {
    await criarNotificacao({
      tipo: "lead_novo",
      titulo: `Novo lead: ${lead.nome}`,
      mensagem: `${lead.nome}${location} preencheu o simulador.`,
      link: `/admin/leads/${data.id}`,
      ref_tipo: "lead",
      ref_id: data.id,
      push_titulo: `Novo lead: ${firstName(lead.nome)}`,
      push_mensagem: `Novo contato pelo simulador${location}.`,
    });
  } catch (notificationError) {
    console.error("Falha ao criar notificação de lead", {
      leadId: data.id,
      error:
        notificationError instanceof Error
          ? notificationError.message
          : "erro desconhecido",
    });
  }

  waitUntil(
    enviarAlertaLeadNovo({
      id: data.id,
      nome: lead.nome,
      uf: lead.uf,
      dest: lead.dest,
      area_total_calculo: lead.area_total_calculo,
      inss_direto: lead.inss_direto,
      economia: lead.economia,
      ddd: phone.data.ddd,
      whatsapp: phone.data.whatsapp,
    }).catch((telegramError) => {
      console.error("Falha ao enviar lead ao Telegram", {
        leadId: data.id,
        error:
          telegramError instanceof Error
            ? telegramError.message
            : "erro desconhecido",
      });
    }),
  );
  waitUntil(
    gerarDiagnosticoPreliminar(data.id).then((result) => {
      if (!result.ok && result.error !== "desabilitado")
        console.error("[diagnostico] geração assíncrona não concluída", {
          leadId: data.id,
          error: result.error,
        });
    }),
  );

  if (matches.leads.length || matches.clientes.length) {
    const { error: recurrenceError } = await admin.from("atividades").insert({
      ref_tipo: "lead",
      ref_id: data.id,
      tipo: "lead_recorrente_detectado",
      descricao: "Possível recorrência detectada por telefone ou e-mail",
      metadata_json: {
        leads_encontrados: matches.leads,
        clientes_encontrados: matches.clientes,
      },
    });
    if (recurrenceError)
      console.error("Falha ao registrar recorrência", {
        leadId: data.id,
        code: recurrenceError.code,
      });
  }

  console.info("Lead registrado", { id: data.id, origem: "simulador" });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Novo contato";
}

async function findRecurrences(
  admin: ReturnType<typeof createAdminClient>,
  phone: string,
  email?: string | null,
) {
  const leadQueries = [
    admin
      .from("leads")
      .select("id")
      .eq("telefone_normalizado", phone)
      .is("deleted_at", null)
      .is("convertido_em", null),
  ];
  const customerQueries = [
    admin
      .from("clientes")
      .select("id")
      .eq("telefone_normalizado", phone)
      .is("deleted_at", null),
  ];
  if (email) {
    const safeEmail = email
      .trim()
      .toLowerCase()
      .replace(/[\\%_]/g, "\\$&");
    leadQueries.push(
      admin
        .from("leads")
        .select("id")
        .ilike("email", safeEmail)
        .is("deleted_at", null)
        .is("convertido_em", null),
    );
    customerQueries.push(
      admin
        .from("clientes")
        .select("id")
        .ilike("email", safeEmail)
        .is("deleted_at", null),
    );
  }
  const results = await Promise.all([...leadQueries, ...customerQueries]);
  const leadCount = leadQueries.length;
  return {
    leads: Array.from(
      new Set(
        results
          .slice(0, leadCount)
          .flatMap((result) => (result.data ?? []).map((item) => item.id)),
      ),
    ),
    clientes: Array.from(
      new Set(
        results
          .slice(leadCount)
          .flatMap((result) => (result.data ?? []).map((item) => item.id)),
      ),
    ),
  };
}
