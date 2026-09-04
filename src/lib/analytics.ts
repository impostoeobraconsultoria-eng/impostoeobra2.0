export const ATTRIBUTION_STORAGE_KEY = "imposto_obra_utms";

export const attributionKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "referrer",
] as const;

export type Attribution = Partial<
  Record<(typeof attributionKeys)[number], string>
>;

export function readAttribution(): Attribution {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      attributionKeys.flatMap((key) => {
        const value = (parsed as Record<string, unknown>)[key];
        return typeof value === "string" && value ? [[key, value]] : [];
      }),
    ) as Attribution;
  } catch {
    return {};
  }
}

export function sendGaEvent(
  name: string,
  params: Record<string, unknown> = {},
) {
  const gtag = (
    window as typeof window & { gtag?: (...args: unknown[]) => void }
  ).gtag;
  gtag?.("event", name, params);
}

export { trackGA4Event } from "@/lib/analytics/ga4";
