const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SAO_PAULO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function localDateKey(value: Date) {
  const parts = Object.fromEntries(
    dateFormatter
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function subtractCalendarDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function agendaReminderIsDue({
  startsAt,
  reminderMinutes,
  now = new Date(),
}: {
  startsAt: string;
  reminderMinutes: number;
  now?: Date;
}) {
  const start = new Date(startsAt);
  if (!Number.isFinite(start.getTime()) || start.getTime() <= now.getTime())
    return false;

  if (reminderMinutes < 1_440)
    return start.getTime() - reminderMinutes * 60_000 <= now.getTime();

  const reminderDays = Math.max(1, Math.round(reminderMinutes / 1_440));
  const reminderDate = subtractCalendarDays(localDateKey(start), reminderDays);
  return localDateKey(now) >= reminderDate;
}

export function reminderLabel(reminderMinutes: number) {
  const days = Math.max(1, Math.round(reminderMinutes / 1_440));
  return days === 1 ? "1 dia antes" : `${days} dias antes`;
}
