import { NextResponse } from "next/server";
import { z } from "zod";

import {
  dateBr,
  dateExtenso,
  fileName,
  generateDocx,
  getConfigMap,
  joinAddress,
  mergeAndNormalize,
  money,
  persistDocx,
  publicDocumentError,
  requireDocumentUser,
} from "@/lib/documentos";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const bodySchema = z.object({
  contrato_id: z.string().uuid(),
  params: z
    .record(
      z.string(),
      z.union([z.string().max(5000), z.number().finite(), z.null()]),
    )
    .optional(),
});

const fields = [
  "contratante_nome",
  "contratante_cpf_cnpj",
  "contratante_rg",
  "contratante_endereco",
  "contratante_email",
  "contratante_telefone",
  "contratada_razao",
  "contratada_cnpj",
  "contratada_endereco",
  "contratada_representante",
  "obra_endereco",
  "obra_area",
  "obra_matricula",
  "obra_iptu",
  "obra_tipo",
  "numero_contrato",
  "data_assinatura",
  "data_assinatura_extenso",
  "cidade_assinatura",
  "cidade_foro",
  "valor_total",
  "valor_extenso",
  "valor_entrada",
  "valor_saldo",
  "parcelas",
  "forma_pagamento",
  "dia_vencimento",
  "escopo_servico",
] as const;

export async function POST(request: Request) {
  try {
    const user = await requireDocumentUser();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Contrato ou parâmetros inválidos." },
        { status: 400 },
      );
    const admin = createAdminClient();
    const { data: contrato, error } = await admin
      .from("contratos")
      .select("*,cliente:clientes(*)")
      .eq("id", parsed.data.contrato_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !contrato)
      return NextResponse.json(
        { error: "Contrato não encontrado." },
        { status: 404 },
      );
    const cliente = Array.isArray(contrato.cliente)
      ? contrato.cliente[0]
      : contrato.cliente;
    if (!cliente)
      return NextResponse.json(
        { error: "Cliente do contrato não encontrado." },
        { status: 422 },
      );
    const { data: product, error: productError } = await admin
      .from("produtos")
      .select("nome,template_contrato_arq")
      .eq("slug", contrato.produto)
      .eq("ativo", true)
      .maybeSingle();
    if (productError || !product?.template_contrato_arq)
      return NextResponse.json(
        {
          error: `Produto "${contrato.produto}" não encontrado, inativo ou sem template. Cadastre o template em /admin/produtos ou atualize o produto do contrato.`,
        },
        { status: 422 },
      );
    const config = await getConfigMap();
    const total = Number(contrato.valor_total ?? 0);
    const assinatura =
      contrato.data_assinatura || new Date().toISOString().slice(0, 10);
    const defaults = {
      contratante_nome: cliente.nome,
      contratante_cpf_cnpj: cliente.cpf || cliente.cnpj,
      contratante_rg: cliente.rg,
      contratante_endereco: joinAddress(
        cliente.end_logradouro,
        cliente.end_bairro,
        cliente.end_cidade,
        cliente.end_uf,
        cliente.end_cep,
      ),
      contratante_email: cliente.email,
      contratante_telefone: [cliente.ddd, cliente.telefone]
        .filter(Boolean)
        .join(" "),
      contratada_razao: config.empresa_razao_social,
      contratada_cnpj: config.empresa_cnpj,
      contratada_endereco: config.empresa_endereco_completo,
      contratada_representante: config.empresa_representante_nome,
      obra_endereco: joinAddress(
        cliente.obra_end_logradouro,
        cliente.obra_end_bairro,
        cliente.obra_end_cidade,
        cliente.obra_end_uf,
      ),
      obra_area: cliente.obra_descricao,
      obra_matricula: cliente.obra_matricula,
      obra_iptu: cliente.obra_iptu,
      obra_tipo: cliente.obra_tipo,
      numero_contrato: contrato.numero,
      data_assinatura: dateBr(assinatura),
      data_assinatura_extenso: dateExtenso(assinatura),
      cidade_assinatura: config.empresa_cidade_sede,
      cidade_foro: config.empresa_cidade_sede,
      valor_total: money(total),
      valor_extenso: "(valor por extenso)",
      valor_entrada: money(total / 2),
      valor_saldo: money(total / 2),
      parcelas: contrato.parcelas,
      forma_pagamento: contrato.forma_pagamento,
      dia_vencimento: "10",
      escopo_servico:
        contrato.observacoes ||
        "Escopo customizado conforme alinhado entre as partes.",
    };
    const values = mergeAndNormalize(defaults, parsed.data.params, fields);
    const buffer = await generateDocx(product.template_contrato_arq, values);
    const modalidade = product.nome;
    const nomeArquivo = fileName(
      `Contrato ${values.numero_contrato} — ${values.contratante_nome} (${modalidade}) — ${new Date().toISOString().slice(0, 10)}.docx`,
    );
    const result = await persistDocx({
      tipo:
        contrato.produto === "obra_finalizada" ||
        product.template_contrato_arq === "contrato_obra_finalizada.docx"
          ? "contrato_finalizada"
          : "contrato_andamento",
      refTipo: "contrato",
      refId: contrato.id,
      nomeArquivo,
      buffer,
      params: values,
      userId: user.id,
      descricao: `Minuta de ${modalidade} gerada: ${nomeArquivo}`,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao gerar contrato", error);
    return NextResponse.json(
      {
        error: publicDocumentError(error, "contrato"),
      },
      { status: 500 },
    );
  }
}
