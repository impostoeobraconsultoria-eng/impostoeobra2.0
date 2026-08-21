import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

export const TEMPLATE_REQUIRED_FIELDS = {
  template_proposta: [
    "nome_cliente",
    "cpf_cnpj",
    "endereco_obra",
    "tipo_construcao",
    "area_construida",
    "situacao_obra",
    "data_proposta",
    "data_extenso",
    "valor_obra_concluida",
    "valor_obra_andamento",
  ],
  template_contrato_andamento: [
    "contratante_nome",
    "contratante_cpf_cnpj",
    "contratada_razao",
    "contratada_cnpj",
    "obra_endereco",
    "numero_contrato",
    "data_assinatura",
    "data_assinatura_extenso",
    "cidade_assinatura",
    "cidade_foro",
    "valor_total",
    "parcelas",
    "forma_pagamento",
    "escopo_servico",
  ],
  template_contrato_finalizada: [
    "contratante_nome",
    "contratante_cpf_cnpj",
    "contratada_razao",
    "contratada_cnpj",
    "obra_endereco",
    "numero_contrato",
    "data_assinatura",
    "data_assinatura_extenso",
    "cidade_assinatura",
    "cidade_foro",
    "valor_total",
    "parcelas",
    "forma_pagamento",
    "escopo_servico",
  ],
} as const;

export type TemplateKey = keyof typeof TEMPLATE_REQUIRED_FIELDS;

export function validateDocxTemplate(buffer: ArrayBuffer, key: TemplateKey) {
  try {
    const zip = new PizZip(buffer);
    const document = new Docxtemplater(zip, {
      delimiters: { start: "{{", end: "}}" },
      paragraphLoop: true,
      linebreaks: true,
    });
    const text = document.getFullText();
    const missing = TEMPLATE_REQUIRED_FIELDS[key].filter(
      (field) => !text.includes(`{{${field}}}`),
    );
    return { ok: missing.length === 0, missing };
  } catch (cause) {
    console.error("Template DOCX inválido", {
      key,
      message: cause instanceof Error ? cause.message : String(cause),
    });
    return { ok: false, missing: [], invalid: true as const };
  }
}
