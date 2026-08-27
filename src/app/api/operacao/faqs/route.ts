import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOperacaoUser } from "@/lib/operacao/auth";

const createSchema = z.object({ pagina_id: z.string().uuid(), pergunta: z.string().trim().min(1).max(500), resposta: z.string().trim().min(1).max(5000), ordem: z.number().int().min(0).max(100000).default(100) });
const patchSchema = z.object({ id: z.string().uuid(), pergunta: z.string().trim().min(1).max(500).optional(), resposta: z.string().trim().min(1).max(5000).optional(), ordem: z.number().int().min(0).max(100000).optional() });

export async function POST(request: Request) {
  const auth = await requireOperacaoUser(); if (!auth) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Preencha pergunta e resposta." }, { status: 422 });
  const { data, error } = await auth.supabase.from("operacao_faqs").insert(parsed.data).select("id,pagina_id,pergunta,resposta,ordem").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 }); return NextResponse.json(data, { status: 201 });
}
export async function PATCH(request: Request) {
  const auth = await requireOperacaoUser(); if (!auth) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  const { id, ...values } = parsed.data; const { data, error } = await auth.supabase.from("operacao_faqs").update(values).eq("id", id).select("id,pagina_id,pergunta,resposta,ordem").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 }); return NextResponse.json(data);
}
export async function DELETE(request: Request) {
  const auth = await requireOperacaoUser(); if (!auth) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id"); if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "ID inválido." }, { status: 422 });
  const { error } = await auth.supabase.from("operacao_faqs").delete().eq("id", id); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); return NextResponse.json({ ok: true });
}
