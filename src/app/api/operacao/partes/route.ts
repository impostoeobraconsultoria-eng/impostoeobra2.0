import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOperacaoUser } from "@/lib/operacao/auth";

const createSchema = z.object({
  titulo: z.string().trim().min(1).max(160),
  numero: z.string().trim().min(1).max(20),
  descricao: z.string().trim().max(500).optional().nullable(),
  ordem: z.number().int().min(0).max(100000),
  ativo: z.boolean().default(true),
});

function slugify(value: string) {
  return `parte-${value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

export async function GET() {
  const auth = await requireOperacaoUser();
  if (!auth)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data, error } = await auth.supabase
    .from("operacao_partes")
    .select("id,slug,numero,titulo,descricao,ordem,ativo")
    .order("ordem");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ partes: data });
}

export async function POST(request: Request) {
  const auth = await requireOperacaoUser();
  if (!auth)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Revise os campos obrigatórios da Parte." },
      { status: 422 },
    );
  const slug = slugify(parsed.data.numero);
  if (slug === "parte-")
    return NextResponse.json(
      { error: "O número informado não gera um slug válido." },
      { status: 422 },
    );
  const { data, error } = await auth.supabase
    .from("operacao_partes")
    .insert({ ...parsed.data, descricao: parsed.data.descricao || null, slug })
    .select("id,slug,numero,titulo,descricao,ordem,ativo")
    .single();
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "Já existe uma Parte com esse número."
            : error.message,
      },
      { status: 400 },
    );
  return NextResponse.json(data, { status: 201 });
}
