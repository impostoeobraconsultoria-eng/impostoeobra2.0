"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  type TemplateKey,
  validateDocxTemplate,
} from "@/lib/docx-template-validation";

const field = z.string().trim().max(20_000);
const jsonArrayField = field.refine((value) => {
  try {
    return Array.isArray(JSON.parse(value));
  } catch {
    return false;
  }
});
const sections = {
  empresa: z.object({
    empresa_razao_social: field.min(2),
    empresa_cnpj: field.min(14),
    empresa_endereco_completo: field,
    empresa_telefone_institucional: field,
    empresa_whatsapp_e164: z
      .string()
      .trim()
      .regex(/^\d{10,15}$/, "Use apenas dígitos no formato E.164."),
    empresa_email: z.string().trim().email(),
    empresa_instagram_url: z.string().trim().url().or(z.literal("")),
    empresa_linkedin_url: z.string().trim().url().or(z.literal("")),
    empresa_frase_apoio: field,
    empresa_representante_nome: field,
    empresa_representante_cpf: field,
    empresa_representante_oab: field,
    empresa_cidade_sede: field,
    dpo_nome: field,
    empresa_email_privacidade: z.string().trim().email().or(z.literal("")),
    horario_atendimento_dias: field,
    horario_atendimento_horas: field,
    horario_atendimento_fuso: field,
  }),
  comunicacao: z.object({
    whatsapp_msg_padrao: field.min(5),
    whatsapp_msg_lead_captura: field.min(5),
  }),
  push: z.object({
    push_habilitado: z.enum(["true", "false"]),
    push_notificar_lead_novo: z.enum(["true", "false"]),
    push_notificar_lead_parado: z.enum(["true", "false"]),
    push_notificar_vau_desatualizada: z.enum(["true", "false"]),
    push_notificar_evento_agenda: z.enum(["true", "false"]),
    push_notificar_sistema: z.enum(["true", "false"]),
    push_titulo_ativar: field.min(5),
    push_descricao_ativar: field.min(10),
    push_icone_padrao: z.string().trim().startsWith("/").max(200),
    push_badge_padrao: z.string().trim().startsWith("/").max(200),
  }),
  telegram: z.object({
    telegram_habilitado: z.enum(["true", "false"]),
    telegram_chat_id_grupo_operacao: z
      .string()
      .trim()
      .regex(/^-?\d*$/)
      .max(30),
    telegram_notificar_lead_novo: z.enum(["true", "false"]),
    telegram_notificar_lead_parado: z.enum(["true", "false"]),
    notif_lead_parado_dias: z.coerce
      .number()
      .int()
      .min(1)
      .max(365)
      .transform(String),
    telegram_notificar_follow_up_inativo: z.enum(["true", "false"]),
    telegram_conversation_timeout_min: z.coerce
      .number()
      .int()
      .min(1)
      .max(120)
      .transform(String),
    telegram_link_base_crm: z.string().trim().url().max(500),
    telegram_msg_vincular_inicio: field.min(2),
    telegram_msg_vincular_sucesso: field.min(2),
    telegram_msg_vincular_erro: field.min(2),
    telegram_msg_nao_autorizado: field.min(2),
    telegram_msg_ajuda: field.min(2),
    telegram_msg_fluxo_expirado: field.min(2),
    telegram_msg_inicio_generico: field.min(2),
    telegram_msg_codigo_apenas_privado: field.min(2),
    telegram_msg_acao_indisponivel: field.min(2),
    telegram_msg_lead_assumido: field.min(2),
    telegram_msg_lead_ja_assumido: field.min(2),
    telegram_msg_contato_resultado: field.min(2),
    telegram_msg_contato_data: field.min(2),
    telegram_msg_contato_concluido: field.min(2),
    telegram_msg_followup_marcado: field.min(2),
    telegram_msg_followup_reativado: field.min(2),
    telegram_msg_followup_adiado: field.min(2),
    telegram_msg_perder_motivo: field.min(2),
    telegram_msg_lead_perdido: field.min(2),
    telegram_msg_lead_indisponivel: field.min(2),
    telegram_msg_erro_generico: field.min(2),
    telegram_template_lead_novo: field.min(2),
    telegram_template_lead_parado: field.min(2),
    telegram_template_follow_up_inativo: field.min(2),
    telegram_btn_assumir: field.min(1).max(100),
    telegram_btn_contato_realizado: field.min(1).max(100),
    telegram_btn_whatsapp: field.min(1).max(100),
    telegram_btn_ver_no_crm: field.min(1).max(100),
    telegram_btn_reativar: field.min(1).max(100),
    telegram_btn_adiar: field.min(1).max(100),
    telegram_btn_perder: field.min(1).max(100),
    telegram_adiar_dias: z.coerce
      .number()
      .int()
      .min(1)
      .max(365)
      .transform(String),
    telegram_contato_resultados: jsonArrayField,
    telegram_contato_datas_retomar: jsonArrayField,
    telegram_perder_motivos: jsonArrayField,
    telegram_cron_follow_up_horario: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/),
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
  const uploads: { key: TemplateKey; fileName: string; buffer: ArrayBuffer }[] =
    [];
  for (const [key, fileName] of templateFiles) {
    const file = formData.get(key);
    if (!(file instanceof File) || file.size === 0) continue;
    if (!file.name.toLowerCase().endsWith(".docx"))
      redirect("/admin/config?tab=templates&error=invalid_extension");
    if (file.size > 10 * 1024 * 1024)
      redirect("/admin/config?tab=templates&error=file_too_large");
    const buffer = await file.arrayBuffer();
    const validation = validateDocxTemplate(buffer, key);
    if (validation.invalid)
      redirect("/admin/config?tab=templates&error=invalid_docx");
    if (!validation.ok)
      redirect(
        `/admin/config?tab=templates&error=missing_placeholders&details=${encodeURIComponent(validation.missing.join(","))}`,
      );
    uploads.push({ key, fileName, buffer });
  }
  for (const { key, fileName, buffer } of uploads) {
    const { error } = await supabase.storage
      .from("templates")
      .upload(fileName, buffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });
    if (error) {
      console.error("Falha ao substituir template DOCX", {
        key,
        fileName,
        code: error.name,
        message: error.message,
      });
      const code = /row-level security|unauthorized|forbidden/i.test(
        error.message,
      )
        ? "upload_permission"
        : /payload|size|large/i.test(error.message)
          ? "file_too_large"
          : "upload";
      redirect(`/admin/config?tab=templates&error=${code}`);
    }
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
    const { error: inactiveHistoryError } = await supabase
      .from("leads")
      .update({ ultima_etapa_kanban: stage.nome })
      .eq("ultima_etapa_kanban", previousName)
      .is("deleted_at", null);
    if (inactiveHistoryError) redirect("/admin/config?tab=funil&error=save");
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

const reasonSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  rotulo: z.string().trim().min(2).max(100),
  ativo: z.boolean(),
  reativavel_padrao: z.boolean(),
});

