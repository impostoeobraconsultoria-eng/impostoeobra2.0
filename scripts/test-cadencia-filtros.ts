import assert from "node:assert/strict";

import {
  leadListFilterLabel,
  normalizeLeadListFilters,
} from "../src/lib/lead-list-filters.ts";

const userId = "11111111-1111-4111-8111-111111111111";

assert.deepEqual(
  normalizeLeadListFilters({
    filter: "sem_consultor",
    isAdmin: false,
    currentUserId: userId,
  }),
  { filter: "meus", responsible: userId },
  "Consultor deve permanecer restrito aos próprios leads.",
);

assert.deepEqual(
  normalizeLeadListFilters({
    filter: "followup_atrasado",
    isAdmin: true,
  }),
  { filter: "followup_atrasado", responsible: undefined },
  "Admin pode aplicar filtro operacional global.",
);

assert.equal(
  normalizeLeadListFilters({
    responsible: "valor-invalido",
    isAdmin: true,
  }).responsible,
  undefined,
  "Responsável inválido não deve chegar à query do Supabase.",
);

assert.equal(
  leadListFilterLabel("decidir_hoje", undefined, []),
  "Filtro: decidir hoje",
);

console.log("✓ Filtros de cadência e visibilidade por papel validados.");
