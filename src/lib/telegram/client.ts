import "server-only";

import type { TelegramReplyMarkup } from "@/lib/telegram/types";

type MessageOptions = {
  reply_markup?: TelegramReplyMarkup;
  parse_mode?: "HTML" | "MarkdownV2";
};

type TelegramResponse<T> = { ok: boolean; result?: T; description?: string };

async function callTelegram<T>(method: string, body: object) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN ausente.");
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  const result = (await response
    .json()
    .catch(() => null)) as TelegramResponse<T> | null;
  if (!response.ok || !result?.ok)
    throw new Error(
      `Telegram ${method} falhou: ${result?.description ?? response.status}`,
    );
  return result.result as T;
}

export function sendMessage(
  chatId: number,
  text: string,
  opts: MessageOptions = {},
) {
  return callTelegram("sendMessage", { chat_id: chatId, text, ...opts });
}

export function answerCallbackQuery(id: string, text?: string) {
  return callTelegram("answerCallbackQuery", {
    callback_query_id: id,
    ...(text ? { text } : {}),
  });
}

export function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  opts: MessageOptions = {},
) {
  return callTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    ...opts,
  });
}

export function setWebhook(url: string, secret: string) {
  return callTelegram("setWebhook", { url, secret_token: secret });
}

export async function getBotUsername() {
  const bot = await callTelegram<{ username?: string }>("getMe", {});
  return bot.username ?? null;
}
