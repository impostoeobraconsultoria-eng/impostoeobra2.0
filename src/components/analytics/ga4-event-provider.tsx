"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PublicGA4Events } from "@/lib/analytics/ga4-events";

const GA4EventContext = createContext<PublicGA4Events | null>(null);

export function GA4EventProvider({
  events,
  children,
}: {
  events: PublicGA4Events;
  children: ReactNode;
}) {
  return (
    <GA4EventContext.Provider value={events}>
      {children}
    </GA4EventContext.Provider>
  );
}

export function usePublicGA4Events() {
  const events = useContext(GA4EventContext);
  if (!events) throw new Error("GA4EventProvider ausente no layout público");
  return events;
}
