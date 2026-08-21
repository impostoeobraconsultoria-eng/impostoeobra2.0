import Link from "next/link";
import { Download } from "lucide-react";

export type DocumentHistoryItem = {
  id: string;
  tipo: string;
  nome_arquivo: string;
  storage_path: string | null;
  gerado_em: string;
  gerador?: { nome: string | null } | Array<{ nome: string | null }> | null;
};

const labels: Record<string, string> = {
  proposta: "Proposta",
  contrato_andamento: "Contrato — andamento",
  contrato_finalizada: "Contrato — finalizada",
  material_apoio: "Material de apoio",
};

export function DocumentHistory({
  items,
  compact = false,
}: {
  items: DocumentHistoryItem[];
  compact?: boolean;
}) {
  if (compact)
    return (
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Documentos gerados</h2>
        <ul className="mt-4 space-y-3">
          {items.map((item) => {
            const generator = Array.isArray(item.gerador)
              ? item.gerador[0]
              : item.gerador;
            return (
              <li
                key={item.id}
                className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <p className="text-sm font-semibold">
                  {labels[item.tipo] ?? item.tipo}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {item.nome_arquivo}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {generator?.nome || "Equipe"} ·{" "}
                  {new Date(item.gerado_em).toLocaleDateString("pt-BR")}
                </p>
                {item.storage_path && (
                  <Link
                    href={`/api/documentos/${item.id}/download`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary"
                  >
                    <Download className="size-3.5" />
                    Baixar novamente
                  </Link>
                )}
              </li>
            );
          })}
          {!items.length && (
            <li className="text-sm text-slate-500">Nenhum documento gerado.</li>
          )}
        </ul>
      </section>
    );
  return (
    <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold">Documentos gerados</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Arquivo</th>
              <th className="px-3 py-3">Gerado por</th>
              <th className="px-3 py-3">Gerado em</th>
              <th className="px-3 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => {
              const generator = Array.isArray(item.gerador)
                ? item.gerador[0]
                : item.gerador;
              return (
                <tr key={item.id}>
                  <td className="px-3 py-3 font-semibold">
                    {labels[item.tipo] ?? item.tipo}
                  </td>
                  <td className="max-w-sm truncate px-3 py-3">
                    {item.nome_arquivo}
                  </td>
                  <td className="px-3 py-3">{generator?.nome || "Equipe"}</td>
                  <td className="px-3 py-3">
                    {new Date(item.gerado_em).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {item.storage_path ? (
                      <Link
                        href={`/api/documentos/${item.id}/download`}
                        className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-semibold text-primary"
                      >
                        <Download className="size-4" />
                        Baixar novamente
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Gerado no navegador
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!items.length && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  Nenhum documento gerado para este cadastro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
