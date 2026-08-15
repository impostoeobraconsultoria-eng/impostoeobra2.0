import "server-only";

import { unstable_cache } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";

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
