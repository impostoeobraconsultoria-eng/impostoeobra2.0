import { load } from "cheerio";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { UFS } from "@/lib/vau-constants";

const SOURCE = "https://www.tabelavau.seroassessoria.com.br/tabela_vau.php";
const placeholders = {
  "Casa Popular": "casa_popular",
  "Comercial Salas/Lojas": "comercial",
  "Conj. Hab. Popular": "conj_pop",
  "Galpão Ind.": "galpao",
  "Res. Multifamiliar": "res_multi",
  "Res. Unifamiliar": "res_uni",
  "Edifício de Garagens": "garagens",
} as const;

function numberBr(value: string) {
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function POST() {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string")
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  const { data: admin } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .eq("ativo", true)
    .eq("perfil", "admin")
    .maybeSingle();
  if (!admin)
    return NextResponse.json(
      { error: "Acesso restrito a administradores." },
      { status: 403 },
    );

  try {
    const response = await fetch(SOURCE, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent":
          "Imposto & Obra Platform Sync (contato@impostoeobra.com.br)",
      },
    });
    if (!response.ok)
      throw new Error(`Fonte respondeu HTTP ${response.status}`);
    const html = await response.text();
    const $ = load(html);
    const vigencia = $("select[name='filtro_periodo_vau'] option:selected")
      .text()
      .replace(/\s*\(Ativado\)\s*/i, "")
      .trim();
    const warnings: string[] = [];
    const rows = $("table tr")
      .slice(1)
      .map((_, row) => {
        const inputs = $(row).find("input");
        const uf = String(inputs.first().attr("value") ?? "").toUpperCase();
        if (!UFS.includes(uf as (typeof UFS)[number])) return null;
        const values: Record<string, number> = {};
        inputs.slice(1).each((__, input) => {
          const key =
            placeholders[
              $(input).attr("placeholder") as keyof typeof placeholders
            ];
          if (!key) return;
          const parsed = numberBr($(input).attr("value") ?? "");
          if (parsed == null) warnings.push(`${uf}: valor inválido em ${key}`);
          else values[key] = parsed;
        });
        if (Object.keys(values).length !== 7)
          warnings.push(`${uf}: linha incompleta`);
        return { uf, ...values };
      })
      .get()
      .filter(Boolean);

    const found = new Set(rows.map((row) => row!.uf));
    for (const uf of UFS)
      if (!found.has(uf)) warnings.push(`${uf}: não encontrada`);
    if (!vigencia || rows.length === 0)
      throw new Error("A estrutura da fonte não foi reconhecida.");

    await supabase.from("atividades").insert({
      ref_tipo: "sistema",
      ref_id: crypto.randomUUID(),
      tipo: "sincronizacao_vau",
      descricao: `VAU carregada do SERO para revisão (${vigencia})`,
      autor_id: admin.id,
      metadata_json: {
        fonte: SOURCE,
        status: response.status,
        linhas: rows.length,
        avisos: warnings,
        resposta_parcial: html.slice(0, 2000),
      },
    });
    return NextResponse.json({ vigencia, rows, warnings });
  } catch (error) {
    console.error("Falha ao carregar VAU do SERO", error);
    return NextResponse.json(
      {
        error:
          "Não foi possível carregar do SERO. Edição manual continua disponível.",
      },
      { status: 502 },
    );
  }
}
