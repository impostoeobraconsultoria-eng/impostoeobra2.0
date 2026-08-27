import Link from "next/link";
import { ArrowRight, BookOpen, Plus } from "lucide-react";
import { getOperacaoConfig } from "@/lib/operacao/get-config";
import { listOperacaoTree } from "@/lib/operacao/queries";

export default async function OperacaoIndexPage() {
  const [config, tree] = await Promise.all([getOperacaoConfig(), listOperacaoTree()]);
  const count = tree.reduce((total, parte) => total + (parte.paginas?.length ?? 0), 0);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-7">
        <div><p className="text-sm font-bold uppercase tracking-[.18em] text-primary">Wiki interna</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{config.titulo}</h1>
          <p className="mt-3 max-w-2xl text-slate-600">{config.subtitulo}</p>
          <p className="mt-2 text-sm text-slate-400">{tree.length} partes · {count} páginas</p></div>
        {config.habilitarCriacao && <Link href="/operacao/nova" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-white"><Plus className="size-4" /> Nova página</Link>}
      </div>
      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        {tree.map((parte) => <section key={parte.id} className="rounded-2xl border border-slate-200 p-5">
          <div className="flex gap-3"><BookOpen className="mt-0.5 size-5 shrink-0 text-primary" /><div>
            <h2 className="font-bold">Parte {parte.numero} — {parte.titulo}</h2>
            {parte.descricao && <p className="mt-1 text-sm text-slate-500">{parte.descricao}</p>}</div></div>
          <div className="mt-4 space-y-1 border-t pt-3">
            {(parte.paginas ?? []).map((pagina) => <Link key={pagina.id} href={`/operacao/${parte.slug}/${pagina.slug}`} className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700"><span>{pagina.titulo}</span><ArrowRight className="size-4 opacity-0 group-hover:opacity-100" /></Link>)}
            {!parte.paginas?.length && <p className="px-3 py-3 text-sm text-slate-400">Nenhuma página nesta parte.</p>}
          </div>
        </section>)}
      </div>
    </div>
  );
}
