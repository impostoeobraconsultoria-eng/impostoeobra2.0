"use client";

import { useState, useTransition } from "react";
import { BadgeCheck } from "lucide-react";

import { toggleLeadQualification } from "@/app/admin/leads/actions";
import { sendGaEvent } from "@/lib/analytics";

export function LeadQualificationButton({
  leadId,
  qualified: initiallyQualified,
  eventName,
}: {
  leadId: string;
  qualified: boolean;
  eventName: string;
}) {
  const [qualified, setQualified] = useState(initiallyQualified);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (qualified && !window.confirm("Remover a qualificação deste lead?"))
      return;
    setError("");
    startTransition(async () => {
      const result = await toggleLeadQualification(leadId);
      if (!result.ok)
        return setError(result.error ?? "Não foi possível atualizar.");
      setQualified(Boolean(result.qualified));
      if (result.qualified)
        sendGaEvent(eventName, {
          lead_id: leadId,
          status_atual: result.status,
        });
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${qualified ? "border border-emerald-300 bg-emerald-50 text-emerald-800" : "border bg-white"}`}
      >
        <BadgeCheck className="size-4" />
        {pending
          ? "Salvando…"
          : qualified
            ? "Remover qualificação"
            : "Marcar como qualificado"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
