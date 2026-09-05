import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getAgendaContext() {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string") return null;
  const { data: user } = await supabase
    .from("users")
    .select("id,nome,email,perfil")
    .eq("email", email)
    .eq("ativo", true)
    .maybeSingle();
  return user ? { supabase, user } : null;
}

export async function getAgendaConfig(
  supabase: NonNullable<Awaited<ReturnType<typeof getAgendaContext>>>["supabase"],
  keys: string[],
) {
  const { data, error } = await supabase
    .from("config")
    .select("chave,valor")
    .in("chave", keys);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((item) => [item.chave, item.valor]));
}
