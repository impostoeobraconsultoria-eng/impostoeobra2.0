import { createClient } from "@/lib/supabase/server";
import { AgendaCalendar } from "./agenda-calendar";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const requested = /^\d{4}-\d{2}$/.test(searchParams?.mes ?? "")
    ? searchParams!.mes!
    : new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
        .format(new Date())
        .slice(0, 7);
  const [year, month] = requested.split("-").map(Number);
  const from = new Date(Date.UTC(year, month - 2, 20, 3)).toISOString();
  const to = new Date(Date.UTC(year, month + 1, 10, 3)).toISOString();
  const supabase = createClient();
  const [
    { data: events },
    { data: users },
    { data: leads },
    { data: customers },
    { data: contracts },
    { data: configs },
    { data: claims },
  ] = await Promise.all([
    supabase
      .from("eventos_agenda")
      .select("*,responsavel:users!eventos_agenda_responsavel_id_fkey(nome)")
      .is("deleted_at", null)
      .gte("data_hora_inicio", from)
      .lt("data_hora_inicio", to)
      .order("data_hora_inicio"),
    supabase
      .from("users")
      .select("id,nome,email")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("leads")
      .select("id,nome")
      .is("deleted_at", null)
      .order("nome")
      .limit(300),
    supabase
      .from("clientes")
      .select("id,nome")
      .is("deleted_at", null)
      .order("nome")
      .limit(300),
    supabase
      .from("contratos")
      .select("id,numero,cliente:clientes(nome)")
      .is("deleted_at", null)
      .order("criado_em", { ascending: false })
      .limit(300),
    supabase
      .from("config")
      .select("chave,valor")
      .in("chave", ["agenda_lembrete_default_min"]),
    supabase.auth.getClaims(),
  ]);
  const email = claims?.claims.email;
  const current = (users ?? []).find((user) => user.email === email);
  const { data: profile } =
    typeof email === "string"
      ? await supabase
          .from("users")
          .select("perfil")
          .eq("email", email)
          .eq("ativo", true)
          .maybeSingle()
      : { data: null };
  const config = Object.fromEntries(
    (configs ?? []).map((item) => [item.chave, item.valor ?? ""]),
  );
  let calendarEvents = events ?? [];
  const initialEventId = searchParams?.evento;
  if (
    initialEventId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      initialEventId,
    ) &&
    !calendarEvents.some((event) => event.id === initialEventId)
  ) {
    const { data: initialEvent } = await supabase
      .from("eventos_agenda")
      .select("*,responsavel:users!eventos_agenda_responsavel_id_fkey(nome)")
      .eq("id", initialEventId)
      .is("deleted_at", null)
      .maybeSingle();
    if (initialEvent) calendarEvents = [...calendarEvents, initialEvent];
  }
  return (
    <AgendaCalendar
      month={requested}
      events={calendarEvents}
      users={users ?? []}
      leads={leads ?? []}
      customers={customers ?? []}
      contracts={contracts ?? []}
      currentUserId={current?.id ?? ""}
      isAdmin={profile?.perfil === "admin"}
      defaultReminder={
        [1440, 4320, 10080].includes(
          Number(config.agenda_lembrete_default_min),
        )
          ? Number(config.agenda_lembrete_default_min)
          : 1440
      }
      initialEventId={initialEventId}
      initialView={searchParams?.view}
    />
  );
}
