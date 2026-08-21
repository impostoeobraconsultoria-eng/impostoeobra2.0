import "server-only";

import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

const getConfiguredWhatsappNumber = unstable_cache(
  async () => {
    try {
      const { data, error } = await createAdminClient()
        .from("config")
        .select("valor")
        .eq("chave", "empresa_whatsapp_e164")
        .maybeSingle();
      if (error) throw error;
      return normalizePhone(data?.valor);
    } catch (error) {
      console.error("Falha ao carregar o WhatsApp institucional", error);
      return "";
    }
  },
  ["empresa-whatsapp-e164"],
  { revalidate: 300, tags: ["config"] },
);

function normalizePhone(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

export async function getWhatsappNumber() {
  const configured = await getConfiguredWhatsappNumber();
  return configured || normalizePhone(process.env.NEXT_PUBLIC_WHATSAPP_PHONE);
}

export async function getWhatsappUrl(mensagem?: string) {
  const phone = await getWhatsappNumber();
  if (!phone) return "#whatsapp-indisponivel";
  const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}`;
  return mensagem ? `${url}&text=${encodeURIComponent(mensagem)}` : url;
}
