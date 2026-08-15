"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  LoaderCircle,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import {
  createAgendaEvent,
  deleteAgendaEvent,
  setAgendaEventStatus,
  updateAgendaEvent,
} from "./actions";

type Event = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: "reuniao" | "follow_up" | "prazo" | "tarefa_interna";
  data_hora_inicio: string;
  data_hora_fim: string | null;
  dia_inteiro: boolean;
  lembrete_minutos: number | null;
  ref_tipo: "lead" | "cliente" | "contrato" | null;
  ref_id: string | null;
  responsavel_id: string | null;
  status: "agendado" | "concluido" | "cancelado";
  responsavel?: { nome: string | null } | { nome: string | null }[] | null;
};
type Named = { id: string; nome: string };
type Contract = {
  id: string;
  numero: string | null;
  cliente?: { nome: string } | { nome: string }[] | null;
};
const typeInfo = {
  reuniao: { label: "Reunião", color: "#0B76C6" },
  follow_up: { label: "Follow-up", color: "#7C3AED" },
  prazo: { label: "Prazo", color: "#D97706" },
  tarefa_interna: { label: "Tarefa", color: "#3AB97A" },
} as const;
const dateKey = (value: string | Date) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
const time = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function inputDate(value?: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function AgendaCalendar({
  month,
  events,
  users,
  leads,
  customers,
  contracts,
  currentUserId,
  isAdmin,
  defaultReminder,
  initialEventId,
  initialView,
}: {
  month: string;
  events: Event[];
  users: Array<{ id: string; nome: string | null; email: string }>;
  leads: Named[];
  customers: Named[];
  contracts: Contract[];
  currentUserId: string;
  isAdmin: boolean;
  defaultReminder: number;
  initialEventId?: string;
  initialView?: string;
}) {
  const [view, setView] = useState<"month" | "week" | "list">(
    initialView === "week" || initialView === "list" ? initialView : "month",
  );
  const [modal, setModal] = useState<"new" | "details" | "edit" | null>(
    initialEventId ? "details" : null,
  );
  const [selected, setSelected] = useState<Event | null>(
    events.find((event) => event.id === initialEventId) ?? null,
  );
  const [typeFilters, setTypeFilters] = useState(
    () => new Set(Object.keys(typeInfo)),
  );
  const [responsible, setResponsible] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const filtered = useMemo(
    () =>
      events.filter(
        (event) =>
          typeFilters.has(event.tipo) &&
          (!responsible || event.responsavel_id === responsible),
      ),
    [events, typeFilters, responsible],
  );
  const [year, monthNumber] = month.split("-").map(Number);
  const title = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 15, 12)));
  const shiftMonth = (delta: number) => {
    const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const todayMonth = dateKey(new Date()).slice(0, 7);

  function openDetails(event: Event) {
    setSelected(event);
    setModal("details");
    setError("");
  }
  function changeStatus(status: Event["status"]) {
    if (!selected) return;
    startTransition(async () => {
      const result = await setAgendaEventStatus(selected.id, status);
      if (!result.ok) setError(result.error ?? "Falha ao atualizar.");
      else window.location.reload();
    });
  }
  function remove() {
    if (!selected || !window.confirm("Excluir este evento definitivamente?"))
      return;
    startTransition(async () => {
      const result = await deleteAgendaEvent(selected.id);
      if (!result.ok) setError(result.error ?? "Falha ao excluir.");
      else window.location.reload();
    });
  }

  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Equipe</p>
            <h1 className="mt-1 text-3xl font-bold capitalize">
              Agenda · {title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Calendário compartilhado de reuniões, contatos, prazos e tarefas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setModal("new");
            }}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white"
          >
            <CalendarPlus className="size-4" />
            Novo evento
          </button>
        </header>
        <section className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center rounded-xl border p-1">
            <Link
              aria-label="Mês anterior"
              href={`/admin/agenda?mes=${shiftMonth(-1)}&view=${view}`}
              className="rounded-lg p-2 hover:bg-slate-50"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={`/admin/agenda?mes=${todayMonth}&view=${view}`}
              className="px-3 py-2 text-sm font-bold"
            >
              Hoje
            </Link>
            <Link
              aria-label="Próximo mês"
              href={`/admin/agenda?mes=${shiftMonth(1)}&view=${view}`}
              className="rounded-lg p-2 hover:bg-slate-50"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
          <div className="flex rounded-xl border p-1">
            {(["month", "week", "list"] as const).map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setView(item)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === item ? "bg-primary text-white" : "text-slate-600"}`}
              >
                {item === "month"
                  ? "Mês"
                  : item === "week"
                    ? "Semana"
                    : "Lista"}
              </button>
            ))}
          </div>
          <select
            aria-label="Filtrar por responsável"
            className="input max-w-xs"
            value={responsible}
            onChange={(event) => setResponsible(event.target.value)}
          >
            <option value="">Todos os responsáveis</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.nome || user.email}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-3">
            {Object.entries(typeInfo).map(([key, info]) => (
              <label
                key={key}
                className="flex items-center gap-1.5 text-xs font-semibold"
              >
                <input
                  type="checkbox"
                  checked={typeFilters.has(key)}
                  onChange={() =>
                    setTypeFilters((current) => {
                      const copy = new Set(current);
                      if (copy.has(key)) copy.delete(key);
                      else copy.add(key);
                      return copy;
                    })
                  }
                />
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: info.color }}
                />
                {info.label}
              </label>
            ))}
          </div>
        </section>
        {view === "month" ? (
          <MonthView
            year={year}
            month={monthNumber}
            events={filtered}
            open={openDetails}
          />
        ) : view === "week" ? (
          <WeekView month={month} events={filtered} open={openDetails} />
        ) : (
          <ListView events={filtered} open={openDetails} />
        )}
        {modal && (
          <EventModal
            mode={modal}
            event={selected}
            users={users}
            leads={leads}
            customers={customers}
            contracts={contracts}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            defaultReminder={defaultReminder}
            pending={pending}
            error={error}
            close={() => setModal(null)}
            edit={() => setModal("edit")}
            status={changeStatus}
            remove={remove}
          />
        )}
      </div>
    </main>
  );
}

function MonthView({
  year,
  month,
  events,
  open,
}: {
  year: number;
  month: number;
  events: Event[];
  open: (event: Event) => void;
}) {
  const first = new Date(Date.UTC(year, month - 1, 1, 12));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return day;
  });
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b bg-slate-50 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div className="p-3" key={day}>
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dateKey(day);
          const list = events.filter(
            (event) => dateKey(event.data_hora_inicio) === key,
          );
          const inMonth = day.getUTCMonth() === month - 1;
          return (
            <div
              key={key}
              className={`min-h-32 border-b border-r p-2 ${inMonth ? "bg-white" : "bg-slate-50/70 text-slate-400"}`}
            >
              <p
                className={`text-xs font-bold ${key === dateKey(new Date()) ? "text-primary" : ""}`}
              >
                {day.getUTCDate()}
              </p>
              <div className="mt-2 space-y-1">
                {list.slice(0, 3).map((event) => (
                  <EventPill key={event.id} event={event} open={open} />
                ))}
                {list.length > 3 && (
                  <p className="px-1 text-xs font-semibold text-slate-500">
                    +{list.length - 3}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
function WeekView({
  month,
  events,
  open,
}: {
  month: string;
  events: Event[];
  open: (event: Event) => void;
}) {
  const base = new Date(`${month}-01T12:00:00Z`);
  const today = new Date();
  if (dateKey(today).startsWith(month)) base.setUTCDate(today.getUTCDate());
  const start = new Date(base);
  start.setUTCDate(base.getUTCDate() - base.getUTCDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    return day;
  });
  return (
    <section className="mt-5 overflow-x-auto rounded-2xl border bg-white shadow-sm">
      <div className="grid min-w-[1100px] grid-cols-[64px_repeat(7,minmax(140px,1fr))]">
        <div className="sticky top-20 z-10 border-b bg-slate-50" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="sticky top-20 z-10 border-b border-l bg-slate-50 p-3 text-center text-sm font-bold capitalize"
          >
            {new Intl.DateTimeFormat("pt-BR", {
              weekday: "short",
              day: "2-digit",
              timeZone: "UTC",
            }).format(day)}
          </div>
        ))}
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className="contents">
            <div className="border-b bg-slate-50 px-2 py-3 text-right text-xs font-semibold text-slate-400">
              {String(hour).padStart(2, "0")}:00
            </div>
            {days.map((day) => {
              const list = events.filter(
                (event) =>
                  dateKey(event.data_hora_inicio) === dateKey(day) &&
                  Number(inputDate(event.data_hora_inicio).slice(11, 13)) ===
                    hour,
              );
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="min-h-16 space-y-1 border-b border-l p-1"
                >
                  {list.map((event) => (
                    <EventPill
                      key={event.id}
                      event={event}
                      open={open}
                      expanded
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
function ListView({
  events,
  open,
}: {
  events: Event[];
  open: (event: Event) => void;
}) {
  const futureEvents = events.filter(
    (event) => new Date(event.data_hora_inicio).getTime() >= Date.now(),
  );
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Evento</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {futureEvents.map((event) => {
              const responsible = Array.isArray(event.responsavel)
                ? event.responsavel[0]
                : event.responsavel;
              return (
                <tr
                  key={event.id}
                  onClick={() => open(event)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-5 py-4 font-semibold">{event.titulo}</td>
                  <td className="px-4 py-4">{typeInfo[event.tipo].label}</td>
                  <td className="px-4 py-4">
                    {dateTime.format(new Date(event.data_hora_inicio))}
                  </td>
                  <td className="px-4 py-4">{responsible?.nome || "—"}</td>
                  <td className="px-4 py-4 capitalize">{event.status}</td>
                </tr>
              );
            })}
            {!futureEvents.length && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-12 text-center text-slate-500"
                >
                  Nenhum evento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function EventPill({
  event,
  open,
  expanded = false,
}: {
  event: Event;
  open: (event: Event) => void;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => open(event)}
      className={`block w-full border-l-4 bg-slate-50 px-2 py-1.5 text-left text-[11px] ${event.status !== "agendado" ? "opacity-45" : ""}`}
      style={{ borderColor: typeInfo[event.tipo].color }}
    >
      <span className="block truncate font-bold">{event.titulo}</span>
      {(expanded || !event.dia_inteiro) && (
        <span className="text-slate-500">
          {event.dia_inteiro
            ? "Dia inteiro"
            : time.format(new Date(event.data_hora_inicio))}
        </span>
      )}
    </button>
  );
}

function EventModal({
  mode,
  event,
  users,
  leads,
  customers,
  contracts,
  currentUserId,
  isAdmin,
  defaultReminder,
  pending,
  error,
  close,
  edit,
  status,
  remove,
}: {
  mode: "new" | "details" | "edit";
  event: Event | null;
  users: Array<{ id: string; nome: string | null; email: string }>;
  leads: Named[];
  customers: Named[];
  contracts: Contract[];
  currentUserId: string;
  isAdmin: boolean;
  defaultReminder: number;
  pending: boolean;
  error: string;
  close: () => void;
  edit: () => void;
  status: (value: Event["status"]) => void;
  remove: () => void;
}) {
  if (mode === "details" && event) {
    const responsible = Array.isArray(event.responsavel)
      ? event.responsavel[0]
      : event.responsavel;
    return (
      <Modal title={event.titulo} close={close}>
        <div className="space-y-3 text-sm">
          <p className="flex items-center gap-2 text-slate-600">
            <Clock className="size-4" />
            {dateTime.format(new Date(event.data_hora_inicio))}
            {event.data_hora_fim
              ? ` — ${dateTime.format(new Date(event.data_hora_fim))}`
              : ""}
          </p>
          <p>
            <strong>Tipo:</strong> {typeInfo[event.tipo].label}
          </p>
          <p>
            <strong>Responsável:</strong> {responsible?.nome || "Não definido"}
          </p>
          <p>
            <strong>Status:</strong> {event.status}
          </p>
          {event.descricao && (
            <p className="whitespace-pre-wrap text-slate-600">
              {event.descricao}
            </p>
          )}
        </div>
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={edit}
            className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold"
          >
            <Pencil className="size-4" />
            Editar
          </button>
          {event.status !== "concluido" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => status("concluido")}
              className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-white"
            >
              <CheckCircle2 className="size-4" />
              Concluir
            </button>
          )}
          {event.status !== "cancelado" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => status("cancelado")}
              className="rounded-full border px-4 py-2 text-sm font-bold"
            >
              Cancelar evento
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              disabled={pending}
              onClick={remove}
              className="ml-auto flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700"
            >
              <Trash2 className="size-4" />
              Excluir
            </button>
          )}
        </div>
      </Modal>
    );
  }
  const action = event
    ? updateAgendaEvent.bind(null, event.id)
    : createAgendaEvent;
  const reference =
    event?.ref_tipo && event.ref_id ? `${event.ref_tipo}:${event.ref_id}` : "";
  return (
    <Modal title={event ? "Editar evento" : "Novo evento"} close={close}>
      <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="field sm:col-span-2">
          Título *
          <input
            className="input"
            name="titulo"
            required
            minLength={2}
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
            {Object.entries(typeInfo).map(([key, info]) => (
              <option key={key} value={key}>
                {info.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Responsável
          <select
            className="input"
            name="responsavel_id"
            required
            defaultValue={event?.responsavel_id ?? currentUserId}
          >
            {users.map((user) => (
              <option value={user.id} key={user.id}>
                {user.nome || user.email}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Início *
          <input
            className="input"
            type="datetime-local"
            name="data_hora_inicio"
            required
            defaultValue={inputDate(event?.data_hora_inicio)}
          />
        </label>
        <label className="field">
          Fim
          <input
            className="input"
            type="datetime-local"
            name="data_hora_fim"
            defaultValue={inputDate(event?.data_hora_fim)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="dia_inteiro"
            defaultChecked={event?.dia_inteiro}
          />
          Dia inteiro
        </label>
        <label className="field">
          Lembrete
          <select
            className="input"
            name="lembrete"
            defaultValue={String(
              [1440, 4320, 10080].includes(
                Number(event?.lembrete_minutos ?? defaultReminder),
              )
                ? (event?.lembrete_minutos ?? defaultReminder)
                : defaultReminder,
            )}
          >
            <option value="">Sem lembrete</option>
            <option value="1440">1 dia antes (email às 8h da manhã)</option>
            <option value="4320">3 dias antes (email às 8h da manhã)</option>
            <option value="10080">
              1 semana antes (email às 8h da manhã)
            </option>
          </select>
        </label>
        <p className="self-end text-xs leading-relaxed text-slate-500">
          Os lembretes são enviados por email às 8h da manhã, no dia do prazo
          escolhido.
        </p>
        <label className="field sm:col-span-2">
          Vincular a
          <select className="input" name="referencia" defaultValue={reference}>
            <option value="">Nenhum</option>
            <optgroup label="Leads">
              {leads.map((item) => (
                <option key={item.id} value={`lead:${item.id}`}>
                  {item.nome}
                </option>
              ))}
            </optgroup>
            <optgroup label="Clientes">
              {customers.map((item) => (
                <option key={item.id} value={`cliente:${item.id}`}>
                  {item.nome}
                </option>
              ))}
            </optgroup>
            <optgroup label="Contratos">
              {contracts.map((item) => {
                const client = Array.isArray(item.cliente)
                  ? item.cliente[0]
                  : item.cliente;
                return (
                  <option key={item.id} value={`contrato:${item.id}`}>
                    {item.numero || "Sem número"} · {client?.nome || "Cliente"}
                  </option>
                );
              })}
            </optgroup>
          </select>
        </label>
        <label className="field sm:col-span-2">
          Descrição
          <textarea
            className="input"
            rows={4}
            name="descricao"
            defaultValue={event?.descricao ?? ""}
          />
        </label>
        <div className="sm:col-span-2">
          <button className="ml-auto flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white">
            {pending && <LoaderCircle className="size-4 animate-spin" />}
            {event ? "Salvar alterações" : "Criar evento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="rounded-full border p-2"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
