import { createClient } from "@/lib/supabase/server";
import type { OperacaoPagina, OperacaoParte } from "./types";

export async function listOperacaoTree(): Promise<OperacaoParte[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("operacao_partes")
    .select("id,slug,numero,titulo,descricao,ordem,paginas:operacao_paginas(id,parte_id,slug,titulo,resumo,ordem)")
    .eq("ativo", true)
    .eq("operacao_paginas.ativo", true)
    .order("ordem")
    .order("ordem", { referencedTable: "operacao_paginas" });
  if (error) throw new Error(`Não foi possível carregar o manual: ${error.message}`);
  return (data ?? []) as OperacaoParte[];
}

export async function getOperacaoPagina(parteSlug: string, paginaSlug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("operacao_paginas")
    .select("id,parte_id,slug,titulo,resumo,conteudo,ordem,atualizado_por,updated_at,parte:operacao_partes!inner(id,slug,numero,titulo),autor:users!operacao_paginas_atualizado_por_fkey(nome),faqs:operacao_faqs(id,pagina_id,pergunta,resposta,ordem)")
    .eq("ativo", true)
    .eq("parte.slug", parteSlug)
    .eq("slug", paginaSlug)
    .order("ordem", { referencedTable: "operacao_faqs" })
    .maybeSingle();
  if (error) throw new Error(`Não foi possível carregar a página: ${error.message}`);
  return data as unknown as OperacaoPagina | null;
}
