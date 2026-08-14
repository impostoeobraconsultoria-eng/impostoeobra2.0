import { getWhatsAppUrl } from "@/lib/whatsapp";
import { HeaderNavigation } from "./header-navigation";

export function PublicHeader() {
  return <HeaderNavigation whatsAppUrl={getWhatsAppUrl()} />;
}
