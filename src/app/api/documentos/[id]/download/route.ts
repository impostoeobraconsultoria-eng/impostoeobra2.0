import { NextResponse } from "next/server";
import { z } from "zod";

import { requireDocumentUser, SIGNED_URL_SECONDS } from "@/lib/documentos";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireDocumentUser();
    if (!z.string().uuid().safeParse(params.id).success)
      return NextResponse.json(
        { error: "Documento inválido." },
        { status: 400 },
      );
    const admin = createAdminClient();
    const { data: document } = await admin
      .from("documentos_gerados")
      .select("storage_bucket,storage_path,nome_arquivo")
      .eq("id", params.id)
      .maybeSingle();
    if (!document?.storage_path)
      return NextResponse.json(
        { error: "Este registro não possui arquivo armazenado." },
        { status: 404 },
      );
    const { data, error } = await admin.storage
      .from(document.storage_bucket || "documentos")
      .createSignedUrl(document.storage_path, SIGNED_URL_SECONDS, {
        download: document.nome_arquivo,
      });
    if (error || !data)
      return NextResponse.json(
        { error: "Não foi possível assinar o download." },
        { status: 500 },
      );
    return NextResponse.redirect(data.signedUrl);
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
