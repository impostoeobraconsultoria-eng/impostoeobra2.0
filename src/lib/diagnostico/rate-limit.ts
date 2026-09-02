import "server-only";

import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

const MAX_REQUESTS = 30;

export async function consumeDiagnosticDownload(ip: string, leadId: string) {
  const admin = createAdminClient();
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("atividades")
    .select("id", { count: "exact", head: true })
    .eq("ref_tipo", "sistema")
    .eq("ref_id", leadId)
    .eq("tipo", "diagnostico_download")
    .contains("metadata_json", { ip_hash: ipHash })
    .gte("data_hora", oneHourAgo);
  if (error) throw new Error(`Rate limit indisponível: ${error.code}`);
  if ((count ?? 0) >= MAX_REQUESTS) return { allowed: false, retryAfter: 3600 };

  const { error: insertError } = await admin.from("atividades").insert({
    ref_tipo: "sistema",
    ref_id: leadId,
    tipo: "diagnostico_download",
    descricao: "Download público do diagnóstico preliminar",
    metadata_json: { ip_hash: ipHash },
  });
  if (insertError)
    throw new Error(`Rate limit indisponível: ${insertError.code}`);
  return { allowed: true, retryAfter: 0 };
}
