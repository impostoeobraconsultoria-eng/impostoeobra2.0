import { NextResponse } from "next/server";

import { getActiveUser } from "@/lib/cadencia/auth";
import { gerarDiagnosticoPreliminar } from "@/lib/diagnostico/gerar";
import { criarUrlAssinadaDiagnostico } from "@/lib/diagnostico/signed-url";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { leadId: string } },
) {
  const auth = await getActiveUser();
  if (!auth)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: lead } = await auth.supabase
    .from("leads")
    .select("id,responsavel_id")
    .eq("id", params.leadId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!lead)
    return NextResponse.json(
      { error: "Lead não encontrado." },
      { status: 404 },
    );
  if (auth.user.perfil !== "admin" && lead.responsavel_id !== auth.user.id)
    return NextResponse.json(
      { error: "Apenas o responsável ou um administrador pode regerar." },
      { status: 403 },
    );

  const result = await gerarDiagnosticoPreliminar(params.leadId);
  if (!result.ok)
    return NextResponse.json(
      { error: "Não foi possível regerar o diagnóstico." },
      { status: result.error === "desabilitado" ? 409 : 500 },
    );
  const signed = await criarUrlAssinadaDiagnostico(params.leadId);
  return NextResponse.json({ ok: true, download_url: signed?.url ?? null });
}
