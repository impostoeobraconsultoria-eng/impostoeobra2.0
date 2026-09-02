import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getActiveUser() {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string") return null;
  const { data: user } = await supabase
    .from("users")
    .select("id,nome,perfil")
    .eq("email", email.toLowerCase())
    .eq("ativo", true)
    .maybeSingle();
  return user ? { supabase, user } : null;
}
