export const RESPONSAVEIS = ["Pessoa Física", "Pessoa Jurídica"] as const;
export const DESTINACOES = [
  "Residencial Unifamiliar",
  "Residencial Multifamiliar",
  "Casa Popular",
  "Comercial Salas/Lojas",
  "Conj. Hab. Popular",
  "Galpão Ind.",
  "Edifício de Garagens",
] as const;
export const TIPOS_OBRA = ["Alvenaria", "Mista", "Madeira"] as const;
export const CATEGORIAS = [
  "Obra Nova",
  "Acréscimo",
  "Reforma",
  "Demolição",
] as const;
export const UFS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
] as const;

export type Responsavel = (typeof RESPONSAVEIS)[number];
export type Destinacao = (typeof DESTINACOES)[number];
export type TipoObra = (typeof TIPOS_OBRA)[number];
export type Categoria = (typeof CATEGORIAS)[number];
export type Uf = (typeof UFS)[number];

export interface EntradasCalculo {
  resp: Responsavel;
  dest: Destinacao;
  tipo: TipoObra;
  categoria: Categoria;
  concreto: "Sim" | "Não";
  prefab: "Sim" | "Não";
  uf: Uf;
  a_construcao: number;
  a_reforma: number;
  a_demolicao: number;
  a_pcoberta: number;
  a_pdescoberta: number;
}

export interface ResultadoCalculo {
  area_total: number;
  area_total_calculo: number;
  area_principal_bruta: number;
  area_principal_equiv: number;
  pct_equivalencia: number;
  vau: number;
  co: number;
  rmt: number;
  cmo_pct: number;
  pct_categoria: number;
  fator_social_pct: number | null;
  aliquota_pct: number;
  reducao_pre_fab_pct: number;
  ded_concreto_usinado: number;
  pct_uso_usinado: number;
  pct_abat_usinado_cat: number;
  inss_direto: number;
  inss_reduzido: number;
  economia: number;
}

export const VAU_PERIODO = "Maio/2026";
export const VAU_HARDCODED: Record<Uf, number[]> = {
  AC: [2086.46, 3865.27, 2086.46, 1786.91, 3490.36, 4129.57, 3865.27],
  AL: [1326.26, 2400.63, 1326.26, 1121.31, 2146.17, 2490.35, 2400.63],
  AM: [2086.46, 3865.27, 2086.46, 1786.91, 3490.36, 4129.57, 3865.27],
  AP: [1851.74, 3296.17, 1851.74, 1566.69, 2903.45, 3287.4, 3296.17],
  BA: [1448.29, 2572.22, 1448.29, 1167.02, 2245.86, 2679.67, 2572.22],
  CE: [1650.76, 2769.59, 1650.76, 1312.04, 2433.2, 2801.99, 2769.59],
  DF: [1546.41, 2803.27, 1546.41, 1253.78, 2449.56, 2826.93, 2803.27],
  ES: [1865.69, 3140.88, 1865.69, 1423.27, 2818.57, 3312.94, 3140.88],
  GO: [1477.94, 2633.19, 1477.94, 1230.56, 2312.98, 2770.41, 2633.19],
  MA: [1277.75, 2233.21, 1277.75, 1065.62, 2186.92, 2286.3, 2233.21],
  MG: [1680.14, 2912.2, 1680.14, 1281.12, 2593.71, 2989.71, 2912.2],
  MS: [1258.32, 2283.21, 1258.32, 1029.23, 1836.95, 2193.11, 2283.21],
  MT: [2163.37, 3852.54, 2163.37, 1694.16, 3390.3, 3901.07, 3852.54],
  PA: [1611.44, 2793.12, 1611.44, 1320.85, 2480.8, 2839.89, 2793.12],
  PB: [1105.26, 2034.41, 1105.26, 935.03, 1809.84, 2042.34, 2034.41],
  PE: [1511.88, 2586.33, 1511.88, 1183.59, 2278.99, 2725.06, 2586.33],
  PI: [1277.75, 2233.21, 1277.75, 1065.62, 1971.74, 2286.3, 2233.21],
  PR: [1778.84, 3166.84, 1778.84, 1419.42, 2769.46, 3251.41, 3166.84],
  RJ: [1685.83, 2955.88, 1685.83, 1342.15, 2598.8, 3018.81, 2955.88],
  RN: [1490.31, 2465.68, 1490.31, 1185.36, 2215.72, 2580.83, 2465.68],
  RO: [1692.9, 2964.04, 1692.9, 1321.58, 2620.71, 2880.01, 2964.04],
  RR: [1862.65, 3500.38, 1862.65, 1677.86, 3072.41, 3584.71, 3500.38],
  RS: [1805.49, 3543.36, 1805.49, 1374.9, 2987.99, 3375.12, 3543.36],
  SC: [1942, 3320.29, 1942, 1535.94, 2889.5, 3405.28, 3320.29],
  SE: [1359.52, 2516.85, 1359.52, 1157.2, 2247.24, 2480.88, 2516.85],
  SP: [1476.87, 2614.71, 1476.87, 1231.83, 2296.89, 2633.5, 2614.71],
  TO: [1477.94, 2633.19, 1477.94, 1230.56, 2312.98, 2770.41, 2633.19],
};

