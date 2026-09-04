"use client";

export type GA4Payload = Record<string, string | number | boolean>;

export function trackGA4Event(name: string, params?: GA4Payload) {
  if (typeof window === "undefined" || !name) return;
  const gtag = (
    window as typeof window & { gtag?: (...args: unknown[]) => void }
  ).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", name, params ?? {});
}
