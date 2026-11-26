import assert from "node:assert/strict";

import {
  calculateMaterialSupport,
  isMultaStatus,
  PARCELAMENTO_PF,
} from "../src/lib/material-support.ts";

const base = calculateMaterialSupport({
  impostoDireto: 34_340.77,
  impostoReduzido: 25_437.6,
  multaStatus: "nao_apuradas",
  multasInformadas: 9_999,
});

assert.equal(base.economia.toFixed(2), "8903.17");
assert.equal(base.economiaPct.toFixed(2), "25.93");
assert.equal(base.multasIdentificadas, 0);
assert.equal(base.multaMoraParcelamento.toFixed(2), "5087.52");
assert.equal(base.totalParcelado.toFixed(2), "30525.12");
assert.equal(base.parcelas, 60);
assert.equal(base.valorParcela.toFixed(2), "508.75");

const identificadas = calculateMaterialSupport({
  impostoDireto: 1_000,
  impostoReduzido: 800,
  multaStatus: "identificadas",
  multasInformadas: 50,
});
assert.equal(identificadas.totalAVista, 850);
assert.equal(identificadas.multaMoraParcelamento, 160);
assert.equal(identificadas.totalParcelado, 1_010);
assert.equal(identificadas.parcelas, 5);
assert.equal(identificadas.valorParcela, 202);

const baixo = calculateMaterialSupport({
  impostoDireto: 100,
  impostoReduzido: 100,
  multaStatus: "nao_identificadas",
  multasInformadas: 0,
});
assert.equal(baixo.parcelas, 1);
assert.equal(baixo.valorParcela, 120);
assert.equal(PARCELAMENTO_PF.parcelaMinima, 200);

assert.equal(isMultaStatus("identificadas"), true);
assert.equal(isMultaStatus("invalido"), false);

console.log("Material de apoio: cálculos validados.");
