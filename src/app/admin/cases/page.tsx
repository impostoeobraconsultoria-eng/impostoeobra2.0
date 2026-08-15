import Link from "next/link";
import { Plus, Star } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createCase } from "./actions";
import { CaseForm } from "./case-form";

export default async function CasesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const supabase = createClient();
  let query = supabase
    .from("cases")
    .select(
      "id,cliente_display,tipo_obra,economia_valor,economia_pct,publicado,ordem,updated_at",
    )
    .order("ordem")
    .order("updated_at", { ascending: false });
  if (searchParams?.status === "published") query = query.eq("publicado", true);
  if (searchParams?.status === "draft") query = query.eq("publicado", false);
  const { data: cases, error } = await query;
  const creating = searchParams?.new === "1";

  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Conteúdo</p>
            <h1 className="text-3xl font-bold">Cases de sucesso</h1>
            <p className="mt-2 text-sm text-slate-500">
              Os cases publicados aparecem na seção &quot;Resultados&quot; da
              home. Mostramos os 6 primeiros na ordem definida.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-white"
            href={creating ? "/admin/cases" : "/admin/cases?new=1"}
          >
            <Plus className="size-4" /> {creating ? "Fechar" : "Novo case"}
          </Link>
        </header>

        {searchParams?.error && (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            Não foi possível salvar. Revise os campos informados.
          </p>
        )}
        {creating && (
          <section className="mt-6 rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-bold">Novo case</h2>
            <CaseForm action={createCase} />
          </section>
        )}

        <nav className="mt-6 flex gap-2" aria-label="Filtrar cases">
          <FilterLink href="/admin/cases" active={!searchParams?.status}>
            Todos
          </FilterLink>
          <FilterLink
            href="/admin/cases?status=published"
            active={searchParams?.status === "published"}
          >
            Publicados
          </FilterLink>
          <FilterLink
            href="/admin/cases?status=draft"
            active={searchParams?.status === "draft"}
          >
            Rascunhos
          </FilterLink>
        </nav>

        {error ? (
          <p className="mt-5 rounded-2xl border bg-white p-10 text-center text-red-700">
            Não foi possível carregar os cases.
          </p>
        ) : cases?.length ? (
          <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cases.map((item) => (
              <article
                className="rounded-2xl border bg-white p-5"
                key={item.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <Star className="size-6 text-amber-500" aria-hidden="true" />
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.publicado ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                  >
                    {item.publicado ? "Publicado" : "Rascunho"}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-bold">
                  {item.cliente_display}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {item.tipo_obra || "Tipo não informado"}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
                  <div>
                    <p className="text-xs text-slate-500">Economia</p>
                    <p className="font-bold text-accent">
                      {money(item.economia_valor)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Redução</p>
                    <p className="font-bold">
                      {item.economia_pct == null
                        ? "—"
                        : `${Number(item.economia_pct).toLocaleString("pt-BR")}%`}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    Ordem {item.ordem ?? 100}
                  </span>
                  <Link
                    className="font-semibold text-primary hover:underline"
                    href={`/admin/cases/${item.id}`}
                  >
                    Editar
                  </Link>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-4 rounded-2xl border bg-white p-12 text-center">
            <Star className="mx-auto size-10 text-slate-300" />
            <h2 className="mt-4 text-lg font-bold">Nenhum case encontrado</h2>
          </section>
        )}
      </div>
    </main>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-primary text-white" : "border bg-white"}`}
      href={href}
    >
      {children}
    </Link>
  );
}

const money = (value: unknown) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(value));
