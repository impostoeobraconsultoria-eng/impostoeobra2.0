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
  persistDocx,
  publicDocumentError,
  requireDocumentUser,
} from "@/lib/documentos";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const paramsSchema = z.record(
  z.string(),
  z.union([z.string().max(4000), z.number().finite(), z.null()]),
);
const bodySchema = z
  .object({
    lead_id: z.string().uuid().optional(),
    cliente_id: z.string().uuid().optional(),
    params: paramsSchema.optional(),
  })
  .refine((body) => Boolean(body.lead_id) !== Boolean(body.cliente_id), {
    message: "Informe exatamente um lead_id ou cliente_id.",
  });

const fields = [
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
] as const;

export async function POST(request: Request) {
  try {
    const user = await requireDocumentUser();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message },
        { status: 400 },
      );
    const admin = createAdminClient();
    const config = await getConfigMap();
    const today = new Date();
    let defaults: Record<string, unknown>;
    let refTipo: "lead" | "cliente";
    let refId: string;

    if (parsed.data.lead_id) {
      const { data: lead, error } = await admin
        .from("leads")
        .select("*")
        .eq("id", parsed.data.lead_id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error || !lead)
        return NextResponse.json(
          { error: "Lead não encontrado." },
          { status: 404 },
        );
      defaults = {
        nome_cliente: lead.nome,
        cpf_cnpj: "—",
        endereco_obra: joinAddress(lead.cidade, lead.uf),
        tipo_construcao: lead.tipo,
        area_construida: lead.area_total ?? lead.a_construcao,
        situacao_obra: lead.categoria ?? lead.status,
      };
      refTipo = "lead";
      refId = lead.id;
    } else {
      const { data: cliente, error } = await admin
        .from("clientes")
        .select("*")
        .eq("id", parsed.data.cliente_id!)
        .is("deleted_at", null)
        .maybeSingle();
      if (error || !cliente)
        return NextResponse.json(
          { error: "Cliente não encontrado." },
          { status: 404 },
        );
      defaults = {
        nome_cliente: cliente.nome,
        cpf_cnpj: cliente.cpf || cliente.cnpj,
        endereco_obra: joinAddress(
          cliente.obra_end_logradouro,
          cliente.obra_end_bairro,
          cliente.obra_end_cidade,
          cliente.obra_end_uf,
        ),
        tipo_construcao: cliente.obra_tipo,
        area_construida: "—",
        situacao_obra: cliente.obra_descricao,
      };
      refTipo = "cliente";
      refId = cliente.id;
    }

    defaults = {
      ...defaults,
      data_proposta: dateBr(today.toISOString()),
      data_extenso: dateExtenso(today.toISOString()),
      valor_obra_concluida: config.proposta_valor_obra_concluida,
      valor_obra_andamento: config.proposta_valor_obra_andamento,
    };
    const values = mergeAndNormalize(defaults, parsed.data.params, fields);
    const template = config.template_proposta || "proposta_comercial.docx";
    const buffer = await generateDocx(template, values);
    const isoDate = today.toISOString().slice(0, 10);
    const nomeArquivo = fileName(
      `Proposta — ${values.nome_cliente} — ${isoDate}.docx`,
    );
    const result = await persistDocx({
      tipo: "proposta",
      refTipo,
      refId,
      nomeArquivo,
      buffer,
      params: values,
      userId: user.id,
      descricao: `Proposta comercial gerada: ${nomeArquivo}`,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao gerar proposta", error);
    return NextResponse.json(
      {
        error: publicDocumentError(error, "proposta"),
      },
      { status: 500 },
    );
  }
}
