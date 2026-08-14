import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://impostoeobra.com.br"
).replace(/\/$/, "");

const fixedRoutes: MetadataRoute.Sitemap = [
  {
    url: `${siteUrl}/`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: `${siteUrl}/guia-inss-de-obra`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.95,
  },
  {
    url: `${siteUrl}/artigos`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    url: `${siteUrl}/sobre`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.6,
  },
  {
    url: `${siteUrl}/contato`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.6,
  },
  {
    url: `${siteUrl}/politica/aviso-de-privacidade`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.5,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const { data, error } = await createPublicClient()
      .from("artigos")
      .select("slug,updated_at,data_publicacao,prioridade_seo")
      .eq("publicado", true)
      .order("data_publicacao", { ascending: false });

    if (error) throw error;

    const articles: MetadataRoute.Sitemap = data.map((article) => ({
      url: `${siteUrl}/artigos/${article.slug.replace(/\.html$/, "")}`,
      lastModified: new Date(
        article.updated_at ?? article.data_publicacao ?? Date.now(),
      ),
      changeFrequency: "monthly",
      priority: Math.min(1, Math.max(0, Number(article.prioridade_seo ?? 0.8))),
    }));

    return [...fixedRoutes, ...articles];
  } catch (error) {
    console.error("Falha ao montar artigos do sitemap", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return fixedRoutes;
  }
}
