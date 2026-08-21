export const DDDS_BRASILEIROS = new Set([
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "21",
  "22",
  "24",
  "27",
  "28",
  "31",
  "32",
  "33",
  "34",
  "35",
  "37",
  "38",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "49",
  "51",
  "53",
  "54",
  "55",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "68",
  "69",
  "71",
  "73",
  "74",
  "75",
  "77",
  "79",
  "81",
  "82",
  "83",
  "84",
  "85",
  "86",
  "87",
  "88",
  "89",
  "91",
  "92",
  "93",
  "94",
  "95",
  "96",
  "97",
  "98",
  "99",
]);

export type BrazilianMobile = {
  ddd: string;
  whatsapp: string;
  telefoneNormalizado: string;
  formatted: string;
};

export function parseBrazilianMobile(
  value: string,
): { ok: true; data: BrazilianMobile } | { ok: false; error: string } {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  if (digits.length >= 10 && !DDDS_BRASILEIROS.has(digits.slice(0, 2)))
    return { ok: false, error: "DDD inválido." };
  if (digits.length < 11)
    return {
      ok: false,
      error:
        digits.length <= 9
          ? "Informe o DDD."
          : "Informe um celular com 11 dígitos.",
    };
  if (digits.length > 11)
    return { ok: false, error: "Informe um celular brasileiro válido." };
  const ddd = digits.slice(0, 2);
  if (!DDDS_BRASILEIROS.has(ddd)) return { ok: false, error: "DDD inválido." };
  const whatsapp = digits.slice(2);
  if (!whatsapp.startsWith("9"))
    return { ok: false, error: "Número de celular deve começar com 9." };
  return {
    ok: true,
    data: {
      ddd,
      whatsapp,
      telefoneNormalizado: `55${digits}`,
      formatted: `(${ddd}) ${whatsapp.slice(0, 5)}-${whatsapp.slice(5)}`,
    },
  };
}

export function formatBrazilianMobile(ddd?: unknown, number?: unknown) {
  const parsed = parseBrazilianMobile(`${ddd ?? ""}${number ?? ""}`);
  return parsed.ok ? parsed.data.formatted : "";
}
