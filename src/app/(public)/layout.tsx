import type { ReactNode } from "react";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { AttributionCapture } from "@/components/analytics/attribution-capture";
import { GA4EventProvider } from "@/components/analytics/ga4-event-provider";
import { getPublicGA4Events } from "@/lib/analytics/ga4-events";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const events = await getPublicGA4Events();
  return (
    <GA4EventProvider events={events}>
      <div className="public-v2 flex min-h-screen flex-col bg-page text-text">
        <AttributionCapture />
        <PublicHeader />
        <div className="flex-1">{children}</div>
        <PublicFooter />
      </div>
    </GA4EventProvider>
  );
}
