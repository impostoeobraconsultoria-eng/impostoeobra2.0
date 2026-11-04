// Expediente operacional acordado: segunda a sexta, 09h–19h, Brasília.
export function businessTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return {
    weekday: !["Sat", "Sun"].includes(values.weekday),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

export function isBusinessHours(now = new Date()) {
  const time = businessTime(now);
  return time.weekday && time.hour >= 9 && time.hour < 19;
}

export function isCoverageSummaryTime(now = new Date()) {
  return isBusinessHours(now) && businessTime(now).hour === 18;
}

export function notificationAllowed(type: string, now = new Date()) {
  return type === "lead_novo" || isBusinessHours(now);
}

// Evita armazenar cobranças no serviço de push para entrega após o expediente.
export function notificationTtl(type: string, now = new Date()) {
  if (type === "lead_novo") return 86_400;
  if (!isBusinessHours(now)) return 0;
  const time = businessTime(now);
  return (19 - time.hour) * 3600 - time.minute * 60 - time.second;
}
