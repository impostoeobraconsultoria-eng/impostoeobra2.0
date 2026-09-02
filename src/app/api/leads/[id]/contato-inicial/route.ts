import { NextResponse } from "next/server";

import { getActiveUser } from "@/lib/cadencia/auth";
import { getCadenciaConfig } from "@/lib/cadencia/config";
import { criarNotificacao } from "@/lib/notificacoes/criar";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const context = await getActiveUser();
  if (!context)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { supabase, user } = context;
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id,nome,responsavel_id,contato_inicial_em")
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
  if (lead.contato_inicial_em)
    return NextResponse.json(
      { error: "O contato inicial já foi registrado." },
      { status: 409 },
    );

  const config = await getCadenciaConfig();
  const today = new Date().toISOString().slice(0, 10);
  const { data: nextDate, error: dateError } = await supabase.rpc(
    "add_business_days",
    { start_date: today, num_days: config.followupDiasUteis },
  );
  if (dateError || typeof nextDate !== "string")
    return NextResponse.json(
      { error: "Não foi possível calcular o próximo follow-up." },
      { status: 500 },
    );

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("leads")
    .update({
      contato_inicial_em: now,
      contato_inicial_por: user.id,
      responsavel_id: lead.responsavel_id ?? user.id,
      tentativa_atual: 1,
      ultima_tentativa_em: now,
      proxima_tentativa_em: nextDate,
      cadencia_finalizada_em: null,
      updated_by: user.id,
    })
    .eq("id", lead.id)
    .is("contato_inicial_em", null)
    .select(
      "id,responsavel_id,contato_inicial_em,tentativa_atual,proxima_tentativa_em,cadencia_finalizada_em",
    )
    .maybeSingle();
  if (updateError || !updated)
    return NextResponse.json(
      { error: "O contato inicial já foi registrado por outro usuário." },
      { status: 409 },
    );

  const { error: attemptError } = await supabase
    .from("lead_tentativas_contato")
    .insert({
      lead_id: lead.id,
      numero: 1,
      tipo: "contato_inicial",
      resultado: "outro",
      criado_por: user.id,
    });
  if (attemptError) {
    console.error("Falha ao registrar tentativa inicial", {
      leadId: lead.id,
      code: attemptError.code,
    });
    return NextResponse.json(
      { error: "Contato salvo, mas a timeline precisa ser revisada." },
      { status: 500 },
    );
  }
  await supabase.from("atividades").insert({
    ref_tipo: "lead",
    ref_id: lead.id,
    tipo: "contato_inicial",
    descricao: "Contato inicial registrado e cadência comercial iniciada",
    metadata_json: { tentativa: 1, proxima_tentativa_em: nextDate },
    autor_id: user.id,
  });
  await criarNotificacao({
    destinatario_id: updated.responsavel_id,
    tipo: "sistema",
    titulo: "Contato inicial registrado",
    mensagem: `Cadência iniciada. Próximo follow-up em ${nextDate}.`,
    link: `/admin/leads/${lead.id}`,
    ref_tipo: "cadencia_contato_inicial",
    ref_id: lead.id,
  });
  return NextResponse.json({ ok: true, lead_atualizado: updated });
}
