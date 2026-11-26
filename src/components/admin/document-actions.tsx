"use client";

import { useState } from "react";
import {
  BookOpen,
  FileSignature,
  FileText,
  LoaderCircle,
  X,
} from "lucide-react";
import {
  calculateMaterialSupport,
  MATERIAL_SUPPORT_EXTERNAL_SIMULATOR,
  type MultaStatus,
} from "@/lib/material-support";

type Values = Record<string, string | number>;
type Modal = "material" | "proposta" | "contrato" | null;

const proposalFields = [
  ["nome_cliente", "Cliente"],
  ["cpf_cnpj", "CPF/CNPJ"],
  ["endereco_obra", "Endereço da obra"],
  ["tipo_construcao", "Tipo de construção"],
  ["area_construida", "Área construída"],
  ["situacao_obra", "Situação da obra"],
  ["data_proposta", "Data da proposta"],
  ["data_extenso", "Data por extenso"],
  ["valor_obra_concluida", "Valor — obra concluída"],
  ["valor_obra_andamento", "Valor — obra em andamento"],
] as const;

const contractGroups = [
  {
    title: "Contratante",
    fields: [
      ["contratante_nome", "Nome"],
      ["contratante_cpf_cnpj", "CPF/CNPJ"],
      ["contratante_rg", "RG"],
      ["contratante_endereco", "Endereço"],
      ["contratante_email", "E-mail"],
      ["contratante_telefone", "Telefone"],
    ],
  },
  {
    title: "Contratada",
    readonly: true,
    fields: [
      ["contratada_razao", "Razão social"],
      ["contratada_cnpj", "CNPJ"],
      ["contratada_endereco", "Endereço"],
      ["contratada_representante", "Representante"],
    ],
  },
  {
    title: "Obra e assinatura",
    fields: [
      ["obra_endereco", "Endereço da obra"],
      ["obra_area", "Área"],
      ["obra_matricula", "Matrícula"],
      ["obra_iptu", "IPTU"],
      ["obra_tipo", "Tipo"],
      ["numero_contrato", "Número do contrato"],
      ["data_assinatura", "Data da assinatura"],
      ["data_assinatura_extenso", "Data por extenso"],
      ["cidade_assinatura", "Cidade da assinatura"],
      ["cidade_foro", "Cidade do foro"],
    ],
  },
  {
    title: "Valores e pagamento",
    fields: [
      ["valor_total", "Valor total"],
      ["valor_extenso", "Valor por extenso"],
      ["valor_entrada", "Entrada (50%)"],
      ["valor_saldo", "Saldo (50%)"],
      ["parcelas", "Parcelas"],
      ["forma_pagamento", "Forma de pagamento"],
      ["dia_vencimento", "Dia do vencimento"],
    ],
  },
  {
    title: "Escopo",
    fields: [["escopo_servico", "Escopo do serviço"]],
  },
] as const;

