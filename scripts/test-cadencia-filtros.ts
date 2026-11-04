import assert from "node:assert/strict";
import {
  leadListFilterLabel,
  normalizeLeadListFilters,
} from "../src/lib/lead-list-filters.ts";

const userId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
for (const isAdmin of [false, true]) {
  const base = { isAdmin, currentUserId: userId };
  assert.deepEqual(
    normalizeLeadListFilters(base),
    { filter: undefined, responsible: undefined },
    "Lista sem filtro deve mostrar todos os leads ativos, inclusive ao limpar Meus leads.",
  );
  assert.deepEqual(
    normalizeLeadListFilters({ ...base, filter: "meus", responsible: otherId }),
    { filter: "meus", responsible: userId },
    "Meus leads deve usar o usuário conectado, inclusive para administradores.",
  );
  for (const filter of [
    "sem_consultor",
    "followup_hoje",
    "followup_atrasado",
    "decidir_hoje",
  ]) {
    assert.deepEqual(
      normalizeLeadListFilters({ ...base, filter }),
      { filter, responsible: undefined },
      "Filtros operacionais devem ser preservados para consultores e administradores.",
    );
  }
  assert.equal(
    normalizeLeadListFilters({ ...base, responsible: otherId }).responsible,
    otherId,
  );
  assert.equal(
    normalizeLeadListFilters({ ...base, responsible: "valor-invalido" })
      .responsible,
    undefined,
  );
  assert.deepEqual(normalizeLeadListFilters({ ...base, filter: "invalido" }), {
    filter: undefined,
    responsible: undefined,
  });
}
assert.equal(leadListFilterLabel(undefined, undefined, []), "");
assert.equal(
  leadListFilterLabel("decidir_hoje", undefined, []),
  "Filtro: decidir hoje",
);
console.log(
  "✓ Filtros de leads: consultores e administradores podem limpar Meus leads e acessar filtros operacionais.",
);
