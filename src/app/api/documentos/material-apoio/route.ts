import { NextResponse } from "next/server";
import { z } from "zod";

import {
  fileName,
  publicDocumentError,
  registerMaterialSupport,
  requireDocumentUser,
} from "@/lib/documentos";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  lead_id: z.string().uuid(),
  params: z.record(
    z.string(),
    z.union([z.string().max(4000), z.number().finite(), z.null()]),
  ),
});

export async function POST(request: Request) {
  try {
    const user = await requireDocumentUser();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    const { data: lead } = await createAdminClient()
      .from("leads")
      .select("id,nome")
      .eq("id", parsed.data.lead_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!lead)
      return NextResponse.json(
        { error: "Lead não encontrado." },
        { status: 404 },
      );
    const nomeArquivo = fileName(
      `Material_Apoio — ${lead.nome} — ${new Date().toISOString().slice(0, 10)}.pdf`,
    );
    const result = await registerMaterialSupport({
      leadId: lead.id,
      nomeArquivo,
      params: parsed.data.params,
      userId: user.id,
    });
    return NextResponse.json({ ...result, nome_arquivo: nomeArquivo });
  } catch (error) {
    console.error("Erro ao registrar material de apoio", error);
    return NextResponse.json(
      {
        error: publicDocumentError(error, "material"),
      },
      { status: 500 },
    );
  }
}
