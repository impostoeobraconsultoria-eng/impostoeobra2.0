import { createClient } from "@/lib/supabase/server";

export async function requireOperacaoUser() {
  const supabase = createClient();
  const { data: claims, error } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (error || typeof email !== "string") return null;
  const { data: user } = await supabase.from("users").select("id,nome,perfil").eq("email", email).eq("ativo", true).maybeSingle();
  return user ? { supabase, user } : null;
}
