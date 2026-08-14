import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { leadSchema } from "@/lib/validation/lead";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Payload muito grande." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido." },
      { status: 400 },
    );
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Dados inválidos.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const lead = { ...parsed.data };
  delete lead.timestamp;
  delete lead.website;
  const { data, error } = await createAdminClient()
    .from("leads")
    .insert({ ...lead, origem: "simulador" })
    .select("id")
    .single();

  if (error) {
    console.error("Falha ao persistir lead", { code: error.code });
    return NextResponse.json(
      { ok: false, error: "Não foi possível registrar a simulação." },
      { status: 500 },
    );
  }

  console.info("Lead registrado", { id: data.id, origem: "simulador" });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
