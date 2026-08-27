import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOperacaoUser } from "@/lib/operacao/auth";

const jsonContent = z.object({ type: z.literal("doc"), content: z.array(z.unknown()).optional() }).passthrough();
const patchSchema = z.object({ titulo: z.string().trim().min(1).max(180).optional(), resumo: z.string().trim().max(500).nullable().optional(), conteudo: jsonContent.optional(), ordem: z.number().int().min(0).max(100000).optional() }).refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireOperacaoUser();
  if (!auth) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ error: "ID inválido." }, { status: 422 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  const values = { ...parsed.data, ...(parsed.data.resumo === "" ? { resumo: null } : {}), atualizado_por: auth.user.id };
  const { data, error } = await auth.supabase.from("operacao_paginas").update(values).eq("id", params.id).eq("ativo", true).select("id,updated_at").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Página não encontrada." }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireOperacaoUser();
  if (!auth) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (auth.user.perfil !== "admin") return NextResponse.json({ error: "Apenas administradores podem excluir." }, { status: 403 });
  const { error } = await auth.supabase.from("operacao_paginas").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
