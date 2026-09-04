import "server-only";

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://impostoeobra.com.br"
).replace(/\/$/, "");

const defaults = {
  tituloPadrao: "Imposto & Obra Consultoria — Regularização de INSS de Obra",
  descriptionPadrao:
    "Diagnóstico preliminar gratuito de redução do INSS da sua obra. Consultoria especializada em regularização previdenciária de obras de construção civil.",
  ogImagePadrao: "/images/og-default.jpg",
  twitterHandle: "",
  orgNome: "Imposto & Obra Consultoria",
  orgTelefone: "+55-61-99398-2653",
  orgEmail: "impostoeobraconsultoria@gmail.com",
  orgCidade: "Brasília",
  orgUf: "DF",
  orgPais: "BR",
  orgHorario: "Mo-Fr 09:00-19:00",
  orgArea: "Brasil",
  orgDescricao:
    "Consultoria jurídico-tributária especializada em regularização previdenciária de obras de construção civil, com atuação nacional 100% remota.",
  sitemapHabilitado: true,
  sitemapChangefreqHome: "weekly",
  sitemapChangefreqArtigos: "monthly",
} as const;

const keyMap = {
  seo_titulo_padrao: "tituloPadrao",
  seo_description_padrao: "descriptionPadrao",
  seo_og_image_padrao: "ogImagePadrao",
  seo_twitter_handle: "twitterHandle",
  seo_org_nome: "orgNome",
  seo_org_telefone: "orgTelefone",
  seo_org_email: "orgEmail",
  seo_org_endereco_cidade: "orgCidade",
  seo_org_endereco_uf: "orgUf",
  seo_org_endereco_pais: "orgPais",
  seo_org_horario_atendimento: "orgHorario",
  seo_org_area_atendimento: "orgArea",
  seo_org_descricao: "orgDescricao",
  seo_sitemap_habilitado: "sitemapHabilitado",
  seo_sitemap_changefreq_home: "sitemapChangefreqHome",
  seo_sitemap_changefreq_artigos: "sitemapChangefreqArtigos",
} as const;

export type SeoConfig = {
  [K in keyof typeof defaults]: (typeof defaults)[K] extends boolean
    ? boolean
    : string;
};

export const getSeoConfig = unstable_cache(
  async (): Promise<SeoConfig> => {
    try {
      const { data, error } = await createAdminClient()
        .from("config")
        .select("chave,valor")
        .in("chave", Object.keys(keyMap));
      if (error) throw error;
      const config: Record<string, string | boolean> = { ...defaults };
      for (const item of data ?? []) {
        const target = keyMap[item.chave as keyof typeof keyMap];
        if (!target) continue;
        if (target === "sitemapHabilitado") {
          config[target] = item.valor?.trim().toLowerCase() === "true";
        } else if (item.valor?.trim()) {
          config[target] = item.valor.trim();
        }
      }
      return config as SeoConfig;
    } catch (error) {
      console.error("Falha ao carregar configuração de SEO", error);
      return { ...defaults } as SeoConfig;
    }
  },
  ["seo-config-v10"],
  { revalidate: 60, tags: ["config"] },
);

export function absoluteUrl(pathOrUrl: string) {
  return new URL(pathOrUrl, `${SITE_URL}/`).toString();
}

export function metadataImageUrl(pathOrUrl: string) {
  try {
    const url = new URL(pathOrUrl);
    if (url.origin === SITE_URL) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    return url.toString();
  } catch {
    return pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  }
}
