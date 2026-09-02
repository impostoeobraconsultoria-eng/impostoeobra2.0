export type DiagnosticoVariante = "com_reducao" | "sem_reducao";

export type DiagnosticoLead = {
  id: string;
  nome: string;
  email?: string | null;
  cidade?: string | null;
  uf?: string | null;
  dest?: string | null;
  categoria?: string | null;
  concreto?: string | null;
  prefab?: string | null;
  area_total?: number | string | null;
  area_total_calculo?: number | string | null;
  vau?: number | string | null;
  co?: number | string | null;
  rmt?: number | string | null;
  aliquota_pct?: number | string | null;
  fator_social_pct?: number | string | null;
  inss_direto?: number | string | null;
  inss_reduzido?: number | string | null;
  economia?: number | string | null;
};

export type DiagnosticoConfig = {
  habilitado: boolean;
  limiteReducaoPct: number;
  signedUrlDias: number;
  enviarEmail: boolean;
  bucket: string;
  titulo: string;
  subtituloMarca: string;
  calloutComReducao: string;
  calloutSemReducao: string;
  disclaimer: string;
  assinaturaLinha1: string;
  assinaturaLinha2: string;
  emailInstitucional: string;
  whatsappDisplay: string;
  whatsappE164: string;
  resendFromEmail: string;
  resendFromName: string;
};

export type DiagnosticoDocumento = {
  lead: DiagnosticoLead;
  config: DiagnosticoConfig;
  variante: DiagnosticoVariante;
  numeroPublico: string;
  dataGeracao: Date;
};
