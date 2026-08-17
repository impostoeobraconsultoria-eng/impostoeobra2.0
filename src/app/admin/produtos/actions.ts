"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const productSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/)
    .max(160),
  descricao: z.string().trim().max(3000).nullable(),
  template_contrato_arq: z.string().trim().max(255).nullable(),
  ordem: z.number().int().min(0).max(100000),
  ativo: z.boolean(),
});

async function adminContext() {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string") throw new Error("Sessão expirada.");
  const { data: admin } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .eq("ativo", true)
    .eq("perfil", "admin")
    .maybeSingle();
  if (!admin) throw new Error("Acesso restrito a administradores.");
  return supabase;
}

export async function saveProduct(raw: unknown) {
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  const supabase = await adminContext();
  const { id, ...values } = parsed.data;
  const query = id
    ? supabase
        .from("produtos")
        .update({
          nome: values.nome,
          descricao: values.descricao,
          template_contrato_arq: values.template_contrato_arq,
          ordem: values.ordem,
          ativo: values.ativo,
        })
        .eq("id", id)
    : supabase.from("produtos").insert(values);
  const { error } = await query;
  if (error)
    return {
      ok: false,
      error:
        error.code === "23505" ? "Este slug já está em uso." : error.message,
    };
  revalidatePath("/admin/produtos");
  return { ok: true };
}

export async function duplicateProduct(id: string) {
  if (!z.string().uuid().safeParse(id).success)
    return { ok: false, error: "Produto inválido." };
  const supabase = await adminContext();
  const { data, error } = await supabase
    .from("produtos")
    .select("nome,slug,descricao,template_contrato_arq,ordem,ativo")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Produto não encontrado." };
  const suffix = Date.now().toString().slice(-8);
  const { error: insertError } = await supabase.from("produtos").insert({
    ...data,
    nome: `${data.nome} (cópia)`,
    slug: `${data.slug}_copia_${suffix}`,
    ordem: Number(data.ordem ?? 100) + 1,
    ativo: false,
  });
  if (insertError) return { ok: false, error: insertError.message };
  revalidatePath("/admin/produtos");
  return { ok: true };
}

export async function reorderProducts(ids: string[]) {
  const parsed = z.array(z.string().uuid()).min(1).max(200).safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Ordem inválida." };
  const supabase = await adminContext();
  for (let index = 0; index < parsed.data.length; index += 1) {
    const id = parsed.data[index];
    const { error } = await supabase
      .from("produtos")
      .update({ ordem: (index + 1) * 10 })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/produtos");
  return { ok: true };
}
