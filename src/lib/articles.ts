import "server-only";

import { cache } from "react";
import sanitizeHtml from "sanitize-html";

import { createPublicClient } from "@/lib/supabase/public";

export const ARTICLES_REVALIDATE_SECONDS = 3600;

export type ArticleSummary = {
  slug: string;
  titulo: string;
  subtitulo: string | null;
  categoria: string | null;
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
      .select("slug,titulo,subtitulo,categoria,data_publicacao,updated_at")
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
        "slug,titulo,subtitulo,meta_description,og_image_url,conteudo_html,faq,schema_type,categoria,tags,data_publicacao,updated_at",
      )
      .eq("publicado", true)
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw new Error(`Falha ao carregar artigo: ${error.message}`);
    return data;
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
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          ...(attribs.target === "_blank"
            ? { rel: "noopener noreferrer" }
            : {}),
        },
      }),
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
