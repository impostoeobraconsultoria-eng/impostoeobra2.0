import { NextRequest, NextResponse } from "next/server";

import { parseBrazilianMobile } from "@/lib/ddds-brasileiros";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims.email !== "string")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("email", claims.claims.email)
    .eq("ativo", true)
    .maybeSingle();
  if (!profile)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const phoneRaw = request.nextUrl.searchParams.get("telefone") ?? "";
  const email = (request.nextUrl.searchParams.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = parseBrazilianMobile(phoneRaw);
  if (!phone.ok && !email) return NextResponse.json({ matches: [] });
  const leadBase = () =>
    supabase
      .from("leads")
      .select("id,nome,data_hora,status,status_ativacao")
      .is("deleted_at", null)
      .is("convertido_em", null)
      .limit(10);
  const clientBase = () =>
    supabase
      .from("clientes")
      .select("id,nome,criado_em")
      .is("deleted_at", null)
      .limit(10);
  const queries = [];
  if (phone.ok) {
    queries.push(
      leadBase().eq("telefone_normalizado", phone.data.telefoneNormalizado),
    );
    queries.push(
      clientBase().eq("telefone_normalizado", phone.data.telefoneNormalizado),
    );
  }
  if (email) {
    const safeEmail = email.replace(/[\\%_]/g, "\\$&");
    queries.push(leadBase().ilike("email", safeEmail));
    queries.push(clientBase().ilike("email", safeEmail));
  }
  const results = await Promise.all(queries);
  const matches = new Map<string, Record<string, unknown>>();
  for (const result of results)
    for (const item of result.data ?? []) {
      const isLead = "status" in item;
      matches.set(`${isLead ? "lead" : "cliente"}:${item.id}`, {
        ...item,
        tipo: isLead ? "lead" : "cliente",
      });
    }
  return NextResponse.json(
    { matches: Array.from(matches.values()) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
