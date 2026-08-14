"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const userSchema = z.object({
  nome: z.string().trim().min(2).max(160),
  email: z.string().trim().toLowerCase().email().max(320),
  perfil: z.enum(["admin", "consultor"]),
  ativo: z.boolean(),
});

function parse(formData: FormData) {
  return userSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    perfil: formData.get("perfil"),
    ativo: formData.get("ativo") === "on",
  });
}

async function adminContext() {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string") throw new Error("Sessão expirada.");
  const normalizedEmail = email.toLowerCase();
  const { data: admin } = await supabase
    .from("users")
    .select("id,email")
    .eq("email", normalizedEmail)
    .eq("ativo", true)
    .eq("perfil", "admin")
    .single();
  if (!admin) throw new Error("Acesso restrito a administradores.");
  return { supabase, admin };
}

export async function createUser(formData: FormData) {
  const parsed = parse(formData);
  if (!parsed.success) redirect("/admin/usuarios?new=1&error=invalid");
  const { supabase } = await adminContext();
  const { error } = await supabase.from("users").insert(parsed.data);
  if (error) {
    console.error("Falha ao cadastrar usuário", { code: error.code });
    redirect(
      `/admin/usuarios?new=1&error=${error.code === "23505" ? "duplicate" : "save"}`,
    );
  }
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?saved=created");
}

export async function updateUser(id: string, formData: FormData) {
  if (!z.string().uuid().safeParse(id).success)
    throw new Error("Usuário inválido.");
  const parsed = parse(formData);
  if (!parsed.success) redirect(`/admin/usuarios?edit=${id}&error=invalid`);
  const { supabase, admin } = await adminContext();
  const { data: current } = await supabase
    .from("users")
    .select("id,email,perfil,ativo")
    .eq("id", id)
    .single();
  if (!current) redirect("/admin/usuarios?error=not_found");

  const isSelf = current.id === admin.id;
  if (isSelf && (!parsed.data.ativo || parsed.data.perfil !== "admin"))
    redirect(`/admin/usuarios?edit=${id}&error=self_access`);

  const removesActiveAdmin =
    current.ativo &&
    current.perfil === "admin" &&
    (!parsed.data.ativo || parsed.data.perfil !== "admin");
  if (removesActiveAdmin) {
    const { count } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("ativo", true)
      .eq("perfil", "admin")
      .neq("id", id);
    if (!count) redirect(`/admin/usuarios?edit=${id}&error=last_admin`);
  }

  const { error } = await supabase
    .from("users")
    .update({
      nome: parsed.data.nome,
      perfil: parsed.data.perfil,
      ativo: parsed.data.ativo,
    })
    .eq("id", id);
  if (error) {
    console.error("Falha ao atualizar usuário", { code: error.code });
    redirect(`/admin/usuarios?edit=${id}&error=save`);
  }
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin");
  redirect("/admin/usuarios?saved=updated");
}
