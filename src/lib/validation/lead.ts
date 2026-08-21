import { z } from "zod";
import { parseBrazilianMobile } from "@/lib/ddds-brasileiros";

const nonNegativeNumber = z.number().finite().nonnegative().max(1_000_000_000);
const attribution = z.string().trim().max(1000).nullable().optional();

export const leadSchema = z
  .object({
    timestamp: z.iso.datetime().optional(),
    nome: z.string().trim().min(2).max(160),
    telefone: z.string().min(1),
    email: z.email().max(254).nullable().optional(),
    utm_source: attribution,
    utm_medium: attribution,
    utm_campaign: attribution,
    utm_content: attribution,
    utm_term: attribution,
    gclid: attribution,
    fbclid: attribution,
    referrer: z.string().trim().max(2000).nullable().optional(),
    resp: z.enum(["Pessoa Física", "Pessoa Jurídica"]),
    dest: z.enum([
      "Residencial Unifamiliar",
      "Residencial Multifamiliar",
      "Casa Popular",
      "Comercial Salas/Lojas",
      "Conj. Hab. Popular",
      "Galpão Ind.",
      "Edifício de Garagens",
    ]),
    tipo: z.enum(["Alvenaria", "Mista", "Madeira"]),
    categoria: z.enum(["Obra Nova", "Acréscimo", "Reforma", "Demolição"]),
    concreto: z.enum(["Sim", "Não"]),
    prefab: z.enum(["Sim", "Não"]),
    uf: z.enum([
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
    ]),
    a_construcao: nonNegativeNumber,
    a_reforma: nonNegativeNumber,
    a_demolicao: nonNegativeNumber,
    a_pcoberta: nonNegativeNumber,
    a_pdescoberta: nonNegativeNumber,
    area_total: nonNegativeNumber,
    area_total_calculo: nonNegativeNumber,
    area_principal_bruta: nonNegativeNumber,
    area_principal_equiv: nonNegativeNumber,
    pct_equivalencia: nonNegativeNumber.max(100),
    vau: nonNegativeNumber,
    co: nonNegativeNumber,
    rmt: nonNegativeNumber,
    cmo_pct: nonNegativeNumber.max(100),
    pct_categoria: nonNegativeNumber.max(100),
    fator_social_pct: nonNegativeNumber.max(100).nullable(),
    aliquota_pct: nonNegativeNumber.max(100),
    reducao_pre_fab_pct: nonNegativeNumber.max(100),
    ded_concreto_usinado: nonNegativeNumber,
    pct_uso_usinado: nonNegativeNumber.max(100),
    pct_abat_usinado_cat: nonNegativeNumber.max(100),
    inss_direto: nonNegativeNumber,
    inss_reduzido: nonNegativeNumber,
    economia: nonNegativeNumber,
    website: z.literal("").optional(),
  })
  .strict()
  .superRefine((lead, context) => {
    const phone = parseBrazilianMobile(lead.telefone);
    if (!phone.ok)
      context.addIssue({
        code: "custom",
        message: phone.error,
        path: ["telefone"],
      });
  })
  .refine(
    (lead) =>
      lead.a_construcao +
        lead.a_reforma +
        lead.a_demolicao +
        lead.a_pcoberta +
        lead.a_pdescoberta >
      0,
    { message: "A área total deve ser maior que zero.", path: ["area_total"] },
  );

export type LeadPayload = z.infer<typeof leadSchema>;
