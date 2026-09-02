"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseBrazilianMobile } from "@/lib/ddds-brasileiros";

const optionalText = z.preprocess(
  (value) => (value === "" || value == null ? null : value),
  z.string().trim().max(2000).nullable(),
);
const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? null : Number(value)),
  z.number().finite().nullable(),
);

async function context() {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string") throw new Error("Sessão expirada.");
  const { data: user } = await supabase
    .from("users")
    .select("id,perfil")
    .eq("email", email)
    .eq("ativo", true)
    .single();
  if (!user) throw new Error("Usuário não autorizado.");
  return { supabase, user };
}

async function adminContext() {
  const value = await context();
  if (value.user.perfil !== "admin")
    throw new Error("Acesso restrito a administradores.");
  return value;
}

export async function softDeleteLead(id: string) {
  if (!z.string().uuid().safeParse(id).success)
    return { ok: false, error: "Lead inválido." };
  const { supabase, user } = await adminContext();
  const { error } = await supabase
    .from("leads")
    .update({ deleted_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };
  await supabase.from("atividades").insert({
    ref_tipo: "lead",
    ref_id: id,
    tipo: "exclusao",
    descricao: "Lead movido para a lixeira",
    autor_id: user.id,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/lixeira");
  return { ok: true };
}

export async function restoreLead(id: string) {
  if (!z.string().uuid().safeParse(id).success)
    return { ok: false, error: "Lead inválido." };
  const { supabase, user } = await adminContext();
  const { error } = await supabase
    .from("leads")
    .update({ deleted_at: null, updated_by: user.id })
    .eq("id", id)
    .not("deleted_at", "is", null);
  if (error) return { ok: false, error: error.message };
  await supabase.from("atividades").insert({
    ref_tipo: "lead",
    ref_id: id,
    tipo: "restauracao",
    descricao: "Lead restaurado da lixeira",
    autor_id: user.id,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/lixeira");
  return { ok: true };
}

export async function permanentlyDeleteLead(id: string) {
  if (!z.string().uuid().safeParse(id).success)
    return { ok: false, error: "Lead inválido." };
  const { supabase } = await adminContext();
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .not("deleted_at", "is", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/leads/lixeira");
  return { ok: true };
}

export async function updateLeadStatus(id: string, status: string) {
  const parsed = z
    .object({
      id: z.string().uuid(),
      status: z.string().trim().min(1).max(100),
    })
    .safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Status inválido." };
  const { supabase, user } = await context();
  if (!(await isValidStatus(supabase, status)))
    return { ok: false, error: "Status inválido." };
  const { data: previous } = await supabase
    .from("leads")
    .select("status")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  const { error } = await supabase
    .from("leads")
    .update({ status, updated_by: user.id })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };
  await supabase.from("atividades").insert({
    ref_tipo: "lead",
    ref_id: id,
    tipo: "mudanca_status",
    descricao: `Status alterado de ${previous?.status ?? "—"} para ${status}`,
    autor_id: user.id,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  return { ok: true };
}

export async function toggleLeadQualification(id: string) {
  if (!z.string().uuid().safeParse(id).success)
    return { ok: false, error: "Lead inválido." };
  const { supabase, user } = await context();
  const { data: lead, error: loadError } = await supabase
    .from("leads")
    .select("qualificado_em,status")
    .eq("id", id)
    .is("deleted_at", null)
    .is("convertido_em", null)
    .maybeSingle();
  if (loadError || !lead)
    return { ok: false, error: "Lead não encontrado ou já convertido." };
  const qualified = !lead.qualificado_em;
  const { error } = await supabase
    .from("leads")
    .update({
      qualificado_em: qualified ? new Date().toISOString() : null,
      updated_by: user.id,
    })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) {
    console.error("Falha ao alterar qualificação do lead", {
      leadId: id,
      code: error.code,
      message: error.message,
    });
    return { ok: false, error: "Não foi possível alterar a qualificação." };
  }
  const { error: activityError } = await supabase.from("atividades").insert({
    ref_tipo: "lead",
    ref_id: id,
    tipo: qualified ? "lead_qualificado" : "qualificacao_removida",
    descricao: qualified
      ? "Lead marcado como qualificado"
      : "Qualificação do lead removida",
    autor_id: user.id,
  });
  if (activityError)
    console.error("Falha ao registrar qualificação na timeline", {
      leadId: id,
      code: activityError.code,
    });
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  return { ok: true, qualified, status: lead.status };
}

export type CreateLeadState = {
  errors?: Partial<Record<"nome" | "telefone" | "status" | "form", string>>;
};

export async function createLead(
  _state: CreateLeadState,
  formData: FormData,
): Promise<CreateLeadState> {
  const schema = z.object({
    nome: z.string().trim().min(1, "Nome é obrigatório").max(160),
    email: optionalText,
    telefone: z.string().trim().min(1, "Informe o WhatsApp com DDD"),
    uf: optionalText,
    cidade: optionalText,
    produto: optionalText,
    status: z.string().trim().min(1).max(100),
    valor_potencial: optionalNumber,
    observacoes: optionalText,
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      errors: {
        nome: fields.nome?.[0],
        telefone: fields.telefone?.[0],
        status: fields.status?.[0],
        form: "Revise os campos destacados e tente novamente.",
      },
    };
  }
  const phone = parseBrazilianMobile(parsed.data.telefone);
  if (!phone.ok) return { errors: { telefone: phone.error } };
  const { supabase, user } = await context();
  if (!(await isValidStatus(supabase, parsed.data.status)))
    return { errors: { status: "Status inválido" } };
  const { telefone: _telefone, ...payload } = parsed.data;
  void _telefone;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leads")
    .insert({
      ...payload,
      ddd: phone.data.ddd,
      whatsapp: phone.data.whatsapp,
      telefone_normalizado: phone.data.telefoneNormalizado,
      origem: "manual",
      updated_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("Falha ao criar lead manual", error);
    return { errors: { form: "Não foi possível salvar o lead." } };
  }
  await supabase.from("atividades").insert({
    ref_tipo: "lead",
    ref_id: data.id,
    tipo: "criacao",
    descricao: "Lead criado manualmente",
    autor_id: user.id,
  });
  const matches = await findExistingRecords(
    admin,
    phone.data.telefoneNormalizado,
    payload.email,
    data.id,
  );
  if (matches.leads.length || matches.clientes.length)
    await supabase.from("atividades").insert({
      ref_tipo: "lead",
      ref_id: data.id,
      tipo: "lead_recorrente_detectado",
      descricao: "Possível recorrência detectada por telefone ou e-mail",
      metadata_json: {
        leads_encontrados: matches.leads,
        clientes_encontrados: matches.clientes,
      },
      autor_id: user.id,
    });
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  redirect(`/admin/leads/${data.id}?saved=1`);
}

const editableFields = [
  "nome",
  "email",
  "ddd",
  "whatsapp",
  "uf",
  "cidade",
  "status",
  "produto",
  "valor_potencial",
  "responsavel_id",
  "observacoes",
  "resp",
  "dest",
  "tipo",
  "categoria",
  "concreto",
  "prefab",
  "a_construcao",
  "a_reforma",
  "a_demolicao",
  "a_pcoberta",
  "a_pdescoberta",
  "area_total",
  "area_total_calculo",
  "area_principal_bruta",
  "area_principal_equiv",
  "pct_equivalencia",
  "vau",
  "co",
  "rmt",
  "cmo_pct",
  "pct_categoria",
  "fator_social_pct",
  "aliquota_pct",
  "reducao_pre_fab_pct",
  "ded_concreto_usinado",
  "pct_uso_usinado",
  "pct_abat_usinado_cat",
  "inss_direto",
  "inss_reduzido",
  "economia",
  "cmpl_folha_mensal",
  "cmpl_meses_folha",
  "cmpl_nf_concreto_usinado",
  "cmpl_nf_prefabricado",
] as const;
const numericFields = new Set(
  editableFields.filter((field) =>
    [
      "valor_potencial",
      "a_construcao",
      "a_reforma",
      "a_demolicao",
      "a_pcoberta",
      "a_pdescoberta",
      "area_total",
      "area_total_calculo",
      "area_principal_bruta",
      "area_principal_equiv",
      "pct_equivalencia",
      "vau",
      "co",
      "rmt",
      "cmo_pct",
      "pct_categoria",
      "fator_social_pct",
      "aliquota_pct",
      "reducao_pre_fab_pct",
      "ded_concreto_usinado",
      "pct_uso_usinado",
      "pct_abat_usinado_cat",
      "inss_direto",
      "inss_reduzido",
      "economia",
      "cmpl_folha_mensal",
      "cmpl_meses_folha",
      "cmpl_nf_concreto_usinado",
      "cmpl_nf_prefabricado",
    ].includes(field),
  ),
);

export async function updateLead(id: string, formData: FormData) {
  if (!z.string().uuid().safeParse(id).success)
    throw new Error("Lead inválido.");
  const payload: Record<string, string | number | null> = {};
  for (const field of editableFields) {
    const raw = formData.get(field);
    if (typeof raw !== "string") continue;
    payload[field] =
      raw === "" ? null : numericFields.has(field) ? Number(raw) : raw.trim();
  }
  const phoneRaw = formData.get("telefone");
  if (typeof phoneRaw === "string") {
    const phone = parseBrazilianMobile(phoneRaw);
    if (!phone.ok) redirect(`/admin/leads/${id}?error=invalid_phone`);
    payload.ddd = phone.data.ddd;
    payload.whatsapp = phone.data.whatsapp;
    payload.telefone_normalizado = phone.data.telefoneNormalizado;
  }
  if (
    typeof payload.nome !== "string" ||
    payload.nome.length < 2 ||
    (payload.status && typeof payload.status !== "string")
  )
    redirect(`/admin/leads/${id}?error=invalid`);
  const { supabase, user } = await context();
  if (
    typeof payload.status === "string" &&
    !(await isValidStatus(supabase, payload.status))
  )
    redirect(`/admin/leads/${id}?error=invalid`);
  const { error } = await supabase
    .from("leads")
    .update({ ...payload, updated_by: user.id })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) redirect(`/admin/leads/${id}?error=save`);
  await supabase.from("atividades").insert({
    ref_tipo: "lead",
    ref_id: id,
    tipo: "edicao",
    descricao: "Dados do lead atualizados",
    autor_id: user.id,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  redirect(`/admin/leads/${id}?saved=1`);
}

async function findExistingRecords(
  admin: ReturnType<typeof createAdminClient>,
  phone: string,
  email: string | null,
  excludedLeadId: string,
) {
  const leadQueries = [
    admin
      .from("leads")
      .select("id")
      .eq("telefone_normalizado", phone)
      .neq("id", excludedLeadId)
      .is("deleted_at", null)
      .is("convertido_em", null),
  ];
  const customerQueries = [
    admin
      .from("clientes")
      .select("id")
      .eq("telefone_normalizado", phone)
      .is("deleted_at", null),
  ];
  if (email) {
    const safe = email.toLowerCase().replace(/[\\%_]/g, "\\$&");
    leadQueries.push(
      admin
        .from("leads")
        .select("id")
        .ilike("email", safe)
        .neq("id", excludedLeadId)
        .is("deleted_at", null)
        .is("convertido_em", null),
    );
    customerQueries.push(
      admin
        .from("clientes")
        .select("id")
        .ilike("email", safe)
        .is("deleted_at", null),
    );
  }
  const results = await Promise.all([...leadQueries, ...customerQueries]);
  const split = leadQueries.length;
  return {
    leads: Array.from(
      new Set(
        results
          .slice(0, split)
          .flatMap((result) => (result.data ?? []).map((row) => row.id)),
      ),
    ),
    clientes: Array.from(
      new Set(
        results
          .slice(split)
          .flatMap((result) => (result.data ?? []).map((row) => row.id)),
      ),
    ),
  };
}

async function isValidStatus(
  supabase: ReturnType<typeof createClient>,
  status: string,
) {
  const { data } = await supabase
    .from("funil_etapas")
    .select("id")
    .eq("nome", status)
    .maybeSingle();
  return Boolean(data);
}

const inactivationSchema = z
  .object({
    motivoId: z.string().uuid(),
    detalhamento: z.string().trim().max(500).default(""),
    contatoFuturo: z.boolean(),
    dataContatoFuturo: z.string().date().nullable(),
  })
  .refine((value) => !value.contatoFuturo || Boolean(value.dataContatoFuturo), {
    message: "Informe a data da próxima tentativa.",
  });

export async function inactivateLead(
  id: string,
  input: z.input<typeof inactivationSchema>,
) {
  const parsed = z
    .object({ id: z.string().uuid(), input: inactivationSchema })
    .safeParse({ id, input });
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  const { supabase } = await context();
  const { error } = await supabase.rpc("inativar_lead", {
    p_lead_id: parsed.data.id,
    p_motivo_id: parsed.data.input.motivoId,
    p_detalhamento: parsed.data.input.detalhamento,
    p_contato_futuro: parsed.data.input.contatoFuturo,
    p_data_contato_futuro: parsed.data.input.contatoFuturo
      ? parsed.data.input.dataContatoFuturo
      : null,
  });
  if (error) {
    console.error("Falha ao inativar lead", {
      leadId: id,
      code: error.code,
      message: error.message,
    });
    return { ok: false, error: friendlyLifecycleError(error.message) };
  }
  await supabase
    .from("leads")
    .update({
      cadencia_finalizada_em: new Date().toISOString(),
      proxima_tentativa_em: null,
    })
    .eq("id", id)
    .eq("status_ativacao", "inativo");
  revalidateLeadLifecycle(id);
  return { ok: true };
}

export async function reactivateLead(id: string, stage: string) {
  const parsed = z
    .object({ id: z.string().uuid(), stage: z.string().trim().min(1).max(100) })
    .safeParse({ id, stage });
  if (!parsed.success) return { ok: false, error: "Etapa inválida." };
  const { supabase } = await context();
  const { error } = await supabase.rpc("reativar_lead", {
    p_lead_id: parsed.data.id,
    p_etapa: parsed.data.stage,
  });
  if (error) {
    console.error("Falha ao reativar lead", {
      leadId: id,
      code: error.code,
      message: error.message,
    });
    return { ok: false, error: friendlyLifecycleError(error.message) };
  }
  revalidateLeadLifecycle(id);
  return { ok: true };
}

export async function updateLeadFutureContact(
  id: string,
  input: { contatoFuturo: boolean; dataContatoFuturo: string | null },
) {
  const parsed = z
    .object({
      id: z.string().uuid(),
      contatoFuturo: z.boolean(),
      dataContatoFuturo: z.string().date().nullable(),
    })
    .refine(
      (value) => !value.contatoFuturo || Boolean(value.dataContatoFuturo),
      {
        message: "Informe a data da próxima tentativa.",
      },
    )
    .safeParse({ id, ...input });
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  const { supabase } = await context();
  const { error } = await supabase.rpc("atualizar_contato_futuro_lead", {
    p_lead_id: parsed.data.id,
    p_contato_futuro: parsed.data.contatoFuturo,
    p_data_contato_futuro: parsed.data.contatoFuturo
      ? parsed.data.dataContatoFuturo
      : null,
  });
  if (error) {
    console.error("Falha ao atualizar contato futuro", {
      leadId: id,
      code: error.code,
      message: error.message,
    });
    return { ok: false, error: friendlyLifecycleError(error.message) };
  }
  revalidateLeadLifecycle(id);
  return { ok: true };
}

function revalidateLeadLifecycle(id: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/inativos");
  revalidatePath("/admin/agenda");
  revalidatePath(`/admin/leads/${id}`);
}

function friendlyLifecycleError(message: string) {
  const expected = [
    "Usuário não autorizado.",
    "O detalhamento deve ter no máximo 500 caracteres.",
    "A próxima tentativa deve ser a partir de amanhã.",
    "Lead não encontrado ou já convertido.",
    "Lead inativo não encontrado.",
    "Motivo de inativação inválido ou inativo.",
    "Etapa do funil inválida.",
  ];
  return (
    expected.find((item) => message.includes(item)) ??
    "Não foi possível atualizar o ciclo de vida do lead."
  );
}

export async function addLeadNote(id: string, formData: FormData) {
  const note = z
    .string()
    .trim()
    .min(2)
    .max(3000)
    .safeParse(formData.get("nota"));
  if (!note.success || !z.string().uuid().safeParse(id).success)
    redirect(`/admin/leads/${id}?error=note`);
  const { supabase, user } = await context();
  const { error } = await supabase.from("atividades").insert({
    ref_tipo: "lead",
    ref_id: id,
    tipo: "nota",
    descricao: note.data,
    autor_id: user.id,
  });
  if (error) redirect(`/admin/leads/${id}?error=note`);
  revalidatePath(`/admin/leads/${id}`);
  redirect(`/admin/leads/${id}?saved=note`);
}
