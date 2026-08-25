import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

import { autorizarTelegramUser } from "@/lib/telegram/auth";
import { sendMessage } from "@/lib/telegram/client";
import { requireTelegramConfig } from "@/lib/telegram/config";
import {
  handleTextoLivre,
  handleVincularStart,
} from "@/lib/telegram/handlers/vincular";
import { handleCallback } from "@/lib/telegram/handlers/callback";
import type { TelegramUpdate } from "@/lib/telegram/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!configuredSecret || receivedSecret !== configuredSecret)
    return NextResponse.json({ ok: false }, { status: 401 });

  const update = (await request
    .json()
    .catch(() => null)) as TelegramUpdate | null;
  if (!update || !Number.isSafeInteger(update.update_id))
    return NextResponse.json({ ok: true });

  const supabase = createAdminClient();
  const actor = update.message?.from ?? update.callback_query?.from;
  const kind = update.callback_query
    ? "callback_query"
    : update.message?.text?.startsWith("/")
      ? "command"
      : "message";
  const action = actionName(update);
  const callbackRef = callbackReference(update);
  const { data: log, error: logError } = await supabase
    .from("telegram_callbacks_log")
    .insert({
      telegram_update_id: update.update_id,
      telegram_user_id: actor?.id ?? null,
      tipo: kind,
      acao: action,
      ref_tipo: callbackRef ? "lead" : null,
      ref_id: callbackRef,
      payload: sanitizedPayload(update),
      resultado: "recebido",
    })
    .select("id")
    .maybeSingle();

  if (logError?.code === "23505") return NextResponse.json({ ok: true });
  if (logError || !log) {
    console.error("Falha ao registrar update Telegram", {
      code: logError?.code,
    });
    return NextResponse.json({ ok: true });
  }

  waitUntil(processUpdate(update, log.id));
  return NextResponse.json({ ok: true });
}

async function processUpdate(update: TelegramUpdate, logId: string) {
  const supabase = createAdminClient();
  try {
    const result = await routeUpdate(update);
    await supabase
      .from("telegram_callbacks_log")
      .update({ resultado: result.resultado, user_id: result.userId })
      .eq("id", logId);
  } catch (error) {
    console.error("Falha ao processar update Telegram", {
      updateId: update.update_id,
      error: error instanceof Error ? error.message : "erro desconhecido",
    });
    await supabase
      .from("telegram_callbacks_log")
      .update({
        resultado: "erro",
        erro_detalhe:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Erro desconhecido",
      })
      .eq("id", logId);
  }
}

async function routeUpdate(update: TelegramUpdate) {
  const message = update.message;
  const text = message?.text?.trim() ?? "";
  const telegramUserId = message?.from?.id ?? update.callback_query?.from.id;

  if (message && /^\/vincular(?:@\w+)?(?:\s|$)/i.test(text)) {
    await handleVincularStart(update);
    return { resultado: "ok", userId: null };
  }
  if (message && /^\d{6}$/.test(text)) {
    await handleTextoLivre(update);
    const user = message.from
      ? await autorizarTelegramUser(message.from.id)
      : null;
    return { resultado: user ? "ok" : "ignorado", userId: user?.id ?? null };
  }
  if (update.callback_query) return handleCallback(update);

  const user = telegramUserId
    ? await autorizarTelegramUser(telegramUserId)
    : null;
  if (!user) {
    if (message)
      await sendMessage(
        message.chat.id,
        await requireTelegramConfig("telegram_msg_inicio_generico"),
      );
    return { resultado: "nao_autorizado", userId: null };
  }

  if (message && /^\/chatid(?:@\w+)?(?:\s|$)/i.test(text)) {
    await sendMessage(message.chat.id, String(message.chat.id));
    return { resultado: "ok", userId: user.id };
  }
  if (message && /^\/ajuda(?:@\w+)?(?:\s|$)/i.test(text)) {
    await sendMessage(
      message.chat.id,
      await requireTelegramConfig("telegram_msg_ajuda"),
    );
    return { resultado: "ok", userId: user.id };
  }
  if (message)
    await sendMessage(
      message.chat.id,
      await requireTelegramConfig("telegram_msg_inicio_generico"),
    );
  return { resultado: "ignorado", userId: user.id };
}

function actionName(update: TelegramUpdate) {
  if (update.callback_query?.data)
    return update.callback_query.data.split(":", 1)[0].slice(0, 80);
  const text = update.message?.text?.trim();
  if (!text) return null;
  if (/^\d{6}$/.test(text)) return "codigo_vinculo";
  if (text.startsWith("/")) return text.split(/[\s@]/, 1)[0].slice(0, 80);
  return "texto_livre";
}

function sanitizedPayload(update: TelegramUpdate) {
  return {
    chat_id: update.message?.chat.id ?? update.callback_query?.message?.chat.id,
    chat_type:
      update.message?.chat.type ?? update.callback_query?.message?.chat.type,
    callback_data: update.callback_query?.data?.slice(0, 128),
    has_text: Boolean(update.message?.text),
  };
}

function callbackReference(update: TelegramUpdate) {
  const id = update.callback_query?.data?.split(":")[1];
  return /^[0-9a-f-]{36}$/i.test(id ?? "") ? id! : null;
}