export function DocumentActions({
  leadId,
  clienteId,
  contratoId,
  proposalDefaults,
  materialDefaults,
  contractDefaults,
}: {
  leadId?: string;
  clienteId?: string;
  contratoId?: string;
  proposalDefaults?: Values;
  materialDefaults?: Values;
  contractDefaults?: Values;
}) {
  const [modal, setModal] = useState<Modal>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function generateDocx(kind: "proposta" | "contrato", form: FormData) {
    setPending(true);
    setError("");
    const params: Record<string, FormDataEntryValue> = {};
    form.forEach((value, key) => {
      params[key] = value;
    });
    try {
      const response = await fetch(`/api/documentos/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "proposta"
            ? { lead_id: leadId, cliente_id: clienteId, params }
            : { contrato_id: contratoId, params },
        ),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Falha ao gerar documento.");
      const anchor = document.createElement("a");
      anchor.href = result.download_url;
      anchor.download = result.nome_arquivo;
      anchor.target = "_blank";
      anchor.rel = "noopener";
      anchor.click();
      setModal(null);
      window.location.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Falha ao gerar documento.",
      );
    } finally {
      setPending(false);
    }
  }

  function openMaterial(form: FormData) {
    const query = new URLSearchParams();
    form.forEach((value, key) => query.set(key, String(value)));
    query.set("print", "1");
    window.open(
      `/admin/leads/${leadId}/material-apoio?${query}`,
      "_blank",
      "noopener",
    );
    setModal(null);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {leadId && materialDefaults && (
          <button
            type="button"
            onClick={() => setModal("material")}
            className="flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-sm font-bold"
          >
            <BookOpen className="size-4" /> Material de apoio
          </button>
        )}
        {(leadId || clienteId) && proposalDefaults && (
          <button
            type="button"
            onClick={() => setModal("proposta")}
            className="flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-sm font-bold"
          >
            <FileText className="size-4" /> Proposta comercial
          </button>
        )}
        {contratoId && contractDefaults && (
          <button
            type="button"
            onClick={() => setModal("contrato")}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white"
          >
            <FileSignature className="size-4" /> Gerar minuta
          </button>
        )}
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  {modal === "material"
                    ? "Material de apoio"
                    : modal === "proposta"
                      ? "Proposta comercial"
                      : "Gerar minuta do contrato"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Revise os campos antes de gerar o documento.
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setModal(null)}
                className="rounded-full border p-2"
              >
                <X className="size-4" />
              </button>
            </div>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}
            {modal === "material" && (
              <MaterialSupportForm
                values={materialDefaults!}
                pending={pending}
                onSubmit={openMaterial}
              />
            )}
            {modal === "proposta" && (
              <SimpleForm
                fields={proposalFields}
                values={proposalDefaults!}
                button="Gerar DOCX"
                pending={pending}
                onSubmit={(form) => generateDocx("proposta", form)}
              />
            )}
            {modal === "contrato" && (
              <form
                className="mt-6 space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  generateDocx("contrato", new FormData(event.currentTarget));
                }}
              >
                {contractGroups.map((group) => (
                  <fieldset key={group.title}>
                    <legend className="text-base font-bold">
                      {group.title}
                    </legend>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {group.fields.map(([name, label]) => (
                        <label
                          className={`field ${name === "escopo_servico" ? "sm:col-span-2 lg:col-span-3" : ""}`}
                          key={name}
                        >
                          {label}
                          {name === "escopo_servico" ? (
                            <textarea
                              className="input"
                              rows={4}
                              name={name}
                              defaultValue={contractDefaults![name] ?? ""}
                            />
                          ) : (
                            <input
                              className="input disabled:bg-slate-100"
                              name={name}
                              defaultValue={contractDefaults![name] ?? ""}
                              readOnly={"readonly" in group && group.readonly}
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <SubmitButton label="Gerar DOCX" pending={pending} />
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MaterialSupportForm({
  values,
  pending,
  onSubmit,
}: {
  values: Values;
  pending: boolean;
  onSubmit: (form: FormData) => void;
}) {
  const [impostoDireto, setImpostoDireto] = useState(
    Number(values.imposto_direto ?? 0),
  );
  const [impostoReduzido, setImpostoReduzido] = useState(
    Number(values.imposto_reduzido ?? 0),
  );
  const [multaStatus, setMultaStatus] = useState<MultaStatus>(
    (values.multa_status as MultaStatus) || "nao_apuradas",
  );
  const [multas, setMultas] = useState(Number(values.multas ?? 0));
  const calculo = calculateMaterialSupport({
    impostoDireto,
    impostoReduzido,
    multaStatus,
    multasInformadas: multas,
  });
  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          Cliente
          <input
            className="input"
            name="cliente"
            defaultValue={values.cliente ?? ""}
          />
        </label>
        <label className="field">
          Situação da obra
          <select
            className="input"
            name="obra_status"
            defaultValue={values.obra_status ?? "concluida"}
          >
            <option value="concluida">Obra concluída</option>
            <option value="em_andamento">Obra em andamento</option>
          </select>
        </label>
        <MaterialNumberField
          name="area_construcao"
          label="Área de construção (m²)"
          value={Number(values.area_construcao ?? 0)}
        />
        <MaterialNumberField
          name="area_piscina"
          label="Área de piscina (m²)"
          value={Number(values.area_piscina ?? 0)}
        />
        <MaterialNumberField
          name="imposto_direto"
          label="INSS sem redução (R$)"
          value={impostoDireto}
          onChange={setImpostoDireto}
        />
        <MaterialNumberField
          name="imposto_reduzido"
          label="INSS reduzido (R$)"
          value={impostoReduzido}
          onChange={setImpostoReduzido}
        />
      </div>
      <p className="rounded-xl bg-blue-50 p-3 text-sm text-slate-600">
        Os valores de INSS são editáveis. Confira a estimativa no{" "}
        <a
          href={MATERIAL_SUPPORT_EXTERNAL_SIMULATOR}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-primary underline"
        >
          Simulador de DISO
        </a>{" "}
        antes de gerar o documento.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          Situação das multas
          <select
            className="input"
            name="multa_status"
            value={multaStatus}
            onChange={(event) =>
              setMultaStatus(event.target.value as MultaStatus)
            }
          >
            <option value="nao_apuradas">Não apuradas</option>
            <option value="nao_identificadas">Não identificadas</option>
            <option value="identificadas">Identificadas</option>
          </select>
        </label>
        {multaStatus === "identificadas" && (
          <MaterialNumberField
            name="multas"
            label="Valor das multas identificadas (R$)"
            value={multas}
            min={0.01}
            required
            onChange={setMultas}
          />
        )}
      </div>
      <div className="grid gap-3 rounded-2xl border bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div>
          <span className="text-slate-500">Economia estimada</span>
          <strong className="mt-1 block text-base">
            {currency.format(calculo.economia)} (
            {calculo.economiaPct.toFixed(0)}%)
          </strong>
        </div>
        <div>
          <span className="text-slate-500">À vista</span>
          <strong className="mt-1 block text-base">
            {currency.format(calculo.totalAVista)}
          </strong>
        </div>
        <div>
          <span className="text-slate-500">Parcelado após vencimento</span>
          <strong className="mt-1 block text-base">
            {calculo.parcelas}x de {currency.format(calculo.valorParcela)}
          </strong>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        O cenário parcelado inclui separadamente a multa de mora de 20% e não a
        soma novamente às multas informadas. Os juros Selic futuros não estão
        incluídos e serão definidos pela Receita Federal na consolidação.
      </p>
      <SubmitButton label="Gerar PDF" pending={pending} />
    </form>
  );
}

function MaterialNumberField({
  name,
  label,
  value,
  min = 0,
  required = false,
  onChange,
}: {
  name: string;
  label: string;
  value: number;
  min?: number;
  required?: boolean;
  onChange?: (value: number) => void;
}) {
  return (
    <label className="field">
      {label}
      <input
        className="input"
        name={name}
        type="number"
        min={min}
        step="0.01"
        value={onChange ? value : undefined}
        defaultValue={onChange ? undefined : value}
        required={required}
        onChange={
          onChange
            ? (event) => onChange(Math.max(0, event.target.valueAsNumber || 0))
            : undefined
        }
      />
    </label>
  );
}

function SimpleForm({
  fields,
  values,
  button,
  pending,
  onSubmit,
}: {
  fields: readonly (readonly [string, string])[];
  values: Values;
  button: string;
  pending: boolean;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <form
      className="mt-6 grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
      }}
    >
      {fields.map(([name, label]) => (
        <label className="field" key={name}>
          {label}
          <input
            className="input"
            name={name}
            defaultValue={values[name] ?? ""}
            type={
              [
                "area_construcao",
                "imposto_direto",
                "imposto_reduzido",
                "multas",
                "parcelas",
                "area_piscina",
              ].includes(name)
                ? "number"
                : "text"
            }
            min={name === "parcelas" ? 1 : undefined}
            step="any"
          />
        </label>
      ))}
      <div className="sm:col-span-2">
        <SubmitButton label={button} pending={pending} />
      </div>
    </form>
  );
}

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button
      disabled={pending}
      className="ml-auto flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-bold text-white disabled:opacity-60"
    >
      {pending && <LoaderCircle className="size-4 animate-spin" />}
      {pending ? "Gerando…" : label}
    </button>
  );
}
