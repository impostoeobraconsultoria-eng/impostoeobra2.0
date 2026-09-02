import "server-only";

import { getDiagnosticoConfig } from "@/lib/diagnostico/config";
import { createAdminClient } from "@/lib/supabase/admin";

export async function criarUrlAssinadaDiagnostico(leadId: string) {
  const admin = createAdminClient();
  const [{ data: diagnostico, error }, config] = await Promise.all([
    admin
      .from("diagnosticos_preliminares")
      .select("id,storage_path,storage_bucket")
      .eq("lead_id", leadId)
      .maybeSingle(),
    getDiagnosticoConfig(),
  ]);

  if (error) throw new Error(`Diagnóstico indisponível: ${error.code}`);
  if (!diagnostico) return null;

  const expiresIn = Math.round(config.signedUrlDias * 24 * 60 * 60);
  const { data, error: signedError } = await admin.storage
    .from(diagnostico.storage_bucket || config.bucket)
    .createSignedUrl(diagnostico.storage_path, expiresIn, {
      download: "Diagnostico-Preliminar.pdf",
    });
  if (signedError || !data?.signedUrl)
    throw new Error(`URL assinada indisponível: ${signedError?.message}`);

  return { id: diagnostico.id, url: data.signedUrl };
}
