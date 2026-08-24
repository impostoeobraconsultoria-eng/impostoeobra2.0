import "server-only";

import { cache } from "react";
import sanitizeHtml from "sanitize-html";

import { createPublicClient } from "@/lib/supabase/public";
import { articleLinkAttributes } from "@/lib/article-links";

export const ARTICLES_REVALIDATE_SECONDS = 3600;

const LEGACY_NOTICE_ARTICLE_PATHS = new Set([
  "/artigos/artigo-notificacao-inss-obra",
  "/artigos/artigo-notificacao-inss-obra.html",
]);
const NOTICE_ARTICLE_PATH =
  "/artigos/aviso-regularizacao-obra-receita-federal";

function canonicalizeArticleHref(href: string) {
  const trimmedHref = href.trim();
  try {
    const url = new URL(trimmedHref, "https://impostoeobra.com.br");
    if (
      (url.hostname === "impostoeobra.com.br" ||
        url.hostname === "www.impostoeobra.com.br") &&
      LEGACY_NOTICE_ARTICLE_PATHS.has(url.pathname)
    ) {
      return `${NOTICE_ARTICLE_PATH}${url.search}${url.hash}`;
    }
  } catch {
    // O sanitizador tratará normalmente URLs inválidas.
  }
  return href;
}

export type ArticleSummary = {
  slug: string;
  titulo: string;
  subtitulo: string | null;
  categoria: string | null;
  cluster: string | null;
  data_publicacao: string | null;
  updated_at: string;
};

export type Article = ArticleSummary & {
  meta_description: string | null;
  og_image_url: string | null;
  conteudo_html: string;
  faq: unknown;
  schema_type: string | null;
  tags: string[] | null;
};

export const getPublishedArticles = cache(
  async (): Promise<ArticleSummary[]> => {
    const { data, error } = await createPublicClient()
      .from("artigos")
      .select(
        "slug,titulo,subtitulo,categoria,cluster,data_publicacao,updated_at",
      )
      .eq("publicado", true)
      .order("data_publicacao", { ascending: false, nullsFirst: false });

    if (error) throw new Error(`Falha ao carregar artigos: ${error.message}`);
    return data;
  },
);

export const getPublishedArticle = cache(
  async (slug: string): Promise<Article | null> => {
    const { data, error } = await createPublicClient()
      .from("artigos")
      .select(
        "slug,titulo,subtitulo,meta_description,og_image_url,conteudo_html,faq,schema_type,categoria,cluster,tags,data_publicacao,updated_at",
      )
      .eq("publicado", true)
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw new Error(`Falha ao carregar artigo: ${error.message}`);
    return data;
  },
);

export const getRelatedArticles = cache(
  async (slug: string, cluster: string | null): Promise<ArticleSummary[]> => {
    const articles = (await getPublishedArticles()).filter(
      (item) => item.slug !== slug,
    );
    const sameCluster = articles.filter(
      (item) => cluster && item.cluster === cluster,
    );
    const complementary = articles.filter(
      (item) => !sameCluster.some((same) => same.slug === item.slug),
    );
    return [...sameCluster, ...complementary].slice(0, 2);
  },
);

export function sanitizeArticleHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img",
      "figure",
      "figcaption",
      "details",
      "summary",
      "h2",
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      "*": ["id"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      h1: "h2",
      a: (_tagName, attribs) => {
        const attributes = { ...attribs };
        attributes.href = canonicalizeArticleHref(attributes.href ?? "");
        const linkAttributes = articleLinkAttributes(attributes.href ?? "");
        if (linkAttributes.target) attributes.target = linkAttributes.target;
        else delete attributes.target;
        if (linkAttributes.rel) attributes.rel = linkAttributes.rel;
        else delete attributes.rel;
        return { tagName: "a", attribs: attributes };
      },
    },
  });
}

export type ArticleFaq = { pergunta: string; resposta: string };

export function getArticleSchemaType(value: string | null) {
  return ["Article", "BlogPosting", "NewsArticle"].includes(value ?? "")
    ? value
    : "Article";
}

export function parseArticleFaq(value: unknown): ArticleFaq[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ArticleFaq =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as ArticleFaq).pergunta === "string" &&
      typeof (item as ArticleFaq).resposta === "string",
  );
}
