import "server-only";

import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";

export const siteConfigDefaults = {
  empresa_razao_social: "Imposto & Obra Consultoria",
  empresa_cnpj: "63.382.260/0001-99",
  empresa_email: "contato@impostoeobra.com.br",
  empresa_telefone_institucional: "+55 (61) 9 9398-2653",
  empresa_endereco_completo: "Brasília - DF",
  empresa_instagram_url: "https://instagram.com/impostoeobra",
  empresa_linkedin_url: "",
  empresa_frase_apoio: "Sua obra regularizada em 5 dias úteis",
  whatsapp_msg_padrao:
    "Olá, gostaria de informações sobre como regularizar minha obra perante a Receita Federal com economia.",
  hero_exemplo_imposto_cheio: "R$ 10.967,90",
  hero_exemplo_imposto_com_consultoria: "R$ 4.074,00",
  hero_exemplo_economia_pct: "67",
  hero_exemplo_descricao:
    "Obra residencial de alvenaria, 100 m², pessoa física. Simulação com VAU de maio/2026.",
} as const;

export type SiteConfig = Record<string, string> & typeof siteConfigDefaults;

export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  try {
    const { data, error } = await createAdminClient()
      .from("config")
      .select("chave,valor");
    if (error) throw error;
    return {
      ...siteConfigDefaults,
      ...Object.fromEntries(
        (data ?? []).map((item) => [item.chave, item.valor ?? ""]),
      ),
    } as SiteConfig;
  } catch (error) {
    console.error("Falha ao carregar configuração pública", error);
    return { ...siteConfigDefaults } as SiteConfig;
  }
});

export function getConfiguredWhatsAppUrl(config: SiteConfig) {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE;
  if (!phone) return "#whatsapp-indisponivel";
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(config.whatsapp_msg_padrao)}`;
}
