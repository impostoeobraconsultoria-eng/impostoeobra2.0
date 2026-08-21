import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data: configRows } = await supabase
    .from("config")
    .select("chave,valor")
    .in("chave", ["notif_lead_parado_dias", "notif_vau_max_dias"]);
  const config = Object.fromEntries(
    (configRows ?? []).map((item) => [item.chave, item.valor]),
  );
  const leadDays = positiveInteger(config.notif_lead_parado_dias, 7);
  const vauDays = positiveInteger(config.notif_vau_max_dias, 30);
  const now = new Date();
  const leadLimit = new Date(
    now.getTime() - leadDays * 86_400_000,
  ).toISOString();

  const [
    { data: leads, error: leadsError },
    { data: latestVau, error: vauError },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id,nome,status,updated_at")
      .is("deleted_at", null)
      .is("convertido_em", null)
      .eq("status_ativacao", "ativo")
      .lt("updated_at", leadLimit)
      .order("updated_at")
      .limit(500),
    supabase
      .from("vau")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (leadsError || vauError)
    return NextResponse.json(
      { error: leadsError?.message || vauError?.message },
      { status: 500 },
    );

  let leadsCreated = 0;
  for (const lead of leads ?? []) {
    const { data: duplicate } = await supabase
      .from("notificacoes")
      .select("id")
      .eq("tipo", "lead_parado")
      .eq("ref_id", lead.id)
      .is("destinatario_id", null)
      .eq("lida", false)
      .maybeSingle();
    if (duplicate) continue;
    const elapsed = Math.max(
      leadDays,
      Math.floor((now.getTime() - Date.parse(lead.updated_at)) / 86_400_000),
    );
    const { error } = await supabase.from("notificacoes").insert({
      tipo: "lead_parado",
      titulo: `Lead sem retorno há ${elapsed} dias`,
      mensagem: `${lead.nome} — status atual: ${lead.status || "sem status"}. Última atualização em ${formatDate(lead.updated_at)}.`,
      link: `/admin/leads/${lead.id}`,
      ref_tipo: "lead",
      ref_id: lead.id,
    });
    if (!error) leadsCreated += 1;
  }

  let vauCreated = 0;
  const vauUpdated = latestVau?.updated_at
    ? Date.parse(latestVau.updated_at)
    : 0;
  const elapsedVau = vauUpdated
    ? Math.floor((now.getTime() - vauUpdated) / 86_400_000)
    : vauDays + 1;
  if (elapsedVau > vauDays) {
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
    const { data: recent } = await supabase
      .from("notificacoes")
      .select("id")
      .eq("tipo", "vau_desatualizada")
      .gte("criado_em", weekAgo)
      .limit(1)
      .maybeSingle();
    if (!recent) {
      const { error } = await supabase.from("notificacoes").insert({
        tipo: "vau_desatualizada",
        titulo: "Tabela VAU está desatualizada",
        mensagem: `Última atualização há ${elapsedVau} dias. Considere sincronizar com o SERO em /admin/vau.`,
        link: "/admin/vau",
        ref_tipo: "sistema",
      });
      if (!error) vauCreated = 1;
    }
  }

  return NextResponse.json({
    ok: true,
    leads_analisados: leads?.length ?? 0,
    leads_criados: leadsCreated,
    vau_criada: vauCreated,
  });
}

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
