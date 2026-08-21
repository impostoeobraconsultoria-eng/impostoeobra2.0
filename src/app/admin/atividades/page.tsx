import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CircleDot,
  FileClock,
  Filter,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;
const REF_TYPES = ["lead", "cliente", "contrato", "sistema"] as const;
const ACTIVITY_TYPES = [
  "criacao",
  "edicao",
  "contato",
  "nota",
  "mudanca_status",
] as const;

type SearchParams = Record<string, string | string[] | undefined>;
type Activity = {
  id: string;
  ref_tipo: string;
  ref_id: string;
  tipo: string;
  descricao: string | null;
  metadata_json: unknown;
  data_hora: string;
  autor_id: string | null;
  autor: Array<{ nome: string | null; email: string }> | null;
};

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const filters = normalizeFilters(searchParams);
  const supabase = createClient();
  const from = (filters.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("atividades")
    .select(
      "id,ref_tipo,ref_id,tipo,descricao,metadata_json,data_hora,autor_id,autor:users(nome,email)",
      { count: "exact" },
    )
    .order("data_hora", { ascending: false })
    .range(from, to);

  if (filters.refTipo) query = query.eq("ref_tipo", filters.refTipo);
  if (filters.tipo) query = query.eq("tipo", filters.tipo);
  if (filters.autorId) query = query.eq("autor_id", filters.autorId);
  if (filters.from)
    query = query.gte("data_hora", `${filters.from}T00:00:00-03:00`);
  if (filters.to)
    query = query.lte("data_hora", `${filters.to}T23:59:59.999-03:00`);
  if (filters.search)
    query = query.ilike("descricao", `%${escapeLike(filters.search)}%`);

  const [{ data, count, error }, { data: authors }] = await Promise.all([
    query,
    supabase
      .from("users")
      .select("id,nome,email")
      .eq("ativo", true)
      .order("nome"),
  ]);

  const activities = (data ?? []) as unknown as Activity[];
  const references = await resolveReferences(supabase, activities);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">CRM</p>
            <h1 className="text-3xl font-bold">Feed de atividades</h1>
            <p className="mt-2 text-sm text-slate-500">
              Últimas movimentações de leads, clientes e contratos, com filtro
              por autor.
            </p>
          </div>
          <div className="rounded-2xl border bg-white px-5 py-3 text-right">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-slate-500">atividades encontradas</p>
          </div>
        </header>

        <form className="mt-6 rounded-2xl border bg-white p-5">
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <Filter className="size-4 text-primary" aria-hidden="true" />
            Filtros
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <label className="field lg:col-span-2">
              Buscar na descrição
              <input
                className="input"
                type="search"
                name="q"
                defaultValue={filters.search}
                placeholder="Ex.: status alterado"
              />
            </label>
            <label className="field">
              Entidade
              <select
                className="input"
                name="ref_tipo"
                defaultValue={filters.refTipo}
              >
                <option value="">Todas</option>
                {REF_TYPES.map((type) => (
                  <option value={type} key={type}>
                    {REF_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Tipo
              <select className="input" name="tipo" defaultValue={filters.tipo}>
                <option value="">Todos</option>
                {ACTIVITY_TYPES.map((type) => (
                  <option value={type} key={type}>
                    {TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field lg:col-span-2">
              Autor
              <select
                className="input"
                name="autor"
                defaultValue={filters.autorId}
              >
                <option value="">Todos</option>
                {(authors ?? []).map((author) => (
                  <option value={author.id} key={author.id}>
                    {author.nome || author.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              De
              <input
                className="input"
                type="date"
                name="de"
                defaultValue={filters.from}
              />
            </label>
            <label className="field">
              Até
              <input
                className="input"
                type="date"
                name="ate"
                defaultValue={filters.to}
              />
            </label>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <button className="rounded-full bg-primary px-5 py-2.5 font-semibold text-white">
                Aplicar filtros
              </button>
              <Link
                className="rounded-full border px-5 py-2.5 font-semibold"
                href="/admin/atividades"
              >
                Limpar
              </Link>
            </div>
          </div>
        </form>

        <section className="mt-6 overflow-hidden rounded-2xl border bg-white">
          {error ? (
            <p className="p-8 text-center text-red-700">
              Não foi possível carregar o histórico.
            </p>
          ) : activities.length ? (
            <ol className="divide-y">
              {activities.map((activity) => {
                const reference = references.get(activity.ref_id);
                const author = activity.autor?.[0];
                return (
                  <li className="flex gap-4 p-5 sm:p-6" key={activity.id}>
                    <span className="mt-1 grid size-10 shrink-0 place-items-center rounded-full bg-blue-50 text-primary">
                      <CircleDot className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                          {typeLabel(activity.tipo)}
                        </span>
                        <span className="text-xs uppercase tracking-wide text-slate-500">
                          {refLabel(activity.ref_tipo)}
                        </span>
                      </div>
                      <p className="mt-2 font-medium text-slate-800">
                        {activity.descricao || "Atividade sem descrição"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <time dateTime={activity.data_hora}>
                          {formatDateTime(activity.data_hora)}
                        </time>
                        <span>
                          {author?.nome || author?.email || "Sistema"}
                        </span>
                        {reference?.href ? (
                          <Link
                            className="font-semibold text-primary hover:underline"
                            href={reference.href}
                          >
                            {reference.label}
                          </Link>
                        ) : (
                          <span>
                            {reference?.label || "Registro indisponível"}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="grid place-items-center p-12 text-center">
              <FileClock
                className="size-10 text-slate-300"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-lg font-bold">
                Nenhuma atividade encontrada
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ajuste os filtros para ampliar a busca.
              </p>
            </div>
          )}
        </section>

        {totalPages > 1 && (
          <nav
            className="mt-6 flex items-center justify-between"
            aria-label="Paginação"
          >
            <PageLink
              page={filters.page - 1}
              filters={filters}
              disabled={filters.page <= 1}
            >
              <ArrowLeft className="size-4" /> Anterior
            </PageLink>
            <p className="text-sm text-slate-500">
              Página {Math.min(filters.page, totalPages)} de {totalPages}
            </p>
            <PageLink
              page={filters.page + 1}
              filters={filters}
              disabled={filters.page >= totalPages}
            >
              Próxima <ArrowRight className="size-4" />
            </PageLink>
          </nav>
        )}
      </div>
    </main>
  );
}

async function resolveReferences(
  supabase: ReturnType<typeof createClient>,
  activities: Activity[],
) {
  const grouped = {
    lead: activities
      .filter((item) => item.ref_tipo === "lead")
      .map((item) => item.ref_id),
    cliente: activities
      .filter((item) => item.ref_tipo === "cliente")
      .map((item) => item.ref_id),
    contrato: activities
      .filter((item) => item.ref_tipo === "contrato")
      .map((item) => item.ref_id),
  };
  const [leads, clients, contracts] = await Promise.all([
    grouped.lead.length
      ? supabase.from("leads").select("id,nome").in("id", grouped.lead)
      : Promise.resolve({ data: [] }),
    grouped.cliente.length
      ? supabase.from("clientes").select("id,nome").in("id", grouped.cliente)
      : Promise.resolve({ data: [] }),
    grouped.contrato.length
      ? supabase
          .from("contratos")
          .select("id,numero,produto")
          .in("id", grouped.contrato)
      : Promise.resolve({ data: [] }),
  ]);
  const map = new Map<string, { label: string; href?: string }>();
  for (const lead of leads.data ?? [])
    map.set(lead.id, {
      label: lead.nome || "Lead",
      href: `/admin/leads/${lead.id}`,
    });
  for (const client of clients.data ?? [])
    map.set(client.id, {
      label: client.nome || "Cliente",
      href: `/admin/clientes/${client.id}`,
    });
  for (const contract of contracts.data ?? [])
    map.set(contract.id, {
      label: contract.numero || contract.produto || "Contrato",
      href: `/admin/contratos/${contract.id}`,
    });
  for (const activity of activities)
    if (activity.ref_tipo === "sistema")
      map.set(activity.ref_id, { label: "Sistema" });
  return map;
}

function normalizeFilters(searchParams?: SearchParams) {
  const value = (key: string) => {
    const raw = searchParams?.[key];
    return typeof raw === "string" ? raw.trim() : "";
  };
  const requestedPage = Number(value("page"));
  const refTipo = value("ref_tipo");
  const tipo = value("tipo");
  return {
    search: value("q").slice(0, 120),
    refTipo: REF_TYPES.includes(refTipo as (typeof REF_TYPES)[number])
      ? refTipo
      : "",
    tipo: ACTIVITY_TYPES.includes(tipo as (typeof ACTIVITY_TYPES)[number])
      ? tipo
      : "",
    autorId: /^[0-9a-f-]{36}$/i.test(value("autor")) ? value("autor") : "",
    from: /^\d{4}-\d{2}-\d{2}$/.test(value("de")) ? value("de") : "",
    to: /^\d{4}-\d{2}-\d{2}$/.test(value("ate")) ? value("ate") : "",
    page:
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  };
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

const REF_LABELS: Record<(typeof REF_TYPES)[number], string> = {
  lead: "Lead",
  cliente: "Cliente",
  contrato: "Contrato",
  sistema: "Sistema",
};
const TYPE_LABELS: Record<(typeof ACTIVITY_TYPES)[number], string> = {
  criacao: "Criação",
  edicao: "Edição",
  contato: "Contato",
  nota: "Nota",
  mudanca_status: "Mudança de status",
};
const refLabel = (value: string) =>
  REF_LABELS[value as keyof typeof REF_LABELS] ?? value;
const typeLabel = (value: string) =>
  TYPE_LABELS[value as keyof typeof TYPE_LABELS] ?? value;
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));

function PageLink({
  page,
  filters,
  disabled,
  children,
}: {
  page: number;
  filters: ReturnType<typeof normalizeFilters>;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.refTipo) params.set("ref_tipo", filters.refTipo);
  if (filters.tipo) params.set("tipo", filters.tipo);
  if (filters.autorId) params.set("autor", filters.autorId);
  if (filters.from) params.set("de", filters.from);
  if (filters.to) params.set("ate", filters.to);
  params.set("page", String(page));
  const classes =
    "inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold";
  return disabled ? (
    <span className={`${classes} cursor-not-allowed opacity-40`}>
      {children}
    </span>
  ) : (
    <Link className={classes} href={`/admin/atividades?${params.toString()}`}>
      {children}
    </Link>
  );
}
