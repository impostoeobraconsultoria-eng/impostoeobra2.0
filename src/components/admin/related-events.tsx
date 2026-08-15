import Link from "next/link";
import { CalendarDays } from "lucide-react";

export type RelatedEvent = {
  id: string;
  titulo: string;
  tipo: string;
  data_hora_inicio: string;
  status: string;
};

export function RelatedEvents({
  events,
  className = "",
}: {
  events: RelatedEvent[];
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border bg-white p-5 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <h2 className="font-bold">Eventos vinculados</h2>
        </div>
        <Link href="/admin/agenda" className="text-xs font-bold text-primary">
          Ver agenda
        </Link>
      </div>
      <ol className="mt-4 space-y-3">
        {events.map((event) => (
          <li
            key={event.id}
            className={`border-l-2 border-primary pl-3 ${event.status !== "agendado" ? "opacity-50" : ""}`}
          >
            <Link
              href={`/admin/agenda?evento=${event.id}`}
              className="text-sm font-semibold hover:text-primary"
            >
              {event.titulo}
            </Link>
            <p className="text-xs text-slate-500">
              {new Date(event.data_hora_inicio).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}{" "}
              · {event.tipo.replaceAll("_", " ")}
            </p>
          </li>
        ))}
        {!events.length && (
          <li className="text-sm text-slate-500">Nenhum evento vinculado.</li>
        )}
      </ol>
    </section>
  );
}
