import assert from "node:assert/strict";
import { parseBrazilianMobile } from "../src/lib/ddds-brasileiros.ts";

for (const input of ["61999998877", "(61) 99999-8877", "+55 61 99999-8877"]) {
  const result = parseBrazilianMobile(input);
  assert.equal(result.ok, true, input);
  if (result.ok) {
    assert.equal(result.data.telefoneNormalizado, "5561999998877");
    assert.equal(result.data.formatted, "(61) 99999-8877");
  }
}
const cases = [
  ["999999999", "Informe o DDD."],
  ["019999999999", "DDD inválido."],
  ["61899998877", "Número de celular deve começar com 9."],
] as const;
for (const [input, message] of cases) {
  const result = parseBrazilianMobile(input);
  assert.equal(result.ok, false, input);
  if (!result.ok) assert.equal(result.error, message);
}
console.log("Telefone BR: 6 cenários aprovados.");
