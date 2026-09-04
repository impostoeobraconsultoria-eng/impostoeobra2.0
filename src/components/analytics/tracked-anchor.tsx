"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { trackGA4Event, type GA4Payload } from "@/lib/analytics/ga4";
import { usePublicGA4Events } from "@/components/analytics/ga4-event-provider";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  eventName: string;
  origem: string;
  eventParams?: GA4Payload;
};

export function TrackedAnchor({
  eventName,
  origem,
  eventParams,
  onClick,
  ...props
}: Props) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    trackGA4Event(eventName, { origem, ...eventParams });
    onClick?.(event);
  }

  return <a {...props} onClick={handleClick} />;
}

export function TrackedPublicAnchor({
  kind,
  ...props
}: Omit<Props, "eventName"> & {
  kind: "whatsapp" | "telefone" | "email" | "diagnostico";
}) {
  const events = usePublicGA4Events();
  const eventName = {
    whatsapp: events.clickWhatsapp,
    telefone: events.clickTelefone,
    email: events.clickEmail,
    diagnostico: events.downloadDiagnostico,
  }[kind];
  return <TrackedAnchor {...props} eventName={eventName} />;
}
