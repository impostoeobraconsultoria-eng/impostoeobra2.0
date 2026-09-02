export const LEAD_LIST_FILTERS = [
  "sem_consultor",
  "followup_hoje",
  "followup_atrasado",
  "decidir_hoje",
  "meus",
] as const;

export type LeadListFilter = (typeof LEAD_LIST_FILTERS)[number];

export function normalizeLeadListFilters({
  filter,
  responsible,
  isAdmin,
  currentUserId,
}: {
  filter?: string;
  responsible?: string;
  isAdmin: boolean;
  currentUserId?: string | null;
}) {
  const validFilter = LEAD_LIST_FILTERS.includes(filter as LeadListFilter)
    ? (filter as LeadListFilter)
    : undefined;
  if (!isAdmin)
    return {
      filter: "meus" as const,
      responsible: currentUserId || undefined,
    };
  return {
    filter: validFilter,
    responsible: isUuid(responsible) ? responsible : undefined,
  };
}

export function leadListFilterLabel(
  filter: LeadListFilter | undefined,
  responsible: string | undefined,
  users: { id: string; nome: string | null }[],
) {
  const labels: Record<LeadListFilter, string> = {
    sem_consultor: "Filtro: leads sem consultor",
    followup_hoje: "Filtro: follow-up hoje",
    followup_atrasado: "Filtro: follow-up atrasado",
    decidir_hoje: "Filtro: decidir hoje",
    meus: "Filtro: meus leads",
  };
  if (filter) return labels[filter];
  if (responsible)
    return `Responsável: ${users.find((user) => user.id === responsible)?.nome ?? "consultor"}`;
  return "";
}

export function singleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isUuid(value: string | undefined): value is string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value ?? "",
  );
}