export async function saveInactivationReasons(formData: FormData) {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("motivos") ?? "[]"));
  } catch {
    redirect("/admin/config?tab=motivos&error=invalid");
  }
  const parsed = z.array(reasonSchema).min(1).max(50).safeParse(raw);
  if (!parsed.success) redirect("/admin/config?tab=motivos&error=invalid");
  const { supabase } = await getAdminContext();
  const existing = parsed.data
    .filter((item) => item.id)
    .map((item, ordem) => ({
      id: item.id!,
      rotulo: item.rotulo,
      ativo: item.ativo,
      reativavel_padrao: item.reativavel_padrao,
      ordem,
    }));
  const added = parsed.data
    .filter((item) => !item.id)
    .map((item, index) => ({
      slug: item.slug,
      rotulo: item.rotulo,
      ativo: item.ativo,
      reativavel_padrao: item.reativavel_padrao,
      ordem: existing.length + index,
    }));
  if (existing.length) {
    const { error } = await supabase
      .from("motivos_inativacao")
      .upsert(existing, { onConflict: "id" });
    if (error) redirect("/admin/config?tab=motivos&error=save");
  }
  if (added.length) {
    const { error } = await supabase.from("motivos_inativacao").insert(added);
    if (error) redirect("/admin/config?tab=motivos&error=save");
  }
  revalidatePath("/admin/leads");
  revalidatePath("/admin/config");
  redirect("/admin/config?tab=motivos&saved=1");
}

function refreshConfig() {
  revalidateTag("config");
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/config");
}
