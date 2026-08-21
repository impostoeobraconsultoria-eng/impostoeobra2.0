import { NextResponse } from "next/server";
import { getCachedVau } from "@/lib/vau";

export const revalidate = 1800;

export async function GET() {
  let data;
  try {
    data = await getCachedVau();
  } catch (error) {
    console.error("Falha ao consultar VAU", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, error: "Tabela VAU indisponível." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const table = Object.fromEntries(
    data.map((row) => [
      row.uf,
      [
        row.casa_popular,
        row.comercial,
        row.conj_pop,
        row.galpao,
        row.res_multi,
        row.res_uni,
        row.garagens,
      ].map(Number),
    ]),
  );
  const vigencia = data.find((row) => row.vigencia)?.vigencia ?? null;

  return NextResponse.json(
    { ok: true, data: table, vigencia },
    { headers: { "Cache-Control": "public, max-age=1800, s-maxage=1800" } },
  );
}
