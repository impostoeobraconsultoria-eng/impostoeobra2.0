"use client";

import { useFormState, useFormStatus } from "react-dom";

import { createLead, type CreateLeadState } from "@/app/admin/leads/actions";

const initialState: CreateLeadState = {};

export function ManualLeadForm({
  stages,
  products,
}: {
  stages: { nome: string }[];
  products: { slug: string; nome: string }[];
}) {
  const [state, action] = useFormState(createLead, initialState);
  return (
    <form
      action={action}
      className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      noValidate
    >
      <Field name="nome" label="Nome" required error={state.errors?.nome} />
      <Field name="email" label="E-mail" type="email" />
      <Field name="ddd" label="DDD" />
      <Field name="whatsapp" label="WhatsApp" />
      <Field name="uf" label="UF" />
      <Field name="cidade" label="Cidade" />
      <label className="text-sm font-semibold">
        Produto
        <select
          name="produto"
          className="mt-1 w-full rounded-lg border px-3 py-2.5 font-normal"
        >
          <option value="">— Selecione um produto —</option>
          {products.map((product) => (
            <option key={product.slug} value={product.slug}>
              {product.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold">
        Status{" "}
        <span aria-hidden="true" className="text-red-600">
          *
        </span>
        <select
          name="status"
          required
          aria-invalid={Boolean(state.errors?.status)}
          className={`mt-1 w-full rounded-lg border px-3 py-2.5 font-normal ${state.errors?.status ? "border-red-500" : ""}`}
        >
          {stages.map((stage) => (
            <option key={stage.nome}>{stage.nome}</option>
          ))}
        </select>
        {state.errors?.status && (
          <span className="mt-1 block text-xs text-red-700">
            {state.errors.status}
          </span>
        )}
      </label>
      <Field name="valor_potencial" label="Valor potencial" type="number" />
      <label className="text-sm font-semibold sm:col-span-2 lg:col-span-3">
        Observações
        <textarea
          name="observacoes"
          rows={3}
          className="mt-1 w-full rounded-lg border px-3 py-2.5 font-normal"
        />
      </label>
      <div className="flex flex-col justify-end gap-2">
        {state.errors?.form && (
          <p role="alert" className="text-xs text-red-700">
            {state.errors.form}
          </p>
        )}
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full rounded-full bg-accent px-5 py-3 font-bold text-white disabled:opacity-60"
      type="submit"
    >
      {pending ? "Criando..." : "Criar lead"}
    </button>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  error,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}{" "}
      {required && (
        <span aria-hidden="true" className="text-red-600">
          *
        </span>
      )}
      <input
        name={name}
        type={type}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        title={error}
        step={type === "number" ? "0.01" : undefined}
        className={`mt-1 w-full rounded-lg border px-3 py-2.5 font-normal ${error ? "border-red-500 ring-1 ring-red-500" : ""}`}
      />
      {error && (
        <span id={`${name}-error`} className="mt-1 block text-xs text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}
