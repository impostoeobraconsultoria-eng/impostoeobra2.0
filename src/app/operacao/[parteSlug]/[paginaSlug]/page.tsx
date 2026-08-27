import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit3 } from "lucide-react";
import { OperacaoViewer } from "@/components/operacao/tiptap-viewer";
import { getOperacaoConfig } from "@/lib/operacao/get-config";
import { getOperacaoPagina } from "@/lib/operacao/queries";
import { EMPTY_TIPTAP_DOCUMENT } from "@/lib/operacao/types";

export default async function OperacaoPaginaPage({ params }: { params: { parteSlug: string; paginaSlug: string } }) {
  const [pagina, config] = await Promise.all([getOperacaoPagina(params.parteSlug, params.paginaSlug), getOperacaoConfig()]);
  if (!pagina) notFound();
  const author = Array.isArray(pagina.autor) ? pagina.autor[0]?.nome : pagina.autor?.nome;
  return <article className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
    <nav className="text-sm text-slate-500"><Link href="/operacao" className="hover:text-primary">Wiki</Link> <span aria-hidden="true">›</span> Parte {pagina.parte.numero} <span aria-hidden="true">›</span> {pagina.titulo}</nav>
    <div className="mt-6 border-b pb-7"><h1 className="text-3xl font-bold sm:text-4xl">{pagina.titulo}</h1>{pagina.resumo && <p className="mt-3 text-lg text-slate-600">{pagina.resumo}</p>}</div>
    <div className="py-5"><OperacaoViewer content={pagina.conteudo?.type ? pagina.conteudo : EMPTY_TIPTAP_DOCUMENT} /></div>
    {config.habilitarFaq && Boolean(pagina.faqs?.length) && <section className="mt-8 border-t pt-8"><h2 className="text-2xl font-bold">Perguntas frequentes</h2><div className="mt-5 space-y-3">{pagina.faqs!.map((faq) => <details key={faq.id} className="rounded-xl border p-4"><summary className="cursor-pointer font-bold">{faq.pergunta}</summary><p className="mt-3 whitespace-pre-wrap text-slate-600">{faq.resposta}</p></details>)}</div></section>}
    <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-sm text-slate-500"><span>Editado por {author || "usuário da equipe"} em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(pagina.updated_at))}</span><Link href={`/operacao/${params.parteSlug}/${params.paginaSlug}/editar`} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"><Edit3 className="size-4" /> Editar</Link></footer>
    <Link href={`/operacao/${params.parteSlug}/${params.paginaSlug}/editar`} aria-label="Editar página" className="fixed bottom-6 right-6 inline-flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-blue-700 sm:hidden"><Edit3 className="size-5" /></Link>
  </article>;
}
