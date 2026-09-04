import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAgendaContext } from "@/lib/agenda/server";
import { eventPatchSchema } from "@/lib/agenda/validation";

type Context = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Context) {
  const id = z.string().uuid().safeParse(params.id);
  const context = await getAgendaContext();
  if (!context)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!id.success)
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  const parsed = eventPatchSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.flatten() },
      { status: 400 },
    );

  const { data: current } = await context.supabase
    .from("eventos_agenda")
    .select("id,serie_id,inicio,fim,lead_id,cliente_id")
    .eq("id", id.data)
    .maybeSingle();
  if (!current)
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

  const { apply_to_series, participantes_user_ids, ...requested } = parsed.data;
  const finalStart = requested.inicio ?? current.inicio;
  const finalEnd = requested.fim ?? current.fim;
  if (Date.parse(finalEnd) < Date.parse(finalStart))
    return NextResponse.json(
      { error: "O fim deve ser igual ou posterior ao início." },
      { status: 400 },
    );
  const finalLead = requested.lead_id === undefined ? current.lead_id : requested.lead_id;
  const finalClient =
    requested.cliente_id === undefined ? current.cliente_id : requested.cliente_id;
  if (finalLead && finalClient)
    return NextResponse.json(
      { error: "Escolha apenas lead ou cliente." },
      { status: 400 },
    );

  const target =
    apply_to_series && current.serie_id
      ? { column: "serie_id", value: current.serie_id }
      : { column: "id", value: current.id };
  const resetReminder =
    requested.inicio !== undefined || requested.lembrete_minutos_antes !== undefined;
  const update = {
    ...requested,
    ...(resetReminder
      ? { lembrete_enviado: false, lembrete_enviado_em: null }
      : {}),
  };
  const { data: updated, error } = await context.supabase
    .from("eventos_agenda")
    .update(update)
    .eq(target.column, target.value)
    .select("id");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  if (participantes_user_ids) {
    const participants = Array.from(
      new Set([...participantes_user_ids, context.user.id]),
    );
    const ids = (updated ?? []).map((event) => event.id);
    if (ids.length) {
      const { error: deleteError } = await context.supabase
        .from("eventos_participantes")
        .delete()
        .in("evento_id", ids);
      if (deleteError)
        return NextResponse.json({ error: deleteError.message }, { status: 400 });
      const { error: insertError } = await context.supabase
        .from("eventos_participantes")
        .insert(
          ids.flatMap((eventId) =>
            participants.map((userId) => ({ evento_id: eventId, user_id: userId })),
          ),
        );
      if (insertError)
        return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
  }
  return NextResponse.json({ ok: true, ids: (updated ?? []).map((event) => event.id) });
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const id = z.string().uuid().safeParse(params.id);
  const context = await getAgendaContext();
  if (!context)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!id.success)
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });

  const { data: current } = await context.supabase
    .from("eventos_agenda")
    .select("id,serie_id,criado_por")
    .eq("id", id.data)
    .maybeSingle();
  if (!current)
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  const deleteSeries = request.nextUrl.searchParams.get("deleteSeries") === "true";
  const { data: targets, error: targetError } = await context.supabase
    .from("eventos_agenda")
    .select("id,criado_por")
    .eq(deleteSeries && current.serie_id ? "serie_id" : "id", deleteSeries && current.serie_id ? current.serie_id : current.id);
  if (targetError)
    return NextResponse.json({ error: targetError.message }, { status: 400 });
  if (
    context.user.perfil !== "admin" &&
    (targets ?? []).some((event) => event.criado_por !== context.user.id)
  )
    return NextResponse.json({ error: "Sem permissão para excluir." }, { status: 403 });

  const ids = (targets ?? []).map((event) => event.id);
  const { error } = await context.supabase
    .from("eventos_agenda")
    .delete()
    .in("id", ids);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, ids });
}
