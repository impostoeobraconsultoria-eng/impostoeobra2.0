"use client";

import { useEffect } from "react";

import { sendGaEvent } from "@/lib/analytics";

export function AnalyticsEventOnLoad({
  name,
  params,
}: {
  name: string;
  params: Record<string, string | number>;
}) {
  useEffect(() => {
    sendGaEvent(name, params);
    const url = new URL(window.location.href);
    for (const key of ["ga_event", "lead_id", "cliente_id", "event_value"])
      url.searchParams.delete(key);
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [name, params]);
  return null;
}
