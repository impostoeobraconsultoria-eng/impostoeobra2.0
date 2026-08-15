import { getConfiguredWhatsAppUrl, getSiteConfig } from "@/lib/site-config";
import { HeaderNavigation } from "./header-navigation";

export async function PublicHeader() {
  const config = await getSiteConfig();
  return <HeaderNavigation whatsAppUrl={getConfiguredWhatsAppUrl(config)} />;
}
