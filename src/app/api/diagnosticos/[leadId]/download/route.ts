import { NextResponse, type NextRequest } from "next/server";

import { consumeDiagnosticDownload } from "@/lib/diagnostico/rate-limit";
import { criarUrlAssinadaDiagnostico } from "@/lib/diagnostico/signed-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } },
) {
  if (!/^[0-9a-f-]{36}$/i.test(params.leadId))
    return NextResponse.json(
      { error: "Diagnóstico não encontrado." },
      { status: 404 },
    );

  try {
    const signed = await criarUrlAssinadaDiagnostico(params.leadId);
    if (!signed)
      return NextResponse.json(
        { status: "gerando", tentativa_em_ms: 3000 },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    if (request.nextUrl.searchParams.get("status") === "1")
      return NextResponse.json(
        { status: "pronto" },
        { headers: { "Cache-Control": "no-store" } },
      );

    const ip = clientIp(request);
    const limit = await consumeDiagnosticDownload(ip, params.leadId);
    if (!limit.allowed)
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente mais tarde." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
    return NextResponse.redirect(signed.url, 302);
  } catch (error) {
    console.error("[diagnostico] falha no download", {
      leadId: params.leadId,
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    return NextResponse.json(
      { status: "gerando", tentativa_em_ms: 3000 },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
