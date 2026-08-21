import Link from "next/link";
import {
  Building2,
  FileText,
  GitBranch,
  MessageSquareText,
  Settings,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { saveConfigSection, saveFunnel, saveTemplates } from "./actions";
import { FunnelEditor } from "./funnel-editor";

const tabs = [
  ["empresa", "Dados da Empresa", Building2],
  ["comunicacao", "Comunicação", MessageSquareText],
  ["templates", "Templates", FileText],
  ["funil", "Funil", GitBranch],
  ["sistema", "Sistema", Settings],
] as const;
type Tab = (typeof tabs)[number][0];
type ConfigMap = Record<string, string>;

export default async function ConfigPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const supabase = createClient();
  const [{ data: configs, error }, { data: loadedStages }] = await Promise.all([
    supabase.from("config").select("chave,valor"),
    supabase
      .from("funil_etapas")
      .select("id,nome,ordem,cor,e_fechada")
      .order("ordem"),
  ]);
  const values = Object.fromEntries(
    (configs ?? []).map((item) => [item.chave, item.valor ?? ""]),
  ) as ConfigMap;
  let stages = loadedStages ?? [];
  if (stages.length === 0) {
    const names = (
      values.etapas_funil ||
      "Novo Lead,Contato iniciado,Em negociacao,Proposta enviada,Aguardando resposta,Fechado — ganho,Fechado — perdido,Sem retorno"
    )
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const colors = [
      "#0B76C6",
      "#2563EB",
      "#7C3AED",
      "#D97706",
      "#EA580C",
      "#3AB97A",
      "#D93025",
      "#5B6265",
    ];
    const { data: migrated } = await supabase
      .from("funil_etapas")
      .insert(
        names.map((nome, ordem) => ({
          nome,
          ordem,
          cor: colors[ordem % colors.length],
          e_fechada: /^fechado/i.test(nome),
        })),
      )
      .select("id,nome,ordem,cor,e_fechada")
      .order("ordem");
    stages = migrated ?? [];
  }
  const requested = searchParams?.tab as Tab | undefined;
  const active = tabs.some(([id]) => id === requested) ? requested! : "empresa";
  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-semibold text-primary">Sistema</p>
          <h1 className="mt-1 text-3xl font-bold">Configurações</h1>
          <p className="mt-2 text-sm text-slate-500">
            Dados institucionais, comunicação, documentos e regras operacionais.
          </p>
        </header>
        {searchParams?.saved && (
          <Notice tone="success">Alterações salvas com sucesso.</Notice>
        )}
        {searchParams?.error && (
          <Notice tone="error">{errorMessage(searchParams.error)}</Notice>
        )}
        {error && (
          <Notice tone="error">
            Não foi possível carregar as configurações.
          </Notice>
        )}
        <div className="mt-7 grid gap-6 lg:grid-cols-[240px_1fr]">
          <nav
            className="h-fit overflow-hidden rounded-2xl border bg-white p-2"
            aria-label="Seções de configurações"
          >
            {tabs.map(([id, label, Icon]) => (
              <Link
                key={id}
                href={`/admin/config?tab=${id}`}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${active === id ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
          <section className="rounded-2xl border bg-white p-5 sm:p-7">
            {active === "empresa" && <CompanyForm values={values} />}
            {active === "comunicacao" && <CommunicationForm values={values} />}
            {active === "templates" && <TemplatesForm values={values} />}
            {active === "funil" && (
              <>
                <SectionTitle
                  title="Etapas do funil"
                  description="Arraste para reordenar. Alterações salvas são aplicadas imediatamente no Kanban."
                />
                <FunnelEditor
                  action={saveFunnel}
                  initialStages={(stages ?? []).map((stage) => ({
                    id: stage.id,
                    nome: stage.nome,
                    cor: stage.cor || "#0B76C6",
                    e_fechada: stage.e_fechada,
                  }))}
                />
              </>
            )}
            {active === "sistema" && <SystemForm values={values} />}
          </section>
        </div>
      </div>
    </main>
  );
}

function CompanyForm({ values }: { values: ConfigMap }) {
  return (
    <form
      action={saveConfigSection.bind(null, "empresa")}
      className="space-y-6"
    >
      <SectionTitle
        title="Dados da Empresa"
        description="Informações usadas no site, propostas, contratos e materiais."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="empresa_razao_social"
          label="Razão social"
          value={values.empresa_razao_social}
          required
        />
        <Input
          name="empresa_cnpj"
          label="CNPJ"
          value={values.empresa_cnpj}
          required
          placeholder="00.000.000/0000-00"
        />
        <TextArea
          name="empresa_endereco_completo"
          label="Endereço completo"
          value={values.empresa_endereco_completo}
          span
        />
        <Input
          name="empresa_telefone_institucional"
          label="Telefone institucional"
          value={values.empresa_telefone_institucional}
        />
        <Input
          name="empresa_whatsapp_e164"
          label="WhatsApp dos links (E.164)"
          value={values.empresa_whatsapp_e164}
          placeholder="5561999999999"
          hint="Somente dígitos, com código do país e DDD. Alterar este campo atualiza todos os CTAs do site."
          required
        />
        <Input
          name="empresa_email"
          label="Email institucional"
          type="email"
          value={values.empresa_email}
          required
        />
        <Input
          name="empresa_instagram_url"
          label="Instagram URL"
          type="url"
          value={values.empresa_instagram_url}
        />
        <Input
          name="empresa_linkedin_url"
          label="LinkedIn URL (opcional)"
          type="url"
          value={values.empresa_linkedin_url}
        />
        <Input
          name="empresa_frase_apoio"
          label="Frase de apoio"
          value={values.empresa_frase_apoio}
          span
        />
        <Input
          name="empresa_representante_nome"
          label="Representante legal — nome"
          value={values.empresa_representante_nome}
        />
        <Input
          name="empresa_representante_cpf"
          label="Representante legal — CPF"
          value={values.empresa_representante_cpf}
        />
        <Input
          name="empresa_representante_oab"
          label="Representante legal — OAB"
          value={values.empresa_representante_oab}
        />
        <Input
          name="empresa_cidade_sede"
          label="Cidade sede"
          value={values.empresa_cidade_sede}
        />
        <div className="mt-2 border-t pt-6 sm:col-span-2">
          <h3 className="font-bold">Encarregado de Dados (LGPD)</h3>
          <p className="mt-1 text-sm text-slate-500">
            Dados exibidos no Aviso de Privacidade.
          </p>
        </div>
        <Input name="dpo_nome" label="Nome do DPO" value={values.dpo_nome} />
        <Input
          name="empresa_email_privacidade"
          label="Email do DPO"
          type="email"
          value={values.empresa_email_privacidade}
          placeholder="Deixe vazio para usar o email institucional"
        />
        <div className="mt-2 border-t pt-6 sm:col-span-2">
          <h3 className="font-bold">Horário de atendimento</h3>
          <p className="mt-1 text-sm text-slate-500">
            Preencha os três campos ou deixe todos vazios para esconder o card.
          </p>
        </div>
        <Input
          name="horario_atendimento_dias"
          label="Dias"
          value={values.horario_atendimento_dias}
        />
        <Input
          name="horario_atendimento_horas"
          label="Horas"
          value={values.horario_atendimento_horas}
        />
        <Input
          name="horario_atendimento_fuso"
          label="Fuso"
          value={values.horario_atendimento_fuso}
          span
        />
      </div>
      <SaveButton />
    </form>
  );
}
function CommunicationForm({ values }: { values: ConfigMap }) {
  return (
    <form
      action={saveConfigSection.bind(null, "comunicacao")}
      className="space-y-6"
    >
      <SectionTitle
        title="Comunicação"
        description="Mensagens padrão usadas pelo site e pela equipe comercial."
      />
      <TextArea
        name="whatsapp_msg_padrao"
        label="Mensagem padrão dos CTAs de WhatsApp"
        value={values.whatsapp_msg_padrao}
      />
      <TextArea
        name="whatsapp_msg_lead_captura"
        label="Mensagem do consultor para lead capturado"
        value={values.whatsapp_msg_lead_captura}
        hint="Use {nome} para inserir automaticamente o primeiro nome do lead."
      />
      <div className="rounded-xl border border-dashed bg-slate-50 p-5 text-sm text-slate-500">
        <strong className="text-slate-700">Templates de email</strong>
        <p className="mt-1">Em preparação para uma etapa futura.</p>
      </div>
      <SaveButton />
    </form>
  );
}
function TemplatesForm({ values }: { values: ConfigMap }) {
  const files = [
    ["template_proposta", "Proposta comercial", "proposta_comercial.docx"],
    [
      "template_contrato_andamento",
      "Contrato — obra em andamento",
      "contrato_obra_andamento.docx",
    ],
    [
      "template_contrato_finalizada",
      "Contrato — obra finalizada",
      "contrato_obra_finalizada.docx",
    ],
  ] as const;
  return (
    <form action={saveTemplates} className="space-y-6">
      <SectionTitle
        title="Templates DOCX"
        description="Arquivos com placeholders {{campo}} armazenados no bucket privado templates."
      />
      <div className="space-y-3">
        {files.map(([key, label, fallback]) => (
          <label className="block rounded-xl border p-4" key={key}>
            <span className="font-semibold">{label}</span>
            <span className="mt-1 block text-xs text-slate-500">
              Atual: {values[key] || fallback}
            </span>
            <input
              className="mt-3 block w-full text-sm"
              type="file"
              name={key}
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
          </label>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="proposta_valor_obra_concluida"
          label="Valor padrão — obra concluída"
          value={values.proposta_valor_obra_concluida}
        />
        <Input
          name="proposta_valor_obra_andamento"
          label="Valor padrão — obra em andamento"
          value={values.proposta_valor_obra_andamento}
        />
      </div>
      <SaveButton />
    </form>
  );
}
function SystemForm({ values }: { values: ConfigMap }) {
  return (
    <form
      action={saveConfigSection.bind(null, "sistema")}
      className="space-y-6"
    >
      <SectionTitle
        title="Sistema"
        description="Parâmetros operacionais do dashboard e da agenda."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="vau_vigencia"
          label="Vigência da VAU atual"
          value={values.vau_vigencia}
          readOnly
        />
        <Input
          name="meta_leads_mensal"
          label="Meta de leads por mês"
          type="number"
          value={values.meta_leads_mensal || "0"}
          min="0"
        />
        <Input
          name="resend_from_email"
          label="Email remetente da agenda"
          type="email"
          value={values.resend_from_email}
          required
        />
        <Input
          name="resend_from_name"
          label="Nome do remetente"
          value={values.resend_from_name}
          required
        />
        <label className="field">
          Lembrete padrão
          <select
            className="input"
            name="agenda_lembrete_default_min"
            defaultValue={
              ["1440", "4320", "10080"].includes(
                values.agenda_lembrete_default_min,
              )
                ? values.agenda_lembrete_default_min
                : "1440"
            }
          >
            <option value="1440">1 dia antes</option>
            <option value="4320">3 dias antes</option>
            <option value="10080">1 semana antes</option>
          </select>
        </label>
      </div>
      <SaveButton />
    </form>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </header>
  );
}
function Input({
  label,
  value = "",
  span = false,
  hint,
  ...props
}: {
  name: string;
  label: string;
  value?: string;
  span?: boolean;
  hint?: string;
  [key: string]: unknown;
}) {
  return (
    <label className={`field ${span ? "sm:col-span-2" : ""}`}>
      {label}
      <input
        className="input disabled:bg-slate-100"
        defaultValue={value}
        {...props}
      />
      {hint && (
        <span className="mt-1 block text-xs font-normal text-slate-500">
          {hint}
        </span>
      )}
    </label>
  );
}
function TextArea({
  name,
  label,
  value = "",
  hint,
  span = false,
}: {
  name: string;
  label: string;
  value?: string;
  hint?: string;
  span?: boolean;
}) {
  return (
    <label className={`field block ${span ? "sm:col-span-2" : ""}`}>
      {label}
      <textarea className="input min-h-28" name={name} defaultValue={value} />
      {hint && (
        <span className="mt-1 block text-xs font-normal text-slate-500">
          {hint}
        </span>
      )}
    </label>
  );
}
function SaveButton() {
  return (
    <button className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white">
      Salvar alterações
    </button>
  );
}
function Notice({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: React.ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : undefined}
      className={`mt-5 rounded-xl p-4 text-sm font-semibold ${tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
    >
      {children}
    </p>
  );
}
function errorMessage(code: string) {
  return (
    {
      invalid: "Revise os campos informados.",
      invalid_file: "Envie somente arquivos DOCX de até 10 MB.",
      upload: "Não foi possível trocar o template.",
      duplicate_stage: "Os nomes das etapas não podem se repetir.",
      stage_in_use: "Não é possível remover uma etapa que ainda contém leads.",
      save: "Não foi possível salvar as alterações.",
    }[code] ?? "Não foi possível concluir a operação."
  );
}
