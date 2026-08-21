import { NextResponse } from "next/server";

import { getCurrentNotificationUser } from "@/lib/notifications";

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { supabase, profile } = await getCurrentNotificationUser();
  if (!profile)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { data: notification } = await supabase
    .from("notificacoes")
    .select("id")
    .eq("id", params.id)
    .maybeSingle();
  if (!notification)
    return NextResponse.json(
      { error: "Notificação não encontrada." },
      { status: 404 },
    );
  const { error } = await supabase
    .from("notificacoes_leituras")
    .upsert(
      {
        notificacao_id: notification.id,
        usuario_id: profile.id,
        lida_em: new Date().toISOString(),
      },
      { onConflict: "notificacao_id,usuario_id" },
    );
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
