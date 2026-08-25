import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string")
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase())
    .eq("ativo", true)
    .maybeSingle();
  if (!profile)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { error } = await createAdminClient()
    .from("users")
    .update({
      telegram_user_id: null,
      telegram_username: null,
      telegram_chat_id: null,
      telegram_vinculado_em: null,
    })
    .eq("id", profile.id);
  if (error) {
    console.error("Falha ao desvincular Telegram", { code: error.code });
    return NextResponse.json(
      { error: "Não foi possível desvincular agora." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
