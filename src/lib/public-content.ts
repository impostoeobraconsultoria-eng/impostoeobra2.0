import "server-only";

import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";

export type PublicFaq = {
  id: string;
  pergunta: string;
  resposta: string;
};

export type PublicCase = {
  id: string;
  cliente_display: string;
  tipo_obra: string | null;
  economia_valor: number | null;
  economia_pct: number | null;
  descricao: string | null;
  imagem_url: string | null;
};

export const getPublishedFaq = cache(async (): Promise<PublicFaq[]> => {
  const { data, error } = await createPublicClient()
    .from("faq")
    .select("id,pergunta,resposta")
    .eq("publicado", true)
    .order("ordem", { ascending: true });

  if (error) throw new Error(`Falha ao carregar FAQ: ${error.message}`);
  return data;
});

export const getPublishedFaqByCategory = cache(
  async (category: string): Promise<PublicFaq[]> => {
    const { data, error } = await createPublicClient()
      .from("faq")
      .select("id,pergunta,resposta")
      .eq("publicado", true)
      .eq("categoria", category)
      .order("ordem", { ascending: true });

    if (error) throw new Error(`Falha ao carregar FAQ: ${error.message}`);
    return data;
  },
);

export const getPublishedCases = cache(async (): Promise<PublicCase[]> => {
  const { data, error } = await createPublicClient()
    .from("cases")
    .select(
      "id,cliente_display,tipo_obra,economia_valor,economia_pct,descricao,imagem_url",
    )
    .eq("publicado", true)
    .order("ordem", { ascending: true })
    .limit(6);

  if (error) throw new Error(`Falha ao carregar cases: ${error.message}`);
  return data;
});

export const getAllPublishedCases = cache(async (): Promise<PublicCase[]> => {
  const { data, error } = await createPublicClient()
    .from("cases")
    .select(
      "id,cliente_display,tipo_obra,economia_valor,economia_pct,descricao,imagem_url",
    )
    .eq("publicado", true)
    .order("ordem", { ascending: true });

  if (error) throw new Error(`Falha ao carregar cases: ${error.message}`);
  return data;
});
