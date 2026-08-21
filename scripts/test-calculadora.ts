import assert from "node:assert/strict";
import { calcularInss, type EntradasCalculo } from "../src/lib/calculadora.ts";

const base: EntradasCalculo = {
  resp: "Pessoa Física",
  dest: "Residencial Unifamiliar",
  tipo: "Alvenaria",
  categoria: "Obra Nova",
  concreto: "Sim",
  prefab: "Não",
  uf: "DF",
  a_construcao: 0,
  a_reforma: 0,
  a_demolicao: 0,
  a_pcoberta: 0,
  a_pdescoberta: 0,
};
const cases = [
  ["A", { ...base, a_construcao: 200 }, [12378.56, 9283.92, 3094.64]],
  ["B", { ...base, a_construcao: 500 }, [69629.41, 61892.81, 7736.6]],
  [
    "C",
    {
      ...base,
      resp: "Pessoa Jurídica",
      dest: "Residencial Multifamiliar",
      uf: "SP",
      a_construcao: 2500,
    },
    [327163.27, 282178.32, 44984.95],
  ],
  [
    "D",
    {
      ...base,
      resp: "Pessoa Jurídica",
      dest: "Comercial Salas/Lojas",
      uf: "SP",
      prefab: "Sim",
      a_construcao: 800,
    },
    [119178.48, 17876.77, 101301.71],
  ],
  [
    "E",
    { ...base, concreto: "Não", a_construcao: 200 },
    [12378.56, 12378.56, 0],
  ],
  [
    "F",
    {
      ...base,
      resp: "Pessoa Jurídica",
      dest: "Residencial Multifamiliar",
      tipo: "Mista",
      categoria: "Reforma",
      uf: "SP",
      a_reforma: 150,
    },
    [5392.49, 4403.86, 988.62],
  ],
] as const;

for (const [name, input, expected] of cases) {
  const r = calcularInss(input as EntradasCalculo);
  const actual = [r.inss_direto, r.inss_reduzido, r.economia].map(
    (v) => Math.round(v * 100) / 100,
  );
  expected.forEach((value, index) =>
    assert.ok(
      Math.abs(actual[index] - value) <= 0.01,
      `${name}: ${actual[index]} != ${value}`,
    ),
  );
  console.log(
    `${name}:`,
    actual
      .map((v) =>
        v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      )
      .join(" | "),
  );
}
