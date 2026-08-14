import Link from "next/link";
import { createContract } from "./actions";
import { createClient } from "@/lib/supabase/server";
export default async function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const s = createClient();
  let q = s
    .from("contratos")
    .select(
      "id,numero,produto,status,valor_total,valor_pago,data_assinatura,cliente:clientes(id,nome)",
    )
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
            href={show ? "/admin/contratos" : "/admin/contratos?new=1"}
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
              {data?.map((c) => (
                <tr key={c.id}>
                  <td className="p-4 font-semibold">
                    <Link href={`/admin/contratos/${c.id}`}>
                      {c.numero || "Sem número"}
                    </Link>
                  </td>
                  <td>{c.cliente?.[0]?.nome || "—"}</td>
                  <td>{c.produto || "—"}</td>
                  <td>{c.status}</td>
                  <td>{money(c.valor_total)}</td>
                  <td>{money(c.valor_pago)}</td>
                </tr>
              ))}
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
export function ContractForm({
  action,
  clients,
  values = {},
}: {
  action: (f: FormData) => void | Promise<void>;
  clients: Array<{ id: string; nome: string }>;
  values?: Record<string, unknown>;
}) {
  return (
    <form
      action={action}
      className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <label className="field">
        Cliente *
        <select
          name="cliente_id"
          required
          defaultValue={String(values.cliente_id ?? "")}
          className="input"
        >
          <option value="">Selecione</option>
          {clients.map((c) => (
            <option value={c.id} key={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>
      {[
        ["numero", "Número", "text"],
        ["produto", "Produto", "text"],
        ["valor_total", "Valor total", "number"],
        ["valor_pago", "Valor pago", "number"],
        ["forma_pagamento", "Forma de pagamento", "text"],
        ["parcelas", "Parcelas", "number"],
        ["data_assinatura", "Assinatura", "date"],
        ["data_inicio", "Início", "date"],
        ["data_conclusao", "Conclusão", "date"],
      ].map(([n, l, t]) => (
        <label className="field" key={n}>
          {l}
          <input
            name={n}
            type={t}
            step={t === "number" ? "0.01" : undefined}
            defaultValue={String(values[n] ?? "")}
            className="input"
          />
        </label>
      ))}
      <label className="field">
        Status
        <select
          name="status"
          defaultValue={String(values.status ?? "em vigor")}
          className="input"
        >
          <option>em vigor</option>
          <option>concluído</option>
          <option>cancelado</option>
        </select>
      </label>
      <label className="field sm:col-span-2">
        Observações
        <textarea
          name="observacoes"
          defaultValue={String(values.observacoes ?? "")}
          className="input"
        />
      </label>
      <button className="rounded-full bg-accent px-5 py-3 font-bold text-white lg:col-span-3">
        Salvar contrato
      </button>
    </form>
  );
}
