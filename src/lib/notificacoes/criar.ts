import "server-only";

import { waitUntil } from "@vercel/functions";

import type { NotificationType } from "@/lib/notifications";
import {
  enviarPushBroadcast,
  enviarPushParaUsuario,
} from "@/lib/push/enviar-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type NovaNotificacao = {
  destinatario_id?: string | null;
  tipo: NotificationType;
  titulo: string;
  mensagem?: string;
  link?: string;
  ref_tipo?: string;
  ref_id?: string;
  push_titulo?: string;
  push_mensagem?: string;
};

export async function criarNotificacao(notification: NovaNotificacao) {
  const admin = createAdminClient();
  const { push_titulo, push_mensagem, ...row } = notification;
  const { data, error } = await admin
    .from("notificacoes")
    .insert({
      ...row,
      destinatario_id: notification.destinatario_id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  const payload = {
    titulo: push_titulo || notification.titulo,
    mensagem: push_mensagem || notification.mensagem || "Novo alerta no CRM.",
    link: internalAdminLink(notification.link),
    tag:
      notification.ref_tipo && notification.ref_id
        ? `${notification.ref_tipo}:${notification.ref_id}`
        : undefined,
  };
  const pushPromise = (
    notification.destinatario_id
      ? enviarPushParaUsuario(
          notification.destinatario_id,
          payload,
          notification.tipo,
        )
      : enviarPushBroadcast(payload, notification.tipo)
  ).catch((pushError) => {
    console.error("Falha no gancho de Web Push", {
      notificationId: data.id,
      type: notification.tipo,
      error:
        pushError instanceof Error ? pushError.message : "erro desconhecido",
    });
  });
  waitUntil(pushPromise);
  return data;
}

function internalAdminLink(link?: string) {
  return link?.startsWith("/admin") ? link : "/admin";
}
