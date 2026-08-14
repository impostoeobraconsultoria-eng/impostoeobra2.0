import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleEditor } from "@/components/admin/article-editor";
import { parseArticleFaq } from "@/lib/articles";
import { createClient } from "@/lib/supabase/server";
import { updateArticle } from "../actions";

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { saved?: string; error?: string };
}) {
  const supabase = createClient();
  const { data: article } = await supabase
    .from("artigos")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!article) notFound();
  const action = updateArticle.bind(null, article.id);
  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          className="text-sm font-semibold text-slate-500 hover:text-primary"
          href="/admin/artigos"
        >
          ← Voltar aos artigos
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Editar artigo</h1>
          {article.publicado && (
            <a
              className="text-sm font-semibold text-primary hover:underline"
              href={`/artigos/${article.slug}`}
              target="_blank"
            >
              Ver publicado ↗
            </a>
          )}
        </div>
        {searchParams?.saved && (
          <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            Artigo salvo com sucesso.
          </p>
        )}
        {searchParams?.error && (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            Não foi possível salvar. Revise os campos e a imagem.
          </p>
        )}
        <ArticleEditor
          action={action}
          value={{ ...article, faq: parseArticleFaq(article.faq) }}
        />
      </div>
    </main>
  );
}
