import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Configuração server-only do Supabase ausente.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      // Desabilita o Data Cache do Next.js para todas as queries feitas via
      // admin client. Sem isso, uma resposta vazia (ex: polling logo após
      // INSERT) fica cacheada e polls seguintes recebem cache stale.
      // Bug reproduzido em produção 2026-09-04 no fluxo do Diagnóstico
      // Preliminar (V9): polling do download sempre retornava 202 "gerando"
      // mesmo com o PDF já pronto.
      fetch: (input, init) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
