"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { sanitizeArticleHtml } from "@/lib/articles";
import { createClient } from "@/lib/supabase/server";

const articleSchema = z.object({
  titulo: z.string().trim().min(4).max(180),
  subtitulo: optionalText(300),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  meta_description: optionalText(170),
  categoria: optionalText(80),
  cluster: z
    .enum(["Regularização", "Cobranças", "Erros", "Custos", "Sistemas RFB"])
    .nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20),
  prioridade_seo: z.number().min(0).max(1),
  schema_type: z.enum(["Article", "BlogPosting", "NewsArticle"]),
  publicado: z.boolean(),
  conteudo_html: z
    .string()
    .min(1)
    .max(500_000)
    .refine(
      (html) =>
        html
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim().length > 0,
      "O conteúdo do artigo é obrigatório.",
    ),
  faq: z
    .array(
      z.object({
        pergunta: z.string().trim().min(2).max(300),
        resposta: z.string().trim().min(2).max(2000),
      }),
    )
    .max(30),
});

function optionalText(max: number) {
  return z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(max).nullable(),
  );
}

async function context() {
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
  return { supabase, user };
}

function parseArticle(formData: FormData) {
  let faq: unknown = [];
  try {
    faq = JSON.parse(String(formData.get("faq") || "[]"));
  } catch {
    faq = null;
  }
  const sanitized = sanitizeArticleHtml(
    String(formData.get("conteudo_html") || ""),
  );
  return articleSchema.safeParse({
    titulo: formData.get("titulo"),
    subtitulo: formData.get("subtitulo"),
    slug: formData.get("slug"),
    meta_description: formData.get("meta_description"),
    categoria: formData.get("categoria"),
    cluster: formData.get("cluster") || null,
    tags: String(formData.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    prioridade_seo: Number(formData.get("prioridade_seo") || 0.8),
    schema_type: formData.get("schema_type") || "Article",
    publicado: formData.get("publicado") === "on",
    conteudo_html: sanitized,
    faq,
  });
}

async function uploadOgImage(
  supabase: ReturnType<typeof createClient>,
  file: FormDataEntryValue | null,
) {
  if (!(file instanceof File) || file.size === 0) return null;
  const allowed = new Map([
    ["image/png", "png"],
    ["image/jpeg", "jpg"],
    ["image/webp", "webp"],
  ]);
  const extension = allowed.get(file.type);
  if (!extension || file.size > 5 * 1024 * 1024)
    throw new Error("Imagem OG inválida. Use PNG, JPG ou WebP de até 5 MB.");
  const path = `artigos/${Date.now()}-${randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("og-images")
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) throw new Error(`Falha no upload da imagem: ${error.message}`);
  return supabase.storage.from("og-images").getPublicUrl(path).data.publicUrl;
}

export async function createArticle(formData: FormData) {
  const parsed = parseArticle(formData);
  if (!parsed.success) redirect("/admin/artigos/novo?error=invalid");
  const { supabase, user } = await context();
  let ogImageUrl: string | null;
  try {
    ogImageUrl = await uploadOgImage(supabase, formData.get("og_image"));
  } catch (error) {
    console.error("Falha ao enviar imagem OG", error);
    redirect(
      `/admin/artigos/novo?error=${error instanceof Error && error.message.startsWith("Imagem OG inválida") ? "image_invalid" : "image_upload"}`,
    );
  }
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("artigos")
    .insert({
      ...parsed.data,
      og_image_url: ogImageUrl,
      autor_id: user.id,
      updated_by: user.id,
      data_publicacao: parsed.data.publicado ? now : null,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("Falha ao criar artigo", error);
    redirect("/admin/artigos/novo?error=save");
  }
  revalidateArticles(parsed.data.slug);
  redirect(`/admin/artigos/${data.id}?saved=1`);
}

export async function updateArticle(id: string, formData: FormData) {
  if (!z.string().uuid().safeParse(id).success)
    throw new Error("Artigo inválido.");
  const parsed = parseArticle(formData);
  if (!parsed.success) redirect(`/admin/artigos/${id}?error=invalid`);
  const { supabase, user } = await context();
  const { data: current } = await supabase
    .from("artigos")
    .select("slug,og_image_url,data_publicacao")
    .eq("id", id)
    .single();
  if (!current) redirect("/admin/artigos?error=not_found");
  let ogImageUrl = current.og_image_url;
  try {
    ogImageUrl =
      (await uploadOgImage(supabase, formData.get("og_image"))) ?? ogImageUrl;
  } catch (error) {
    console.error("Falha ao enviar imagem OG", error);
    redirect(
      `/admin/artigos/${id}?error=${error instanceof Error && error.message.startsWith("Imagem OG inválida") ? "image_invalid" : "image_upload"}`,
    );
  }
  const { error } = await supabase
    .from("artigos")
    .update({
      ...parsed.data,
      slug: current.slug,
      og_image_url: ogImageUrl,
      updated_by: user.id,
      data_publicacao:
        parsed.data.publicado && !current.data_publicacao
          ? new Date().toISOString()
          : current.data_publicacao,
    })
    .eq("id", id);
  if (error) {
    console.error("Falha ao atualizar artigo", error);
    redirect(`/admin/artigos/${id}?error=save`);
  }
  revalidateArticles(current.slug);
  redirect(`/admin/artigos/${id}?saved=1`);
}

function revalidateArticles(slug: string) {
  revalidatePath("/artigos");
  revalidatePath(`/artigos/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/artigos");
}
