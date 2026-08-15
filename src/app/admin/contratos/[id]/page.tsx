import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { ContractForm } from "@/components/admin/contract-form";
import { addContractNote, updateContract } from "../actions";
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
  money as formatMoney,
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
  const [
    { data: c },
    { data: clients },
    { data: a },
    { data: documents },
    config,
  ] = await Promise.all([
    s
      .from("contratos")
      .select("*,cliente:clientes(*)")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle(),
    s.from("clientes").select("id,nome").is("deleted_at", null).order("nome"),
    s
      .from("atividades")
      .select("id,tipo,descricao,data_hora")
      .eq("ref_tipo", "contrato")
      .eq("ref_id", params.id)
      .order("data_hora", { ascending: false }),
    s
      .from("documentos_gerados")
      .select("id,tipo,nome_arquivo,storage_path,gerado_em,gerador:users(nome)")
      .eq("ref_tipo", "contrato")
      .eq("ref_id", params.id)
      .order("gerado_em", { ascending: false })
      .limit(10),
    getConfigMap(),
  ]);
  if (!c) notFound();
  const customer = Array.isArray(c.cliente) ? c.cliente[0] : c.cliente;
  const phone = `${customer?.ddd ?? ""}${customer?.telefone ?? ""}`.replace(
    /\D/g,
    "",
  );
  const whatsappUrl = phone
    ? `https://api.whatsapp.com/send?phone=55${phone.replace(/^55/, "")}&text=${encodeURIComponent(`Olá, ${customer?.nome}! Sou da Imposto & Obra Consultoria e estou entrando em contato sobre o seu contrato.`)}`
    : null;
  const total = Number(c.valor_total ?? 0),
    paid = Number(c.valor_pago ?? 0);
  const assinatura = c.data_assinatura || new Date().toISOString().slice(0, 10);
  const contractDefaults = {
    contratante_nome: customer?.nome || "",
    contratante_cpf_cnpj: customer?.cpf || customer?.cnpj || "",
    contratante_rg: customer?.rg || "",
    contratante_endereco: joinAddress(
      customer?.end_logradouro,
      customer?.end_bairro,
      customer?.end_cidade,
      customer?.end_uf,
      customer?.end_cep,
    ),
    contratante_email: customer?.email || "",
    contratante_telefone: [customer?.ddd, customer?.telefone]
      .filter(Boolean)
      .join(" "),
    contratada_razao: config.empresa_razao_social || "",
    contratada_cnpj: config.empresa_cnpj || "",
    contratada_endereco: config.empresa_endereco_completo || "",
    contratada_representante: config.empresa_representante_nome || "",
    obra_endereco: joinAddress(
      customer?.obra_end_logradouro,
      customer?.obra_end_bairro,
      customer?.obra_end_cidade,
      customer?.obra_end_uf,
    ),
    obra_area: customer?.obra_descricao || "",
    obra_matricula: customer?.obra_matricula || "",
    obra_iptu: customer?.obra_iptu || "",
    obra_tipo: customer?.obra_tipo || "",
    numero_contrato: c.numero || "",
    data_assinatura: dateBr(assinatura),
    data_assinatura_extenso: dateExtenso(assinatura),
    cidade_assinatura: config.empresa_cidade_sede || "",
    cidade_foro: config.empresa_cidade_sede || "",
    valor_total: formatMoney(total),
    valor_extenso: "(valor por extenso)",
    valor_entrada: formatMoney(total / 2),
    valor_saldo: formatMoney(total / 2),
    parcelas: c.parcelas ?? "",
    forma_pagamento: c.forma_pagamento || "",
    dia_vencimento: "10",
    escopo_servico:
      c.observacoes || "Escopo customizado conforme alinhado entre as partes.",
  };
  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/contratos" className="font-semibold text-slate-500">
          ← Contratos
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Contrato {c.numero || "sem número"}
            </h1>
            {customer && (
              <div className="mt-2 text-sm text-slate-500">
                <Link
                  href={`/admin/clientes/${customer.id}`}
                  className="font-bold text-primary hover:underline"
                >
                  {customer.nome}
                </Link>
                <span>
                  {customer.cpf || customer.cnpj
                    ? ` · ${customer.cpf || customer.cnpj}`
                    : ""}
                  {customer.email ? ` · ${customer.email}` : ""}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-white"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            )}
            <DocumentActions
              contratoId={c.id}
              contractDefaults={contractDefaults}
            />
          </div>
        </div>
        {searchParams?.saved && (
          <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-800">
            Alterações salvas.
          </p>
        )}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Metric label="Valor total" value={money(total)} />
          <Metric label="Valor pago" value={money(paid)} />
          <Metric label="Saldo" value={money(Math.max(0, total - paid))} />
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-bold">Dados do contrato</h2>
            <ContractForm
              action={updateContract.bind(null, params.id)}
              clients={clients ?? []}
              values={c}
            />
          </section>
          <aside className="rounded-2xl border bg-white p-5">
            <h2 className="font-bold">Timeline</h2>
            <form
              action={addContractNote.bind(null, params.id)}
              className="mt-4"
            >
              <textarea
                className="input"
                name="nota"
                required
                placeholder="Adicionar nota..."
              />
              <button className="mt-2 w-full rounded-full bg-slate-900 px-4 py-2 text-white">
                Adicionar nota
              </button>
            </form>
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
const money = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v,
  );
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
