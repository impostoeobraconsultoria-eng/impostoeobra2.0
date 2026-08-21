"use client";

import {
  ArrowRightLeft,
  CircleDot,
  FileText,
  MessageCircle,
  NotebookPen,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

export type CustomerTimelineItem = {
  id: string;
  tipo: string;
  descricao: string | null;
  data_hora: string;
  origem: "lead" | "cliente" | "contrato";
  autor?: { nome: string | null; email: string } | null;
};

const filters = [
  ["todos", "Todos"],
  ["nota", "Notas"],
  ["documento", "Documentos"],
  ["contato", "Contatos"],
  ["status", "Status"],
] as const;

const formatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function CustomerTimeline({ items }: { items: CustomerTimelineItem[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number][0]>("todos");
  const visible = items.filter((item) => matchesFilter(item.tipo, filter));

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Timeline</h2>
          <p className="mt-1 text-sm text-slate-500">
            Jornada completa desde o primeiro contato como lead.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {filters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${filter === value ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ol className="mt-6 space-y-0 border-l border-slate-200 pl-6">
        {visible.map((item) => {
          const Icon = iconFor(item.tipo);
          const fromLead = item.origem === "lead";
          return (
            <li className="relative pb-6 last:pb-0" key={item.id}>
              <span
                className={`absolute -left-[37px] top-0 grid size-7 place-items-center rounded-full ring-4 ring-white ${fromLead ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-primary"}`}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                  {typeLabel(item.tipo)}
                </span>
                {fromLead && (
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                    Quando era lead
                  </span>
                )}
                {item.origem === "contrato" && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Contrato
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {item.descricao || "Atividade registrada"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {formatter.format(new Date(item.data_hora))}
                {item.autor?.nome || item.autor?.email
                  ? ` · ${item.autor.nome || item.autor.email}`
                  : " · Sistema"}
              </p>
            </li>
          );
        })}
        {!visible.length && (
          <li className="pb-2 text-sm text-slate-500">
            Nenhuma atividade neste filtro.
          </li>
        )}
      </ol>
    </section>
  );
}

function matchesFilter(tipo: string, filter: (typeof filters)[number][0]) {
  if (filter === "todos") return true;
  if (filter === "documento") return tipo.includes("documento");
  if (filter === "status") return tipo.includes("status");
  return tipo.includes(filter);
}

function iconFor(tipo: string) {
  if (tipo.includes("documento")) return FileText;
  if (tipo.includes("nota")) return NotebookPen;
  if (tipo.includes("contato")) return MessageCircle;
  if (tipo.includes("status")) return RefreshCw;
  if (tipo.includes("conversao")) return ArrowRightLeft;
  return CircleDot;
}

function typeLabel(tipo: string) {
  const labels: Record<string, string> = {
    criacao: "Criação",
    edicao: "Edição",
    contato: "Contato",
    nota: "Nota",
    mudanca_status: "Mudança de status",
    conversao_cliente: "Conversão em cliente",
    documento_gerado: "Documento gerado",
  };
  return labels[tipo] ?? tipo.replaceAll("_", " ");
}
