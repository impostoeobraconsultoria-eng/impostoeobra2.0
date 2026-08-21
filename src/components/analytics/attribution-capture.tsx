"use client";

import { useEffect } from "react";

import { ATTRIBUTION_STORAGE_KEY, attributionKeys } from "@/lib/analytics";

export function AttributionCapture() {
  useEffect(() => {
    if (sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY)) return;
    const search = new URLSearchParams(window.location.search);
    const attribution = Object.fromEntries(
      attributionKeys.flatMap((key) => {
        if (key === "referrer") return [];
        const value = search.get(key)?.trim();
        return value ? [[key, value.slice(0, 1000)]] : [];
      }),
    ) as Record<string, string>;
    if (document.referrer)
      attribution.referrer = document.referrer.slice(0, 2000);
    sessionStorage.setItem(
      ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(attribution),
    );
  }, []);

  return null;
}
