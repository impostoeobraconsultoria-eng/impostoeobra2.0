import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOperacaoUser } from "@/lib/operacao/auth";
import { EMPTY_TIPTAP_DOCUMENT } from "@/lib/operacao/types";

const createSchema = z.object({
  parte_id: z.string().uuid(), titulo: z.string().trim().min(1).max(180),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  resumo: z.string().trim().max(500).optional().nullable(), ordem: z.number().int().min(0).max(100000).default(100),
});

export async function GET() {
  const auth = await requireOperacaoUser();
  if (!auth) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data, error } = await auth.supabase.from("operacao_paginas").select("id,parte_id,slug,titulo,resumo,ordem,updated_at,parte:operacao_partes(id,slug,numero,titulo)").eq("ativo", true).order("ordem");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ paginas: data });
}

export async function POST(request: Request) {
  const auth = await requireOperacaoUser();
  if (!auth) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revise os campos obrigatórios." }, { status: 422 });
  const { data: setting } = await auth.supabase.from("config").select("valor").eq("chave", "operacao_habilitar_criacao_paginas").maybeSingle();
  if (setting?.valor === "false" && auth.user.perfil !== "admin") return NextResponse.json({ error: "Criação de páginas desabilitada." }, { status: 403 });
  const { data: parte } = await auth.supabase.from("operacao_partes").select("slug").eq("id", parsed.data.parte_id).eq("ativo", true).maybeSingle();
  if (!parte) return NextResponse.json({ error: "Parte inválida." }, { status: 422 });
  const { data, error } = await auth.supabase.from("operacao_paginas").insert({ ...parsed.data, resumo: parsed.data.resumo || null, conteudo: EMPTY_TIPTAP_DOCUMENT, criado_por: auth.user.id, atualizado_por: auth.user.id }).select("id,slug").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Já existe uma página com este slug nesta parte." : error.message }, { status: 400 });
  return NextResponse.json({ ...data, parte_slug: parte.slug }, { status: 201 });
}
