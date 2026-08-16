import Link from "next/link";
import { createContract } from "./actions";
import { ContractForm } from "@/components/admin/contract-form";
import { createClient } from "@/lib/supabase/server";
export default async function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const s = createClient();
  let q = s
    .from("contratos")
    .select("*,cliente:clientes(id,nome,cpf,cnpj)")
    .is("deleted_at", null)
    .order("criado_em", { ascending: false });
  if (searchParams?.status) q = q.eq("status", searchParams.status);
  const [{ data }, { data: clients }] = await Promise.all([
    q,
    s.from("clientes").select("id,nome").is("deleted_at", null).order("nome"),
  ]);
  const show = searchParams?.new === "1";
  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">CRM</p>
            <h1 className="text-3xl font-bold">Contratos</h1>
          </div>
          <Link
            className="rounded-full bg-primary px-5 py-3 font-bold text-white"
            href={show ? "/admin/contratos" : "/admin/contratos/novo"}
          >
            {show ? "Fechar" : "Novo contrato"}
          </Link>
        </div>
        {show && (
          <section className="mt-6 rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-bold">Novo contrato</h2>
            <ContractForm action={createContract} clients={clients ?? []} />
          </section>
        )}
        <form className="mt-6">
          <select
            name="status"
            defaultValue={searchParams?.status ?? ""}
            className="input max-w-xs"
          >
            <option value="">Todos os status</option>
            <option>em vigor</option>
            <option>concluído</option>
            <option>cancelado</option>
          </select>
          <button className="ml-2 rounded-full border px-4 py-2">
            Filtrar
          </button>
        </form>
        <div className="mt-4 overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[750px] text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4">Número</th>
                <th>Cliente</th>
                <th>Produto</th>
                <th>Status</th>
                <th>Total</th>
                <th>Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.map((c) => {
                const cliente = relatedClient(c.cliente);
                const document = cliente?.cpf || cliente?.cnpj;
                return (
                  <tr key={c.id}>
                    <td className="p-4 font-semibold">
                      <Link href={`/admin/contratos/${c.id}`}>
                        {c.numero || "Sem número"}
                      </Link>
                    </td>
                    <td>
                      {cliente ? (
                        <Link
                          className="font-semibold text-slate-900 hover:text-primary"
                          href={`/admin/clientes/${cliente.id}`}
                        >
                          <span className="block">{cliente.nome}</span>
                          {document && (
                            <span className="mt-0.5 block text-xs font-normal text-slate-500">
                              {formatDocument(document)}
                            </span>
                          )}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{c.produto || "—"}</td>
                    <td>{c.status}</td>
                    <td>{money(c.valor_total)}</td>
                    <td>{money(c.valor_pago)}</td>
                  </tr>
                );
              })}
              {!data?.length && (
                <tr>
                  <td colSpan={6} className="p-10 text-center">
                    Nenhum contrato cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
const money = (v: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v ?? 0),
  );

type ClientRelation = {
  id: string;
  nome: string;
  cpf: string | null;
  cnpj: string | null;
};

function relatedClient(value: ClientRelation | ClientRelation[] | null) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDocument(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11)
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (digits.length === 14)
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  return value;
}
