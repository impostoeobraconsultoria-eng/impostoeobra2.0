import { getWhatsappUrl } from "@/lib/config";
import { getSiteConfig } from "@/lib/site-config";
import { HeaderNavigation } from "./header-navigation";

export async function PublicHeader() {
  const config = await getSiteConfig();
  return (
    <HeaderNavigation
      whatsAppUrl={await getWhatsappUrl(config.whatsapp_msg_padrao)}
    />
  );
}
