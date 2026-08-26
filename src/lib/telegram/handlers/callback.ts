import "server-only";

import { autorizarTelegramUser } from "@/lib/telegram/auth";
import { answerCallbackQuery } from "@/lib/telegram/client";
import { requireTelegramConfig } from "@/lib/telegram/config";
import { handleAssumir } from "@/lib/telegram/handlers/assumir";
import {
  handleContatoData,
  handleContatoResultado,
  handleContatoStart,
} from "@/lib/telegram/handlers/contato";
import {
  handleAdiar,
  handlePerderConfirmar,
  handlePerderStart,
  handleReativar,
} from "@/lib/telegram/handlers/inativo";
import type { TelegramUpdate } from "@/lib/telegram/types";

export async function handleCallback(update: TelegramUpdate) {
  const callback = update.callback_query!;
  const user = await autorizarTelegramUser(callback.from.id);
  if (!user) {
    await answerCallbackQuery(
      callback.id,
      await requireTelegramConfig("telegram_msg_nao_autorizado"),
    );
    return { resultado: "nao_autorizado", userId: null };
  }
  if (!callback.data || !callback.message) {
    await answerCallbackQuery(
      callback.id,
      await requireTelegramConfig("telegram_msg_acao_indisponivel"),
    );
    return { resultado: "ignorado", userId: user.id };
  }
  const [action, leadId, argument] = callback.data.split(":");
  if (!/^[0-9a-f-]{36}$/i.test(leadId ?? "")) {
    await answerCallbackQuery(
      callback.id,
      await requireTelegramConfig("telegram_msg_acao_indisponivel"),
    );
    return { resultado: "ignorado", userId: user.id };
  }
  try {
    if (action === "assumir") await handleAssumir(user, leadId, update);
    else if (action === "contato")
      await handleContatoStart(user.id, leadId, update);
    else if ((action === "cr" || action === "contato_result") && argument)
      await handleContatoResultado(user.id, leadId, argument, update);
    else if ((action === "cd" || action === "contato_data") && argument)
      await handleContatoData(user.id, leadId, argument, update);
    else if (action === "reativar") await handleReativar(user, leadId, update);
    else if (action === "adiar" && argument)
      await handleAdiar(user, leadId, argument, update);
    else if (action === "perder") await handlePerderStart(leadId, update);
    else if (action === "pd" && argument)
      await handlePerderConfirmar(user, leadId, argument, update);
    else {
      await answerCallbackQuery(
        callback.id,
        await requireTelegramConfig("telegram_msg_acao_indisponivel"),
      );
      return { resultado: "ignorado", userId: user.id };
    }
    return { resultado: "ok", userId: user.id };
  } catch (error) {
    await answerCallbackQuery(
      callback.id,
      await requireTelegramConfig("telegram_msg_erro_generico"),
    ).catch(() => undefined);
    throw error;
  }
}
