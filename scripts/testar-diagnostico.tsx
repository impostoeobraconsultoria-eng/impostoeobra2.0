import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

import { DiagnosticoPreliminar } from "../src/lib/diagnostico/pdf/DiagnosticoPreliminar";
import type {
  DiagnosticoConfig,
  DiagnosticoLead,
  DiagnosticoVariante,
} from "../src/lib/diagnostico/types";

const outputDir = path.resolve("docs/samples");

const config: DiagnosticoConfig = {
  habilitado: true,
  limiteReducaoPct: 5,
  signedUrlDias: 7,
  enviarEmail: false,
  bucket: "diagnosticos-preliminares",
  titulo: "Diagnóstico Preliminar de Regularização",
  subtituloMarca: "Consultoria em Regularização Previdenciária",
  calloutComReducao:
    "A obra apresenta potencial significativo de redução do INSS mediante aplicação da metodologia prevista na IN RFB nº 2.021/2021 e no Manual do SERO da Receita Federal.",
  calloutSemReducao:
    "Esta obra não apresentou potencial de redução na análise preliminar, mas ainda precisa de regularização junto à Receita Federal. Leia com atenção os itens abaixo.",
  disclaimer:
    "Documento com fundamento na IN RFB nº 2.021/2021 e no Manual do SERO da Receita Federal. Diagnóstico preliminar não vinculante; a apuração definitiva depende de análise documental completa e aferição via SERO/DCTFWeb.",
  assinaturaLinha1: "Imposto & Obra Consultoria",
  assinaturaLinha2: "CNPJ 63.382.260/0001-99",
  emailInstitucional: "contato@impostoeobra.com.br",
  whatsappDisplay: "(61) 99398-2653",
  whatsappE164: "5561993982653",
  resendFromEmail: "contato@impostoeobra.com.br",
  resendFromName: "Imposto & Obra Consultoria",
};

const base: DiagnosticoLead = {
  id: "00000000-0000-4000-8000-000000000001",
  nome: "Carlos Henrique",
  cidade: "Brasília",
  uf: "DF",
  dest: "Residencial Unifamiliar",
  categoria: "Obra Nova",
  concreto: "Sim",
  prefab: "Não",
  area_total: 186,
  area_total_calculo: 186,
  vau: 1284.5,
  co: 238917,
  rmt: 95566.8,
  aliquota_pct: 32.89,
  fator_social_pct: 0,
  inss_direto: 31420,
  inss_reduzido: 18660,
  economia: 12760,
};

async function main() {
  await mkdir(outputDir, { recursive: true });
  for (const variante of [
    "com_reducao",
    "sem_reducao",
  ] satisfies DiagnosticoVariante[]) {
    const lead =
      variante === "com_reducao"
        ? base
        : {
            ...base,
            nome: "Marina Souza",
            cidade: "Goiânia",
            uf: "GO",
            categoria: "Reforma",
            concreto: "Não",
            area_total: 45,
            area_total_calculo: 45,
            inss_direto: 8412,
            inss_reduzido: 8412,
            economia: 0,
          };
    const startedAt = performance.now();
    const buffer = await renderToBuffer(
      React.createElement(DiagnosticoPreliminar, {
        lead,
        config,
        variante,
        numeroPublico:
          variante === "com_reducao" ? "2026-09-02/1042" : "2026-09-02/1057",
        dataGeracao: new Date("2026-09-02T11:00:00-03:00"),
      }) as unknown as Parameters<typeof renderToBuffer>[0],
    );
    const file = path.join(
      outputDir,
      `diagnostico-${variante.replaceAll("_", "-")}.pdf`,
    );
    await writeFile(file, buffer);
    console.log(
      JSON.stringify({
        variante,
        file,
        bytes: buffer.byteLength,
        durationMs: Math.round(performance.now() - startedAt),
      }),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
