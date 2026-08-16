import Link from "next/link";

import { ContractForm } from "@/components/admin/contract-form";
import { createClient } from "@/lib/supabase/server";
import { createContract } from "../actions";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const supabase = createClient();
  const { data: clients } = await supabase
    .from("clientes")
    .select("id,nome")
    .is("deleted_at", null)
    .order("nome");
  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/contratos"
          className="text-sm font-semibold text-slate-500 hover:text-primary"
        >
          ← Voltar aos contratos
        </Link>
        <header className="mt-4">
          <p className="text-sm font-semibold text-primary">CRM</p>
          <h1 className="mt-1 text-3xl font-bold">Novo contrato</h1>
        </header>
        {searchParams?.error && (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            Não foi possível salvar. Revise os campos obrigatórios.
          </p>
        )}
        <section className="mt-6 rounded-2xl border bg-white p-6">
          <ContractForm action={createContract} clients={clients ?? []} />
        </section>
      </div>
    </main>
  );
}
