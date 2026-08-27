import { createClient } from "@/lib/supabase/server";

export type OperacaoConfig = {
  titulo: string;
  subtitulo: string;
  rodape: string;
  habilitarFaq: boolean;
  habilitarCriacao: boolean;
};

const defaults: OperacaoConfig = {
  titulo: "Manual Operacional",
  subtitulo: "Procedimentos internos de regularização previdenciária de obras.",
  rodape: "Documento interno. Não compartilhar externamente.",
  habilitarFaq: true,
  habilitarCriacao: true,
};

export async function getOperacaoConfig(): Promise<OperacaoConfig> {
  const supabase = createClient();
  const { data } = await supabase
    .from("config")
    .select("chave,valor")
    .like("chave", "operacao_%");
  const values = Object.fromEntries((data ?? []).map((row) => [row.chave, row.valor]));

  return {
    titulo: values.operacao_titulo || defaults.titulo,
    subtitulo: values.operacao_subtitulo || defaults.subtitulo,
    rodape: values.operacao_msg_rodape || defaults.rodape,
    habilitarFaq: (values.operacao_habilitar_faq ?? "true") === "true",
    habilitarCriacao:
      (values.operacao_habilitar_criacao_paginas ?? "true") === "true",
  };
}
