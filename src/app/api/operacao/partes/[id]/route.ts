import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOperacaoUser } from "@/lib/operacao/auth";

const idSchema = z.string().uuid();
const patchSchema = z
  .object({
    titulo: z.string().trim().min(1).max(160).optional(),
    descricao: z.string().trim().max(500).nullable().optional(),
    ordem: z.number().int().min(0).max(100000).optional(),
    ativo: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireOperacaoUser();
  if (!auth)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!idSchema.safeParse(params.id).success)
    return NextResponse.json({ error: "ID inválido." }, { status: 422 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  const values = {
    ...parsed.data,
    ...(parsed.data.descricao === "" ? { descricao: null } : {}),
  };
  const { data, error } = await auth.supabase
    .from("operacao_partes")
    .update(values)
    .eq("id", params.id)
    .select("id,slug,numero,titulo,descricao,ordem,ativo")
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data)
    return NextResponse.json(
      { error: "Parte não encontrada." },
      { status: 404 },
    );
  return NextResponse.json(data);
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireOperacaoUser();
  if (!auth)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (auth.user.perfil !== "admin")
    return NextResponse.json(
      { error: "Apenas administradores podem excluir Partes." },
      { status: 403 },
    );
  if (!idSchema.safeParse(params.id).success)
    return NextResponse.json({ error: "ID inválido." }, { status: 422 });
  const { count: activePages, error: countError } = await auth.supabase
    .from("operacao_paginas")
    .select("id", { head: true, count: "exact" })
    .eq("parte_id", params.id)
    .eq("ativo", true);
  if (countError)
    return NextResponse.json({ error: countError.message }, { status: 400 });
  if ((activePages ?? 0) > 0)
    return NextResponse.json(
      {
        error: `Esta Parte possui ${activePages} página(s) ativa(s). Desative as páginas antes de excluir.`,
      },
      { status: 409 },
    );
  const { count: inactivePages, error: inactiveError } = await auth.supabase
    .from("operacao_paginas")
    .select("id", { head: true, count: "exact" })
    .eq("parte_id", params.id);
  if (inactiveError)
    return NextResponse.json({ error: inactiveError.message }, { status: 400 });
  if ((inactivePages ?? 0) > 0)
    return NextResponse.json(
      {
        error:
          "Esta Parte ainda contém páginas inativas vinculadas. Mova ou exclua essas páginas antes de excluir a Parte.",
      },
      { status: 409 },
    );
  const { error } = await auth.supabase
    .from("operacao_partes")
    .delete()
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
