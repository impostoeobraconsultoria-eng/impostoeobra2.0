import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CircleDollarSign,
  Target,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type AdminPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};
type Lead = {
  id: string;
  nome: string;
  status: string;
  uf: string | null;
  cidade: string | null;
  data_hora: string;
  valor_potencial: number | null;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const number = new Intl.NumberFormat("pt-BR");
const shortDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function getPeriods(now = new Date()) {
  const brasiliaNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const year = brasiliaNow.getUTCFullYear();
  const month = brasiliaNow.getUTCMonth();
  const day = brasiliaNow.getUTCDate();
  const monthStart = new Date(Date.UTC(year, month, 1, 3));
  const nextMonth = new Date(Date.UTC(year, month + 1, 1, 3));
  const thirtyDaysAgo = new Date(Date.UTC(year, month, day - 29, 3));
  return {
    monthStart: monthStart.toISOString(),
    nextMonth: nextMonth.toISOString(),
    thirtyDaysAgo,
  };
}

function brasiliaDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function isWon(status: string) {
  const normalized = status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return normalized.includes("fechado") && normalized.includes("ganho");
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const forbidden = searchParams?.error === "forbidden";
  const supabase = createClient();
  const { monthStart, nextMonth, thirtyDaysAgo } = getPeriods();

  const [
    monthLeadsResult,
    chartLeadsResult,
    latestLeadsResult,
    contractsResult,
    goalResult,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id,status", { count: "exact" })
      .is("deleted_at", null)
      .gte("data_hora", monthStart)
      .lt("data_hora", nextMonth),
    supabase
      .from("leads")
      .select("data_hora")
      .is("deleted_at", null)
      .gte("data_hora", thirtyDaysAgo.toISOString())
      .order("data_hora"),
    supabase
      .from("leads")
      .select("id,nome,status,uf,cidade,data_hora,valor_potencial")
      .is("deleted_at", null)
      .order("data_hora", { ascending: false })
      .limit(10),
    supabase
      .from("contratos")
      .select("valor_total,data_assinatura")
      .is("deleted_at", null)
      .neq("status", "cancelado")
      .gte("data_assinatura", monthStart.slice(0, 10))
      .lt("data_assinatura", nextMonth.slice(0, 10)),
    supabase
      .from("config")
      .select("valor")
      .eq("chave", "meta_faturamento_mensal")
      .maybeSingle(),
  ]);

  const queryError = [
    monthLeadsResult.error,
    chartLeadsResult.error,
    latestLeadsResult.error,
    contractsResult.error,
  ].find(Boolean);
  if (queryError)
    console.error("Falha ao carregar dashboard", {
      code: queryError.code,
      message: queryError.message,
    });

  const monthLeads = monthLeadsResult.data ?? [];
  const leadsCount = monthLeadsResult.count ?? monthLeads.length;
  const wonCount = monthLeads.filter((lead) => isWon(lead.status)).length;
  const conversionRate = leadsCount ? (wonCount / leadsCount) * 100 : 0;
  const contracts = contractsResult.data ?? [];
  const revenue = contracts.reduce(
    (sum, contract) => sum + Number(contract.valor_total ?? 0),
    0,
  );
  const averageTicket = contracts.length ? revenue / contracts.length : 0;
  const goal = Number(goalResult.data?.valor);
  const validGoal = Number.isFinite(goal) && goal > 0 ? goal : null;
  const goalProgress = validGoal
    ? Math.min(100, (revenue / validGoal) * 100)
    : 0;

  const dayCounts = new Map<string, number>();
  for (let index = 0; index < 30; index += 1) {
    const day = new Date(thirtyDaysAgo);
    day.setDate(day.getDate() + index);
    dayCounts.set(brasiliaDateKey(day), 0);
  }
  for (const lead of chartLeadsResult.data ?? []) {
    const key = brasiliaDateKey(lead.data_hora);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }
  const chart = Array.from(dayCounts, ([day, count]) => ({ day, count }));
  const maxDaily = Math.max(1, ...chart.map(({ count }) => count));

  const kpis = [
    {
      label: "Leads este mês",
      value: number.format(leadsCount),
      detail: `${wonCount} fechado${wonCount === 1 ? "" : "s"} — ganho`,
      icon: Users,
    },
    {
      label: "Taxa de conversão",
      value: `${conversionRate.toFixed(1).replace(".", ",")}%`,
      detail: "Sobre os leads deste mês",
      icon: Target,
    },
    {
      label: "Contratos assinados",
      value: money.format(revenue),
      detail: `${contracts.length} contrato${contracts.length === 1 ? "" : "s"} no mês`,
      icon: CircleDollarSign,
    },
    {
      label: "Ticket médio",
      value: money.format(averageTicket),
      detail: "Dos contratos deste mês",
      icon: BadgeDollarSign,
    },
  ];

  return (
    <main className="px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-semibold text-primary">Visão geral</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-slate-500">
            Acompanhe o desempenho comercial do mês.
          </p>
        </div>
        {forbidden && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900"
          >
            Seu perfil não tem permissão para acessar essa área.
          </p>
        )}
        {queryError && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            Não foi possível atualizar todos os indicadores agora. Tente
            recarregar a página.
          </p>
        )}

        <section
          className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Indicadores do mês"
        >
          {kpis.map(({ label, value, detail, icon: Icon }) => (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              key={label}
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <span className="rounded-xl bg-blue-50 p-2 text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
              </div>
              <p className="mt-4 text-2xl font-bold tracking-tight">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-lg font-bold">Leads nos últimos 30 dias</h2>
              <p className="text-sm text-slate-500">
                Novos contatos recebidos por dia
              </p>
            </div>
            <div
              className="mt-8 flex h-52 items-end gap-1"
              role="img"
              aria-label="Gráfico de leads recebidos por dia"
            >
              {chart.map(({ day, count }, index) => (
                <div
                  className="group relative flex min-w-0 flex-1 flex-col items-center justify-end"
                  key={day}
                >
                  <span className="absolute -top-7 hidden rounded bg-slate-900 px-2 py-1 text-xs text-white group-hover:block">
                    {count}
                  </span>
                  <div
                    className="w-full min-w-1 rounded-t bg-primary/80"
                    style={{
                      height: `${Math.max(count ? 8 : 2, (count / maxDaily) * 100)}%`,
                    }}
                  />
                  <span className="mt-2 hidden text-[10px] text-slate-400 sm:block">
                    {index % 5 === 0
                      ? shortDate.format(new Date(`${day}T12:00:00`))
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Meta de faturamento do mês
            </p>
            <p className="mt-3 text-3xl font-bold">
              {validGoal ? money.format(revenue) : "Não configurada"}
            </p>
            {validGoal ? (
              <>
                <p className="mt-1 text-sm text-slate-500">
                  de {money.format(validGoal)}
                </p>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {goalProgress.toFixed(0)}% realizado
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                Defina a chave{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5">
                  meta_faturamento_mensal
                </code>{" "}
                em Config.
              </p>
            )}
          </article>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-bold">Últimos leads</h2>
              <p className="text-sm text-slate-500">
                Os 10 contatos mais recentes
              </p>
            </div>
            <Link
              href="/admin/leads"
              className="flex items-center gap-1 text-sm font-semibold text-primary"
            >
              Ver todos <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">Local</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Potencial</th>
                  <th className="px-6 py-3 font-semibold">Recebido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(latestLeadsResult.data as Lead[] | null)?.map((lead) => (
                  <tr className="hover:bg-slate-50" key={lead.id}>
                    <td className="px-6 py-4 font-semibold">
                      <Link href={`/admin/leads/${lead.id}`}>{lead.nome}</Link>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {[lead.cidade, lead.uf].filter(Boolean).join(" / ") ||
                        "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-primary">
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {lead.valor_potencial == null
                        ? "—"
                        : money.format(Number(lead.valor_potencial))}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {dateTime.format(new Date(lead.data_hora))}
                    </td>
                  </tr>
                ))}
                {!latestLeadsResult.data?.length && (
                  <tr>
                    <td
                      className="px-6 py-10 text-center text-slate-500"
                      colSpan={5}
                    >
                      Nenhum lead recebido ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
