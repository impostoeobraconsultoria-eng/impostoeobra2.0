"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseBrazilianMobile } from "@/lib/ddds-brasileiros";

async function context() {
  const supabase = createClient();
  const { data: c } = await supabase.auth.getClaims();
  if (typeof c?.claims.email !== "string") throw new Error("Sessão expirada");
  const { data: u } = await supabase
    .from("users")
    .select("id,perfil")
    .eq("email", c.claims.email)
    .eq("ativo", true)
    .single();
  if (!u) throw new Error("Não autorizado");
  return { supabase, user: u };
}

async function adminContext() {
  const value = await context();
  if (value.user.perfil !== "admin")
    throw new Error("Acesso restrito a administradores.");
  return value;
}

const uuid = z.string().uuid();
const noteContent = z.string().trim().min(2).max(3000);

export async function updateDossierLink(
  customerId: string,
  formData: FormData,
) {
  const parsed = z
    .object({
      customerId: uuid,
      link: z.preprocess(
        (value) => (String(value ?? "").trim() === "" ? null : value),
        z.string().trim().url().startsWith("https://").max(1000).nullable(),
      ),
    })
    .safeParse({ customerId, link: formData.get("link_dossie") });
  if (!parsed.success)
    return { ok: false, error: "Informe uma URL https válida." };
  const { supabase, user } = await context();
  const { error } = await supabase
    .from("clientes")
    .update({ link_dossie: parsed.data.link })
    .eq("id", parsed.data.customerId)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };
  await supabase.from("atividades").insert({
    ref_tipo: "cliente",
    ref_id: customerId,
    tipo: "edicao",
    descricao: parsed.data.link
      ? "Link do dossiê atualizado"
      : "Link do dossiê removido",
    autor_id: user.id,
  });
  revalidatePath(`/admin/clientes/${customerId}`);
  return { ok: true };
}

