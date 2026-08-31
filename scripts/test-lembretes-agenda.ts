import assert from "node:assert/strict";

import { agendaReminderIsDue } from "../src/lib/agenda/lembrete-due.ts";

const now = new Date("2026-08-31T11:00:00.000Z"); // 08h em Brasília

const cases = [
  {
    name: "1 dia antes considera o dia de calendário, não 24 horas exatas",
    startsAt: "2026-09-01T18:00:00.000Z", // 15h em Brasília
    minutes: 1_440,
    expected: true,
  },
  {
    name: "3 dias antes dispara na data correta",
    startsAt: "2026-09-03T21:00:00.000Z",
    minutes: 4_320,
    expected: true,
  },
  {
    name: "1 semana antes inclui evento no fim do dia",
    startsAt: "2026-09-07T23:30:00.000Z",
    minutes: 10_080,
    expected: true,
  },
  {
    name: "não dispara um dia antes da data configurada",
    startsAt: "2026-09-04T18:00:00.000Z",
    minutes: 4_320,
    expected: false,
  },
  {
    name: "não dispara para evento passado",
    startsAt: "2026-08-31T10:00:00.000Z",
    minutes: 1_440,
    expected: false,
  },
  {
    name: "lembrete legado de 60 minutos mantém precisão em minutos",
    startsAt: "2026-08-31T11:45:00.000Z",
    minutes: 60,
    expected: true,
  },
  {
    name: "lembrete legado não dispara antes da janela exata",
    startsAt: "2026-08-31T12:30:00.000Z",
    minutes: 60,
    expected: false,
  },
] as const;

for (const testCase of cases) {
  assert.equal(
    agendaReminderIsDue({
      startsAt: testCase.startsAt,
      reminderMinutes: testCase.minutes,
      now,
    }),
    testCase.expected,
    testCase.name,
  );
  console.log(`✓ ${testCase.name}`);
}

console.log(`\n${cases.length} cenários de lembrete validados.`);
