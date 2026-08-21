import Link from "next/link";
import { FileText, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const supabase = createClient();
  let query = supabase
    .from("artigos")
    .select("id,slug,titulo,categoria,publicado,data_publicacao,updated_at")
    .order("updated_at", { ascending: false });
  if (searchParams?.status === "published") query = query.eq("publicado", true);
  if (searchParams?.status === "draft") query = query.eq("publicado", false);
  const { data: articles, error } = await query;

  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Conteúdo</p>
            <h1 className="text-3xl font-bold">Artigos</h1>
            <p className="mt-2 text-sm text-slate-500">
              Crie, revise e publique conteúdos do site.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-white"
            href="/admin/artigos/novo"
          >
            <Plus className="size-4" /> Novo artigo
          </Link>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filtrar artigos">
          <FilterLink href="/admin/artigos" active={!searchParams?.status}>
            Todos
          </FilterLink>
          <FilterLink
            href="/admin/artigos?status=published"
            active={searchParams?.status === "published"}
          >
            Publicados
          </FilterLink>
          <FilterLink
            href="/admin/artigos?status=draft"
            active={searchParams?.status === "draft"}
          >
            Rascunhos
          </FilterLink>
        </nav>

        <section className="mt-4 overflow-hidden rounded-2xl border bg-white">
          {error ? (
            <p className="p-10 text-center text-red-700">
              Não foi possível carregar os artigos.
            </p>
          ) : articles?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-sm text-slate-600">
                  <tr>
                    <th className="p-4">Título</th>
                    <th>Categoria</th>
                    <th>Status</th>
                    <th>Atualizado</th>
                    <th className="pr-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {articles.map((article) => (
                    <tr key={article.id}>
                      <td className="p-4">
                        <Link
                          className="font-semibold hover:text-primary"
                          href={`/admin/artigos/${article.id}`}
                        >
                          {article.titulo}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          /artigos/{article.slug}
                        </p>
                      </td>
                      <td>{article.categoria || "—"}</td>
                      <td>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${article.publicado ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                        >
                          {article.publicado ? "Publicado" : "Rascunho"}
                        </span>
                      </td>
                      <td className="text-sm text-slate-500">
                        {formatDate(article.updated_at)}
                      </td>
                      <td className="pr-4 text-right">
                        <Link
                          className="font-semibold text-primary hover:underline"
                          href={`/admin/artigos/${article.id}`}
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid place-items-center p-12 text-center">
              <FileText className="size-10 text-slate-300" />
              <h2 className="mt-4 text-lg font-bold">
                Nenhum artigo encontrado
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Crie um artigo ou altere o filtro.
              </p>
            </div>
          )}
        </section>
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

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
