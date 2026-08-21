import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LockKeyhole, MessageCircle, Save } from "lucide-react";

import { addLeadNote, updateLead } from "@/app/admin/leads/actions";
import { convertLead } from "@/app/admin/clientes/actions";
import { DocumentActions } from "@/components/admin/document-actions";
import { LeadLifecycleActions } from "@/components/admin/lead-lifecycle-actions";
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
import { calcularComplementar } from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";
import { BrazilianPhoneInput } from "@/components/ui/brazilian-phone-input";
import { formatBrazilianMobile } from "@/lib/ddds-brasileiros";
import { findRecurrencesForRecord } from "@/lib/recurrence";
import { RecurrenceAlert } from "@/components/admin/recurrence-alert";

type Props = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function LeadDetailPage({ params, searchParams }: Props) {
  const supabase = createClient();
  const [
    { data: lead, error },
    { data: activities },
    { data: users },
    { data: documents },
    { data: funnelStages },
    { data: relatedEvents },
    { data: products },
    { data: inactivationReasons },
    config,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("atividades")
      .select("id,tipo,descricao,data_hora,autor_id")
      .eq("ref_tipo", "lead")
      .eq("ref_id", params.id)
      .order("data_hora", { ascending: false })
      .limit(100),
    supabase.from("users").select("id,nome").eq("ativo", true).order("nome"),
    supabase
      .from("documentos_gerados")
      .select("id,tipo,nome_arquivo,storage_path,gerado_em,gerador:users(nome)")
      .eq("ref_tipo", "lead")
      .eq("ref_id", params.id)
      .order("gerado_em", { ascending: false })
      .limit(10),
    supabase.from("funil_etapas").select("nome").order("ordem"),
    supabase
      .from("eventos_agenda")
      .select("id,titulo,tipo,data_hora_inicio,status")
      .eq("ref_tipo", "lead")
      .eq("ref_id", params.id)
      .is("deleted_at", null)
      .order("data_hora_inicio", { ascending: false })
      .limit(10),
    supabase.from("produtos").select("slug,nome,ativo").order("ordem"),
    supabase
      .from("motivos_inativacao")
      .select("id,rotulo,reativavel_padrao")
      .eq("ativo", true)
      .order("ordem"),
    getConfigMap(),
  ]);
  if (error || !lead) notFound();
  const recurrenceMatches = await findRecurrencesForRecord({
    phone: lead.telefone_normalizado,
    email: lead.email,
    excludeLeadId: lead.id,
  });
  const complementary = calcularComplementar(lead);
  const whatsappPhone = `${lead.ddd ?? ""}${lead.whatsapp ?? ""}`.replace(
    /\D/g,
    "",
  );
  const whatsappUrl = whatsappPhone
    ? `https://api.whatsapp.com/send?phone=55${whatsappPhone.replace(/^55/, "")}&text=${encodeURIComponent(`Olá, ${lead.nome}! Sou da Imposto & Obra Consultoria e estou entrando em contato sobre sua simulação de INSS de obra.`)}`
    : null;
  const userMap = new Map((users ?? []).map((user) => [user.id, user.nome]));
  const updateAction = updateLead.bind(null, params.id);
  const noteAction = addLeadNote.bind(null, params.id);
  const today = new Date().toISOString();
  const proposalDefaults = {
    nome_cliente: lead.nome,
    cpf_cnpj: "—",
    endereco_obra: joinAddress(lead.cidade, lead.uf),
    tipo_construcao: lead.tipo ?? "",
    area_construida: lead.area_total ?? lead.a_construcao ?? "",
    situacao_obra: lead.categoria ?? lead.status,
    data_proposta: dateBr(today),
    data_extenso: dateExtenso(today),
    valor_obra_concluida: config.proposta_valor_obra_concluida || "",
    valor_obra_andamento: config.proposta_valor_obra_andamento || "",
  };
  const materialDefaults = {
    cliente: lead.nome,
    area_construcao: Number(lead.area_total ?? lead.a_construcao ?? 0),
    imposto_direto: Number(lead.inss_direto ?? 0),
    imposto_reduzido: Number(lead.inss_reduzido ?? 0),
    multas: 0,
    parcelas: 5,
    area_piscina:
      Number(lead.a_pcoberta ?? 0) + Number(lead.a_pdescoberta ?? 0),
  };

  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-[1500px]">
        <Link
          href="/admin/leads"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Voltar para leads
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Lead</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">{lead.nome}</h1>
              {lead.status_ativacao === "inativo" && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">
                  INATIVO
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Recebido em {dateTime.format(new Date(lead.data_hora))}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LeadLifecycleActions
              leadId={lead.id}
              leadName={lead.nome}
              inactive={lead.status_ativacao === "inativo"}
              reasons={inactivationReasons ?? []}
              stages={(funnelStages ?? []).map((stage) => stage.nome)}
              lastStage={lead.ultima_etapa_kanban}
              futureContact={lead.contato_futuro}
              futureDate={lead.data_contato_futuro}
            />
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
              leadId={lead.id}
              proposalDefaults={proposalDefaults}
              materialDefaults={materialDefaults}
            />
            <form action={convertLead.bind(null, params.id)}>
              <button
                disabled={Boolean(lead.cliente_id)}
                className="flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                <LockKeyhole className="size-4" />
                {lead.cliente_id
                  ? "Cliente convertido"
                  : "Converter em cliente"}
              </button>
            </form>
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
        <RecurrenceAlert matches={recurrenceMatches} />
        {searchParams?.error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
          >
            Não foi possível salvar. Revise os dados e tente novamente.
          </p>
        )}
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <form action={updateAction} className="space-y-6">
            <Card title="1. Dados do lead">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input name="nome" label="Nome" value={lead.nome} required />
                <Input
                  name="email"
                  label="E-mail"
                  value={lead.email}
                  type="email"
                />
                <label className="field">
                  WhatsApp com DDD
                  <BrazilianPhoneInput
                    value={formatBrazilianMobile(lead.ddd, lead.whatsapp)}
                    required
                  />
                </label>
                <Input name="uf" label="UF" value={lead.uf} />
                <Input name="cidade" label="Cidade" value={lead.cidade} />
                <label className="field">
                  Status
                  <select
                    name="status"
                    defaultValue={lead.status}
                    className="input"
                  >
                    {(funnelStages ?? []).map((stage) => (
                      <option key={stage.nome}>{stage.nome}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Produto
                  <select
                    name="produto"
                    defaultValue={lead.produto ?? ""}
                    className="input"
                  >
                    <option value="">— Selecione um produto —</option>
                    {(products ?? []).map((product) => (
                      <option
                        key={product.slug}
                        value={product.slug}
                        disabled={!product.ativo}
                      >
                        {product.nome}
                        {product.ativo ? "" : " (inativo)"}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  name="valor_potencial"
                  label="Valor potencial"
                  value={lead.valor_potencial}
                  type="number"
                />
                <label className="field">
                  Responsável
                  <select
                    name="responsavel_id"
                    defaultValue={lead.responsavel_id ?? ""}
                    className="input"
                  >
                    <option value="">Não atribuído</option>
                    {(users ?? []).map((user) => (
                      <option value={user.id} key={user.id}>
                        {user.nome ?? "Sem nome"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field sm:col-span-2">
                  Observações
                  <textarea
                    name="observacoes"
                    defaultValue={lead.observacoes ?? ""}
                    rows={3}
                    className="input"
                  />
                </label>
              </div>
            </Card>
            <Card title="2. Dados da obra">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input
                  name="resp"
                  label="Responsável pela obra"
                  value={lead.resp}
                />
                <Input name="dest" label="Destinação" value={lead.dest} />
                <Input name="tipo" label="Tipo" value={lead.tipo} />
                <Input
                  name="categoria"
                  label="Categoria"
                  value={lead.categoria}
                />
                <Input
                  name="concreto"
                  label="Concreto usinado"
                  value={lead.concreto}
                />
                <Input
                  name="prefab"
                  label="Pré-fabricado"
                  value={lead.prefab}
                />
                {[
                  ["a_construcao", "Área construção"],
                  ["a_reforma", "Área reforma"],
                  ["a_demolicao", "Área demolição"],
                  ["a_pcoberta", "Piscina coberta"],
                  ["a_pdescoberta", "Piscina descoberta"],
                  ["area_total", "Área total"],
                  ["area_total_calculo", "Área de cálculo"],
                  ["area_principal_bruta", "Área principal bruta"],
                  ["area_principal_equiv", "Área principal equivalente"],
                  ["pct_equivalencia", "Equivalência (%)"],
                ].map(([name, label]) => (
                  <Input
                    key={name}
                    name={name}
                    label={label}
                    value={lead[name]}
                    type="number"
                  />
                ))}
              </div>
            </Card>
            <Card title="3. Cálculos do simulador">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["vau", "VAU"],
                  ["co", "Custo da obra (CO)"],
                  ["rmt", "RMT"],
                  ["cmo_pct", "CMO (%)"],
                  ["pct_categoria", "Categoria (%)"],
                  ["fator_social_pct", "Fator social (%)"],
                  ["aliquota_pct", "Alíquota (%)"],
                  ["reducao_pre_fab_pct", "Redução pré-fab. (%)"],
                  ["ded_concreto_usinado", "Dedução concreto"],
                  ["pct_uso_usinado", "Uso usinado (%)"],
                  ["pct_abat_usinado_cat", "Abatimento usinado (%)"],
                  ["inss_direto", "INSS sem redução"],
                  ["inss_reduzido", "INSS com redução"],
                  ["economia", "Economia"],
                ].map(([name, label]) => (
                  <Input
                    key={name}
                    name={name}
                    label={label}
                    value={lead[name]}
                    type="number"
                  />
                ))}
              </div>
            </Card>
            <Card title="4. Informações complementares">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["cmpl_folha_mensal", "Folha mensal estimada"],
                  ["cmpl_meses_folha", "Meses com folha"],
                  ["cmpl_nf_concreto_usinado", "NF de concreto usinado"],
                  ["cmpl_nf_prefabricado", "NF de pré-fabricado"],
                ].map(([name, label]) => (
                  <Input
                    key={name}
                    name={name}
                    label={label}
                    value={lead[name]}
                    type="number"
                  />
                ))}
              </div>
            </Card>
            <Card title="5. Fundamentação do cálculo">
              <p className="text-sm leading-relaxed text-slate-600">
                O cálculo considera os parâmetros registrados no simulador e as
                reduções previstas na IN RFB nº 2.021/2021. As informações
                complementares consideram aproveitamento de folha,
                pré-fabricados e concreto usinado conforme os documentos
                efetivamente apresentados.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Sem redução"
                  value={money.format(Number(lead.inss_direto ?? 0))}
                />
                <Metric
                  label="Com redução"
                  value={money.format(Number(lead.inss_reduzido ?? 0))}
                />
                <Metric
                  label="Economia"
                  value={money.format(Number(lead.economia ?? 0))}
                />
              </div>
              <div
                className={`mt-3 grid gap-3 sm:grid-cols-3 ${complementary.preenchido ? "" : "opacity-40"}`}
              >
                <Metric
                  label="Complementar sem redução"
                  value={money.format(complementary.inssDireto)}
                />
                <Metric
                  label="Complementar reduzido"
                  value={money.format(complementary.inssReduzido)}
                />
                <Metric
                  label={`Economia (${complementary.economiaPct}%)`}
                  value={money.format(complementary.economia)}
                />
              </div>
            </Card>
            <div className="sticky bottom-4 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-white shadow-lg"
              >
                <Save className="size-4" />
                Salvar alterações
              </button>
            </div>
          </form>
          <aside className="h-fit rounded-2xl border bg-white p-5 shadow-sm xl:sticky xl:top-24">
            <h2 className="text-lg font-bold">Timeline</h2>
            <form action={noteAction} className="mt-4">
              <label className="sr-only" htmlFor="nota">
                Nova nota
              </label>
              <textarea
                id="nota"
                name="nota"
                required
                minLength={2}
                rows={3}
                placeholder="Adicionar nota ao histórico..."
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
              />
              <button className="mt-2 w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
                Adicionar nota
              </button>
            </form>
            <ol className="mt-6 space-y-5 border-l border-slate-200 pl-5">
              {(activities ?? []).map((activity) => (
                <li className="relative" key={activity.id}>
                  <span className="absolute -left-[25px] top-1 size-2.5 rounded-full bg-primary ring-4 ring-white" />
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">
                    {activity.tipo.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    {activity.descricao || "Atividade registrada"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {dateTime.format(new Date(activity.data_hora))}
                    {activity.autor_id
                      ? ` · ${userMap.get(activity.autor_id) ?? "Equipe"}`
                      : ""}
                  </p>
                </li>
              ))}
              {!activities?.length && (
                <li className="text-sm text-slate-500">
                  Nenhuma atividade registrada.
                </li>
              )}
            </ol>
          </aside>
        </div>
        <RelatedEvents
          events={(relatedEvents ?? []) as RelatedEvent[]}
          className="mt-6"
        />
        <DocumentHistory items={(documents ?? []) as DocumentHistoryItem[]} />
      </div>
    </main>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-5 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
function Input({
  name,
  label,
  value,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  value: unknown;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      {label}
      <input
        className="input"
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        defaultValue={value == null ? "" : String(value)}
        required={required}
      />
    </label>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
