import Link from "next/link";
import { notFound } from "next/navigation";

import { parseArticleFaq, sanitizeArticleHtml } from "@/lib/articles";
import { createClient } from "@/lib/supabase/server";

export default async function ArticlePreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: article } = await supabase
    .from("artigos")
    .select("id,titulo,subtitulo,categoria,conteudo_html,faq")
    .eq("id", params.id)
    .maybeSingle();
  if (!article) notFound();
  const faq = parseArticleFaq(article.faq);
  return (
    <main className="bg-white px-6 py-14">
      <article className="institutional-content mx-auto max-w-[800px]">
        <Link
          className="mb-6 inline-block text-sm font-semibold text-primary"
          href={`/admin/artigos/${article.id}`}
        >
          ← Voltar ao editor
        </Link>
        <p className="mb-6 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Preview interno — esta página não é pública nem indexada.
        </p>
        {article.categoria && (
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-primary">
            {article.categoria}
          </p>
        )}
        <h1 className="mb-5 text-3xl font-extrabold leading-tight sm:text-[42px]">
          {article.titulo}
        </h1>
        {article.subtitulo && <p className="lead">{article.subtitulo}</p>}
        <div
          className="article-html"
          dangerouslySetInnerHTML={{
            __html: sanitizeArticleHtml(article.conteudo_html),
          }}
        />
        {faq.length > 0 && (
          <section>
            <h2>Perguntas frequentes</h2>
            <div className="space-y-3">
              {faq.map((item) => (
                <details className="rounded-xl border p-5" key={item.pergunta}>
                  <summary className="cursor-pointer font-semibold">
                    {item.pergunta}
                  </summary>
                  <p className="mt-3">{item.resposta}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
