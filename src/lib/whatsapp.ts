const defaultMessage =
  "Olá, gostaria de informações sobre como regularizar minha obra perante a Receita Federal com economia";

export function getWhatsAppUrl() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE;

  if (!phone) return "#whatsapp-indisponivel";

  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(defaultMessage)}`;
}
