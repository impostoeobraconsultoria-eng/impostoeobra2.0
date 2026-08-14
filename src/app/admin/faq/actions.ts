"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const faqSchema = z.object({
  pergunta: z.string().trim().min(5).max(500),
  resposta: z.string().trim().min(5).max(5000),
  categoria: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(100).nullable(),
  ),
  ordem: z.preprocess(
    (value) => Number(value || 100),
    z.number().int().min(0).max(9999),
  ),
  publicado: z.boolean(),
});

function parse(formData: FormData) {
  return faqSchema.safeParse({
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

export async function createFaq(formData: FormData) {
  const parsed = parse(formData);
  if (!parsed.success) redirect("/admin/faq?new=1&error=invalid");
  const supabase = await getAuthorizedClient();
  const { error } = await supabase.from("faq").insert(parsed.data);
  if (error) {
    console.error("Falha ao criar FAQ", error);
    redirect("/admin/faq?new=1&error=save");
  }
  revalidateFaq();
  redirect("/admin/faq?saved=created");
}

export async function updateFaq(id: string, formData: FormData) {
  if (!z.string().uuid().safeParse(id).success)
    throw new Error("FAQ inválida.");
  const parsed = parse(formData);
  if (!parsed.success) redirect(`/admin/faq?edit=${id}&error=invalid`);
  const supabase = await getAuthorizedClient();
  const { error } = await supabase.from("faq").update(parsed.data).eq("id", id);
  if (error) {
    console.error("Falha ao atualizar FAQ", error);
    redirect(`/admin/faq?edit=${id}&error=save`);
  }
  revalidateFaq();
  redirect("/admin/faq?saved=updated");
}

function revalidateFaq() {
  revalidatePath("/");
  revalidatePath("/admin/faq");
}
