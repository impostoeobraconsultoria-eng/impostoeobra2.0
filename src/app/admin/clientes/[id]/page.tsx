import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Save } from "lucide-react";

import { updateCustomer } from "@/app/admin/clientes/actions";
import { CustomerContractDialog } from "@/components/admin/customer-contract-dialog";
import { CustomerDossier } from "@/components/admin/customer-dossier";
import {
  CustomerTimeline,
  type CustomerTimelineItem,
} from "@/components/admin/customer-timeline";
import {
  CustomerNotes,
  type CustomerNote,
} from "@/components/admin/customer-notes";
import { DocumentActions } from "@/components/admin/document-actions";
import {
  DocumentHistory,
  type DocumentHistoryItem,
} from "@/components/admin/document-history";
import {
  RelatedEvents,
  type RelatedEvent,
} from "@/components/admin/related-events";
import {
  dateBr,
  dateExtenso,
  getConfigMap,
  joinAddress,
} from "@/lib/documentos";
import { createClient } from "@/lib/supabase/server";
import { BrazilianPhoneInput } from "@/components/ui/brazilian-phone-input";
import { formatBrazilianMobile } from "@/lib/ddds-brasileiros";
import { findRecurrencesForRecord } from "@/lib/recurrence";
import { RecurrenceAlert } from "@/components/admin/recurrence-alert";
import { AnalyticsEventOnLoad } from "@/components/analytics/event-on-load";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | undefined>;
}) {
  const supabase = createClient();
  const [
    { data: customer },
    { data: contracts },
    { data: notes },
    { data: documents },
    { data: relatedEvents },
    { data: claims },
    { data: products },
    config,
  ] = await Promise.all([
    supabase
      .from("clientes")
      .select("*")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("contratos")
      .select(
        "id,numero,produto,status,valor_total,valor_pago,data_assinatura,criado_em",
      )
      .eq("cliente_id", params.id)
      .is("deleted_at", null)
      .order("criado_em", { ascending: false }),
    supabase
      .from("cliente_notas")
      .select(
        "id,autor_id,conteudo,criado_em,autor:users!cliente_notas_autor_id_fkey(nome,email)",
      )
      .eq("cliente_id", params.id)
      .is("deleted_at", null)
      .order("criado_em", { ascending: false }),
    supabase
      .from("documentos_gerados")
      .select("id,tipo,nome_arquivo,storage_path,gerado_em,gerador:users(nome)")
      .eq("ref_tipo", "cliente")
      .eq("ref_id", params.id)
      .order("gerado_em", { ascending: false })
      .limit(10),
    supabase
      .from("eventos_agenda")
      .select("id,titulo,tipo,data_hora_inicio,status")
      .eq("ref_tipo", "cliente")
      .eq("ref_id", params.id)
      .is("deleted_at", null)
      .order("data_hora_inicio", { ascending: false })
      .limit(10),
    supabase.auth.getClaims(),
    supabase
      .from("produtos")
      .select("slug,nome")
      .eq("ativo", true)
      .order("ordem"),
    getConfigMap(),
  ]);
  if (!customer) notFound();
  const recurrenceMatches = await findRecurrencesForRecord({
    phone: customer.telefone_normalizado,
    email: customer.email,
    excludeCustomerId: customer.id,
  });
  const { data: originLead } = customer.lead_id_origem
    ? await supabase
        .from("leads")
        .select("produto")
        .eq("id", customer.lead_id_origem)
        .maybeSingle()
    : { data: null };
  const email = claims?.claims.email;
  const { data: profile } =
    typeof email === "string"
      ? await supabase
          .from("users")
          .select("id,perfil")
          .eq("email", email)
          .eq("ativo", true)
          .maybeSingle()
      : { data: null };
  if (!profile) notFound();
  const conversionEvent =
    searchParams?.ga_event === "close_convert_lead" &&
    searchParams.lead_id &&
    searchParams.cliente_id
      ? {
          lead_id: searchParams.lead_id,
          cliente_id: searchParams.cliente_id,
          value: Number(searchParams.event_value ?? 0),
          currency: "BRL",
        }
      : null;
  const contractIds = (contracts ?? []).map((contract) => contract.id);
  const activitySelect =
    "id,tipo,descricao,data_hora,autor:users!atividades_autor_id_fkey(nome,email)";
  const [customerActivities, leadActivities, contractActivities] =
    await Promise.all([
      supabase
        .from("atividades")
        .select(activitySelect)
        .eq("ref_tipo", "cliente")
        .eq("ref_id", customer.id),
      customer.lead_id_origem
        ? supabase
            .from("atividades")
            .select(activitySelect)
            .eq("ref_tipo", "lead")
            .eq("ref_id", customer.lead_id_origem)
        : Promise.resolve({ data: [] }),
      contractIds.length
        ? supabase
            .from("atividades")
            .select(activitySelect)
            .eq("ref_tipo", "contrato")
            .in("ref_id", contractIds)
        : Promise.resolve({ data: [] }),
    ]);
  const timeline = [
    ...normalizeActivities(customerActivities.data, "cliente"),
    ...normalizeActivities(leadActivities.data, "lead"),
    ...normalizeActivities(contractActivities.data, "contrato"),
    ...(notes ?? []).map((note) => ({
      id: `nota-${note.id}`,
      tipo: "nota",
      descricao: note.conteudo,
      data_hora: note.criado_em,
      origem: "cliente" as const,
      autor: normalizeAuthor(note.autor),
    })),
  ].sort(
    (a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime(),
  );
  const total = (contracts ?? []).reduce(
    (sum, contract) => sum + Number(contract.valor_total ?? 0),
    0,
  );
  const paid = (contracts ?? []).reduce(
    (sum, contract) => sum + Number(contract.valor_pago ?? 0),
    0,
  );
  const phone = `${customer.ddd ?? ""}${customer.telefone ?? ""}`.replace(
    /\D/g,
    "",
  );
  const customerWhatsappMessage = String(
    config.whatsapp_msg_cliente_default ?? "",
  ).trim();
  const whatsappUrl = phone
    ? `https://api.whatsapp.com/send?phone=55${phone.replace(/^55/, "")}${customerWhatsappMessage ? `&text=${encodeURIComponent(customerWhatsappMessage.replaceAll("{nome}", customer.nome))}` : ""}`
    : null;
  const today = new Date().toISOString();
  const proposalDefaults = {
    nome_cliente: customer.nome,
    cpf_cnpj: customer.cpf || customer.cnpj || "",
    endereco_obra: joinAddress(
      customer.obra_end_logradouro,
      customer.obra_end_bairro,
      customer.obra_end_cidade,
      customer.obra_end_uf,
    ),
    tipo_construcao: customer.obra_tipo || "",
    area_construida: "",
    situacao_obra: customer.obra_descricao || "",
    data_proposta: dateBr(today),
    data_extenso: dateExtenso(today),
    valor_obra_concluida: config.proposta_valor_obra_concluida || "",
    valor_obra_andamento: config.proposta_valor_obra_andamento || "",
  };

  return (
    <main className="px-5 py-8 sm:px-8">
      {conversionEvent && (
        <AnalyticsEventOnLoad
          name={config.ga4_event_close_convert_lead || "close_convert_lead"}
          params={conversionEvent}
        />
      )}
      <div className="mx-auto max-w-[1500px]">
        <Link
          href="/admin/clientes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Voltar para clientes
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">
              Cliente · Visão 360°
            </p>
            <h1 className="mt-1 text-3xl font-bold">{customer.nome}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {customer.cpf || customer.cnpj || "Documento não informado"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-white"
              >
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            )}
            <DocumentActions
              clienteId={customer.id}
              proposalDefaults={proposalDefaults}
            />
          </div>
        </div>
        {searchParams?.saved && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
          >
            Alterações salvas com sucesso.
          </p>
        )}
        {searchParams?.error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
          >
            Não foi possível salvar. Revise os dados e tente novamente.
          </p>
        )}
        <RecurrenceAlert matches={recurrenceMatches} />
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          <div className="space-y-6">
            <CustomerTimeline items={timeline} />
            <form
              action={updateCustomer.bind(null, params.id)}
              className="space-y-6"
            >
              <Card title="Dados pessoais">
                <Fields
                  values={customer}
                  fields={[
                    ["nome", "Nome", "text", true],
                    ["cpf", "CPF"],
                    ["cnpj", "CNPJ"],
                    ["rg", "RG"],
                    ["data_nascimento", "Data de nascimento", "date"],
                    ["estado_civil", "Estado civil"],
                    ["profissao", "Profissão"],
                  ]}
                />
              </Card>
              <Card title="Contato">
                <label className="field mb-4">
                  WhatsApp com DDD
                  <BrazilianPhoneInput
                    name="telefone_contato"
                    value={formatBrazilianMobile(
                      customer.ddd,
                      customer.telefone,
                    )}
                    required
                  />
                </label>
                <Fields
                  values={customer}
                  fields={[["email", "E-mail", "email"]]}
                />
              </Card>
              <Card title="Endereço residencial">
                <Fields
                  values={customer}
                  fields={[
                    ["end_logradouro", "Logradouro"],
                    ["end_bairro", "Bairro"],
                    ["end_cidade", "Cidade"],
                    ["end_uf", "UF"],
                    ["end_cep", "CEP"],
                  ]}
                />
              </Card>
              <Card title="Endereço da obra e dados do imóvel">
                <Fields
                  values={customer}
                  fields={[
                    ["obra_end_logradouro", "Logradouro"],
                    ["obra_end_bairro", "Bairro"],
                    ["obra_end_cidade", "Cidade"],
                    ["obra_end_uf", "UF"],
                    ["obra_matricula", "Matrícula"],
                    ["obra_iptu", "IPTU"],
                    ["obra_tipo", "Tipo"],
                  ]}
                />
                <label className="field mt-4 block">
                  Descrição
                  <textarea
                    className="input"
                    name="obra_descricao"
                    rows={3}
                    defaultValue={customer.obra_descricao ?? ""}
                  />
                </label>
                <label className="field mt-4 block">
                  Observações contratuais
                  <textarea
                    className="input"
                    name="obs_contrato"
                    rows={3}
                    defaultValue={customer.obs_contrato ?? ""}
                  />
                </label>
              </Card>
              <details className="rounded-2xl border bg-white p-5 shadow-sm">
                <summary className="cursor-pointer text-lg font-bold">
                  Dados bancários
                </summary>
                <div className="mt-5">
                  <Fields
                    values={customer}
                    fields={[
                      ["banco", "Banco"],
                      ["agencia", "Agência"],
                      ["conta", "Conta"],
                      ["tipo_conta", "Tipo de conta"],
                      ["pix", "PIX"],
                    ]}
                  />
                </div>
              </details>
              <div className="flex justify-end">
                <button className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-white">
                  <Save className="size-4" />
                  Salvar dados do cliente
                </button>
              </div>
            </form>
            <Card
              title="Contratos deste cliente"
              action={
                <CustomerContractDialog
                  customer={{ id: customer.id, nome: customer.nome }}
                  products={products ?? []}
                  initialProduct={originLead?.produto}
                />
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Número</th>
                      <th className="px-3 py-3">Produto</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Total</th>
                      <th className="px-3 py-3">Pago</th>
                      <th className="px-3 py-3">Assinatura</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(contracts ?? []).map((contract) => (
                      <tr key={contract.id}>
                        <td className="px-3 py-3 font-semibold">
                          {contract.numero || "Sem número"}
                        </td>
                        <td className="px-3 py-3">{contract.produto || "—"}</td>
                        <td className="px-3 py-3">{contract.status}</td>
                        <td className="px-3 py-3">
                          {money.format(Number(contract.valor_total ?? 0))}
                        </td>
                        <td className="px-3 py-3">
                          {money.format(Number(contract.valor_pago ?? 0))}
                        </td>
                        <td className="px-3 py-3">
                          {contract.data_assinatura
                            ? new Date(
                                `${contract.data_assinatura}T12:00:00`,
                              ).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            className="font-bold text-primary"
                            href={`/admin/contratos/${contract.id}`}
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {!contracts?.length && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-8 text-center text-slate-500"
                        >
                          Nenhum contrato cadastrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-sm">
                <strong>Total contratado: {money.format(total)}</strong>
                <strong>Total pago: {money.format(paid)}</strong>
                <strong>
                  Saldo: {money.format(Math.max(0, total - paid))}
                </strong>
              </div>
            </Card>
          </div>
          <aside className="space-y-6">
            <CustomerDossier
              customerId={customer.id}
              initialLink={customer.link_dossie}
            />
            <CustomerNotes
              customerId={customer.id}
              notes={(notes ?? []) as CustomerNote[]}
              currentUserId={profile.id}
              isAdmin={profile.perfil === "admin"}
            />
            <RelatedEvents events={(relatedEvents ?? []) as RelatedEvent[]} />
            <DocumentHistory
              compact
              items={(documents ?? []) as DocumentHistoryItem[]}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

type ActivityRow = {
  id: string;
  tipo: string;
  descricao: string | null;
  data_hora: string;
  autor:
    | { nome: string | null; email: string }
    | { nome: string | null; email: string }[]
    | null;
};

function normalizeActivities(
  rows: unknown[] | null | undefined,
  origem: CustomerTimelineItem["origem"],
): CustomerTimelineItem[] {
  return (rows ?? []).map((raw) => {
    const row = raw as ActivityRow;
    return {
      id: row.id,
      tipo: row.tipo,
      descricao: row.descricao,
      data_hora: row.data_hora,
      origem,
      autor: normalizeAuthor(row.autor),
    };
  });
}

function normalizeAuthor(value: ActivityRow["autor"]) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type FieldDef = readonly [string, string, string?, boolean?];
function Fields({
  values,
  fields,
}: {
  values: Record<string, unknown>;
  fields: FieldDef[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map(([name, label, type = "text", required = false]) => (
        <label className="field" key={name}>
          {label}
          <input
            className="input"
            name={name}
            type={type}
            required={required}
            defaultValue={values[name] == null ? "" : String(values[name])}
          />
        </label>
      ))}
    </div>
  );
}
function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
