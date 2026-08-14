import Link from "next/link";
import { createCustomer } from "./actions";
import { createClient } from "@/lib/supabase/server";
export default async function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const s = createClient();
  const { data } = await s
    .from("clientes")
    .select("id,nome,cpf,cnpj,email,telefone,end_cidade,end_uf")
    .is("deleted_at", null)
    .order("criado_em", { ascending: false });
  const show = searchParams?.new === "1";
  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">CRM</p>
            <h1 className="text-3xl font-bold">Clientes</h1>
          </div>
          <Link
            className="rounded-full bg-primary px-5 py-3 font-bold text-white"
            href={show ? "/admin/clientes" : "/admin/clientes?new=1"}
          >
            {show ? "Fechar" : "Novo cliente"}
          </Link>
        </div>
        {show && (
          <section className="mt-6 rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-bold">Novo cliente</h2>
            <CustomerForm action={createCustomer} />
          </section>
        )}
        <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[650px] text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4">Nome</th>
                <th>Documento</th>
                <th>Contato</th>
                <th>Local</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.map((c) => (
                <tr key={c.id}>
                  <td className="p-4 font-semibold">
                    <Link href={`/admin/clientes/${c.id}`}>{c.nome}</Link>
                  </td>
                  <td>{c.cpf || c.cnpj || "—"}</td>
                  <td>{c.email || c.telefone || "—"}</td>
                  <td>
                    {[c.end_cidade, c.end_uf].filter(Boolean).join(" / ") ||
                      "—"}
                  </td>
                </tr>
              ))}
              {!data?.length && (
                <tr>
                  <td colSpan={4} className="p-10 text-center">
                    Nenhum cliente cadastrado.
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
export function CustomerForm({
  action,
  values = {},
}: {
  action: (f: FormData) => void | Promise<void>;
  values?: Record<string, unknown>;
}) {
  const fs = [
    ["nome", "Nome *"],
    ["cpf", "CPF"],
    ["cnpj", "CNPJ"],
    ["email", "E-mail"],
    ["ddd", "DDD"],
    ["telefone", "Telefone"],
    ["profissao", "Profissão"],
    ["end_logradouro", "Endereço"],
    ["end_bairro", "Bairro"],
    ["end_cidade", "Cidade"],
    ["end_uf", "UF"],
    ["end_cep", "CEP"],
    ["obra_end_logradouro", "Endereço da obra"],
    ["obra_end_cidade", "Cidade da obra"],
    ["obra_end_uf", "UF da obra"],
    ["obra_matricula", "Matrícula"],
    ["obra_iptu", "IPTU"],
    ["obra_tipo", "Tipo da obra"],
    ["pix", "PIX"],
    ["obs_contrato", "Observações"],
  ];
  return (
    <form
      action={action}
      className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {fs.map(([n, l]) => (
        <label className="field" key={n}>
          {l}
          <input
            className="input"
            name={n}
            required={n === "nome"}
            defaultValue={values[n] == null ? "" : String(values[n])}
          />
        </label>
      ))}
      <button className="rounded-full bg-accent px-5 py-3 font-bold text-white lg:col-span-3">
        Salvar cliente
      </button>
    </form>
  );
}
