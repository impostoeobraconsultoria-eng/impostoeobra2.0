import { NextRequest, NextResponse } from "next/server";

import { expandirRecorrencia } from "@/lib/agenda/recorrencia";
import { getAgendaConfig, getAgendaContext } from "@/lib/agenda/server";
import { eventInputSchema, eventTypes } from "@/lib/agenda/validation";

export const dynamic = "force-dynamic";

const eventSelect = `
  *,
  lead:leads(id,nome),
  cliente:clientes(id,nome),
  eventos_participantes!inner(user_id,user:users(id,nome))
`;

export async function GET(request: NextRequest) {
  const context = await getAgendaContext();
  if (!context)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const type = params.get("tipo");
  const participant = params.get("participante");
  let query = context.supabase
    .from("eventos_agenda")
    .select(eventSelect)
    .order("inicio");

  if (from) query = query.gte("inicio", from);
  if (to) query = query.lt("inicio", to);
  if (type) {
    const types = type.split(",").filter((item) =>
      eventTypes.includes(item as (typeof eventTypes)[number]),
    );
    if (types.length) query = query.in("tipo", types);
  }
  if (params.get("lead_id")) query = query.eq("lead_id", params.get("lead_id")!);
  if (params.get("cliente_id"))
    query = query.eq("cliente_id", params.get("cliente_id")!);
  if (participant)
    query = query.eq("eventos_participantes.user_id", participant);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  const events = (data ?? []).map(({ eventos_participantes, ...event }) => ({
    ...event,
    participantes: (eventos_participantes ?? []).map(
      (participant: {
        user_id: string;
        user: { nome: string | null } | Array<{ nome: string | null }> | null;
      }) => {
      const related = Array.isArray(participant.user)
        ? participant.user[0]
        : participant.user;
      return { user_id: participant.user_id, nome: related?.nome || "Usuário" };
      },
    ),
  }));
  return NextResponse.json({ eventos: events });
}

export async function POST(request: NextRequest) {
  const context = await getAgendaContext();
  if (!context)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const parsed = eventInputSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.flatten() },
      { status: 400 },
    );

  const participants = Array.from(
    new Set([...parsed.data.participantes_user_ids, context.user.id]),
  );
  const config = await getAgendaConfig(context.supabase, [
    "agenda_recorrencia_max_instancias",
  ]);
  const configuredMax = Number(config.agenda_recorrencia_max_instancias);
  const maxInstances = Number.isInteger(configuredMax)
    ? Math.min(Math.max(configuredMax, 1), 366)
    : 52;
  const occurrences = expandirRecorrencia(
    { ...parsed.data, participantes_user_ids: participants },
    maxInstances,
  );
  if (!occurrences.length)
    return NextResponse.json(
      { error: "A recorrência não gerou eventos." },
      { status: 400 },
    );

  if (parsed.data.tipo === "reuniao" && !parsed.data.lead_id && !parsed.data.cliente_id)
    console.warn("Reunião criada sem associação", { userId: context.user.id });

  const rows = occurrences.map((occurrence) => ({
    titulo: occurrence.titulo,
    descricao: occurrence.descricao || null,
    tipo: occurrence.tipo,
    dia_inteiro: occurrence.dia_inteiro,
    inicio: occurrence.inicio,
    fim: occurrence.fim,
    lead_id: occurrence.lead_id || null,
    cliente_id: occurrence.cliente_id || null,
    serie_id: occurrence.serie_id || null,
    serie_indice: occurrence.serie_indice || null,
    serie_total: occurrence.serie_total || null,
    lembrete_minutos_antes: occurrence.lembrete_minutos_antes ?? null,
    criado_por: context.user.id,
  }));
  const { data: inserted, error } = await context.supabase
    .from("eventos_agenda")
    .insert(rows)
    .select("id");
  if (error || !inserted)
    return NextResponse.json(
      { error: error?.message || "Não foi possível criar o evento." },
      { status: 400 },
    );

  const participantRows = inserted.flatMap((event) =>
    participants.map((userId) => ({ evento_id: event.id, user_id: userId })),
  );
  const { error: participantError } = await context.supabase
    .from("eventos_participantes")
    .insert(participantRows);
  if (participantError) {
    await context.supabase
      .from("eventos_agenda")
      .delete()
      .in("id", inserted.map((event) => event.id));
    return NextResponse.json({ error: participantError.message }, { status: 400 });
  }

  return NextResponse.json(
    { ok: true, ids: inserted.map((event) => event.id) },
    { status: 201 },
  );
}
