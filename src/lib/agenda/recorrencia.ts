import { randomUUID } from "node:crypto";

import type { EventoExpandido, EventoInput } from "@/lib/agenda/types";

const DAY_MS = 86_400_000;

function monthlyDate(base: Date, index: number) {
  const targetMonth = base.getUTCMonth() + index;
  const year = base.getUTCFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(base.getUTCDate(), lastDay),
      base.getUTCHours(),
      base.getUTCMinutes(),
      base.getUTCSeconds(),
      base.getUTCMilliseconds(),
    ),
  );
}

function occurrenceStart(base: Date, type: string, index: number) {
  if (type === "mensal") return monthlyDate(base, index);
  const multiplier = type === "semanal" ? 7 : 1;
  return new Date(base.getTime() + index * multiplier * DAY_MS);
}

export function expandirRecorrencia(
  input: EventoInput,
  maxInstances = 52,
): EventoExpandido[] {
  const type = input.recorrencia?.tipo ?? "unico";
  if (type === "unico") {
    const single = { ...input };
    delete single.recorrencia;
    return [single];
  }

  const start = new Date(input.inicio);
  const end = new Date(input.fim);
  const until = new Date(`${input.recorrencia!.ate.slice(0, 10)}T00:00:00.000Z`);
  const duration = end.getTime() - start.getTime();
  const occurrences: EventoExpandido[] = [];

  for (let index = 0; index < maxInstances; index += 1) {
    const currentStart = occurrenceStart(start, type, index);
    if (currentStart >= until) break;
    occurrences.push({
      ...input,
      recorrencia: undefined,
      inicio: currentStart.toISOString(),
      fim: new Date(currentStart.getTime() + duration).toISOString(),
    } as EventoExpandido);
  }

  if (
    occurrences.length === maxInstances &&
    occurrenceStart(start, type, maxInstances) < until
  ) {
    console.warn("Recorrência da agenda limitada", {
      tipo: type,
      limite: maxInstances,
    });
  }

  const seriesId = randomUUID();
  return occurrences.map((occurrence, index) => ({
    ...occurrence,
    serie_id: seriesId,
    serie_indice: index + 1,
    serie_total: occurrences.length,
  }));
}
