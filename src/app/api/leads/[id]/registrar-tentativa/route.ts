import { NextResponse } from "next/server";
import { z } from "zod";

import { getActiveUser } from "@/lib/cadencia/auth";
import { getCadenciaConfig } from "@/lib/cadencia/config";

const schema = z.object({
  resultado: z.enum([
    "sem_resposta",
    "ocupado",
    "nao_atende",
    "interessado",
    "sem_interesse",
    "retornar_depois",
    "outro",
  ]),
  observacoes: z.string().trim().max(1000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const context = await getActiveUser();
  if (!context)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Resultado ou observação inválidos." },
      { status: 400 },
    );
  const { supabase, user } = context;
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select(
      "id,tentativa_atual,contato_inicial_em,cadencia_finalizada_em,responsavel_id",
    )
    .eq("id", params.id)
    .is("deleted_at", null)
    .is("convertido_em", null)
    .eq("status_ativacao", "ativo")
    .maybeSingle();
  if (leadError || !lead)
    return NextResponse.json(
      { error: "Lead não encontrado ou indisponível." },
      { status: 404 },
    );
  if (!lead.contato_inicial_em)
    return NextResponse.json(
      { error: "Registre primeiro o contato inicial." },
      { status: 409 },
    );
  if (lead.cadencia_finalizada_em)
    return NextResponse.json(
      { error: "Cadência finalizada. Use converter ou inativar." },
      { status: 409 },
    );

  const config = await getCadenciaConfig();
  const numero = Number(lead.tentativa_atual ?? 0) + 1;
  if (numero > config.maxTentativas)
    return NextResponse.json(
      { error: "Cadência esgotada. Use converter ou inativar." },
      { status: 409 },
    );
  const finalByResult = ["interessado", "sem_interesse"].includes(
    parsed.data.resultado,
  );
  const finished = finalByResult || numero >= config.maxTentativas;
  const today = new Date().toISOString().slice(0, 10);
  let nextDate: string | null = null;
  if (!finished) {
    const { data, error } = await supabase.rpc("add_business_days", {
      start_date: today,
      num_days: config.followupDiasUteis,
    });
    if (error || typeof data !== "string")
      return NextResponse.json(
        { error: "Não foi possível calcular o próximo follow-up." },
        { status: 500 },
      );
    nextDate = data;
  }
  const now = new Date().toISOString();
  const { error: insertError } = await supabase
    .from("lead_tentativas_contato")
    .insert({
      lead_id: lead.id,
      numero,
      tipo: "follow_up",
      resultado: parsed.data.resultado,
      observacoes: parsed.data.observacoes || null,
      criado_por: user.id,
    });
  if (insertError)
    return NextResponse.json(
      { error: "Não foi possível registrar a tentativa." },
      { status: insertError.code === "23505" ? 409 : 500 },
    );
  const { data: updated, error: updateError } = await supabase
    .from("leads")
    .update({
      tentativa_atual: numero,
      ultima_tentativa_em: now,
      proxima_tentativa_em: nextDate,
      cadencia_finalizada_em: finished ? now : null,
      updated_by: user.id,
    })
    .eq("id", lead.id)
    .eq("tentativa_atual", lead.tentativa_atual)
    .is("cadencia_finalizada_em", null)
    .select("id,tentativa_atual,proxima_tentativa_em,cadencia_finalizada_em")
    .maybeSingle();
  if (updateError || !updated) {
    console.error("Tentativa registrada sem atualizar resumo do lead", {
      leadId: lead.id,
      code: updateError?.code,
    });
    return NextResponse.json(
      { error: "A tentativa foi salva, mas o resumo precisa ser revisado." },
      { status: 409 },
    );
  }
  await supabase.from("atividades").insert({
    ref_tipo: "lead",
    ref_id: lead.id,
    tipo: "tentativa_contato",
    descricao: `Tentativa ${numero}/${config.maxTentativas} registrada: ${parsed.data.resultado.replaceAll("_", " ")}`,
    metadata_json: {
      tentativa: numero,
      resultado: parsed.data.resultado,
      proxima_tentativa_em: nextDate,
      cadencia_finalizada: finished,
    },
    autor_id: user.id,
  });
  return NextResponse.json({
    ok: true,
    proxima_acao_sugerida: finished
      ? "Converter ou inativar o lead."
      : `Realizar novo follow-up em ${nextDate}.`,
    lead_atualizado: updated,
  });
}
