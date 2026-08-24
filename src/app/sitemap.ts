import type { MetadataRoute } from "next";

import { pagesMeta } from "@/content/pages-meta";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://impostoeobra.com.br"
).replace(/\/$/, "");

type DynamicDates = { articles?: Date; cases?: Date; faq?: Date };

const LEGACY_NOTICE_ARTICLE_SLUG = "artigo-notificacao-inss-obra";
const NOTICE_ARTICLE_SLUG = "aviso-regularizacao-obra-receita-federal";

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function newest(values: Array<string | null | undefined>, fallback: Date) {
  const timestamps = [
    fallback.getTime(),
    ...values
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter(Number.isFinite),
  ];
  return new Date(Math.max(...timestamps));
}

function fixedRoutes(dynamic: DynamicDates): MetadataRoute.Sitemap {
  const homeDate = date(pagesMeta.home.lastmod);
  return [
    {
      url: `${siteUrl}${pagesMeta.home.slug}`,
      lastModified: dynamic.cases
        ? newest([dynamic.cases.toISOString()], homeDate)
        : homeDate,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}${pagesMeta.guia.slug}`,
      lastModified: dynamic.faq
        ? newest([dynamic.faq.toISOString()], date(pagesMeta.guia.lastmod))
        : date(pagesMeta.guia.lastmod),
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      url: `${siteUrl}${pagesMeta.calculadora.slug}`,
      lastModified: date(pagesMeta.calculadora.lastmod),
      changeFrequency: "monthly",
      priority: 0.95,
    },
    {
      url: `${siteUrl}${pagesMeta.artigos.slug}`,
      lastModified: dynamic.articles ?? date(pagesMeta.artigos.lastmod),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}${pagesMeta.cases.slug}`,
      lastModified: dynamic.cases ?? date(pagesMeta.cases.lastmod),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...(
      [pagesMeta.sobre, pagesMeta.contato, pagesMeta.privacidade] as const
    ).map((page, index) => ({
      url: `${siteUrl}${page.slug}`,
      lastModified: date(page.lastmod),
      changeFrequency: "yearly" as const,
      priority: index < 2 ? 0.6 : 0.5,
    })),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = createPublicClient();
    const [articleResult, caseResult, faqResult] = await Promise.all([
      supabase
        .from("artigos")
        .select("slug,updated_at,data_publicacao,prioridade_seo")
        .eq("publicado", true)
        .order("data_publicacao", { ascending: false }),
      supabase.from("cases").select("updated_at").eq("publicado", true),
      supabase.from("faq").select("updated_at").eq("publicado", true),
    ]);
    if (articleResult.error) throw articleResult.error;
    if (caseResult.error) throw caseResult.error;
    if (faqResult.error) throw faqResult.error;

    const articlesBySlug = new Map(
      articleResult.data.map((article) => {
        const sourceSlug = article.slug.replace(/\.html$/, "");
        const slug =
          sourceSlug === LEGACY_NOTICE_ARTICLE_SLUG
            ? NOTICE_ARTICLE_SLUG
            : sourceSlug;
        return [slug, { ...article, slug }] as const;
      }),
    );
    const articles: MetadataRoute.Sitemap = Array.from(
      articlesBySlug.values(),
      (article) => ({
        url: `${siteUrl}/artigos/${article.slug}`,
        lastModified: new Date(
          article.updated_at ??
            article.data_publicacao ??
            pagesMeta.artigos.lastmod,
        ),
        changeFrequency: "monthly",
        priority: Math.min(
          1,
          Math.max(0, Number(article.prioridade_seo ?? 0.8)),
        ),
      }),
    );
    const dynamic = {
      articles: newest(
        articleResult.data.map(
          (article) => article.updated_at ?? article.data_publicacao,
        ),
        date(pagesMeta.artigos.lastmod),
      ),
      cases: newest(
        caseResult.data.map((item) => item.updated_at),
        date(pagesMeta.cases.lastmod),
      ),
      faq: newest(
        faqResult.data.map((item) => item.updated_at),
        date(pagesMeta.guia.lastmod),
      ),
    };
    return [...fixedRoutes(dynamic), ...articles];
  } catch (error) {
    console.error("Falha ao montar sitemap dinâmico", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return fixedRoutes({});
  }
}
