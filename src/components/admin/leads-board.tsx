"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { LayoutGrid, List, LoaderCircle } from "lucide-react";

import { updateLeadStatus } from "@/app/admin/leads/actions";
import { LEAD_STATUSES, type LeadRecord } from "@/lib/leads";

type User = { id: string; nome: string | null };
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function LeadsBoard({
  initialLeads,
  users,
}: {
  initialLeads: LeadRecord[];
  users: User[];
}) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [leads, setLeads] = useState(initialLeads);
  const [filters, setFilters] = useState({
    uf: "",
    status: "",
    responsavel: "",
    from: "",
    to: "",
  });
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const filtered = useMemo(
    () =>
      leads.filter(
        (lead) =>
          (!filters.uf || lead.uf === filters.uf) &&
          (!filters.status || lead.status === filters.status) &&
          (!filters.responsavel ||
            lead.responsavel_id === filters.responsavel) &&
          (!filters.from || lead.data_hora.slice(0, 10) >= filters.from) &&
          (!filters.to || lead.data_hora.slice(0, 10) <= filters.to),
      ),
    [leads, filters],
  );
  const ufs = Array.from(
    new Set(leads.map((lead) => lead.uf).filter(Boolean) as string[]),
  ).sort();

  function moveLead(id: string, status: string) {
    const previous = leads;
    setLeads((items) =>
      items.map((lead) => (lead.id === id ? { ...lead, status } : lead)),
    );
    setMessage("");
    startTransition(async () => {
      const result = await updateLeadStatus(id, status);
      if (!result.ok) {
        setLeads(previous);
        setMessage(result.error ?? "Não foi possível alterar o status.");
      }
    });
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border bg-white p-1">
          <button
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${view === "kanban" ? "bg-primary text-white" : "text-slate-600"}`}
            onClick={() => setView("kanban")}
          >
            <LayoutGrid className="size-4" />
            Kanban
          </button>
          <button
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${view === "table" ? "bg-primary text-white" : "text-slate-600"}`}
            onClick={() => setView("table")}
          >
            <List className="size-4" />
            Tabela
          </button>
        </div>
        {pending && (
          <span className="flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="size-4 animate-spin" />
            Salvando
          </span>
        )}
      </div>
      {message && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {message}
        </p>
      )}
      {view === "table" && (
        <div className="mt-5 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
          <select
            value={filters.uf}
            onChange={(e) => setFilters({ ...filters, uf: e.target.value })}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Todas as UFs</option>
            {ufs.map((uf) => (
              <option key={uf}>{uf}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Todos os status</option>
            {LEAD_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <select
            value={filters.responsavel}
            onChange={(e) =>
              setFilters({ ...filters, responsavel: e.target.value })
            }
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Responsável</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.nome ?? "Sem nome"}
              </option>
            ))}
          </select>
          <input
            aria-label="Período inicial"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <input
            aria-label="Período final"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </div>
      )}
      {view === "kanban" ? (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-5">
          {LEAD_STATUSES.map((status) => {
            const column = filtered.filter((lead) => lead.status === status);
            return (
              <section
                className="w-72 shrink-0 rounded-2xl bg-slate-100 p-3"
                key={status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) =>
                  moveLead(e.dataTransfer.getData("text/lead-id"), status)
                }
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-bold">{status}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">
                    {column.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {column.map((lead) => (
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/lead-id", lead.id)
                      }
                      className="block cursor-grab rounded-xl border bg-white p-4 shadow-sm hover:border-primary/30"
                      key={lead.id}
                    >
                      <h3 className="font-semibold">{lead.nome}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {[lead.cidade, lead.uf].filter(Boolean).join(" / ") ||
                          "Local não informado"}
                      </p>
                      {lead.valor_potencial != null && (
                        <p className="mt-3 text-sm font-bold text-primary">
                          {money.format(Number(lead.valor_potencial))}
                        </p>
                      )}
                    </Link>
                  ))}
                  {column.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-xs text-slate-400">
                      Arraste um lead para cá
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3">Potencial</th>
                  <th className="px-5 py-3">Recebido</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold">
                      <Link href={`/admin/leads/${lead.id}`}>{lead.nome}</Link>
                    </td>
                    <td className="px-4 py-4">
                      {[lead.cidade, lead.uf].filter(Boolean).join(" / ") ||
                        "—"}
                    </td>
                    <td className="px-4 py-4">{lead.status}</td>
                    <td className="px-4 py-4">
                      {users.find((u) => u.id === lead.responsavel_id)?.nome ??
                        "—"}
                    </td>
                    <td className="px-4 py-4">
                      {lead.valor_potencial == null
                        ? "—"
                        : money.format(Number(lead.valor_potencial))}
                    </td>
                    <td className="px-5 py-4">
                      {new Date(lead.data_hora).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Nenhum lead encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
