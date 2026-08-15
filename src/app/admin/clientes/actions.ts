"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
  return Object.fromEntries(
    fields.map((k) => [k, String(f.get(k) ?? "").trim() || null]),
  );
}
export async function createCustomer(f: FormData) {
  const p = values(f);
  if (!p.nome) redirect("/admin/clientes?new=1&error=invalid");
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
  const { supabase, user } = await context();
  const { error } = await supabase
    .from("clientes")
    .update(values(f))
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
  const { data, error } = await supabase.rpc("converter_lead_em_cliente", {
    p_lead_id: id,
  });
  if (error || !data) redirect(`/admin/leads/${id}?error=convert`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin/clientes");
  redirect(`/admin/clientes/${data}?saved=converted`);
}
