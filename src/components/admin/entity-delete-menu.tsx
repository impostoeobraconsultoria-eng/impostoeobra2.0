"use client";

import { Ellipsis, LoaderCircle, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { softDeleteCustomer } from "@/app/admin/clientes/actions";
import { softDeleteContract } from "@/app/admin/contratos/actions";

export function EntityDeleteMenu({
  kind,
  id,
  name,
}: {
  kind: "cliente" | "contrato";
  id: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const message =
    kind === "cliente"
      ? "Deseja excluir este cliente? Ele será movido para a Lixeira e os contratos vinculados permanecem intactos."
      : "Deseja excluir este contrato? Ele será movido para a Lixeira. Os documentos gerados permanecem no histórico do cliente.";
  function remove() {
    if (!window.confirm(message)) return;
    setError("");
    startTransition(async () => {
      const result =
        kind === "cliente"
          ? await softDeleteCustomer(id)
          : await softDeleteContract(id);
      if (!result.ok)
        setError(result.error ?? `Não foi possível excluir ${kind}.`);
    });
  }
  return (
    <div className="relative">
      <details className="relative">
        <summary
          aria-label={`Ações de ${name}`}
          className="inline-flex cursor-pointer list-none rounded-md p-2 text-slate-500 hover:bg-slate-100"
        >
          <Ellipsis className="size-4" />
        </summary>
        <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border bg-white p-1 shadow-lg">
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}{" "}
            Excluir {kind}
          </button>
        </div>
      </details>
      {error && (
        <p
          role="alert"
          className="absolute right-0 top-11 z-30 w-72 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 shadow"
        >
          {error}
        </p>
      )}
    </div>
  );
}