export async function addCustomerNote(customerId: string, formData: FormData) {
  const parsed = z
    .object({ customerId: uuid, conteudo: noteContent })
    .safeParse({ customerId, conteudo: formData.get("conteudo") });
  if (!parsed.success)
    return { ok: false, error: "A nota deve ter entre 2 e 3.000 caracteres." };
  const { supabase, user } = await context();
  const { error } = await supabase.from("cliente_notas").insert({
    cliente_id: parsed.data.customerId,
    autor_id: user.id,
    conteudo: parsed.data.conteudo,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clientes/${customerId}`);
  return { ok: true };
}

export async function updateCustomerNote(noteId: string, formData: FormData) {
  const parsed = z
    .object({ noteId: uuid, conteudo: noteContent })
    .safeParse({ noteId, conteudo: formData.get("conteudo") });
  if (!parsed.success) return { ok: false, error: "Nota inválida." };
  const { supabase, user } = await context();
  let query = supabase
    .from("cliente_notas")
    .update({ conteudo: parsed.data.conteudo })
    .eq("id", parsed.data.noteId)
    .is("deleted_at", null);
  if (user.perfil !== "admin") query = query.eq("autor_id", user.id);
  const { data, error } = await query.select("cliente_id").maybeSingle();
  if (error || !data)
    return { ok: false, error: "Você não pode editar esta nota." };
  revalidatePath(`/admin/clientes/${data.cliente_id}`);
  return { ok: true };
}

export async function deleteCustomerNote(noteId: string) {
  if (!uuid.safeParse(noteId).success)
    return { ok: false, error: "Nota inválida." };
  const { supabase, user } = await context();
  if (user.perfil !== "admin")
    return { ok: false, error: "Somente administradores podem excluir notas." };
  const { data, error } = await supabase
    .from("cliente_notas")
    .delete()
    .eq("id", noteId)
    .select("cliente_id")
    .maybeSingle();
  if (error || !data)
    return { ok: false, error: error?.message ?? "Nota não encontrada." };
  revalidatePath(`/admin/clientes/${data.cliente_id}`);
  return { ok: true };
}
const fields = [
  "nome",
  "cpf",
  "cnpj",
  "rg",
  "data_nascimento",
  "estado_civil",
  "profissao",
  "ddd",
  "telefone",
  "email",
  "end_logradouro",
  "end_bairro",
  "end_cidade",
  "end_uf",
  "end_cep",
  "obra_end_logradouro",
  "obra_end_bairro",
  "obra_end_cidade",
  "obra_end_uf",
  "obra_matricula",
  "obra_iptu",
  "obra_tipo",
  "obra_descricao",
  "banco",
  "agencia",
  "conta",
  "tipo_conta",
  "pix",
  "obs_contrato",
];
function values(f: FormData) {
  const payload = Object.fromEntries(
    fields.map((k) => [k, String(f.get(k) ?? "").trim() || null]),
  );
  const phoneRaw = String(f.get("telefone_contato") ?? "");
  if (phoneRaw) {
    const phone = parseBrazilianMobile(phoneRaw);
    if (!phone.ok) return { ...payload, telefone_invalido: phone.error };
    payload.ddd = phone.data.ddd;
    payload.telefone = phone.data.whatsapp;
    payload.telefone_normalizado = phone.data.telefoneNormalizado;
  }
  return payload;
}
export async function createCustomer(f: FormData) {
  const p = values(f);
  if (!p.nome || p.telefone_invalido)
    redirect("/admin/clientes?new=1&error=invalid");
  delete p.telefone_invalido;
  const { supabase, user } = await context();
  const { data, error } = await supabase
    .from("clientes")
    .insert({ ...p, criado_por: user.id })
    .select("id")
    .single();
  if (error || !data) redirect("/admin/clientes?new=1&error=save");
  await supabase.from("atividades").insert({
    ref_tipo: "cliente",
    ref_id: data.id,
    tipo: "criacao",
    descricao: "Cliente criado manualmente",
    autor_id: user.id,
  });
  revalidatePath("/admin/clientes");
  redirect(`/admin/clientes/${data.id}?saved=1`);
}
export async function updateCustomer(id: string, f: FormData) {
  const payload = values(f);
  if (payload.telefone_invalido)
    redirect(`/admin/clientes/${id}?error=invalid_phone`);
  delete payload.telefone_invalido;
  const { supabase, user } = await context();
  const { error } = await supabase
    .from("clientes")
    .update(payload)
    .eq("id", id)
    .is("deleted_at", null);
  if (error) redirect(`/admin/clientes/${id}?error=save`);
  await supabase.from("atividades").insert({
    ref_tipo: "cliente",
    ref_id: id,
    tipo: "edicao",
    descricao: "Dados do cliente atualizados",
    autor_id: user.id,
  });
  revalidatePath("/admin/clientes");
  redirect(`/admin/clientes/${id}?saved=1`);
}
export async function convertLead(id: string) {
  const { supabase } = await context();
  const { data: sourceLead } = await supabase
    .from("leads")
    .select("valor_potencial")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  const { data, error } = await supabase.rpc("converter_lead_em_cliente", {
    p_lead_id: id,
  });
  if (error || !data) {
    console.error("Falha ao converter lead em cliente", {
      leadId: id,
      code: error?.code,
      message: error?.message,
    });
    const reason = /já convertido/i.test(error?.message ?? "")
      ? "already_converted"
      : /não encontrado/i.test(error?.message ?? "")
        ? "lead_not_found"
        : "convert";
    redirect(`/admin/leads/${id}?error=${reason}`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/convertidos");
  revalidatePath("/admin/clientes");
  const query = new URLSearchParams({
    saved: "converted",
    ga_event: "close_convert_lead",
    lead_id: id,
    cliente_id: String(data),
    event_value: String(Number(sourceLead?.valor_potencial ?? 0)),
  });
  redirect(`/admin/clientes/${data}?${query}`);
}

export async function softDeleteCustomer(id: string) {
  if (!uuid.safeParse(id).success)
    return { ok: false, error: "Cliente inválido." };
  const { supabase, user } = await adminContext();
  const { error } = await supabase
    .from("clientes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };
  await supabase.from("atividades").insert({
    ref_tipo: "cliente",
    ref_id: id,
    tipo: "exclusao",
    descricao: "Cliente movido para a lixeira",
    autor_id: user.id,
  });
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/clientes/lixeira");
  revalidatePath("/admin");
  return { ok: true };
}

export async function restoreCustomer(id: string) {
  if (!uuid.safeParse(id).success)
    return { ok: false, error: "Cliente inválido." };
  const { supabase, user } = await adminContext();
  const { error } = await supabase
    .from("clientes")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null);
  if (error) return { ok: false, error: error.message };
  await supabase.from("atividades").insert({
    ref_tipo: "cliente",
    ref_id: id,
    tipo: "restauracao",
    descricao: "Cliente restaurado da lixeira",
    autor_id: user.id,
  });
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/clientes/lixeira");
  revalidatePath("/admin");
  return { ok: true };
}

export async function permanentlyDeleteCustomer(id: string) {
  if (!uuid.safeParse(id).success)
    return { ok: false, error: "Cliente inválido." };
  const { supabase } = await adminContext();
  const { count, error: countError } = await supabase
    .from("contratos")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", id);
  if (countError) return { ok: false, error: countError.message };
  if ((count ?? 0) > 0)
    return {
      ok: false,
      error:
        "Não é possível excluir permanentemente — há contratos vinculados.",
    };
  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id)
    .not("deleted_at", "is", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/clientes/lixeira");
  return { ok: true };
}
