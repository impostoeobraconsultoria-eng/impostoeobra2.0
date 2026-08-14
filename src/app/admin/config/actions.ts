"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const configSchema = z.object({
  chave: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/),
  valor: z.string().trim().max(20_000).nullable(),
  descricao: z.string().trim().max(500).nullable(),
});

function parse(formData: FormData) {
  const text = (field: string) => {
    const value = String(formData.get(field) ?? "").trim();
    return value || null;
  };
  return configSchema.safeParse({
    chave: formData.get("chave"),
    valor: text("valor"),
    descricao: text("descricao"),
  });
}

async function getAdminClient() {
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
    .single();
  if (!admin) throw new Error("Acesso restrito a administradores.");
  return supabase;
}

export async function createConfig(formData: FormData) {
  const parsed = parse(formData);
  if (!parsed.success) redirect("/admin/config?new=1&error=invalid");
  const supabase = await getAdminClient();
  const { error } = await supabase.from("config").insert(parsed.data);
  if (error) {
    console.error("Falha ao criar configuração", { code: error.code });
    redirect(
      `/admin/config?new=1&error=${error.code === "23505" ? "duplicate" : "save"}`,
    );
  }
  refreshConfig();
  redirect("/admin/config?saved=created");
}

export async function updateConfig(key: string, formData: FormData) {
  if (!configSchema.shape.chave.safeParse(key).success)
    throw new Error("Configuração inválida.");
  const parsed = parse(formData);
  if (!parsed.success || parsed.data.chave !== key)
    redirect(`/admin/config?edit=${encodeURIComponent(key)}&error=invalid`);
  const supabase = await getAdminClient();
  const { error } = await supabase
    .from("config")
    .update({
      valor: parsed.data.valor,
      descricao: parsed.data.descricao,
    })
    .eq("chave", key);
  if (error) {
    console.error("Falha ao atualizar configuração", { code: error.code });
    redirect(`/admin/config?edit=${encodeURIComponent(key)}&error=save`);
  }
  refreshConfig();
  redirect("/admin/config?saved=updated");
}

function refreshConfig() {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/config");
}
