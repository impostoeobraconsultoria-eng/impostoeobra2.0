"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, RotateCcw, Trash2 } from "lucide-react";

import { permanentlyDeleteLead, restoreLead } from "@/app/admin/leads/actions";

export function TrashActions({ id, nome }: { id: string; nome: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function restore() {
    setError("");
    startTransition(async () => {
      const result = await restoreLead(id);
      if (!result.ok) setError(result.error ?? "Não foi possível restaurar.");
    });
  }

  function remove() {
    if (
      !window.confirm(
        `Excluir ${nome} definitivamente? Esta ação é irreversível.`,
      )
    )
      return;
    setError("");
    startTransition(async () => {
      const result = await permanentlyDeleteLead(id);
      if (!result.ok)
        setError(result.error ?? "Não foi possível excluir definitivamente.");
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={restore}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
          Restaurar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
          Excluir definitivamente
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
