import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FinalCta } from "@/components/public/institutional-page";
import {
  ARTICLES_REVALIDATE_SECONDS,
  getArticleSchemaType,
  getPublishedArticle,
  getPublishedArticles,
  parseArticleFaq,
  sanitizeArticleHtml,
} from "@/lib/articles";

export const revalidate = ARTICLES_REVALIDATE_SECONDS;
export const dynamicParams = true;

type Props = { params: { slug: string } };

export async function generateStaticParams() {
  try {
    return (await getPublishedArticles()).map(({ slug }) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getPublishedArticle(params.slug);
  if (!article)
    return {
      title: "Artigo não encontrado",
      robots: { index: false, follow: false },
    };
  const description =
    article.meta_description ?? article.subtitulo ?? undefined;
  return {
    title: article.titulo,
    description,
    alternates: { canonical: `/artigos/${article.slug}` },
    openGraph: {
      title: article.titulo,
      description,
      url: `/artigos/${article.slug}`,
      type: "article",
      publishedTime: article.data_publicacao ?? undefined,
      modifiedTime: article.updated_at,
      images: article.og_image_url
        ? [{ url: article.og_image_url }]
        : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = await getPublishedArticle(params.slug);
  if (!article) notFound();
  const faq = parseArticleFaq(article.faq);
  const date = article.data_publicacao
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "long",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(article.data_publicacao))
    : null;
  const url = `https://impostoeobra.com.br/artigos/${article.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": getArticleSchemaType(article.schema_type),
    headline: article.titulo,
    description: article.meta_description ?? article.subtitulo,
    image: article.og_image_url || "https://impostoeobra.com.br/og-cover.png",
    datePublished: article.data_publicacao,
    dateModified: article.updated_at,
    author: { "@type": "Organization", name: "Imposto & Obra Consultoria" },
    publisher: { "@type": "Organization", name: "Imposto & Obra Consultoria" },
    mainEntityOfPage: url,
    inLanguage: "pt-BR",
  };

  return (
    <main className="py-14 sm:py-16">
      <div className="site-container">
        <article className="institutional-content mx-auto max-w-[800px]">
          <Link
            className="mb-6 inline-block text-sm font-medium text-slate-500 hover:text-primary"
            href="/artigos"
          >
            ← Todos os artigos
          </Link>
          {article.categoria && (
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-primary">
              {article.categoria}
            </p>
          )}
          <h1 className="mb-5 text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-[42px]">
            {article.titulo}
          </h1>
          {article.subtitulo && <p className="lead">{article.subtitulo}</p>}
          {date && (
            <p className="!mb-8 !text-sm !text-slate-500">
              Publicado em {date}
            </p>
          )}
          <div
            className="article-html"
            dangerouslySetInnerHTML={{
              __html: sanitizeArticleHtml(article.conteudo_html),
            }}
          />
          {faq.length > 0 && (
            <section aria-labelledby="article-faq">
              <h2 id="article-faq">Perguntas frequentes</h2>
              <div className="space-y-3">
                {faq.map((item) => (
                  <details
                    className="rounded-xl border border-slate-200 p-5"
                    key={item.pergunta}
                  >
                    <summary className="cursor-pointer font-semibold">
                      {item.pergunta}
                    </summary>
                    <p className="mt-3 text-slate-700">{item.resposta}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
          <FinalCta
            title="Quer regularizar sua obra com economia?"
            highlight="Simule o INSS em 2 minutos."
            description="Atendimento especializado em todo o Brasil."
            href="/#calculadora"
            label="Simular agora"
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
          {faq.length > 0 && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: faq.map((item) => ({
                    "@type": "Question",
                    name: item.pergunta,
                    acceptedAnswer: { "@type": "Answer", text: item.resposta },
                  })),
                }),
              }}
            />
          )}
        </article>
      </div>
    </main>
  );
}
