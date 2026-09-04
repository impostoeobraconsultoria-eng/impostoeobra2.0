import "server-only";

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicGA4Events = {
  clickWhatsapp: string;
  clickTelefone: string;
  clickEmail: string;
  downloadDiagnostico: string;
};

const defaults: PublicGA4Events = {
  clickWhatsapp: "click_whatsapp",
  clickTelefone: "click_telefone",
  clickEmail: "click_email",
  downloadDiagnostico: "download_diagnostico",
};

const keys = {
  ga4_event_click_whatsapp: "clickWhatsapp",
  ga4_event_click_telefone: "clickTelefone",
  ga4_event_click_email: "clickEmail",
  ga4_event_download_diagnostico: "downloadDiagnostico",
} as const;

export const getPublicGA4Events = unstable_cache(
  async (): Promise<PublicGA4Events> => {
    try {
      const { data, error } = await createAdminClient()
        .from("config")
        .select("chave,valor")
        .in("chave", Object.keys(keys));
      if (error) throw error;
      const result = { ...defaults };
      for (const item of data ?? []) {
        const target = keys[item.chave as keyof typeof keys];
        const value = item.valor?.trim();
        if (target && value) result[target] = value;
      }
      return result;
    } catch (error) {
      console.error("Falha ao carregar eventos públicos do GA4", error);
      return { ...defaults };
    }
  },
  ["public-ga4-events"],
  { revalidate: 60, tags: ["config"] },
);
