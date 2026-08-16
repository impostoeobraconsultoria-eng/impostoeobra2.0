import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";

import { EntityTrashActions } from "@/components/admin/entity-trash-actions";
import { createClient } from "@/lib/supabase/server";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function CustomersTrashPage() {
  const supabase = createClient();
  const [{ data: customers, error }, { data: contracts }] = await Promise.all([
    supabase
      .from("clientes")
      .select("id,nome,cpf,cnpj,deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    supabase.from("contratos").select("id,cliente_id"),
  ]);
  const counts = new Map<string, number>();
  for (const contract of contracts ?? [])
    counts.set(contract.cliente_id, (counts.get(contract.cliente_id) ?? 0) + 1);
  return (
    <TrashPage
      title="Lixeira de clientes"
      back="/admin/clientes"
      backLabel="Voltar para clientes"
      error={error?.message}
      empty={!customers?.length}
    >
      {(customers ?? []).map((customer) => {
        const count = counts.get(customer.id) ?? 0;
        const reason =
          count > 0
            ? "Não é possível excluir permanentemente — há contratos vinculados"
            : undefined;
        return (
          <tr key={customer.id}>
            <td className="px-5 py-4 font-semibold">{customer.nome}</td>
            <td className="px-4 py-4">
              {customer.cpf || customer.cnpj || "—"}
            </td>
            <td className="px-4 py-4">{count}</td>
            <td className="px-4 py-4">
              {customer.deleted_at
                ? dateTime.format(new Date(customer.deleted_at))
                : "—"}
            </td>
            <td className="px-5 py-4">
              <EntityTrashActions
                kind="cliente"
                id={customer.id}
                name={customer.nome}
                permanentDisabledReason={reason}
              />
            </td>
          </tr>
        );
      })}
    </TrashPage>
  );
}

function TrashPage({
  title,
  back,
  backLabel,
  error,
  empty,
  children,
}: {
  title: string;
  back: string;
  backLabel: string;
  error?: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href={back}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
        <h1 className="mt-5 flex items-center gap-3 text-3xl font-bold">
          <Trash2 className="size-7" />
          {title}
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
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Nome</th>
                <th className="px-4 py-3">CPF/CNPJ</th>
                <th className="px-4 py-3">Contratos vinculados</th>
                <th className="px-4 py-3">Deletado em</th>
                <th className="px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {children}
              {empty && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    Nenhum cliente na lixeira.
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
