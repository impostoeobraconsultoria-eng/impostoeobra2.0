import { NextResponse } from "next/server";

import { getCurrentNotificationUser } from "@/lib/notifications";

export async function PATCH() {
  const { supabase, profile } = await getCurrentNotificationUser();
  if (!profile)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  // Marque o mesmo conjunto recente que alimenta o contador do sino.
  const { data, error: notificationsError } = await supabase
    .from("notificacoes")
    .select("id")
    .order("criado_em", { ascending: false })
    .limit(200);
  if (notificationsError)
    return NextResponse.json(
      { error: notificationsError.message },
      { status: 500 },
    );
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
