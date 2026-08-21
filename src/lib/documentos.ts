import "server-only";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

type RefTipo = "lead" | "cliente" | "contrato";
type DocumentoTipo =
  | "proposta"
  | "contrato_andamento"
  | "contrato_finalizada"
  | "material_apoio";

export async function requireDocumentUser() {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string") throw new Error("Sessão expirada.");
  const { data: user } = await supabase
    .from("users")
    .select("id,nome,email,perfil")
    .eq("email", email)
    .eq("ativo", true)
    .maybeSingle();
  if (!user) throw new Error("Usuário não autorizado.");
  return user;
}

export async function getConfigMap() {
  const { data, error } = await createAdminClient()
    .from("config")
    .select("chave,valor");
  if (error)
    throw new Error(`Não foi possível carregar Config: ${error.message}`);
  return Object.fromEntries(
    (data ?? []).map((item) => [item.chave, item.valor ?? ""]),
  );
}

export function text(value: unknown) {
  if (value == null) return "—";
  const normalized = String(value).trim();
  return normalized || "—";
}

export function dateBr(value: unknown) {
  if (!value) return new Intl.DateTimeFormat("pt-BR").format(new Date());
  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? text(value)
    : new Intl.DateTimeFormat("pt-BR").format(parsed);
}

export function dateExtenso(value: unknown) {
  const parsed = value
    ? new Date(`${String(value).slice(0, 10)}T12:00:00`)
    : new Date();
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

export function money(value: unknown) {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(number) ? number : 0);
}

export function joinAddress(...parts: unknown[]) {
  const value = parts
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean)
    .join(", ");
  return value || "—";
}

export function mergeAndNormalize(
  defaults: Record<string, unknown>,
  params: Record<string, unknown> | undefined,
  fields: readonly string[],
) {
  const merged = { ...defaults, ...(params ?? {}) };
  return Object.fromEntries(
    fields.map((field) => [field, text(merged[field])]),
  );
}

export async function generateDocx(
  templateName: string,
  values: Record<string, unknown>,
) {
  const admin = createAdminClient();
  const { data: template, error } = await admin.storage
    .from("templates")
    .download(templateName);
  if (error || !template)
    throw new Error(`Template ${templateName} não encontrado.`);
  const zip = new PizZip(await template.arrayBuffer());
  const doc = new Docxtemplater(zip, {
    delimiters: { start: "{{", end: "}}" },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "—",
  });
  doc.render(values);
  if (doc.getFullText().includes("{{") || doc.getFullText().includes("}}")) {
    throw new Error("O documento gerado ainda contém placeholders.");
  }
  const buffer = doc
    .getZip()
    .generate({ type: "nodebuffer", compression: "DEFLATE" });
  return buffer;
}

export function publicDocumentError(
  error: unknown,
  operation: "proposta" | "contrato" | "material",
) {
  const message = error instanceof Error ? error.message : "";
  if (/Template .* não encontrado/i.test(message))
    return "O template configurado não foi encontrado. Verifique o arquivo em Configurações → Templates.";
  if (/placeholder/i.test(message))
    return "O template contém variáveis inválidas ou não preenchidas. Revise o DOCX em Configurações → Templates.";
  if (/zip|corrupt|docx|file type/i.test(message))
    return "O template configurado está corrompido ou não é um DOCX válido.";
  if (/upload/i.test(message))
    return "Não foi possível armazenar o documento gerado. Tente novamente em alguns instantes.";
  if (/registrar documento|registrar atividade/i.test(message))
    return "O arquivo foi gerado, mas não foi possível registrar o histórico. A operação foi desfeita com segurança; tente novamente.";
  if (/assinar download/i.test(message))
    return "O documento foi gerado, mas o link de download não pôde ser criado. Tente baixar novamente pelo histórico de documentos.";
  return operation === "material"
    ? "Não foi possível registrar o material de apoio. Tente novamente."
    : `Não foi possível gerar ${operation === "proposta" ? "a proposta" : "o contrato"}. Revise os dados e tente novamente.`;
}

function safeFileSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function fileName(value: string) {
  return safeFileSegment(value) || "Documento.docx";
}

export async function persistDocx(args: {
  tipo: Exclude<DocumentoTipo, "material_apoio">;
  refTipo: RefTipo;
  refId: string;
  nomeArquivo: string;
  buffer: Buffer;
  params: Record<string, unknown>;
  userId: string;
  descricao: string;
}) {
  const admin = createAdminClient();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const storagePath = `${args.tipo}/${args.refTipo}_${args.refId}/${timestamp}.docx`;
  const { error: uploadError } = await admin.storage
    .from("documentos")
    .upload(storagePath, args.buffer, {
      contentType: DOCX_MIME,
      upsert: false,
    });
  if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

  const { data: document, error: insertError } = await admin
    .from("documentos_gerados")
    .insert({
      tipo: args.tipo,
      ref_tipo: args.refTipo,
      ref_id: args.refId,
      nome_arquivo: args.nomeArquivo,
      storage_path: storagePath,
      storage_bucket: "documentos",
      mime_type: DOCX_MIME,
      tamanho_bytes: args.buffer.length,
      params_json: args.params,
      gerado_por: args.userId,
    })
    .select("id")
    .single();
  if (insertError || !document) {
    await admin.storage.from("documentos").remove([storagePath]);
    throw new Error(`Falha ao registrar documento: ${insertError?.message}`);
  }

  const { error: activityError } = await admin.from("atividades").insert({
    ref_tipo: args.refTipo,
    ref_id: args.refId,
    tipo: "documento_gerado",
    descricao: args.descricao,
    autor_id: args.userId,
    metadata_json: { documento_id: document.id, tipo: args.tipo },
  });
  if (activityError) {
    await admin.from("documentos_gerados").delete().eq("id", document.id);
    await admin.storage.from("documentos").remove([storagePath]);
    throw new Error(`Falha ao registrar atividade: ${activityError.message}`);
  }
  const { data: signed, error: signedError } = await admin.storage
    .from("documentos")
    .createSignedUrl(storagePath, SIGNED_URL_SECONDS, {
      download: args.nomeArquivo,
    });
  if (signedError || !signed)
    throw new Error(`Falha ao assinar download: ${signedError?.message}`);
  return {
    id: document.id,
    download_url: signed.signedUrl,
    nome_arquivo: args.nomeArquivo,
  };
}

export async function registerMaterialSupport(args: {
  leadId: string;
  nomeArquivo: string;
  params: Record<string, unknown>;
  userId: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("documentos_gerados")
    .insert({
      tipo: "material_apoio",
      ref_tipo: "lead",
      ref_id: args.leadId,
      nome_arquivo: args.nomeArquivo,
      storage_path: null,
      storage_bucket: null,
      mime_type: "application/pdf",
      params_json: args.params,
      gerado_por: args.userId,
      observacao:
        "PDF gerado localmente pelo diálogo de impressão do navegador.",
    })
    .select("id")
    .single();
  if (error || !data)
    throw new Error(`Falha ao registrar material: ${error?.message}`);
  const { error: activityError } = await admin.from("atividades").insert({
    ref_tipo: "lead",
    ref_id: args.leadId,
    tipo: "documento_gerado",
    descricao: "Material de apoio preparado para impressão em PDF",
    autor_id: args.userId,
    metadata_json: { documento_id: data.id, tipo: "material_apoio" },
  });
  if (activityError) {
    await admin.from("documentos_gerados").delete().eq("id", data.id);
    throw new Error(`Falha ao registrar atividade: ${activityError.message}`);
  }
  return { id: data.id };
}
