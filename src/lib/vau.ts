import "server-only";

import { unstable_cache } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";

export const VAU_COLUMNS = [
  { key: "casa_popular", label: "Casa Popular" },
  { key: "comercial", label: "Comercial Salas/Lojas" },
  { key: "conj_pop", label: "Conj. Hab. Popular" },
  { key: "galpao", label: "Galpão Industrial" },
  { key: "res_multi", label: "Residencial Multifamiliar" },
  { key: "res_uni", label: "Residencial Unifamiliar" },
  { key: "garagens", label: "Edifício de Garagens" },
] as const;

export const UFS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
] as const;

export const getCachedVau = unstable_cache(
  async () => {
    const { data, error } = await createPublicClient()
      .from("vau")
      .select(
        "uf,casa_popular,comercial,conj_pop,galpao,res_multi,res_uni,garagens,vigencia",
      )
      .order("uf");
    if (error) throw new Error(`Falha ao consultar VAU: ${error.code}`);
    return data;
  },
  ["vau-table"],
  { revalidate: 1800, tags: ["vau"] },
);
