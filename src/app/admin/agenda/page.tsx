import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AgendaCalendar } from "./agenda-calendar";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const supabase = createClient();
  const [
    { data: claims },
    { data: configs },
    { data: users },
    { data: leads },
    { data: clients },
  ] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("config")
      .select("chave,valor")
      .in("chave", [
        "agenda_habilitada",
        "agenda_view_padrao",
        "agenda_horario_inicio_dia",
        "agenda_horario_fim_dia",
        "agenda_lembrete_padrao_minutos",
      ]),
    supabase
      .from("users")
      .select("id,nome,email")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("leads")
      .select("id,nome")
      .eq("status_ativacao", "ativo")
      .is("convertido_em", null)
      .is("deleted_at", null)
      .order("nome")
      .limit(500),
    supabase
      .from("clientes")
      .select("id,nome")
      .is("deleted_at", null)
      .order("nome")
      .limit(500),
  ]);
  const config = Object.fromEntries(
    (configs ?? []).map((item) => [item.chave, item.valor ?? ""]),
  );
  if (config.agenda_habilitada?.toLowerCase() === "false") notFound();
  const email = claims?.claims.email;
  const currentUser = (users ?? []).find((user) => user.email === email);
  if (!currentUser) notFound();

  return (
    <AgendaCalendar
      users={(users ?? []).map((user) => ({
        id: user.id,
        nome: user.nome || user.email,
      }))}
      leads={leads ?? []}
      clients={clients ?? []}
      currentUserId={currentUser.id}
      defaultView={config.agenda_view_padrao || "semanal"}
      defaultReminder={Number(config.agenda_lembrete_padrao_minutos) || 15}
      dayStart={config.agenda_horario_inicio_dia || "08:00"}
      dayEnd={config.agenda_horario_fim_dia || "20:00"}
      initialEventId={searchParams?.evento}
    />
  );
}
