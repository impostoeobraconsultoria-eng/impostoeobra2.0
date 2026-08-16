"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const statuses = ["em vigor", "concluído", "cancelado"] as const;
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
function parse(f: FormData) {
  const raw = Object.fromEntries(f);
  const schema = z.object({
    cliente_id: z.string().uuid(),
    numero: z.string().trim().max(80).nullable(),
    produto: z.enum(["obra_andamento", "obra_finalizada"]),
    status: z.enum(statuses),
    valor_total: z.number().nonnegative().nullable(),
    valor_pago: z.number().nonnegative().nullable(),
    forma_pagamento: z.string().trim().max(160).nullable(),
    parcelas: z.number().int().positive().nullable(),
    data_assinatura: z.string().nullable(),
    data_inicio: z.string().nullable(),
    data_conclusao: z.string().nullable(),
    observacoes: z.string().trim().max(3000).nullable(),
  });
  const n = (k: string) => (raw[k] === "" ? null : Number(raw[k]));
  const t = (k: string) => (raw[k] === "" ? null : String(raw[k]));
  return schema.safeParse({
    ...raw,
    numero: t("numero"),
    valor_total: n("valor_total"),
    valor_pago: n("valor_pago"),
    forma_pagamento: t("forma_pagamento"),
    parcelas: n("parcelas"),
    data_assinatura: t("data_assinatura"),
    data_inicio: t("data_inicio"),
    data_conclusao: t("data_conclusao"),
    observacoes: t("observacoes"),
  });
}
export async function createContract(f: FormData) {
  const p = parse(f);
  if (!p.success) redirect("/admin/contratos/novo?error=invalid");
  const { supabase, user } = await context();
  const { data, error } = await supabase
    .from("contratos")
    .insert(p.data)
    .select("id")
    .single();
  if (error || !data) redirect("/admin/contratos/novo?error=save");
  await supabase.from("atividades").insert({
    ref_tipo: "contrato",
    ref_id: data.id,
    tipo: "criacao",
    descricao: "Contrato criado",
    autor_id: user.id,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/contratos");
  redirect(`/admin/contratos/${data.id}?saved=1`);
}

export async function createCustomerContract(customerId: string, f: FormData) {
  f.set("cliente_id", customerId);
  const p = parse(f);
  if (!p.success) redirect(`/admin/clientes/${customerId}?error=contract`);
  const { supabase, user } = await context();
  const { data, error } = await supabase
    .from("contratos")
    .insert(p.data)
    .select("id")
    .single();
  if (error || !data) redirect(`/admin/clientes/${customerId}?error=contract`);
  await supabase.from("atividades").insert({
    ref_tipo: "contrato",
    ref_id: data.id,
    tipo: "criacao",
    descricao: "Contrato criado a partir da vista do cliente",
    autor_id: user.id,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/contratos");
  revalidatePath(`/admin/clientes/${customerId}`);
  redirect(`/admin/clientes/${customerId}?saved=contract`);
}
export async function updateContract(id: string, f: FormData) {
  const p = parse(f);
  if (!p.success) redirect(`/admin/contratos/${id}?error=invalid`);
  const { supabase, user } = await context();
  const { error } = await supabase
    .from("contratos")
    .update(p.data)
    .eq("id", id)
    .is("deleted_at", null);
  if (error) redirect(`/admin/contratos/${id}?error=save`);
  await supabase.from("atividades").insert({
    ref_tipo: "contrato",
    ref_id: id,
    tipo: "edicao",
    descricao: "Contrato atualizado",
    autor_id: user.id,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/contratos");
  redirect(`/admin/contratos/${id}?saved=1`);
}
export async function addContractNote(id: string, f: FormData) {
  const note = z.string().trim().min(2).max(3000).safeParse(f.get("nota"));
  if (!note.success) redirect(`/admin/contratos/${id}?error=note`);
  const { supabase, user } = await context();
  await supabase.from("atividades").insert({
    ref_tipo: "contrato",
    ref_id: id,
    tipo: "nota",
    descricao: note.data,
    autor_id: user.id,
  });
  revalidatePath(`/admin/contratos/${id}`);
  redirect(`/admin/contratos/${id}?saved=note`);
}
