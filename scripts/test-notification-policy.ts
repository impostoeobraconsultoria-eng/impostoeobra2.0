import assert from "node:assert/strict";
import {
  isBusinessHours,
  isCoverageSummaryTime,
  notificationAllowed,
  notificationTtl,
} from "../src/lib/notification-policy.ts";

const at = (date: string, time: string) => new Date(`${date}T${time}:00-03:00`);
for (const [date, time, business, summary] of [
  ["2026-11-03", "08:59", false, false],
  ["2026-11-03", "09:00", true, false],
  ["2026-11-03", "17:59", true, false],
  ["2026-11-03", "18:00", true, true],
  ["2026-11-03", "18:59", true, true],
  ["2026-11-03", "19:00", false, false],
  ["2026-11-07", "18:00", false, false],
  ["2026-11-08", "10:00", false, false],
  ["2026-11-09", "09:00", true, false],
] as const) {
  const now = at(date, time);
  assert.equal(isBusinessHours(now), business, `${date} ${time}`);
  assert.equal(isCoverageSummaryTime(now), summary, `${date} ${time}`);
  assert.equal(notificationAllowed("sistema", now), business);
  assert.equal(notificationAllowed("lead_novo", now), true);
  assert.equal(notificationTtl("lead_novo", now), 86_400);
}
assert.equal(notificationTtl("sistema", at("2026-11-03", "18:59")), 60);
assert.equal(notificationTtl("sistema", at("2026-11-07", "10:00")), 0);
console.log(
  "✓ Horário comercial, resumo de fechamento, fim de semana, exceção de novo lead e expiração do push validados.",
);
