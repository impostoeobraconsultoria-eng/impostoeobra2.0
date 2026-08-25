import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://impostoeobra.com.br"
).replace(/\/$/, "");

if (!token || !secret) {
  console.error(
    "Defina TELEGRAM_BOT_TOKEN e TELEGRAM_WEBHOOK_SECRET antes de registrar o webhook.",
  );
  process.exit(1);
}
if (secret.length < 32) {
  console.error(
    "TELEGRAM_WEBHOOK_SECRET precisa ter pelo menos 32 caracteres.",
  );
  process.exit(1);
}
if (secret.length > 256 || !/^[A-Za-z0-9_-]+$/.test(secret)) {
  console.error(
    "TELEGRAM_WEBHOOK_SECRET aceita somente letras, números, _ e - (máximo 256 caracteres).",
  );
  process.exit(1);
}

const webhookUrl = `${siteUrl}/api/telegram/webhook`;
const response = await fetch(
  `https://api.telegram.org/bot${token}/setWebhook`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
  },
);
const result = await response.json();
if (!response.ok || !result.ok) {
  console.error(
    "Não foi possível registrar o webhook:",
    result.description || response.status,
  );
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, webhook_url: webhookUrl }));
