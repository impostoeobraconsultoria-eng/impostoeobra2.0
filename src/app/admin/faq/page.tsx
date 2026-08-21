import Link from "next/link";
import { CircleHelp, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createFaq, updateFaq } from "./actions";
import { FaqForm } from "./faq-form";

export default async function FaqPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const supabase = createClient();
  let query = supabase
    .from("faq")
    .select("id,pergunta,resposta,categoria,ordem,publicado,updated_at")
    .order("ordem")
    .order("updated_at", { ascending: false });
  if (searchParams?.status === "published") query = query.eq("publicado", true);
  if (searchParams?.status === "draft") query = query.eq("publicado", false);
  if (searchParams?.categoria)
    query = query.eq("categoria", searchParams.categoria);
  const { data: questions, error } = await query;
  const { data: categoryRows } = await supabase
    .from("faq")
    .select("categoria")
    .not("categoria", "is", null)
    .order("categoria");
  const categories = Array.from(
    new Set(
      (categoryRows ?? [])
        .map((row) => row.categoria)
        .filter((category): category is string => Boolean(category)),
    ),
  );
  const creating = searchParams?.new === "1";

  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Conteúdo</p>
            <h1 className="text-3xl font-bold">Perguntas frequentes</h1>
            <p className="mt-2 text-sm text-slate-500">
              As perguntas publicadas aparecem no fim da página Guia INSS de
              Obra.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-white"
            href={creating ? "/admin/faq" : "/admin/faq?new=1"}
          >
            <Plus className="size-4" /> {creating ? "Fechar" : "Nova pergunta"}
          </Link>
        </header>

        {searchParams?.saved && (
          <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            Pergunta salva com sucesso.
          </p>
        )}
        {searchParams?.error && (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            Não foi possível salvar. Revise os campos informados.
          </p>
        )}
        {creating && (
          <section className="mt-6 rounded-2xl border bg-white p-6">
            <h2 className="mb-5 text-xl font-bold">Nova pergunta</h2>
            <FaqForm action={createFaq} />
          </section>
        )}

        <form className="mt-6 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
          <select
            className="input !mt-0"
            name="status"
            defaultValue={searchParams?.status ?? ""}
            aria-label="Status"
          >
            <option value="">Todos os status</option>
            <option value="published">Publicadas</option>
            <option value="draft">Rascunhos</option>
          </select>
          <select
            className="input !mt-0"
            name="categoria"
            defaultValue={searchParams?.categoria ?? ""}
            aria-label="Categoria"
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <button className="rounded-full border px-5 py-2.5 font-semibold">
            Filtrar
          </button>
        </form>

        {error ? (
          <p className="mt-5 rounded-2xl border bg-white p-10 text-center text-red-700">
            Não foi possível carregar as perguntas.
          </p>
        ) : questions?.length ? (
          <section className="mt-5 space-y-3">
            {questions.map((item) => {
              const editing = searchParams?.edit === item.id;
              return (
                <article
                  className="rounded-2xl border bg-white p-5"
                  key={item.id}
                >
                  {editing ? (
                    <>
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <h2 className="text-lg font-bold">Editar pergunta</h2>
                        <Link
                          className="text-sm font-semibold text-slate-500"
                          href="/admin/faq"
                        >
                          Cancelar
                        </Link>
                      </div>
                      <FaqForm
                        action={updateFaq.bind(null, item.id)}
                        value={item}
                        submitLabel="Atualizar pergunta"
                      />
                    </>
                  ) : (
                    <div className="flex gap-4">
                      <CircleHelp
                        className="mt-1 size-5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-bold text-slate-900">
                            {item.pergunta}
                          </h2>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.publicado
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {item.publicado ? "Publicada" : "Rascunho"}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                          {item.resposta}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <span>{item.categoria || "Sem categoria"}</span>
                          <span>Ordem {item.ordem ?? 100}</span>
                          <Link
                            className="font-semibold text-primary hover:underline"
                            href={`/admin/faq?edit=${item.id}`}
                          >
                            Editar
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        ) : (
          <section className="mt-5 rounded-2xl border bg-white p-12 text-center">
            <CircleHelp className="mx-auto size-10 text-slate-300" />
            <h2 className="mt-4 text-lg font-bold">
              Nenhuma pergunta encontrada
            </h2>
          </section>
        )}
      </div>
    </main>
  );
}
