"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import type { EventoAgenda, TipoEvento } from "@/lib/agenda/types";

type Named = { id: string; nome: string };
type ViewMode = "mensal" | "semanal" | "lista";
type ModalState = {
  event: EventoAgenda | null;
  start?: Date;
  leadId?: string;
  clientId?: string;
} | null;

const typeInfo: Record<TipoEvento, { label: string; className: string }> = {
  reuniao: {
    label: "Reunião",
    className: "border-blue-500 bg-blue-50 text-blue-800",
  },
  follow_up: {
    label: "Follow-up",
    className: "border-emerald-500 bg-emerald-50 text-emerald-800",
  },
  prazo: {
    label: "Prazo",
    className: "border-amber-500 bg-amber-50 text-amber-900",
  },
  tarefa: {
    label: "Tarefa",
    className: "border-slate-400 bg-slate-100 text-slate-700",
  },
};
const allTypes = Object.keys(typeInfo) as TipoEvento[];
const dateKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
const time = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});

export function AgendaCalendar({
  users,
  leads,
  clients,
  currentUserId,
  isAdmin,
  defaultView,
  defaultReminder,
  dayStart,
  dayEnd,
  initialEventId,
  initialLeadId,
  initialClientId,
}: {
  users: Named[];
  leads: Named[];
  clients: Named[];
  currentUserId: string;
  isAdmin: boolean;
  defaultView: string;
  defaultReminder: number;
  dayStart: string;
  dayEnd: string;
  initialEventId?: string;
  initialLeadId?: string;
  initialClientId?: string;
}) {
  const [view, setViewState] = useState<ViewMode>(
    defaultView === "mensal" || defaultView === "lista"
      ? defaultView
      : "semanal",
  );
  const [anchor, setAnchor] = useState(new Date());
  const [events, setEvents] = useState<EventoAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [types, setTypes] = useState<Set<TipoEvento>>(new Set(allTypes));
  const [participants, setParticipants] = useState<Set<string>>(new Set());
  const [association, setAssociation] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("agenda:view");
    if (saved === "mensal" || saved === "semanal" || saved === "lista")
      setViewState(saved);
  }, []);
  const setView = (next: ViewMode) => {
    setViewState(next);
    window.localStorage.setItem("agenda:view", next);
  };

  const range = useMemo(() => {
    const from = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 1, 1),
    );
    const to = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 2, 1),
    );
    return { from: from.toISOString(), to: to.toISOString() };
  }, [anchor]);
  const loadEvents = useCallback(async () => {
    setLoading(true);
    const response = await fetch(
      `/api/agenda/eventos?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
      { cache: "no-store" },
    );
    if (response.ok) {
      const payload = await response.json();
      let loadedEvents: EventoAgenda[] = payload.eventos ?? [];
      if (
        initialEventId &&
        !loadedEvents.some((event) => event.id === initialEventId)
      ) {
        const selectedResponse = await fetch(
          `/api/agenda/eventos?id=${encodeURIComponent(initialEventId)}`,
          { cache: "no-store" },
        );
        if (selectedResponse.ok) {
          const selectedPayload = await selectedResponse.json();
          loadedEvents = [...loadedEvents, ...(selectedPayload.eventos ?? [])];
        }
      }
      setEvents(loadedEvents);
    }
    setLoading(false);
  }, [initialEventId, range]);
  useEffect(() => void loadEvents(), [loadEvents]);
  useEffect(() => {
    if (!initialEventId || !events.length) return;
    const selected = events.find((event) => event.id === initialEventId);
    if (selected) setModal({ event: selected });
  }, [events, initialEventId]);
  useEffect(() => {
    if (!initialLeadId && !initialClientId) return;
    setModal({
      event: null,
      start: new Date(),
      leadId: initialLeadId,
      clientId: initialClientId,
    });
  }, [initialClientId, initialLeadId]);

  const filtered = useMemo(
    () =>
      events.filter((event) => {
        if (!types.has(event.tipo)) return false;
        if (
          participants.size > 0 &&
          !event.participantes?.some((item) => participants.has(item.user_id))
        )
          return false;
        if (association === "lead" && !event.lead_id) return false;
        if (association === "cliente" && !event.cliente_id) return false;
        if (association === "nenhum" && (event.lead_id || event.cliente_id))
          return false;
        return true;
      }),
    [association, events, participants, types],
  );
  const move = (direction: number) => {
    const next = new Date(anchor);
    if (view === "mensal") next.setMonth(next.getMonth() + direction);
    else
      next.setDate(next.getDate() + direction * (view === "semanal" ? 7 : 14));
    setAnchor(next);
  };

  return (
    <main className="px-4 py-7 sm:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">
              CRM compartilhado
            </p>
            <h1 className="text-3xl font-bold">Agenda</h1>
            <p className="mt-2 text-sm text-slate-500">
              Reuniões, follow-ups, prazos e tarefas da equipe.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-white"
            onClick={() => setModal({ event: null, start: anchor })}
          >
            <Plus className="size-4" /> Novo evento
          </button>
        </header>

        <section className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border p-2"
                onClick={() => move(-1)}
                aria-label="Anterior"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                className="rounded-full border px-4 py-2 text-sm font-semibold"
                onClick={() => setAnchor(new Date())}
              >
                Hoje
              </button>
              <button
                className="rounded-full border p-2"
                onClick={() => move(1)}
                aria-label="Próximo"
              >
                <ChevronRight className="size-4" />
              </button>
              <strong className="ml-2 capitalize">
                {anchor.toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </strong>
            </div>
            <div className="flex rounded-full bg-slate-100 p-1">
              {(["mensal", "semanal", "lista"] as ViewMode[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setView(item)}
                  className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${view === item ? "bg-white text-primary shadow-sm" : "text-slate-500"}`}
                >
                  {item === "lista" ? "Próximos" : item}
                </button>
              ))}
            </div>
          </div>
          <details className="mt-4 border-t pt-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold">
              <Filter className="size-4" /> Filtros{" "}
              <ChevronDown className="size-4" />
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <fieldset>
                <legend className="text-xs font-bold uppercase text-slate-500">
                  Tipos
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {allTypes.map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={types.has(type)}
                        onChange={() =>
                          setTypes((current) => {
                            const next = new Set(current);
                            if (next.has(type)) next.delete(type);
                            else next.add(type);
                            return next;
                          })
                        }
                      />
                      {typeInfo[type].label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-xs font-bold uppercase text-slate-500">
                  Participantes
                </legend>
                <div className="mt-2 max-h-28 space-y-1 overflow-y-auto rounded-xl border p-2">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={participants.has(user.id)}
                        onChange={() =>
                          setParticipants((current) => {
                            const next = new Set(current);
                            if (next.has(user.id)) next.delete(user.id);
                            else next.add(user.id);
                            return next;
                          })
                        }
                      />
                      {user.nome}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="field">
                Associação
                <select
                  className="input"
                  value={association}
                  onChange={(event) => setAssociation(event.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="lead">Lead</option>
                  <option value="cliente">Cliente</option>
                  <option value="nenhum">Sem associação</option>
                </select>
              </label>
            </div>
          </details>
        </section>

        {loading ? (
          <div className="grid min-h-80 place-items-center">
            <LoaderCircle className="size-7 animate-spin text-primary" />
          </div>
        ) : !filtered.length ? (
          <EmptyState create={() => setModal({ event: null, start: anchor })} />
        ) : view === "mensal" ? (
          <MonthView
            anchor={anchor}
            events={filtered}
            open={(event) => setModal({ event })}
            create={(start) => setModal({ event: null, start })}
          />
        ) : view === "semanal" ? (
          <WeekView
            anchor={anchor}
            events={filtered}
            dayStart={dayStart}
            dayEnd={dayEnd}
            open={(event) => setModal({ event })}
            create={(start) => setModal({ event: null, start })}
          />
        ) : (
          <ListView
            anchor={anchor}
            events={filtered}
            open={(event) => setModal({ event })}
          />
        )}
      </div>
      {modal && (
        <EventModal
          key={`${modal.event?.id ?? "new"}-${modal.start?.toISOString() ?? ""}`}
          state={modal}
          users={users}
          leads={leads}
          clients={clients}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          defaultReminder={defaultReminder}
          close={() => setModal(null)}
          saved={async () => {
            setModal(null);
            await loadEvents();
          }}
        />
      )}
    </main>
  );
}

function EventPill({
  event,
  open,
}: {
  event: EventoAgenda;
  open: (event: EventoAgenda) => void;
}) {
  return (
    <button
      onClick={(click) => {
        click.stopPropagation();
        open(event);
      }}
      className={`block w-full truncate border-l-4 px-2 py-1 text-left text-[11px] font-semibold ${typeInfo[event.tipo].className}`}
    >
      {event.dia_inteiro ? "" : `${time.format(new Date(event.inicio))} `}
      {event.titulo}
    </button>
  );
}

function MonthView({
  anchor,
  events,
  open,
  create,
}: {
  anchor: Date;
  events: EventoAgenda[];
  open: (event: EventoAgenda) => void;
  create: (date: Date) => void;
}) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="grid grid-cols-7 bg-slate-50 text-center text-xs font-bold uppercase text-slate-500">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
          <div key={day} className="p-3">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const list = events.filter(
            (event) => dateKey(new Date(event.inicio)) === dateKey(day),
          );
          return (
            <button
              key={day.toISOString()}
              onClick={() => create(day)}
              className={`min-h-28 border-l border-t p-2 text-left align-top ${day.getMonth() === anchor.getMonth() ? "" : "bg-slate-50 text-slate-400"}`}
            >
              <span className="text-xs font-bold">{day.getDate()}</span>
              <div className="mt-2 space-y-1">
                {list.slice(0, 3).map((event) => (
                  <EventPill key={event.id} event={event} open={open} />
                ))}
                {list.length > 3 && (
                  <span className="block text-[11px] font-bold text-primary">
                    +{list.length - 3} mais
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function weekStart(anchor: Date) {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  return start;
}
function WeekView({
  anchor,
  events,
  dayStart,
  dayEnd,
  open,
  create,
}: {
  anchor: Date;
  events: EventoAgenda[];
  dayStart: string;
  dayEnd: string;
  open: (event: EventoAgenda) => void;
  create: (date: Date) => void;
}) {
  const start = weekStart(anchor);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  const firstHour = Number(dayStart.slice(0, 2)) || 8;
  const lastHour = Number(dayEnd.slice(0, 2)) || 20;
  const hours = Array.from(
    { length: Math.max(1, lastHour - firstHour + 1) },
    (_, index) => firstHour + index,
  );
  return (
    <section className="mt-5 overflow-x-auto rounded-2xl border bg-white shadow-sm">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[70px_repeat(7,1fr)] bg-slate-50">
          <div />
          <>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className="border-l p-3 text-center text-xs font-bold"
              >
                {day.toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                })}
              </div>
            ))}
          </>
        </div>
        <div className="grid grid-cols-[70px_repeat(7,1fr)] border-t">
          <span className="p-2 text-xs text-slate-500">Dia todo</span>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="min-h-14 space-y-1 border-l p-1"
            >
              {events
                .filter(
                  (event) =>
                    event.dia_inteiro &&
                    dateKey(new Date(event.inicio)) === dateKey(day),
                )
                .map((event) => (
                  <EventPill key={event.id} event={event} open={open} />
                ))}
            </div>
          ))}
        </div>
        {hours.map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-[70px_repeat(7,1fr)] border-t"
          >
            <span className="p-2 text-xs text-slate-500">
              {String(hour).padStart(2, "0")}:00
            </span>
            {days.map((day) => {
              const list = events.filter(
                (event) =>
                  !event.dia_inteiro &&
                  dateKey(new Date(event.inicio)) === dateKey(day) &&
                  Number(
                    new Intl.DateTimeFormat("pt-BR", {
                      hour: "2-digit",
                      hourCycle: "h23",
                      timeZone: "America/Sao_Paulo",
                    }).format(new Date(event.inicio)),
                  ) === hour,
              );
              const cell = new Date(day);
              cell.setHours(hour, 0, 0, 0);
              return (
                <button
                  key={day.toISOString()}
                  className="min-h-16 space-y-1 border-l p-1 text-left"
                  onClick={() => create(cell)}
                >
                  {list.map((event) => (
                    <EventPill key={event.id} event={event} open={open} />
                  ))}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function ListView({
  anchor,
  events,
  open,
}: {
  anchor: Date;
  events: EventoAgenda[];
  open: (event: EventoAgenda) => void;
}) {
  const end = new Date(anchor);
  end.setDate(end.getDate() + 14);
  const list = events
    .filter(
      (event) =>
        new Date(event.inicio) >= new Date(anchor.toDateString()) &&
        new Date(event.inicio) < end,
    )
    .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  const groups = list.reduce((result, event) => {
    const key = dateKey(new Date(event.inicio));
    const current = result.get(key) ?? [];
    current.push(event);
    result.set(key, current);
    return result;
  }, new Map<string, EventoAgenda[]>());
  return (
    <section className="mt-5 space-y-4">
      {Array.from(groups.entries()).map(([key, items]) => (
        <article
          key={key}
          className="overflow-hidden rounded-2xl border bg-white shadow-sm"
        >
          <h2 className="bg-slate-50 px-5 py-3 text-sm font-bold capitalize">
            {relativeDay(new Date(items[0].inicio))}
          </h2>
          <div className="divide-y">
            {items.map((event) => (
              <button
                key={event.id}
                onClick={() => open(event)}
                className="flex w-full flex-wrap items-center gap-3 p-4 text-left hover:bg-slate-50"
              >
                <time className="w-14 text-sm font-bold">
                  {event.dia_inteiro
                    ? "Dia"
                    : time.format(new Date(event.inicio))}
                </time>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold ${typeInfo[event.tipo].className}`}
                >
                  {typeInfo[event.tipo].label}
                </span>
                <strong className="min-w-48 flex-1">{event.titulo}</strong>
                <span className="text-xs text-slate-500">
                  {event.participantes?.map((item) => item.nome).join(", ")}
                </span>
                {event.lead && (
                  <Link
                    href={`/admin/leads/${event.lead.id}`}
                    className="text-xs font-bold text-primary"
                    onClick={(click) => click.stopPropagation()}
                  >
                    {event.lead.nome}
                  </Link>
                )}
                {event.cliente && (
                  <Link
                    href={`/admin/clientes/${event.cliente.id}`}
                    className="text-xs font-bold text-primary"
                    onClick={(click) => click.stopPropagation()}
                  >
                    {event.cliente.nome}
                  </Link>
                )}
              </button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function relativeDay(date: Date) {
  const today = dateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateKey(date) === today) return "Hoje";
  if (dateKey(date) === dateKey(tomorrow)) return "Amanhã";
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}
function EmptyState({ create }: { create: () => void }) {
  return (
    <section className="mt-6 grid min-h-80 place-items-center rounded-2xl border border-dashed bg-white p-8 text-center">
      <div>
        <CalendarDays className="mx-auto size-12 text-primary" />
        <h2 className="mt-4 text-xl font-bold">Sua agenda está livre</h2>
        <p className="mt-2 text-sm text-slate-500">
          Crie o primeiro compromisso compartilhado da equipe.
        </p>
        <button
          onClick={create}
          className="mt-5 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white"
        >
          Criar primeiro evento
        </button>
      </div>
    </section>
  );
}

function inputValue(value: Date) {
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
function EventModal({
  state,
  users,
  leads,
  clients,
  currentUserId,
  isAdmin,
  defaultReminder,
  close,
  saved,
}: {
  state: NonNullable<ModalState>;
  users: Named[];
  leads: Named[];
  clients: Named[];
  currentUserId: string;
  isAdmin: boolean;
  defaultReminder: number;
  close: () => void;
  saved: () => Promise<void>;
}) {
  const event = state.event;
  const baseStart = event
    ? new Date(event.inicio)
    : (state.start ?? new Date());
  if (!event && !state.start)
    baseStart.setMinutes(Math.ceil(baseStart.getMinutes() / 30) * 30, 0, 0);
  const baseEnd = event
    ? new Date(event.fim)
    : new Date(baseStart.getTime() + 60 * 60 * 1000);
  const [allDay, setAllDay] = useState(event?.dia_inteiro ?? false);
  const [repeat, setRepeat] = useState(false);
  const [associationType, setAssociationType] = useState(
    event?.lead_id || state.leadId
      ? "lead"
      : event?.cliente_id || state.clientId
        ? "cliente"
        : "nenhum",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(form: HTMLFormElement, applyToSeries = false) {
    setPending(true);
    setError("");
    const data = new FormData(form);
    const startRaw = String(data.get("inicio"));
    const endRaw = String(data.get("fim"));
    const associationId = String(data.get("associacao_id") || "");
    const payload = {
      titulo: String(data.get("titulo")),
      descricao: String(data.get("descricao") || ""),
      tipo: String(data.get("tipo")),
      dia_inteiro: allDay,
      inicio: new Date(
        allDay ? `${startRaw}T00:00:00` : startRaw,
      ).toISOString(),
      fim: new Date(allDay ? `${endRaw}T23:59:59` : endRaw).toISOString(),
      lead_id:
        associationType === "lead" && associationId ? associationId : null,
      cliente_id:
        associationType === "cliente" && associationId ? associationId : null,
      lembrete_minutos_antes:
        data.get("lembrete") === "" ? null : Number(data.get("lembrete")),
      participantes_user_ids: data.getAll("participantes").map(String),
      ...(!event && repeat
        ? {
            recorrencia: {
              tipo: String(data.get("recorrencia_tipo")),
              ate: String(data.get("recorrencia_ate")),
            },
          }
        : {}),
      ...(event ? { apply_to_series: applyToSeries } : {}),
    };
    const response = await fetch(
      event ? `/api/agenda/eventos/${event.id}` : "/api/agenda/eventos",
      {
        method: event ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || "Não foi possível salvar.");
      setPending(false);
      return;
    }
    await saved();
  }
  async function remove(series: boolean) {
    if (
      !event ||
      !window.confirm(series ? "Excluir toda a série?" : "Excluir este evento?")
    )
      return;
    setPending(true);
    const response = await fetch(
      `/api/agenda/eventos/${event.id}?deleteSeries=${series}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      const result = await response.json();
      setError(result.error || "Não foi possível excluir.");
      setPending(false);
      return;
    }
    await saved();
  }
  const creatorId = event?.criado_por ?? currentUserId;
  const canDelete = Boolean(
    event && (event.criado_por === currentUserId || isAdmin),
  );
  const selectedParticipants = new Set(
    event?.participantes?.map((item) => item.user_id) ?? [currentUserId],
  );
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-3">
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Agenda</p>
            <h2 className="text-2xl font-bold">
              {event ? "Editar evento" : "Novo evento"}
            </h2>
          </div>
          <button onClick={close} className="rounded-full border p-2">
            <X className="size-4" />
          </button>
        </header>
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            void submit(submitEvent.currentTarget);
          }}
        >
          <label className="field sm:col-span-2">
            Título *
            <input
              className="input"
              name="titulo"
              maxLength={200}
              required
              defaultValue={event?.titulo ?? ""}
            />
          </label>
          <label className="field">
            Tipo
            <select
              className="input"
              name="tipo"
              defaultValue={event?.tipo ?? "reuniao"}
            >
              {allTypes.map((type) => (
                <option key={type} value={type}>
                  {typeInfo[type].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(change) => setAllDay(change.target.checked)}
            />{" "}
            Dia todo
          </label>
          <label className="field">
            Início
            <input
              className="input"
              name="inicio"
              type={allDay ? "date" : "datetime-local"}
              required
              defaultValue={
                allDay
                  ? inputValue(baseStart).slice(0, 10)
                  : inputValue(baseStart)
              }
            />
          </label>
          <label className="field">
            Fim
            <input
              className="input"
              name="fim"
              type={allDay ? "date" : "datetime-local"}
              required
              defaultValue={
                allDay ? inputValue(baseEnd).slice(0, 10) : inputValue(baseEnd)
              }
            />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="field">Participantes *</legend>
            <div className="mt-2 grid max-h-32 gap-2 overflow-y-auto rounded-xl border p-3 sm:grid-cols-2">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    name="participantes"
                    value={user.id}
                    type="checkbox"
                    defaultChecked={
                      selectedParticipants.has(user.id) || user.id === creatorId
                    }
                    disabled={user.id === creatorId}
                  />
                  {user.nome}
                  {user.id === creatorId && (
                    <span className="text-xs text-slate-400">(criador)</span>
                  )}
                </label>
              ))}
              <input type="hidden" name="participantes" value={creatorId} />
            </div>
          </fieldset>
          <label className="field">
            Associação
            <select
              className="input"
              value={associationType}
              onChange={(change) => setAssociationType(change.target.value)}
            >
              <option value="nenhum">Nenhum</option>
              <option value="lead">Lead</option>
              <option value="cliente">Cliente</option>
            </select>
          </label>
          <label className="field">
            {associationType === "nenhum"
              ? "Sem associação"
              : associationType === "lead"
                ? "Lead"
                : "Cliente"}
            <select
              className="input"
              name="associacao_id"
              disabled={associationType === "nenhum"}
              required={associationType !== "nenhum"}
              defaultValue={
                event?.lead_id ??
                event?.cliente_id ??
                state.leadId ??
                state.clientId ??
                ""
              }
            >
              <option value="">Selecione</option>
              {(associationType === "lead" ? leads : clients).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Lembrete
            <select
              className="input"
              name="lembrete"
              defaultValue={String(
                event?.lembrete_minutos_antes ?? defaultReminder,
              )}
            >
              <option value="">Sem lembrete</option>
              <option value="0">No horário</option>
              <option value="5">5 minutos antes</option>
              <option value="15">15 minutos antes</option>
              <option value="30">30 minutos antes</option>
              <option value="60">1 hora antes</option>
              <option value="1440">1 dia antes</option>
            </select>
          </label>
          {!event && (
            <div className="rounded-xl border p-3">
              <label className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={repeat}
                  onChange={(change) => setRepeat(change.target.checked)}
                />{" "}
                Repetir este evento
              </label>
              {repeat && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <select
                    className="input"
                    name="recorrencia_tipo"
                    defaultValue="semanal"
                  >
                    <option value="diaria">Diária</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                  <input
                    className="input"
                    name="recorrencia_ate"
                    type="date"
                    required
                  />
                </div>
              )}
            </div>
          )}
          <label className="field sm:col-span-2">
            Descrição
            <textarea
              className="input"
              name="descricao"
              rows={4}
              maxLength={5000}
              defaultValue={event?.descricao ?? ""}
            />
          </label>
          {error && (
            <p className="text-sm font-semibold text-red-700 sm:col-span-2">
              {error}
            </p>
          )}
          <footer className="flex flex-wrap gap-2 sm:col-span-2">
            {canDelete && event && (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void remove(false)}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700"
                >
                  <Trash2 className="size-4" /> Excluir este
                </button>
                {event.serie_id && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void remove(true)}
                    className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700"
                  >
                    Excluir série
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={close}
              className="ml-auto rounded-full border px-5 py-2 text-sm font-bold"
            >
              Cancelar
            </button>
            {event?.serie_id && (
              <button
                type="button"
                disabled={pending}
                onClick={(click) =>
                  void submit(click.currentTarget.form!, true)
                }
                className="rounded-full border border-primary px-5 py-2 text-sm font-bold text-primary"
              >
                Salvar série
              </button>
            )}
            <button
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-white"
            >
              {pending && <LoaderCircle className="size-4 animate-spin" />}{" "}
              Salvar
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
