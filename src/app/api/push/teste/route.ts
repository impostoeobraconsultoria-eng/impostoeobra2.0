import { NextResponse } from "next/server";

import { criarNotificacao } from "@/lib/notificacoes/criar";
import { createClient } from "@/lib/supabase/server";

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

  const { count, error: subscriptionError } = await supabase
    .from("push_subscriptions")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", profile.id)
    .eq("ativo", true);
  if (subscriptionError)
    return NextResponse.json(
      { error: "Não foi possível verificar seus dispositivos." },
      { status: 500 },
    );
  if (!count)
    return NextResponse.json(
      { error: "Ative as notificações em um dispositivo antes do teste." },
      { status: 409 },
    );

  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentTests } = await supabase
    .from("notificacoes")
    .select("id", { head: true, count: "exact" })
    .eq("destinatario_id", profile.id)
    .eq("ref_tipo", "push_teste")
    .gte("criado_em", oneMinuteAgo);
  if (recentTests)
    return NextResponse.json(
      { error: "Aguarde um minuto antes de enviar outro teste." },
      { status: 429 },
    );

  try {
    await criarNotificacao({
      destinatario_id: profile.id,
      tipo: "sistema",
      titulo: "Web Push funcionando",
      mensagem: "Este dispositivo está pronto para receber prazos e lembretes.",
      link: "/admin/configuracoes/dispositivos",
      ref_tipo: "push_teste",
      ref_id: crypto.randomUUID(),
      push_titulo: "Web Push funcionando ✓",
      push_mensagem:
        "Você receberá neste dispositivo os prazos e lembretes do CRM.",
    });
  } catch (error) {
    console.error("Falha ao criar notificação de teste", error);
    return NextResponse.json(
      { error: "Não foi possível enviar a notificação de teste." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
