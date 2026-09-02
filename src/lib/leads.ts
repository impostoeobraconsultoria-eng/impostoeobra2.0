export const LEAD_STATUSES = [
  "Novo Lead",
  "Contato iniciado",
  "Em negociação",
  "Proposta enviada",
  "Aguardando resposta",
  "Fechado — ganho",
  "Fechado — perdido",
  "Sem retorno",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type LeadRecord = {
  id: string;
  data_hora: string;
  nome: string;
  ddd: string | null;
  whatsapp: string | null;
  email: string | null;
  uf: string | null;
  cidade: string | null;
  produto: string | null;
  status: string;
  responsavel_id: string | null;
  valor_potencial: number | null;
  observacoes: string | null;
  contato_inicial_em: string | null;
  contato_inicial_por: string | null;
  tentativa_atual: number;
  proxima_tentativa_em: string | null;
  ultima_tentativa_em: string | null;
  cadencia_finalizada_em: string | null;
  ultimo_alerta_cobertura_h: number | null;
  [key: string]: unknown;
};

export function calcularComplementar(lead: Record<string, unknown>) {
  const value = (key: string) => Number(lead[key] ?? 0);
  const folha = value("cmpl_folha_mensal");
  const meses = value("cmpl_meses_folha");
  const nfConc = value("cmpl_nf_concreto_usinado");
  const nfPfab = value("cmpl_nf_prefabricado");
  const co = value("co");
  const rmt = value("rmt");
  const aliquota = value("aliquota_pct");
  const aproveitamento = folha * meses;
  const reducaoPreFabricado = co > 0 && nfPfab >= co * 0.4 ? 70 : 0;
  const rmtAjustado = rmt * (1 - reducaoPreFabricado / 100);
  const deducaoConcreto = nfConc * 0.05;
  const base = Math.max(0, rmtAjustado - deducaoConcreto - aproveitamento);
  const inssDireto = rmt * (aliquota / 100);
  const inssReduzido = base * (aliquota / 100);
  const economia = Math.max(0, inssDireto - inssReduzido);
  return {
    aproveitamento,
    deducaoConcreto,
    reducaoPreFabricado,
    base,
    inssDireto,
    inssReduzido,
    economia,
    economiaPct: inssDireto > 0 ? Math.round((economia / inssDireto) * 100) : 0,
    preenchido: folha > 0 || nfConc > 0 || nfPfab > 0,
  };
}
