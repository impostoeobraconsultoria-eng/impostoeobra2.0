"use client";

import { LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import {
  permanentlyDeleteCustomer,
  restoreCustomer,
} from "@/app/admin/clientes/actions";
import {
  permanentlyDeleteContract,
  restoreContract,
} from "@/app/admin/contratos/actions";

export function EntityTrashActions({
  kind,
  id,
  name,
  permanentDisabledReason,
}: {
  kind: "cliente" | "contrato";
  id: string;
  name: string;
  permanentDisabledReason?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function run(operation: "restore" | "remove") {
    if (
      operation === "remove" &&
      !window.confirm(
        `Excluir ${name} definitivamente? Esta ação é irreversível.`,
      )
    )
      return;
    setError("");
    startTransition(async () => {
      const result =
        operation === "restore"
          ? kind === "cliente"
            ? await restoreCustomer(id)
            : await restoreContract(id)
          : kind === "cliente"
            ? await permanentlyDeleteCustomer(id)
            : await permanentlyDeleteContract(id);
      if (!result.ok)
        setError(result.error ?? "Não foi possível concluir a ação.");
    });
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run("restore")}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
          Restaurar
        </button>
        <span title={permanentDisabledReason}>
          <button
            type="button"
            disabled={pending || Boolean(permanentDisabledReason)}
            onClick={() => run("remove")}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="size-3.5" />
            Excluir permanentemente
          </button>
        </span>
      </div>
      {permanentDisabledReason && (
        <p className="mt-2 max-w-md text-xs text-amber-700">
          {permanentDisabledReason}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
