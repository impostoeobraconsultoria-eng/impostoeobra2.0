import { NextResponse } from "next/server";

import { getCurrentNotificationUser } from "@/lib/notifications";

export async function PATCH() {
  const { supabase, profile } = await getCurrentNotificationUser();
  if (!profile)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { data } = await supabase.from("notificacoes").select("id").limit(500);
  const rows = (data ?? []).map((item) => ({
    notificacao_id: item.id,
    usuario_id: profile.id,
    lida_em: new Date().toISOString(),
  }));
  if (rows.length) {
    const { error } = await supabase
      .from("notificacoes_leituras")
      .upsert(rows, { onConflict: "notificacao_id,usuario_id" });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
