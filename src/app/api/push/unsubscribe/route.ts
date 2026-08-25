import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  endpoint: z
    .string()
    .url()
    .max(4_096)
    .refine((value) => value.startsWith("https://")),
});

export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string")
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const [{ data: profile }, parsed] = await Promise.all([
    supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .eq("ativo", true)
      .maybeSingle(),
    request
      .json()
      .then((value) => bodySchema.safeParse(value))
      .catch(() => ({ success: false as const })),
  ]);
  if (!profile)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!parsed.success)
    return NextResponse.json({ error: "Endpoint inválido." }, { status: 422 });

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data.endpoint)
    .eq("user_id", profile.id);
  if (error) {
    console.error("Falha ao remover dispositivo push", { code: error.code });
    return NextResponse.json(
      { error: "Não foi possível remover este dispositivo." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
