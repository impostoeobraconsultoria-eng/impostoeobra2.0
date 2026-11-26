export const MATERIAL_SUPPORT_EXTERNAL_SIMULATOR =
  "https://simuladordediso.com.br/land2";

export const PARCELAMENTO_PF = {
  multaMoraPct: 20,
  maxParcelas: 60,
  parcelaMinima: 200,
} as const;

export type MultaStatus =
  | "nao_apuradas"
  | "nao_identificadas"
  | "identificadas";

export type ObraStatus = "concluida" | "em_andamento";

function nonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function isMultaStatus(value: unknown): value is MultaStatus {
  return ["nao_apuradas", "nao_identificadas", "identificadas"].includes(
    String(value),
  );
}

export function isObraStatus(value: unknown): value is ObraStatus {
  return ["concluida", "em_andamento"].includes(String(value));
}

export function calculateMaterialSupport({
  impostoDireto,
  impostoReduzido,
  multaStatus,
  multasInformadas,
}: {
  impostoDireto: number;
  impostoReduzido: number;
  multaStatus: MultaStatus;
  multasInformadas: number;
}) {
  const direto = nonNegative(impostoDireto);
  const principal = nonNegative(impostoReduzido);
  const multasIdentificadas =
    multaStatus === "identificadas" ? nonNegative(multasInformadas) : 0;
  const economia = Math.max(0, direto - principal);
  const economiaPct = direto > 0 ? Math.min(100, (economia / direto) * 100) : 0;
  const totalAVista = principal + multasIdentificadas;

  // A Receita informa que o débito de obra só pode ser parcelado depois do
  // vencimento e, nesse cenário, recebe multa de mora de 20%. A multa de mora
  // fica separada das demais multas para impedir dupla contagem.
  const multaMoraParcelamento =
    principal * (PARCELAMENTO_PF.multaMoraPct / 100);
  const totalParcelado = totalAVista + multaMoraParcelamento;
  const parcelas = Math.max(
    1,
    Math.min(
      PARCELAMENTO_PF.maxParcelas,
      Math.floor(totalParcelado / PARCELAMENTO_PF.parcelaMinima),
    ),
  );

  return {
    economia,
    economiaPct,
    multasIdentificadas,
    totalAVista,
    multaMoraParcelamento,
    totalParcelado,
    parcelas,
    valorParcela: totalParcelado / parcelas,
  };
}
