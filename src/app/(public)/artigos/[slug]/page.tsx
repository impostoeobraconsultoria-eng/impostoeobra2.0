import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";

import { FinalCta } from "@/components/public/institutional-page";
import {
  ARTICLES_REVALIDATE_SECONDS,
  getArticleSchemaType,
  getPublishedArticle,
  getPublishedArticles,
  getRelatedArticles,
  parseArticleFaq,
  sanitizeArticleHtml,
} from "@/lib/articles";
import { getSeoConfig } from "@/lib/seo/config";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  getSchemaArticle,
  getSchemaBreadcrumb,
  getSchemaFAQPage,
} from "@/lib/seo/schema";

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
  return pageMetadata(await getSeoConfig(), {
    title: article.titulo,
    description,
    canonical: `/artigos/${article.slug}`,
    image: article.og_image_url,
    type: "article",
    publishedTime: article.data_publicacao,
    modifiedTime: article.updated_at,
  });
}

export default async function ArticlePage({ params }: Props) {
  const article = await getPublishedArticle(params.slug);
  if (!article) notFound();
  const faq = parseArticleFaq(article.faq);
  const related = await getRelatedArticles(article.slug, article.cluster);
  const seo = await getSeoConfig();
  const date = article.data_publicacao
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "long",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(article.data_publicacao))
    : null;
  const schema = getSchemaArticle(
    {
      slug: article.slug,
      titulo: article.titulo,
      description: article.meta_description ?? article.subtitulo,
      image: article.og_image_url,
      datePublished: article.data_publicacao,
      dateModified: article.updated_at,
      schemaType: getArticleSchemaType(article.schema_type) ?? "Article",
    },
    seo,
  );
  const breadcrumb = getSchemaBreadcrumb([
    { name: "Início", url: "/" },
    { name: "Artigos", url: "/artigos" },
    { name: article.titulo, url: `/artigos/${article.slug}` },
  ]);

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
          <section
            className="my-12 border-y border-border py-9"
            aria-labelledby="continue-reading"
          >
            <p className="editorial-label">Arquitetura pilar-cluster</p>
            <h2 id="continue-reading">Continue lendo</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {related.map((item) => (
                <article
                  key={item.slug}
                  className="border border-border bg-page p-5"
                >
                  {item.cluster && (
                    <p className="!mb-2 !text-xs font-bold uppercase tracking-wide text-primary">
                      {item.cluster}
                    </p>
                  )}
                  <h3 className="!my-0 !text-base !leading-snug">
                    <Link href={`/artigos/${item.slug}`}>{item.titulo}</Link>
                  </h3>
                </article>
              ))}
              <article className="border border-primary bg-primary p-5 text-white">
                <p className="!mb-2 !text-xs font-bold uppercase tracking-wide text-white/75">
                  Conteúdo pilar
                </p>
                <h3 className="!my-0 !text-base !leading-snug">
                  <Link className="text-white" href="/guia-inss-de-obra">
                    Guia completo do INSS de obra
                  </Link>
                </h3>
              </article>
            </div>
          </section>
          <FinalCta
            title="Quer regularizar sua obra com economia?"
            highlight="Simule o INSS em 2 minutos."
            description="Atendimento especializado em todo o Brasil."
            href="/#calculadora"
            label="Simular agora"
          />
          <JsonLd data={schema} />
          <JsonLd data={breadcrumb} />
          {faq.length > 0 && (
            <JsonLd data={getSchemaFAQPage(faq)} />
          )}
        </article>
      </div>
    </main>
  );
}
