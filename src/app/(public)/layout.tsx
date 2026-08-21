import type { ReactNode } from "react";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { AttributionCapture } from "@/components/analytics/attribution-capture";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-v2 flex min-h-screen flex-col bg-page text-text">
      <AttributionCapture />
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </div>
  );
}
