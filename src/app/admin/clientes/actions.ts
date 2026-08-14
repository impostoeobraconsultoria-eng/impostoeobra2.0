"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function context() {
  const supabase = createClient();
  const { data: c } = await supabase.auth.getClaims();
  if (typeof c?.claims.email !== "string") throw new Error("Sessão expirada");
  const { data: u } = await supabase
    .from("users")
    .select("id")
    .eq("email", c.claims.email)
    .eq("ativo", true)
    .single();
  if (!u) throw new Error("Não autorizado");
  return { supabase, user: u };
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
