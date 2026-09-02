import Link from "next/link";
import {
  BadgeDollarSign,
  CircleCheckBig,
  FileSignature,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSiteConfig } from "@/lib/site-config";
import { AtivarPush } from "@/components/admin/ativar-push";
import {
  DashboardCadence,
  type CadenceMetrics,
} from "@/components/admin/dashboard-cadence";
import type { ContactPerformancePoint } from "@/components/admin/grafico-performance-contato";
import type { ConsultantLeadSlice } from "@/components/admin/grafico-leads-por-consultor";
import { getCadenciaConfig, saoPauloDateKey } from "@/lib/cadencia/config";

type AdminPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};
type Stage = { nome: string; cor: string | null; e_fechada: boolean };
type CadenceLead = {
  id: string;
  data_hora: string;
  contato_inicial_em: string | null;
  responsavel_id: string | null;
  proxima_tentativa_em: string | null;
  cadencia_finalizada_em: string | null;
  tentativa_atual: number;
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

function periods(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(now);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const year = get("year");
  const month = get("month") - 1;
  const day = get("day");
  return {
    previousMonthStart: new Date(Date.UTC(year, month - 1, 1, 3)).toISOString(),
    monthStart: new Date(Date.UTC(year, month, 1, 3)).toISOString(),
    nextMonth: new Date(Date.UTC(year, month + 1, 1, 3)).toISOString(),
    thirtyDaysAgo: new Date(Date.UTC(year, month, day - 29, 3)).toISOString(),
  };
}

function dateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function LeadsLineChart({
  values,
}: {
  values: { day: string; count: number }[];
}) {
  const max = Math.max(1, ...values.map((value) => value.count));
  const points = values
    .map(
      (value, index) =>
        `${(index / Math.max(1, values.length - 1)) * 100},${100 - (value.count / max) * 88}`,
    )
    .join(" ");
  return (
    <div className="mt-7">
      <svg
        viewBox="0 0 100 105"
        preserveAspectRatio="none"
        className="h-52 w-full overflow-visible"
        role="img"
        aria-label="Gráfico de linha de leads recebidos por dia"
      >
        {[25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            x2="100"
            y1={y}
            y2={y}
            stroke="#e2e8f0"
            strokeWidth="0.5"
          />
        ))}
        <polyline
          points={points}
          fill="none"
          stroke="#0071e3"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {values.map((value, index) => (
          <circle
            key={value.day}
            cx={(index / Math.max(1, values.length - 1)) * 100}
            cy={100 - (value.count / max) * 88}
            r="1.2"
            fill="#0071e3"
          >
            <title>{`${shortDate.format(new Date(`${value.day}T12:00:00`))}: ${value.count} leads`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>{shortDate.format(new Date(`${values[0]?.day}T12:00:00`))}</span>
        <span>
          {shortDate.format(new Date(`${values.at(-1)?.day}T12:00:00`))}
        </span>
      </div>
    </div>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const forbidden = searchParams?.error === "forbidden";
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  const { data: profile } =
    typeof email === "string"
      ? await supabase
          .from("users")
          .select("id,perfil")
          .eq("email", email.toLowerCase())
          .eq("ativo", true)
          .maybeSingle()
      : { data: null };
  const { previousMonthStart, monthStart, nextMonth, thirtyDaysAgo } =
    periods();
  const [
    currentResult,
    previousResult,
    allLeadsResult,
    chartResult,
    contractsResult,
    stagesResult,
    goalResult,
    config,
    cadenceLeadsResult,
    activeUsersResult,
    cadenceConfig,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id,status", { count: "exact" })
      .is("deleted_at", null)
      .is("convertido_em", null)
      .eq("status_ativacao", "ativo")
      .gte("data_hora", monthStart)
      .lt("data_hora", nextMonth),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .is("convertido_em", null)
      .eq("status_ativacao", "ativo")
      .gte("data_hora", previousMonthStart)
      .lt("data_hora", monthStart),
    supabase
      .from("leads")
      .select("status")
      .is("deleted_at", null)
      .is("convertido_em", null)
      .eq("status_ativacao", "ativo"),
    supabase
      .from("leads")
      .select("data_hora")
      .is("deleted_at", null)
      .is("convertido_em", null)
      .eq("status_ativacao", "ativo")
      .gte("data_hora", thirtyDaysAgo)
      .order("data_hora"),
    supabase
      .from("contratos")
      .select("id,valor_total")
      .is("deleted_at", null)
      .neq("status", "cancelado")
      .gte("data_assinatura", monthStart.slice(0, 10))
      .lt("data_assinatura", nextMonth.slice(0, 10)),
    supabase.from("funil_etapas").select("nome,cor,e_fechada").order("ordem"),
    supabase
      .from("config")
      .select("valor")
      .eq("chave", "meta_leads_mensal")
      .maybeSingle(),
    getSiteConfig(),
    supabase
      .from("leads")
      .select(
        "id,data_hora,contato_inicial_em,responsavel_id,proxima_tentativa_em,cadencia_finalizada_em,tentativa_atual",
      )
      .is("deleted_at", null)
      .is("convertido_em", null)
      .eq("status_ativacao", "ativo")
      .limit(2000),
    supabase.from("users").select("id,nome").eq("ativo", true).order("nome"),
    getCadenciaConfig(),
  ]);
  const errors = [
    currentResult.error,
    previousResult.error,
    allLeadsResult.error,
    chartResult.error,
    contractsResult.error,
    stagesResult.error,
    cadenceLeadsResult.error,
    activeUsersResult.error,
  ].filter(Boolean);
  if (errors.length)
    console.error(
      "Falha ao carregar dashboard",
      errors.map((error) => ({ code: error?.code, message: error?.message })),
    );

  const stages = (stagesResult.data ?? []) as Stage[];
  const closed = new Set(
    stages.filter((stage) => stage.e_fechada).map((stage) => stage.nome),
  );
  const current = currentResult.data ?? [];
  const currentCount = currentResult.count ?? current.length;
  const previousCount = previousResult.count ?? 0;
  const variation = previousCount
    ? ((currentCount - previousCount) / previousCount) * 100
    : currentCount
      ? 100
      : 0;
  const closedCount = current.filter((lead) => closed.has(lead.status)).length;
  const conversion = currentCount ? (closedCount / currentCount) * 100 : 0;
  const contracts = contractsResult.data ?? [];
  const revenue = contracts.reduce(
    (sum, contract) => sum + Number(contract.valor_total ?? 0),
    0,
  );
  const averageTicket = contracts.length ? revenue / contracts.length : 0;
  const goal = Number(goalResult.data?.valor);
  const validGoal = Number.isFinite(goal) && goal > 0 ? goal : null;

  const counts = new Map<string, number>();
  for (const lead of allLeadsResult.data ?? [])
    counts.set(lead.status, (counts.get(lead.status) ?? 0) + 1);
  const funnel = stages.map((stage, index) => ({
    ...stage,
    count: counts.get(stage.nome) ?? 0,
    drop: index
      ? Math.max(
          0,
          (counts.get(stages[index - 1].nome) ?? 0) -
            (counts.get(stage.nome) ?? 0),
        )
      : 0,
  }));
  const biggestDrop = Math.max(0, ...funnel.map((stage) => stage.drop));
  const maxStage = Math.max(1, ...funnel.map((stage) => stage.count));

  const daily = new Map<string, number>();
  for (let index = 0; index < 30; index += 1) {
    const day = new Date(thirtyDaysAgo);
    day.setUTCDate(day.getUTCDate() + index);
    daily.set(dateKey(day), 0);
  }
  for (const lead of chartResult.data ?? []) {
    const key = dateKey(lead.data_hora);
    daily.set(key, (daily.get(key) ?? 0) + 1);
  }
  const chart = Array.from(daily, ([day, count]) => ({ day, count }));
  const cadenceLeads = (cadenceLeadsResult.data ?? []) as CadenceLead[];
  const mine = profile
    ? cadenceLeads.filter((lead) => lead.responsavel_id === profile.id)
    : [];
  const today = saoPauloDateKey();
  const now = new Date();
  const allMetrics = cadenceMetrics(
    cadenceLeads,
    profile?.id ?? null,
    today,
    now,
  );
  const mineMetrics = cadenceMetrics(mine, profile?.id ?? null, today, now);
  const allPerformance = contactPerformance(cadenceLeads, thirtyDaysAgo);
  const minePerformance = contactPerformance(mine, thirtyDaysAgo);
  const consultantSlices = leadSlices(
    cadenceLeads,
    activeUsersResult.data ?? [],
  );

  const kpis = [
    {
      label: "Leads este mês",
      value: number.format(currentCount),
      detail: `${variation >= 0 ? "+" : ""}${variation.toFixed(1).replace(".", ",")}% vs. mês anterior`,
      icon: variation >= 0 ? TrendingUp : TrendingDown,
    },
    {
      label: "Taxa de conversão",
      value: `${conversion.toFixed(1).replace(".", ",")}%`,
      detail: `${closedCount} de ${currentCount} leads fechados`,
      icon: Target,
    },
    {
      label: "Contratos assinados",
      value: number.format(contracts.length),
      detail: `No mês atual`,
      icon: FileSignature,
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
        <p className="text-sm font-semibold text-primary">Visão geral</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-slate-500">
          Acompanhe o desempenho comercial do mês.
        </p>
        <AtivarPush
          title={config.push_titulo_ativar}
          description={config.push_descricao_ativar}
        />
        {forbidden && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900"
          >
            Seu perfil não tem permissão para acessar essa área.
          </p>
        )}
        {!!errors.length && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            Não foi possível atualizar todos os indicadores agora.
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
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-2xl font-bold tracking-tight">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{detail}</p>
            </article>
          ))}
        </section>
        <DashboardCadence
          isAdmin={profile?.perfil === "admin"}
          allMetrics={allMetrics}
          mineMetrics={mineMetrics}
          allPerformance={allPerformance}
          minePerformance={minePerformance}
          cardOrder={cadenceConfig.dashboardCardsOrdem}
          consultantSlices={consultantSlices}
        />
        <section className="mt-6 grid grid-cols-1 gap-8">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold">Leads nos últimos 30 dias</h2>
            <p className="text-sm text-slate-500">
              Novos contatos recebidos por dia
            </p>
            <LeadsLineChart values={chart} />
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold">Funil de conversão</h2>
            <p className="text-sm text-slate-500">
              Distribuição atual dos leads por etapa
            </p>
            <div className="mt-6 space-y-4">
              {funnel.map((stage) => (
                <Link
                  key={stage.nome}
                  href={`/admin/leads?status=${encodeURIComponent(stage.nome)}`}
                  className="group block"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-semibold group-hover:text-primary">
                      {stage.nome}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 font-bold">
                      {stage.drop > 0 && stage.drop === biggestDrop && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-800">
                          gargalo
                        </span>
                      )}
                      {stage.count}
                    </span>
                  </div>
                  <div className="h-6 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full min-w-1 rounded-full transition-all group-hover:brightness-95"
                      style={{
                        width: `${Math.max(2, (stage.count / maxStage) * 100)}%`,
                        backgroundColor: stage.cor || "#0071e3",
                      }}
                    />
                  </div>
                </Link>
              ))}
              {!funnel.length && (
                <p className="py-10 text-center text-sm text-slate-500">
                  Configure as etapas do funil para visualizar os dados.
                </p>
              )}
            </div>
          </article>
        </section>
        {validGoal && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Meta mensal de leads fechados
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {closedCount} de {number.format(validGoal)}
                </p>
              </div>
              <CircleCheckBig className="size-8 text-accent" />
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${Math.min(100, (closedCount / validGoal) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {Math.min(100, (closedCount / validGoal) * 100).toFixed(0)}% da
              meta
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

function cadenceMetrics(
  leads: CadenceLead[],
  currentUserId: string | null,
  today: string,
  now: Date,
): CadenceMetrics {
  const uncovered = leads.filter((lead) => !lead.responsavel_id);
  const averageHours = uncovered.length
    ? Math.floor(
        uncovered.reduce(
          (sum, lead) =>
            sum + Math.max(0, now.getTime() - Date.parse(lead.data_hora)),
          0,
        ) /
          uncovered.length /
          3_600_000,
      )
    : 0;
  const followupToday = leads.filter(
    (lead) =>
      lead.proxima_tentativa_em === today && !lead.cadencia_finalizada_em,
  );
  const overdue = leads.filter(
    (lead) =>
      lead.proxima_tentativa_em != null &&
      lead.proxima_tentativa_em < today &&
      !lead.cadencia_finalizada_em,
  );
  const decisions = leads.filter((lead) => lead.cadencia_finalizada_em);
  const personal = currentUserId
    ? leads.filter((lead) => lead.responsavel_id === currentUserId)
    : [];
  return {
    sem_consultor: {
      count: uncovered.length,
      detail: uncovered.length
        ? `Em média há ${averageHours}h`
        : "Todos os leads estão cobertos",
    },
    followup_hoje: {
      count: followupToday.length,
      detail: "Contatos previstos para hoje",
    },
    followup_atrasado: {
      count: overdue.length,
      detail: overdue.length ? "Exigem ação imediata" : "Nenhum atraso",
    },
    decidir_hoje: {
      count: decisions.length,
      detail: "Converter ou inativar",
    },
    meus_leads: {
      count: personal.length,
      detail: "Leads ativos sob sua responsabilidade",
    },
  };
}

function contactPerformance(
  leads: CadenceLead[],
  thirtyDaysAgo: string,
): ContactPerformancePoint[] {
  const points = new Map<string, ContactPerformancePoint>();
  for (let index = 0; index < 30; index += 1) {
    const day = new Date(thirtyDaysAgo);
    day.setUTCDate(day.getUTCDate() + index);
    const key = dateKey(day);
    points.set(key, {
      day: shortDate.format(new Date(`${key}T12:00:00-03:00`)),
      verde: 0,
      amarelo: 0,
      vermelho: 0,
    });
  }
  for (const lead of leads) {
    if (lead.data_hora < thirtyDaysAgo) continue;
    const point = points.get(dateKey(lead.data_hora));
    if (!point) continue;
    if (!lead.contato_inicial_em) point.vermelho += 1;
    else {
      const hours =
        (Date.parse(lead.contato_inicial_em) - Date.parse(lead.data_hora)) /
        3_600_000;
      if (hours < 1) point.verde += 1;
      else if (hours <= 3) point.amarelo += 1;
      else point.vermelho += 1;
    }
  }
  return Array.from(points.values());
}

function leadSlices(
  leads: CadenceLead[],
  users: { id: string; nome: string | null }[],
): ConsultantLeadSlice[] {
  const counts = new Map<string | null, number>();
  for (const lead of leads)
    counts.set(lead.responsavel_id, (counts.get(lead.responsavel_id) ?? 0) + 1);
  const names = new Map(users.map((user) => [user.id, user.nome]));
  return Array.from(counts, ([id, quantidade]) => ({
    id,
    nome: id ? names.get(id) || "Usuário inativo" : "Sem consultor",
    quantidade,
  })).sort((a, b) => {
    if (a.id === null) return -1;
    if (b.id === null) return 1;
    return b.quantidade - a.quantidade;
  });
}
