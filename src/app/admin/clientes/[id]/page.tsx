import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/admin/customer-form";
import { updateCustomer } from "../actions";
import { DocumentActions } from "@/components/admin/document-actions";
import {
  DocumentHistory,
  type DocumentHistoryItem,
} from "@/components/admin/document-history";
import {
  dateBr,
  dateExtenso,
  getConfigMap,
  joinAddress,
} from "@/lib/documentos";
import { createClient } from "@/lib/supabase/server";
export default async function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | undefined>;
}) {
  const s = createClient();
  const [{ data: c }, { data: a }, { data: documents }, config] =
    await Promise.all([
      s
        .from("clientes")
        .select("*")
        .eq("id", params.id)
        .is("deleted_at", null)
        .maybeSingle(),
      s
        .from("atividades")
        .select("id,tipo,descricao,data_hora")
        .eq("ref_tipo", "cliente")
        .eq("ref_id", params.id)
        .order("data_hora", { ascending: false }),
      s
        .from("documentos_gerados")
        .select(
          "id,tipo,nome_arquivo,storage_path,gerado_em,gerador:users(nome)",
        )
        .eq("ref_tipo", "cliente")
        .eq("ref_id", params.id)
        .order("gerado_em", { ascending: false })
        .limit(10),
      getConfigMap(),
    ]);
  if (!c) notFound();
  const today = new Date().toISOString();
  const proposalDefaults = {
    nome_cliente: c.nome,
    cpf_cnpj: c.cpf || c.cnpj || "",
    endereco_obra: joinAddress(
      c.obra_end_logradouro,
      c.obra_end_bairro,
      c.obra_end_cidade,
      c.obra_end_uf,
    ),
    tipo_construcao: c.obra_tipo || "",
    area_construida: "",
    situacao_obra: c.obra_descricao || "",
    data_proposta: dateBr(today),
    data_extenso: dateExtenso(today),
    valor_obra_concluida: config.proposta_valor_obra_concluida || "",
    valor_obra_andamento: config.proposta_valor_obra_andamento || "",
  };
  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/clientes" className="font-semibold text-slate-500">
          ← Clientes
        </Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">{c.nome}</h1>
          <DocumentActions
            clienteId={c.id}
            proposalDefaults={proposalDefaults}
          />
        </div>
        {searchParams?.saved && (
          <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-800">
            Alterações salvas.
          </p>
        )}
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-bold">Dados do cliente</h2>
            <CustomerForm
              action={updateCustomer.bind(null, params.id)}
              values={c}
            />
          </section>
          <aside className="rounded-2xl border bg-white p-5">
            <h2 className="font-bold">Timeline</h2>
            <ol className="mt-5 space-y-4">
              {a?.map((x) => (
                <li key={x.id} className="border-l-2 border-primary pl-3">
                  <p className="text-xs font-bold uppercase text-primary">
                    {x.tipo}
                  </p>
                  <p className="text-sm">{x.descricao}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(x.data_hora).toLocaleString("pt-BR")}
                  </p>
                </li>
              ))}
              {!a?.length && (
                <li className="text-sm text-slate-500">Sem atividades.</li>
              )}
            </ol>
          </aside>
        </div>
        <DocumentHistory items={(documents ?? []) as DocumentHistoryItem[]} />
      </div>
    </main>
  );
}
