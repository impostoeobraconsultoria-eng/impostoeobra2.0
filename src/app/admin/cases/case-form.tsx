"use client";

import { useState } from "react";

export type CaseValue = {
  cliente_display?: string | null;
  tipo_obra?: string | null;
  economia_valor?: number | string | null;
  economia_pct?: number | string | null;
  descricao?: string | null;
  imagem_url?: string | null;
  ordem?: number | null;
  publicado?: boolean;
};

export function CaseForm({
  action,
  value = {},
}: {
  action: (formData: FormData) => void | Promise<void>;
  value?: CaseValue;
}) {
  const [description, setDescription] = useState(value.descricao ?? "");
  const [touched, setTouched] = useState(false);
  const suspicious =
    description.trim().length < 30 || /\b(teste|asdf|lorem)\b/i.test(description);
  return (
    <form action={action} className="mt-5 grid gap-5 sm:grid-cols-2">
      <label className="field">
        Cliente para exibição *
        <input
          className="input"
          name="cliente_display"
          required
          maxLength={160}
          defaultValue={value.cliente_display ?? ""}
          placeholder="Ex.: Residência em Brasília"
        />
      </label>
      <label className="field">
        Tipo de obra
        <input
          className="input"
          name="tipo_obra"
          maxLength={120}
          defaultValue={value.tipo_obra ?? ""}
          placeholder="Residencial, comercial…"
        />
      </label>
      <label className="field">
        Economia em reais
        <input
          className="input"
          type="number"
          name="economia_valor"
          min="0"
          step="0.01"
          defaultValue={String(value.economia_valor ?? "")}
        />
      </label>
      <label className="field">
        Economia percentual
        <input
          className="input"
          type="number"
          name="economia_pct"
          min="0"
          max="100"
          step="0.01"
          defaultValue={String(value.economia_pct ?? "")}
        />
      </label>
      <label className="field sm:col-span-2">
        Descrição
        <textarea
          className="input min-h-32"
          name="descricao"
          maxLength={3000}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            setTouched(true);
          }}
          placeholder="Contexto da obra, desafio e resultado alcançado."
        />
        {touched && suspicious && (
          <span role="status" className="mt-2 block rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Descrição parece incompleta. Confirme antes de publicar.
          </span>
        )}
      </label>
      <label className="field sm:col-span-2">
        URL da imagem
        <input
          className="input"
          type="url"
          name="imagem_url"
          maxLength={1000}
          defaultValue={value.imagem_url ?? ""}
          placeholder="https://…"
        />
      </label>
      <label className="field">
        Ordem de exibição
        <input
          className="input"
          type="number"
          name="ordem"
          min="0"
          max="9999"
          defaultValue={String(value.ordem ?? 100)}
        />
      </label>
      <label className="flex items-center gap-3 self-end pb-3 font-semibold">
        <input
          className="size-5 accent-primary"
          type="checkbox"
          name="publicado"
          defaultChecked={value.publicado}
        />
        Publicado
      </label>
      <button className="rounded-full bg-accent px-6 py-3 font-bold text-white sm:col-span-2">
        Salvar case
      </button>
    </form>
  );
}
