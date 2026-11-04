"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { softDeleteLead } from "@/app/admin/leads/actions";

export function LeadDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function remove() {
    if (
      !window.confirm(
        `Mover ${name} para a lixeira? O lead poderá ser restaurado depois.`,
      )
    )
      return;
    setError("");
    startTransition(async () => {
      try {
        const result = await softDeleteLead(id);
        if (!result.ok) {
          setError(result.error || "Não foi possível excluir o lead.");
          return;
        }
        router.refresh();
      } catch {
        setError(
          "Não foi possível excluir. Confira sua sessão e tente novamente.",
        );
      }
    });
  }
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={remove}
        aria-label={`Mover ${name} para a lixeira`}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="size-4" />
        {pending ? "Excluindo…" : "Excluir"}
      </button>
      {error && (
        <p role="alert" className="mt-1 max-w-56 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
