import Link from "next/link";
import type { OperacaoParte } from "@/lib/operacao/types";

export function OperacaoSidebar({ tree }: { tree: OperacaoParte[] }) {
  return (
    <nav aria-label="Sumário do manual" className="space-y-2">
      {tree.map((parte) => (
        <details key={parte.id} open className="group rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-800">
            Parte {parte.numero} <span className="font-medium text-slate-500">— {parte.titulo}</span>
          </summary>
          <div className="space-y-1 border-t border-slate-100 p-2">
            {(parte.paginas ?? []).map((pagina) => (
              <Link key={pagina.id} href={`/operacao/${parte.slug}/${pagina.slug}`}
                className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700">
                {pagina.titulo}
              </Link>
            ))}
            {!parte.paginas?.length && <p className="px-3 py-2 text-xs text-slate-400">Nenhuma página.</p>}
          </div>
        </details>
      ))}
    </nav>
  );
}
