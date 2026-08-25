import "server-only";

import webpush from "web-push";

import type { NotificationType } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = {
  titulo: string;
  mensagem: string;
  link?: string;
  icone?: string;
  badge?: string;
  tag?: string;
};

type UserRow = {
  id: string;
  preferencias_push: unknown;
};

export async function enviarPushParaUsuario(
  userId: string,
  payload: PushPayload,
  type: NotificationType,
) {
  return sendPush(payload, type, userId);
}

export async function enviarPushBroadcast(
  payload: PushPayload,
  type: NotificationType,
) {
  return sendPush(payload, type);
}

async function sendPush(
  payload: PushPayload,
  type: NotificationType,
  userId?: string,
) {
  const vapidSubject = process.env.VAPID_SUBJECT;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
    console.warn("Web Push ignorado: variáveis VAPID não configuradas.");
    return { sent: 0, skipped: true };
  }

  const admin = createAdminClient();
  const configKeys = [
    "push_habilitado",
    `push_notificar_${type}`,
    "push_icone_padrao",
    "push_badge_padrao",
  ];
  const { data: configRows, error: configError } = await admin
    .from("config")
    .select("chave,valor")
    .in("chave", configKeys);
  if (configError) {
    console.error("Falha ao carregar configuração de Web Push", {
      code: configError.code,
    });
    return { sent: 0, skipped: true };
  }
  const config = Object.fromEntries(
    (configRows ?? []).map((item) => [item.chave, item.valor ?? ""]),
  );
  if (
    config.push_habilitado !== "true" ||
    config[`push_notificar_${type}`] !== "true"
  )
    return { sent: 0, skipped: true };

  let usersQuery = admin
    .from("users")
    .select("id,preferencias_push")
    .eq("ativo", true);
  if (userId) usersQuery = usersQuery.eq("id", userId);
  const { data: users, error: usersError } = await usersQuery;
  if (usersError) {
    console.error("Falha ao carregar destinatários de Web Push", {
      code: usersError.code,
    });
    return { sent: 0, skipped: true };
  }
  const allowedUserIds = (users as UserRow[] | null)
    ?.filter((user) => preferenceEnabled(user.preferencias_push, type))
    .map((user) => user.id);
  if (!allowedUserIds?.length) return { sent: 0, skipped: true };

  const { data: subscriptions, error: subscriptionsError } = await admin
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth")
    .eq("ativo", true)
    .in("user_id", allowedUserIds);
  if (subscriptionsError) {
    console.error("Falha ao carregar assinaturas Web Push", {
      code: subscriptionsError.code,
    });
    return { sent: 0, skipped: true };
  }
  if (!subscriptions?.length) return { sent: 0, skipped: true };

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const encryptedPayload = JSON.stringify({
    titulo: truncate(payload.titulo, 120),
    mensagem: truncate(payload.mensagem, 280),
    link: internalAdminLink(payload.link),
    tag: payload.tag ? truncate(payload.tag, 100) : undefined,
    icone: internalAssetPath(
      payload.icone || config.push_icone_padrao,
      "/icons/icon-192.png",
    ),
    badge: internalAssetPath(
      payload.badge || config.push_badge_padrao,
      "/icons/badge-72.png",
    ),
  });
  let sent = 0;
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          encryptedPayload,
          { TTL: 86_400, urgency: "high" },
        );
        sent += 1;
        const { error: updateError } = await admin
          .from("push_subscriptions")
          .update({
            ultimo_envio_em: new Date().toISOString(),
            ultimo_erro: null,
            ultimo_erro_em: null,
          })
          .eq("id", subscription.id);
        if (updateError)
          console.error("Falha ao atualizar entrega Web Push", {
            subscriptionId: subscription.id,
            code: updateError.code,
          });
      } catch (error) {
        const statusCode = pushStatusCode(error);
        const message = pushErrorMessage(error);
        if (statusCode === 429) {
          console.warn("Push service limitou temporariamente o envio", {
            subscriptionId: subscription.id,
          });
          return;
        }
        const expired = statusCode === 404 || statusCode === 410;
        await admin
          .from("push_subscriptions")
          .update({
            ...(expired ? { ativo: false } : {}),
            ultimo_erro: message,
            ultimo_erro_em: new Date().toISOString(),
          })
          .eq("id", subscription.id);
        console.error("Falha ao enviar Web Push", {
          subscriptionId: subscription.id,
          statusCode,
          expired,
        });
      }
    }),
  );
  return { sent, skipped: false };
}

function preferenceEnabled(value: unknown, type: NotificationType) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return true;
  return (value as Record<string, unknown>)[type] !== false;
}

function pushStatusCode(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const value = (error as { statusCode?: unknown }).statusCode;
  return typeof value === "number" ? value : null;
}

function pushErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  return message.slice(0, 1_000);
}

function internalAdminLink(value?: string) {
  return value?.startsWith("/admin") ? truncate(value, 500) : "/admin";
}

function internalAssetPath(value: string | undefined, fallback: string) {
  return value?.startsWith("/") ? truncate(value, 200) : fallback;
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}
