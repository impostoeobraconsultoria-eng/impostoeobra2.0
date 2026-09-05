import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";

export type RelatedEvent = {
  id: string;
  titulo: string;
  tipo: string;
  inicio: string;
  participantes?: Array<{
    user_id: string;
    user: { nome: string | null } | Array<{ nome: string | null }> | null;
  }>;
};

export function RelatedEvents({
  events,
  createHref,
  className = "",
}: {
  events: RelatedEvent[];
  createHref: string;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border bg-white p-5 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <h2 className="font-bold">Próximos eventos</h2>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/agenda" className="text-xs font-bold text-primary">
            Ver agenda
          </Link>
          <Link
            href={createHref}
            className="inline-flex items-center gap-1 text-xs font-bold text-accent"
          >
            <Plus className="size-3" /> Agendar
          </Link>
        </div>
      </div>
      <ol className="mt-4 space-y-3">
        {events.map((event) => (
          <li key={event.id} className="border-l-2 border-primary pl-3">
            <Link
              href={`/admin/agenda?evento=${event.id}`}
              className="text-sm font-semibold hover:text-primary"
            >
              {event.titulo}
            </Link>
            <p className="text-xs text-slate-500">
              {new Date(event.inicio).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}{" "}
              ·{" "}
              <span className="rounded-full bg-blue-50 px-2 py-0.5 font-bold capitalize text-primary">
                {event.tipo.replaceAll("_", " ")}
              </span>
            </p>
            {!!event.participantes?.length && (
              <div className="mt-2 flex -space-x-1" aria-label="Participantes">
                {event.participantes.slice(0, 5).map((participant) => {
                  const user = Array.isArray(participant.user)
                    ? participant.user[0]
                    : participant.user;
                  const name = user?.nome || "Usuário";
                  return (
                    <span
                      title={name}
                      key={participant.user_id}
                      className="grid size-6 place-items-center rounded-full border-2 border-white bg-blue-100 text-[9px] font-extrabold text-primary"
                    >
                      {name.slice(0, 2).toUpperCase()}
                    </span>
                  );
                })}
              </div>
            )}
          </li>
        ))}
        {!events.length && (
          <li className="text-sm text-slate-500">Nenhum evento futuro.</li>
        )}
      </ol>
    </section>
  );
}
