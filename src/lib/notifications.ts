import "server-only";

import { createClient } from "@/lib/supabase/server";

export const NOTIFICATION_TYPES = [
  "agenda_lembrete",
  "evento_agenda",
  "lead_novo",
  "vau_desatualizada",
  "lead_parado",
  "sistema",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationItem = {
  id: string;
  tipo: NotificationType;
  titulo: string;
  mensagem: string | null;
  link: string | null;
  ref_tipo: string | null;
  ref_id: string | null;
  criado_em: string;
  lida: boolean;
};

export async function getCurrentNotificationUser() {
  const supabase = createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const email = claimsData?.claims.email;
  if (typeof email !== "string") return { supabase, profile: null };
  const { data: profile } = await supabase
    .from("users")
    .select("id,nome,email,perfil")
    .eq("email", email)
    .eq("ativo", true)
    .maybeSingle();
  return { supabase, profile };
}

export async function listNotifications(limit = 10) {
  const { supabase, profile } = await getCurrentNotificationUser();
  if (!profile) return { profile: null, notifications: [], unread: 0 };

  const { data, error } = await supabase
    .from("notificacoes")
    .select("id,tipo,titulo,mensagem,link,ref_tipo,ref_id,criado_em")
    .order("criado_em", { ascending: false })
    .limit(200);
  if (error) throw error;

  const ids = (data ?? []).map((item) => item.id);
  const { data: reads } = ids.length
    ? await supabase
        .from("notificacoes_leituras")
        .select("notificacao_id")
        .eq("usuario_id", profile.id)
        .in("notificacao_id", ids)
    : { data: [] };
  const readIds = new Set((reads ?? []).map((item) => item.notificacao_id));
  const priority: Record<string, number> = {
    agenda_lembrete: 0,
    evento_agenda: 1,
    lead_novo: 2,
    vau_desatualizada: 3,
    lead_parado: 4,
    sistema: 5,
  };
  const notifications = (data ?? [])
    .map((item) => ({ ...item, lida: readIds.has(item.id) }))
    .sort((a, b) => {
      if (a.lida !== b.lida) return a.lida ? 1 : -1;
      if (!a.lida && priority[a.tipo] !== priority[b.tipo])
        return priority[a.tipo] - priority[b.tipo];
      return Date.parse(b.criado_em) - Date.parse(a.criado_em);
    }) as NotificationItem[];
  return {
    profile,
    notifications: notifications.slice(0, limit),
    unread: notifications.filter((item) => !item.lida).length,
  };
}
