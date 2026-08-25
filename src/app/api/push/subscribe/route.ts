import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const subscriptionSchema = z.object({
  endpoint: z
    .string()
    .url()
    .max(4_096)
    .refine((value) => value.startsWith("https://")),
  keys: z.object({
    p256dh: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .min(40)
      .max(256),
    auth: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .min(8)
      .max(128),
  }),
  device_label: z.string().trim().min(2).max(120),
  user_agent: z.string().trim().max(1_000),
});

export async function POST(request: NextRequest) {
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

  const parsed = subscriptionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Assinatura inválida." },
      { status: 422 },
    );

  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: profile.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        device_label: parsed.data.device_label,
        user_agent: parsed.data.user_agent,
        ativo: true,
        ultimo_erro: null,
        ultimo_erro_em: null,
      },
      { onConflict: "endpoint" },
    )
    .select("id")
    .single();

  if (error) {
    console.error("Falha ao registrar dispositivo push", { code: error.code });
    return NextResponse.json(
      { error: "Não foi possível registrar este dispositivo." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, id: data.id });
}
