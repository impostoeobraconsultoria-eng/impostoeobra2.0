import { randomInt } from "node:crypto";

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getTelegramConfig } from "@/lib/telegram/config";

export const runtime = "nodejs";

export async function POST() {
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

  const now = new Date().toISOString();
  const { error: invalidateError } = await supabase
    .from("telegram_codigos_vinculo")
    .update({ usado_em: now })
    .eq("user_id", profile.id)
    .is("usado_em", null);
  if (invalidateError) return saveError(invalidateError.code);

  const configuredTimeout = Number(
    await getTelegramConfig("telegram_conversation_timeout_min"),
  );
  const timeoutMinutes = Number.isInteger(configuredTimeout)
    ? Math.min(Math.max(configuredTimeout, 1), 120)
    : 10;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const codigo = String(randomInt(100_000, 1_000_000));
    const expiraEm = new Date(
      Date.now() + timeoutMinutes * 60_000,
    ).toISOString();
    const { error } = await supabase.from("telegram_codigos_vinculo").insert({
      codigo,
      user_id: profile.id,
      expira_em: expiraEm,
    });
    if (!error) return NextResponse.json({ codigo, expira_em: expiraEm });
    if (error.code !== "23505") return saveError(error.code);
  }
  return saveError("collision");
}

function saveError(code: string) {
  console.error("Falha ao gerar código Telegram", { code });
  return NextResponse.json(
    { error: "Não foi possível gerar o código agora." },
    { status: 500 },
  );
}
