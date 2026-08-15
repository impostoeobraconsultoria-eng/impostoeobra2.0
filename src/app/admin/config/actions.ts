"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const field = z.string().trim().max(20_000);
const sections = {
  empresa: z.object({
    empresa_razao_social: field.min(2),
    empresa_cnpj: field.min(14),
    empresa_endereco_completo: field,
    empresa_telefone_institucional: field,
    empresa_email: z.string().trim().email(),
    empresa_instagram_url: z.string().trim().url().or(z.literal("")),
    empresa_linkedin_url: z.string().trim().url().or(z.literal("")),
    empresa_frase_apoio: field,
    empresa_representante_nome: field,
    empresa_representante_cpf: field,
    empresa_representante_oab: field,
    empresa_cidade_sede: field,
  }),
  comunicacao: z.object({
    whatsapp_msg_padrao: field.min(5),
    whatsapp_msg_lead_captura: field.min(5),
  }),
  sistema: z.object({
    meta_leads_mensal: z.coerce
      .number()
      .int()
      .min(0)
      .max(100000)
      .transform(String),
    resend_from_email: z.string().trim().email(),
    resend_from_name: field.min(2),
    agenda_lembrete_default_min: z.enum(["1440", "4320", "10080"]),
  }),
} as const;

async function getAdminContext() {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string") throw new Error("Sessão expirada.");
  const { data: admin } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase())
    .eq("ativo", true)
    .eq("perfil", "admin")
    .maybeSingle();
  if (!admin) throw new Error("Acesso restrito a administradores.");
  return { supabase, admin };
}

export async function saveConfigSection(
  section: keyof typeof sections,
  formData: FormData,
) {
  const schema = sections[section];
  if (!schema) redirect("/admin/config?error=invalid");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/config?tab=${section}&error=invalid`);
  const { supabase } = await getAdminContext();
  const rows = Object.entries(parsed.data).map(([chave, valor]) => ({
    chave,
    valor: String(valor),
  }));
  const { error } = await supabase
    .from("config")
    .upsert(rows, { onConflict: "chave" });
  if (error) redirect(`/admin/config?tab=${section}&error=save`);
  refreshConfig();
  redirect(`/admin/config?tab=${section}&saved=1`);
}

const templateSchema = z.object({
  proposta_valor_obra_concluida: field,
  proposta_valor_obra_andamento: field,
});
const templateFiles = [
  ["template_proposta", "proposta_comercial.docx"],
  ["template_contrato_andamento", "contrato_obra_andamento.docx"],
  ["template_contrato_finalizada", "contrato_obra_finalizada.docx"],
] as const;

export async function saveTemplates(formData: FormData) {
  const parsed = templateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/config?tab=templates&error=invalid");
  const { supabase } = await getAdminContext();
  const configRows = Object.entries(parsed.data).map(([chave, valor]) => ({
    chave,
    valor,
  }));
  for (const [key, fileName] of templateFiles) {
    const file = formData.get(key);
    if (!(file instanceof File) || file.size === 0) continue;
    if (
      !file.name.toLowerCase().endsWith(".docx") ||
      file.size > 10 * 1024 * 1024
    )
      redirect("/admin/config?tab=templates&error=invalid_file");
    const { error } = await supabase.storage
      .from("templates")
      .upload(fileName, await file.arrayBuffer(), {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });
    if (error) redirect("/admin/config?tab=templates&error=upload");
    configRows.push({ chave: key, valor: fileName });
  }
  const { error } = await supabase
    .from("config")
    .upsert(configRows, { onConflict: "chave" });
  if (error) redirect("/admin/config?tab=templates&error=save");
  refreshConfig();
  redirect("/admin/config?tab=templates&saved=1");
}

const stageSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1).max(100),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  e_fechada: z.boolean(),
});

export async function saveFunnel(formData: FormData) {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("etapas") ?? "[]"));
  } catch {
    redirect("/admin/config?tab=funil&error=invalid");
  }
  const parsed = z.array(stageSchema).min(1).max(30).safeParse(raw);
  if (!parsed.success) redirect("/admin/config?tab=funil&error=invalid");
  const normalized = parsed.data.map((stage, ordem) => ({ ...stage, ordem }));
  if (
    new Set(normalized.map((stage) => stage.nome.toLocaleLowerCase("pt-BR")))
      .size !== normalized.length
  )
    redirect("/admin/config?tab=funil&error=duplicate_stage");
  const { supabase } = await getAdminContext();
  const { data: current, error: readError } = await supabase
    .from("funil_etapas")
    .select("id,nome");
  if (readError) redirect("/admin/config?tab=funil&error=save");
  const keptIds = new Set(
    normalized.flatMap((stage) => (stage.id ? [stage.id] : [])),
  );
  const removed = (current ?? []).filter((stage) => !keptIds.has(stage.id));
  if (removed.length) {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .in(
        "status",
        removed.map((stage) => stage.nome),
      )
      .is("deleted_at", null);
    if ((count ?? 0) > 0)
      redirect("/admin/config?tab=funil&error=stage_in_use");
  }
  const existing = normalized
    .filter((stage) => stage.id)
    .map((stage) => ({
      id: stage.id!,
      nome: stage.nome,
      cor: stage.cor,
      e_fechada: stage.e_fechada,
      ordem: stage.ordem,
    }));
  const previousNames = new Map(
    (current ?? []).map((stage) => [stage.id, stage.nome]),
  );
  for (const stage of existing) {
    const previousName = previousNames.get(stage.id);
    if (!previousName || previousName === stage.nome) continue;
    const { error } = await supabase
      .from("leads")
      .update({ status: stage.nome })
      .eq("status", previousName)
      .is("deleted_at", null);
    if (error) redirect("/admin/config?tab=funil&error=save");
  }
  const added = normalized
    .filter((stage) => !stage.id)
    .map((stage) => ({
      nome: stage.nome,
      cor: stage.cor,
      e_fechada: stage.e_fechada,
      ordem: stage.ordem,
    }));
  if (existing.length) {
    const { error } = await supabase
      .from("funil_etapas")
      .upsert(existing, { onConflict: "id" });
    if (error) redirect("/admin/config?tab=funil&error=save");
  }
  if (added.length) {
    const { error } = await supabase.from("funil_etapas").insert(added);
    if (error) redirect("/admin/config?tab=funil&error=save");
  }
  if (removed.length) {
    const { error } = await supabase
      .from("funil_etapas")
      .delete()
      .in(
        "id",
        removed.map((stage) => stage.id),
      );
    if (error) redirect("/admin/config?tab=funil&error=save");
  }
  revalidatePath("/admin/leads");
  revalidatePath("/admin/config");
  redirect("/admin/config?tab=funil&saved=1");
}

function refreshConfig() {
  revalidateTag("config");
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/config");
}
