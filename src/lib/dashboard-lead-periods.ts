import type { createClient } from "@/lib/supabase/server";

type Client = ReturnType<typeof createClient>;
type Period = { from: string; to: string };
type SearchParams = Record<string, string | string[] | undefined>;

const saoPauloDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function dashboardDateKey(value: string | Date) {
  return saoPauloDate.format(new Date(value));
}

function shiftPeriod(key: string, offset: number, monthly: boolean) {
  const date = new Date(`${monthly ? `${key}-01` : key}T00:00:00Z`);
  if (monthly) date.setUTCMonth(date.getUTCMonth() + offset);
  else date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, monthly ? 7 : 10);
}

function validKey(value: unknown, monthly: boolean): value is string {
  if (typeof value !== "string") return false;
  const pattern = monthly ? /^20\d{2}-\d{2}$/ : /^20\d{2}-\d{2}-\d{2}$/;
  if (!pattern.test(value)) return false;
  const date = new Date(`${monthly ? `${value}-01` : value}T00:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().startsWith(value);
}

export function chartPeriod(
  params: SearchParams | undefined,
  today: string,
  monthly: boolean,
) {
  const month = today.slice(0, 7);
  const fallback = monthly
    ? { from: shiftPeriod(month, -5, true), to: month }
    : { from: `${month}-01`, to: today };
  const prefix = monthly ? "mensal" : "diario";
  const from = params?.[`${prefix}_inicio`];
  const to = params?.[`${prefix}_fim`];
  if (from === undefined && to === undefined)
    return { ...fallback, invalid: false };
  const maxPeriods = monthly ? 60 : 366;
  if (
    validKey(from, monthly) &&
    validKey(to, monthly) &&
    from <= to &&
    to <= fallback.to &&
    to < shiftPeriod(from, maxPeriods, monthly)
  ) {
    return { from, to, invalid: false };
  }
  return { ...fallback, invalid: true };
}

function bounds({ from, to }: Period, monthly: boolean) {
  const midnight = (key: string) =>
    `${monthly ? `${key}-01` : key}T03:00:00.000Z`;
  return { start: midnight(from), end: midnight(shiftPeriod(to, 1, monthly)) };
}

async function leadEvents(
  supabase: Client,
  { start, end }: { start: string; end: string },
  converted: boolean,
) {
  const pageSize = 500;
  const dates: string[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const result = converted
      ? await supabase
          .from("leads")
          .select("convertido_em,clientes!fk_leads_cliente_id!inner(id)")
          .is("deleted_at", null)
          .is("clientes.deleted_at", null)
          .gte("convertido_em", start)
          .lt("convertido_em", end)
          .order("id")
          .range(offset, offset + pageSize - 1)
      : await supabase
          .from("leads")
          .select("data_hora")
          .is("deleted_at", null)
          .gte("data_hora", start)
          .lt("data_hora", end)
          .order("id")
          .range(offset, offset + pageSize - 1);
    if (result.error) {
      console.error("Falha ao carregar série do dashboard", result.error.code);
      return null;
    }
    for (const row of result.data) {
      dates.push("convertido_em" in row ? row.convertido_em : row.data_hora);
    }
    if (result.data.length < pageSize) return dates;
  }
}

export async function leadChartData(
  supabase: Client,
  period: Period,
  monthly: boolean,
) {
  const interval = bounds(period, monthly);
  const [leads, conversions] = await Promise.all([
    leadEvents(supabase, interval, false),
    monthly ? leadEvents(supabase, interval, true) : [],
  ]);
  if (!leads || !conversions) return null;

  const series = new Map<
    string,
    { period: string; leads: number; converted: number }
  >();
  for (
    let key = period.from;
    key <= period.to;
    key = shiftPeriod(key, 1, monthly)
  ) {
    series.set(key, { period: key, leads: 0, converted: 0 });
  }
  for (const [dates, field] of [
    [leads, "leads"],
    [conversions, "converted"],
  ] as const) {
    for (const date of dates) {
      const key = dashboardDateKey(date).slice(0, monthly ? 7 : 10);
      const point = series.get(key);
      if (point) point[field] += 1;
    }
  }
  return Array.from(series.values());
}
