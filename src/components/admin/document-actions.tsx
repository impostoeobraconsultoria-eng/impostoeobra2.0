"use client";

import { useState } from "react";
import {
  BookOpen,
  FileSignature,
  FileText,
  LoaderCircle,
  X,
} from "lucide-react";

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

const materialFields = [
  ["cliente", "Cliente"],
  ["area_construcao", "Área de construção"],
  ["imposto_direto", "Imposto direto"],
  ["imposto_reduzido", "Imposto reduzido"],
  ["multas", "Multas"],
  ["parcelas", "Parcelas"],
  ["area_piscina", "Área de piscina"],
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
              <SimpleForm
                fields={materialFields}
                values={materialDefaults!}
                button="Gerar PDF"
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
