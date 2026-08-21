"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { createLead, type CreateLeadState } from "@/app/admin/leads/actions";
import { BrazilianPhoneInput } from "@/components/ui/brazilian-phone-input";
import { parseBrazilianMobile } from "@/lib/ddds-brasileiros";

const initialState: CreateLeadState = {};

export function ManualLeadForm({
  stages,
  products,
}: {
  stages: { nome: string }[];
  products: { slug: string; nome: string }[];
}) {
  const [state, action] = useFormState(createLead, initialState);
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const phoneError =
    telefone && !parseBrazilianMobile(telefone).ok
      ? (parseBrazilianMobile(telefone) as { ok: false; error: string }).error
      : state.errors?.telefone;
  useEffect(() => {
    const phone = parseBrazilianMobile(telefone);
    if (!phone.ok && !email.includes("@")) return setMatches([]);
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        fetch(
          `/api/leads/recorrencia?telefone=${encodeURIComponent(telefone)}&email=${encodeURIComponent(email)}`,
          { signal: controller.signal },
        )
          .then((response) =>
            response.ok ? response.json() : Promise.reject(),
          )
          .then((body) => setMatches(body.matches ?? []))
          .catch(() => {}),
      450,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [telefone, email]);
  return (
    <form
      action={action}
      className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      noValidate
    >
      <Field name="nome" label="Nome" required error={state.errors?.nome} />
      <Field
        name="email"
        label="E-mail"
        type="email"
        value={email}
        onChange={setEmail}
      />
      <label className="text-sm font-semibold">
        WhatsApp com DDD <span className="text-red-600">*</span>
        <BrazilianPhoneInput
          value={telefone}
          onValueChange={setTelefone}
          required
          invalid={Boolean(phoneError)}
          className={`mt-1 w-full rounded-lg border px-3 py-2.5 font-normal ${phoneError ? "border-red-500 ring-1 ring-red-500" : ""}`}
        />
        {phoneError && (
          <span className="mt-1 block text-xs text-red-700">{phoneError}</span>
        )}
      </label>
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
      {matches.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:col-span-2 lg:col-span-4">
          <p className="font-bold">⚠️ Possível cadastro recorrente</p>
          <ul className="mt-2 space-y-2">
            {matches.map((match) => (
              <li key={`${match.tipo}:${match.id}`}>
                {match.tipo === "cliente"
                  ? "Este número ou e-mail já é de um cliente"
                  : "Possível lead recorrente"}{" "}
                — <strong>{match.nome}</strong>
                {match.tipo === "lead"
                  ? ` entrou em ${new Date(match.data_hora!).toLocaleDateString("pt-BR")}, está atualmente ${match.status_ativacao === "inativo" ? "inativo" : match.status}`
                  : ""}
                .{" "}
                <Link
                  className="font-bold underline"
                  href={`/admin/${match.tipo === "lead" ? "leads" : "clientes"}/${match.id}`}
                >
                  Ver ficha
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col justify-end gap-2">
        {state.errors?.form && (
          <p role="alert" className="text-xs text-red-700">
            {state.errors.form}
          </p>
        )}
        <SubmitButton recurrent={matches.length > 0} />
      </div>
    </form>
  );
}

function SubmitButton({ recurrent }: { recurrent: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full rounded-full bg-accent px-5 py-3 font-bold text-white disabled:opacity-60"
      type="submit"
    >
      {pending
        ? "Criando..."
        : recurrent
          ? "Continuar mesmo assim"
          : "Criar lead"}
    </button>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  error,
  value,
  onChange,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
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
        value={value}
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
      />
      {error && (
        <span id={`${name}-error`} className="mt-1 block text-xs text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}

type Match = {
  id: string;
  tipo: "lead" | "cliente";
  nome: string;
  data_hora?: string;
  status?: string;
  status_ativacao?: string;
};
