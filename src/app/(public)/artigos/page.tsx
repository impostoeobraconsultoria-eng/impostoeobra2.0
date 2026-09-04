import type { Metadata } from "next";
import Link from "next/link";

import { FinalCta } from "@/components/public/institutional-page";
import {
  ARTICLES_REVALIDATE_SECONDS,
  getPublishedArticles,
  type ArticleSummary,
} from "@/lib/articles";
import { getSeoConfig } from "@/lib/seo/config";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { getSchemaCollectionPage } from "@/lib/seo/schema";

export const revalidate = ARTICLES_REVALIDATE_SECONDS;

const description =
  "Artigos sobre regularização de obras e INSS: CNO, SERO, aferição, redução legal, CND e Receita Federal.";
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await getSeoConfig(), {
    title: "Artigos sobre INSS de obras",
    description,
    canonical: "/artigos",
  });
}

export default async function ArticlesPage() {
  let articles: ArticleSummary[] = [];
  let unavailable = false;
  try {
    articles = await getPublishedArticles();
  } catch (error) {
    unavailable = true;
    console.error("Falha ao renderizar índice de artigos", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  return (
    <main className="py-14 sm:py-16">
      <div className="site-container">
        <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[44px]">
          Artigos sobre regularização de obras
        </h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-slate-700">
          Entenda suas pendências, regularize a obra e conheça as formas legais
          de reduzir o valor do INSS.
        </p>
        <section className="my-12 border-y border-border bg-primary px-7 py-10 text-white sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-white/80">
            ★ Comece aqui
          </p>
          <h2 className="mt-2 text-2xl font-extrabold">
            <Link href="/guia-inss-de-obra">Guia completo do INSS de obra</Link>
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-white/90">
            CNO, SERO, ARO, aferição, reduções legais, multas, CND e averbação —
            os fundamentos reunidos em um único lugar.
          </p>
          <Link
            className="mt-5 inline-flex min-h-12 items-center bg-white px-5 py-3 text-sm font-bold text-primary transition hover:bg-slate-100"
            href="/guia-inss-de-obra"
          >
            Ler o guia completo
          </Link>
        </section>

        {articles.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {articles.map((article) => (
              <article
                className="flex flex-col border border-border bg-white p-7"
                key={article.slug}
              >
                {article.categoria && (
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
                    {article.categoria}
                  </p>
                )}
                <h2 className="text-xl font-bold leading-snug text-slate-950">
                  <Link href={`/artigos/${article.slug}`}>
                    {article.titulo}
                  </Link>
                </h2>
                {article.subtitulo && (
                  <p className="mt-3 flex-1 text-[15px] leading-relaxed text-slate-600">
                    {article.subtitulo}
                  </p>
                )}
                <Link
                  className="mt-5 inline-flex w-fit border-b-2 border-primary pb-1 text-sm font-bold text-primary"
                  href={`/artigos/${article.slug}`}
                >
                  Ler artigo
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <section className="border border-border bg-page px-6 py-10 text-center">
            <h2 className="text-xl font-bold">
              {unavailable
                ? "Artigos temporariamente indisponíveis"
                : "Novos artigos em preparação"}
            </h2>
            <p className="mt-2 text-slate-600">
              {unavailable
                ? "Tente novamente em alguns instantes."
                : "Enquanto isso, consulte nosso guia completo sobre INSS de obra."}
            </p>
          </section>
        )}

        <FinalCta
          title="Quer entender o INSS da sua obra?"
          highlight="Faça uma simulação gratuita em 2 minutos."
          description="Nossa equipe retorna com um diagnóstico em até 24h."
          href="/#calculadora"
          label="Simular agora"
        />
        <JsonLd
          data={getSchemaCollectionPage({
            name: "Artigos sobre INSS de obras",
            description,
            url: "/artigos",
            numberOfItems: articles.length,
          })}
        />
      </div>
    </main>
  );
}
