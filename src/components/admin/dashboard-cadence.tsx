"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ClockAlert,
  Gavel,
  PhoneForwarded,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import {
  ContactPerformanceChart,
  type ContactPerformancePoint,
} from "@/components/admin/grafico-performance-contato";
import {
  LeadsByConsultantChart,
  type ConsultantLeadSlice,
} from "@/components/admin/grafico-leads-por-consultor";

export type CadenceMetrics = {
  sem_consultor: { count: number; detail: string };
  followup_hoje: { count: number; detail: string };
  followup_atrasado: { count: number; detail: string };
  decidir_hoje: { count: number; detail: string };
  meus_leads: { count: number; detail: string };
};

const CARD_META = {
  sem_consultor: {
    label: "Leads sem consultor",
    filter: "sem_consultor",
    icon: UsersRound,
  },
  followup_hoje: {
    label: "Follow-up hoje",
    filter: "followup_hoje",
    icon: PhoneForwarded,
  },
  followup_atrasado: {
    label: "Follow-up atrasado",
    filter: "followup_atrasado",
    icon: ClockAlert,
  },
  decidir_hoje: { label: "Decidir hoje", filter: "decidir_hoje", icon: Gavel },
  meus_leads: { label: "Meus leads", filter: "meus", icon: UserRoundCheck },
} as const;

export function DashboardCadence({
  isAdmin,
  allMetrics,
  mineMetrics,
  allPerformance,
  minePerformance,
  cardOrder,
  consultantSlices,
}: {
  isAdmin: boolean;
  allMetrics: CadenceMetrics;
  mineMetrics: CadenceMetrics;
  allPerformance: ContactPerformancePoint[];
  minePerformance: ContactPerformancePoint[];
  cardOrder: string[];
  consultantSlices: ConsultantLeadSlice[];
}) {
  const [scope, setScope] = useState<"mine" | "all">(isAdmin ? "all" : "mine");
  const metrics = scope === "all" ? allMetrics : mineMetrics;
  const performance = scope === "all" ? allPerformance : minePerformance;
  const orderedKeys = cardOrder.filter(
    (key): key is keyof CadenceMetrics => key in CARD_META,
  );
  return (
    <section className="mt-8" aria-labelledby="operacao-comercial-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="operacao-comercial-title" className="text-xl font-bold">
            Operação comercial
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Cobertura, follow-ups e decisões que precisam de atenção.
          </p>
        </div>
        {isAdmin && (
          <div
            className="inline-flex rounded-xl border bg-white p-1"
            aria-label="Escopo do dashboard"
          >
            <button
              type="button"
              onClick={() => setScope("mine")}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${scope === "mine" ? "bg-primary text-white" : "text-slate-600"}`}
            >
              Meus
            </button>
            <button
              type="button"
              onClick={() => setScope("all")}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${scope === "all" ? "bg-primary text-white" : "text-slate-600"}`}
            >
              Todos
            </button>
          </div>
        )}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {orderedKeys.map((key) => {
          const meta = CARD_META[key];
          const value = metrics[key];
          const Icon = meta.icon;
          return (
            <Link
              key={key}
              href={`/admin/leads?filtro=${meta.filter}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-500">
                  {meta.label}
                </p>
                <span
                  className={`rounded-xl p-2 ${key === "followup_atrasado" || key === "decidir_hoje" ? "bg-red-50 text-red-700" : "bg-blue-50 text-primary"}`}
                >
                  <Icon className="size-5" />
                </span>
              </div>
              <p className="mt-4 text-2xl font-bold">{value.count}</p>
              <p className="mt-1 text-xs text-slate-500">{value.detail}</p>
            </Link>
          );
        })}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-bold">Tempo até o primeiro contato</h3>
          <p className="text-sm text-slate-500">
            Leads criados nos últimos 30 dias por faixa de SLA
          </p>
          <ContactPerformanceChart values={performance} />
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-bold">Leads por consultor</h3>
          <p className="text-sm text-slate-500">
            Distribuição de todos os leads ativos
          </p>
          <LeadsByConsultantChart values={consultantSlices} />
        </article>
      </div>
    </section>
  );
}
