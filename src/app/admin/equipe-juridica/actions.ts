"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => String(value ?? "").trim() || null,
    z.string().max(max).nullable(),
  );
const memberSchema = z.object({
  nome: z.string().trim().min(2).max(160),
  oab: optionalText(100),
  papel: z.string().trim().min(2).max(180),
  descricao: optionalText(3000),
  ordem: z.coerce.number().int().min(0).max(9999),
  publicado: z.boolean(),
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

function parse(formData: FormData) {
  return memberSchema.safeParse({
    ...Object.fromEntries(formData),
    publicado: formData.get("publicado") === "on",
  });
}

async function uploadPhoto(
  supabase: Awaited<ReturnType<typeof adminContext>>,
  file: FormDataEntryValue | null,
) {
  if (!(file instanceof File) || file.size === 0) return null;
  const extensions = new Map([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ]);
  const extension = extensions.get(file.type);
  if (!extension || file.size > 5 * 1024 * 1024)
    throw new Error("Use uma foto JPG, PNG ou WebP de até 5 MB.");
  const path = `equipe/${Date.now()}-${randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("og-images")
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) throw error;
  return supabase.storage.from("og-images").getPublicUrl(path).data.publicUrl;
}

export async function createMember(formData: FormData) {
  const parsed = parse(formData);
  if (!parsed.success) redirect("/admin/equipe-juridica?new=1&error=invalid");
  const supabase = await adminContext();
  let fotoUrl: string | null = null;
  try {
    fotoUrl = await uploadPhoto(supabase, formData.get("foto"));
  } catch (error) {
    console.error("Falha no upload da foto da equipe", error);
    redirect(
      `/admin/equipe-juridica?new=1&error=${error instanceof Error && error.message.startsWith("Use uma foto") ? "image_invalid" : "image_upload"}`,
    );
  }
  const { error } = await supabase
    .from("equipe_juridica")
    .insert({ ...parsed.data, foto_url: fotoUrl });
  if (error) redirect("/admin/equipe-juridica?new=1&error=save");
  refresh();
  redirect("/admin/equipe-juridica?saved=1");
}

export async function updateMember(id: string, formData: FormData) {
  if (!z.string().uuid().safeParse(id).success) throw new Error("ID inválido.");
  const parsed = parse(formData);
  if (!parsed.success)
    redirect(`/admin/equipe-juridica?edit=${id}&error=invalid`);
  const supabase = await adminContext();
  const { data: current } = await supabase
    .from("equipe_juridica")
    .select("foto_url")
    .eq("id", id)
    .maybeSingle();
  if (!current) redirect("/admin/equipe-juridica?error=not_found");
  let fotoUrl = current.foto_url;
  try {
    fotoUrl = (await uploadPhoto(supabase, formData.get("foto"))) ?? fotoUrl;
  } catch (error) {
    console.error("Falha no upload da foto da equipe", error);
    redirect(
      `/admin/equipe-juridica?edit=${id}&error=${error instanceof Error && error.message.startsWith("Use uma foto") ? "image_invalid" : "image_upload"}`,
    );
  }
  const { error } = await supabase
    .from("equipe_juridica")
    .update({ ...parsed.data, foto_url: fotoUrl })
    .eq("id", id);
  if (error) redirect(`/admin/equipe-juridica?edit=${id}&error=save`);
  refresh();
  redirect("/admin/equipe-juridica?saved=1");
}

export async function deleteMember(id: string) {
  if (!z.string().uuid().safeParse(id).success)
    return { ok: false, error: "Membro inválido." };
  const supabase = await adminContext();
  const { error } = await supabase
    .from("equipe_juridica")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function reorderMembers(ids: string[]) {
  const parsed = z.array(z.string().uuid()).min(1).max(100).safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Ordem inválida." };
  const supabase = await adminContext();
  const updates = await Promise.all(
    parsed.data.map((id, index) =>
      supabase
        .from("equipe_juridica")
        .update({ ordem: (index + 1) * 10 })
        .eq("id", id),
    ),
  );
  const failed = updates.find(({ error }) => error);
  if (failed?.error) return { ok: false, error: failed.error.message };
  refresh();
  return { ok: true };
}

function refresh() {
  revalidatePath("/sobre");
  revalidatePath("/admin/equipe-juridica");
}
