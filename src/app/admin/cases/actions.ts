"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(max).nullable(),
  );
const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? null : Number(value)),
  z.number().finite().nonnegative().nullable(),
);
const caseSchema = z.object({
  cliente_display: z.string().trim().min(2).max(160),
  tipo_obra: optionalText(120),
  economia_valor: optionalNumber,
  economia_pct: z.preprocess(
    (value) => (value === "" || value == null ? null : Number(value)),
    z.number().finite().min(0).max(100).nullable(),
  ),
  descricao: optionalText(3000),
  imagem_url: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().url().max(1000).nullable(),
  ),
  ordem: z.preprocess(
    (value) => Number(value || 100),
    z.number().int().min(0).max(9999),
  ),
  publicado: z.boolean(),
});

function parse(formData: FormData) {
  return caseSchema.safeParse({
    ...Object.fromEntries(formData),
    publicado: formData.get("publicado") === "on",
  });
}

async function getAuthorizedClient() {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string") throw new Error("Sessão expirada.");
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .eq("ativo", true)
    .single();
  if (!user) throw new Error("Usuário não autorizado.");
  return supabase;
}

export async function createCase(formData: FormData) {
  const parsed = parse(formData);
  if (!parsed.success) redirect("/admin/cases?new=1&error=invalid");
  const supabase = await getAuthorizedClient();
  const { data, error } = await supabase
    .from("cases")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error || !data) {
    console.error("Falha ao criar case", error);
    redirect("/admin/cases?new=1&error=save");
  }
  revalidateCases();
  redirect(`/admin/cases/${data.id}?saved=1`);
}

export async function updateCase(id: string, formData: FormData) {
  if (!z.string().uuid().safeParse(id).success)
    throw new Error("Case inválido.");
  const parsed = parse(formData);
  if (!parsed.success) redirect(`/admin/cases/${id}?error=invalid`);
  const supabase = await getAuthorizedClient();
  const { error } = await supabase
    .from("cases")
    .update(parsed.data)
    .eq("id", id);
  if (error) {
    console.error("Falha ao atualizar case", error);
    redirect(`/admin/cases/${id}?error=save`);
  }
  revalidateCases();
  redirect(`/admin/cases/${id}?saved=1`);
}

function revalidateCases() {
  revalidatePath("/");
  revalidatePath("/admin/cases");
}
