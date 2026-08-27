import type { JSONContent } from "@tiptap/react";

export type OperacaoParte = {
  id: string;
  slug: string;
  numero: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  paginas?: OperacaoPaginaResumo[];
};

export type OperacaoPaginaResumo = {
  id: string;
  parte_id: string;
  slug: string;
  titulo: string;
  resumo: string | null;
  ordem: number;
};

export type OperacaoFaq = {
  id: string;
  pagina_id: string;
  pergunta: string;
  resposta: string;
  ordem: number;
};

export type OperacaoPagina = OperacaoPaginaResumo & {
  conteudo: JSONContent;
  atualizado_por: string | null;
  updated_at: string;
  parte: Pick<OperacaoParte, "id" | "slug" | "numero" | "titulo">;
  autor?: { nome: string | null } | null;
  faqs?: OperacaoFaq[];
};

export const EMPTY_TIPTAP_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
