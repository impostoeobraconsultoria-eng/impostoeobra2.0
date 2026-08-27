import { notFound } from "next/navigation";
import { EditOperacaoPage } from "@/components/operacao/edit-page";
import { getOperacaoPagina } from "@/lib/operacao/queries";
import { EMPTY_TIPTAP_DOCUMENT } from "@/lib/operacao/types";
import { createClient } from "@/lib/supabase/server";

export default async function EditarOperacaoPage({ params }: { params: { parteSlug: string; paginaSlug: string } }) {
  const pagina = await getOperacaoPagina(params.parteSlug, params.paginaSlug);
  if (!pagina) notFound();
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data: profile } = await supabase.from("users").select("perfil").eq("email", claims?.claims.email).eq("ativo", true).maybeSingle();
  return <EditOperacaoPage pagina={{ id: pagina.id, titulo: pagina.titulo, resumo: pagina.resumo, conteudo: pagina.conteudo?.type ? pagina.conteudo : EMPTY_TIPTAP_DOCUMENT }} backHref={`/operacao/${params.parteSlug}/${params.paginaSlug}`} initialFaqs={pagina.faqs ?? []} canDelete={profile?.perfil === "admin"} />;
}