const CAT_IDX: Record<Destinacao, number> = {
  "Casa Popular": 0,
  "Comercial Salas/Lojas": 1,
  "Conj. Hab. Popular": 2,
  "Galpão Ind.": 3,
  "Residencial Multifamiliar": 4,
  "Residencial Unifamiliar": 5,
  "Edifício de Garagens": 6,
};
const CMO = {
  padrao: { Alvenaria: 20, Mista: 15, Madeira: 15 },
  popular: { Alvenaria: 12, Mista: 7, Madeira: 7 },
} as const;
const PCT_CATEGORIA: Record<Categoria, number> = {
  "Obra Nova": 100,
  Acréscimo: 100,
  Reforma: 35,
  Demolição: 10,
};
const PCT_ABAT: Record<Categoria, number> = {
  "Obra Nova": 100,
  Acréscimo: 100,
  Reforma: 35,
  Demolição: 0,
};
const PCT_USO: Record<Destinacao, number> = {
  "Residencial Unifamiliar": 40,
  "Residencial Multifamiliar": 55,
  "Casa Popular": 30,
  "Comercial Salas/Lojas": 60,
  "Conj. Hab. Popular": 35,
  "Galpão Ind.": 70,
  "Edifício de Garagens": 55,
};

export function percEquivalencia(dest: Destinacao, area: number) {
  if (dest === "Residencial Unifamiliar") return area <= 1000 ? 89 : 85;
  if (dest === "Residencial Multifamiliar") return area <= 1000 ? 90 : 86;
  if (dest === "Comercial Salas/Lojas" || dest === "Edifício de Garagens")
    return area <= 3000 ? 86 : 83;
  if (dest === "Galpão Ind.") return 95;
  return 98;
}

export function fatorSocial(area: number) {
  if (area <= 100) return 20;
  if (area <= 200) return 40;
  if (area <= 300) return 55;
  if (area <= 400) return 70;
  return 90;
}

export function calcularInss(
  entrada: EntradasCalculo,
  tabela = VAU_HARDCODED,
): ResultadoCalculo {
  const principal =
    entrada.a_construcao + entrada.a_reforma + entrada.a_demolicao;
  const pctEq = percEquivalencia(entrada.dest, principal);
  const principalEq = (principal * pctEq) / 100;
  const areaCalculo =
    principalEq + entrada.a_pcoberta * 0.5 + entrada.a_pdescoberta * 0.25;
  const areaTotal = principal + entrada.a_pcoberta + entrada.a_pdescoberta;
  const vau = (tabela[entrada.uf] ?? VAU_HARDCODED.SP)[CAT_IDX[entrada.dest]];
  const co = vau * areaCalculo;
  const popular =
    entrada.dest === "Casa Popular" || entrada.dest === "Conj. Hab. Popular";
  const cmoPct = (popular ? CMO.popular : CMO.padrao)[entrada.tipo];
  const pctCat = PCT_CATEGORIA[entrada.categoria];
  const isPF = entrada.resp === "Pessoa Física";
  const fsPct = isPF ? fatorSocial(areaTotal) : null;
  let rmt = (((co * cmoPct) / 100) * pctCat) / 100;
  if (entrada.dest === "Edifício de Garagens") rmt *= 0.8;
  if (fsPct !== null) rmt *= fsPct / 100;
  const reducaoPrefab =
    entrada.prefab === "Sim" && entrada.tipo === "Alvenaria" ? 70 : 0;
  const pctUso = PCT_USO[entrada.dest];
  const pctAbat = PCT_ABAT[entrada.categoria];
  const dedConcreto =
    entrada.concreto === "Sim"
      ? (((co * 0.05 * pctUso) / 100) * pctAbat) / 100
      : 0;
  const aliquota = isPF ? 30.75 : 33.125;
  const inssDireto = (Math.max(0, rmt) * aliquota) / 100;
  const inssReduzido =
    (Math.max(0, rmt * (1 - reducaoPrefab / 100) - dedConcreto) * aliquota) /
    100;
  return {
    area_total: areaTotal,
    area_total_calculo: areaCalculo,
    area_principal_bruta: principal,
    area_principal_equiv: principalEq,
    pct_equivalencia: pctEq,
    vau,
    co,
    rmt,
    cmo_pct: cmoPct,
    pct_categoria: pctCat,
    fator_social_pct: fsPct,
    aliquota_pct: aliquota,
    reducao_pre_fab_pct: reducaoPrefab,
    ded_concreto_usinado: dedConcreto,
    pct_uso_usinado: pctUso,
    pct_abat_usinado_cat: pctAbat,
    inss_direto: inssDireto,
    inss_reduzido: inssReduzido,
    economia: Math.max(0, inssDireto - inssReduzido),
  };
}

export const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
