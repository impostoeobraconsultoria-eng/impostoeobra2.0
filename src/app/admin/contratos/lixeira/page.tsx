import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";

import { EntityTrashActions } from "@/components/admin/entity-trash-actions";
import { createClient } from "@/lib/supabase/server";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function ContractsTrashPage() {
  const supabase = createClient();
  const { data: contracts, error } = await supabase
    .from("contratos")
    .select("id,numero,produto,deleted_at,cliente:clientes(nome)")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/contratos"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="size-4" />
          Voltar para contratos
        </Link>
        <h1 className="mt-5 flex items-center gap-3 text-3xl font-bold">
          <Trash2 className="size-7" />
          Lixeira de contratos
        </h1>
        <p className="mt-2 text-slate-500">
          Restaure registros ou exclua-os permanentemente.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-4 text-red-700"
          >
            Não foi possível carregar a lixeira.
          </p>
        )}
        <section className="mt-6 overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Contrato</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Deletado em</th>
                <th className="px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(contracts ?? []).map((contract) => {
                const client = Array.isArray(contract.cliente)
                  ? contract.cliente[0]
                  : contract.cliente;
                return (
                  <tr key={contract.id}>
                    <td className="px-5 py-4 font-semibold">
                      {contract.numero || "Sem número"}
                    </td>
                    <td className="px-4 py-4">{client?.nome || "—"}</td>
                    <td className="px-4 py-4">{contract.produto || "—"}</td>
                    <td className="px-4 py-4">
                      {contract.deleted_at
                        ? dateTime.format(new Date(contract.deleted_at))
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <EntityTrashActions
                        kind="contrato"
                        id={contract.id}
                        name={contract.numero || "contrato sem número"}
                      />
                    </td>
                  </tr>
                );
              })}
              {!contracts?.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    Nenhum contrato na lixeira.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
