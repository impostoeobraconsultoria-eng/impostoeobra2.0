export type TipoEvento = "reuniao" | "follow_up" | "prazo" | "tarefa";
export type RecorrenciaTipo = "unico" | "diaria" | "semanal" | "mensal";

export interface EventoAgenda {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: TipoEvento;
  dia_inteiro: boolean;
  inicio: string;
  fim: string;
  lead_id: string | null;
  cliente_id: string | null;
  serie_id: string | null;
  serie_indice: number | null;
  serie_total: number | null;
  lembrete_minutos_antes: number | null;
  lembrete_enviado: boolean;
  criado_por: string;
  criado_em: string;
  updated_at: string;
  participantes?: Array<{ user_id: string; nome: string }>;
  lead?: { id: string; nome: string } | null;
  cliente?: { id: string; nome: string } | null;
}

export interface EventoInput {
  titulo: string;
  descricao?: string;
  tipo: TipoEvento;
  dia_inteiro: boolean;
  inicio: string;
  fim: string;
  lead_id?: string | null;
  cliente_id?: string | null;
  lembrete_minutos_antes?: number | null;
  participantes_user_ids: string[];
  recorrencia?: {
    tipo: RecorrenciaTipo;
    ate: string;
  };
}

export type EventoExpandido = Omit<EventoInput, "recorrencia"> & {
  serie_id?: string;
  serie_indice?: number;
  serie_total?: number;
};
