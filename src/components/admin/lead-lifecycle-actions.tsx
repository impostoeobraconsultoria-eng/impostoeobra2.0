"use client";

import { useState, useTransition } from "react";
import { CalendarClock, PauseCircle, PlayCircle, X } from "lucide-react";

import {
  inactivateLead,
  reactivateLead,
  updateLeadFutureContact,
} from "@/app/admin/leads/actions";

export type InactivationReason = {
  id: string;
  rotulo: string;
  reativavel_padrao: boolean;
};

type Props = {
  leadId: string;
  leadName: string;
  inactive?: boolean;
  reasons: InactivationReason[];
  stages?: string[];
  lastStage?: string | null;
  futureContact?: boolean;
  futureDate?: string | null;
  compact?: boolean;
  onSuccess?: () => void;
};

export function LeadLifecycleActions(props: Props) {
  const [dialog, setDialog] = useState<"inactive" | "reactivate" | "contact" | null>(null);
  const [reasonId, setReasonId] = useState("");
  const selectedReason = props.reasons.find((reason) => reason.id === reasonId);
  const [futureContact, setFutureContact] = useState(props.futureContact ?? true);
  const [futureDate, setFutureDate] = useState(props.futureDate ?? "");
  const [details, setDetails] = useState("");
  const [stage, setStage] = useState(props.lastStage || props.stages?.[0] || "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  function close() {
    if (!pending) {
      setDialog(null);
      setError("");
    }
  }

  function submitInactive() {
    if (!reasonId || (futureContact && !futureDate)) {
      setError("Preencha os campos obrigatórios.");
      return;
    }
    startTransition(async () => {
      const result = await inactivateLead(props.leadId, {
        motivoId: reasonId,
        detalhamento: details,
        contatoFuturo: futureContact,
        dataContatoFuturo: futureContact ? futureDate : null,
      });
      if (!result.ok) return setError(result.error ?? "Não foi possível inativar.");
      close();
      props.onSuccess?.();
      window.location.reload();
    });
  }

  function submitReactivation() {
    if (!stage) return setError("Escolha a etapa de retorno.");
    startTransition(async () => {
      const result = await reactivateLead(props.leadId, stage);
      if (!result.ok) return setError(result.error ?? "Não foi possível reativar.");
      close();
      window.location.href = `/admin/leads/${props.leadId}`;
    });
  }

  function submitContact() {
    if (futureContact && !futureDate) return setError("Informe a data da próxima tentativa.");
    startTransition(async () => {
      const result = await updateLeadFutureContact(props.leadId, {
        contatoFuturo: futureContact,
        dataContatoFuturo: futureContact ? futureDate : null,
      });
      if (!result.ok) return setError(result.error ?? "Não foi possível atualizar.");
      close();
      window.location.reload();
    });
  }

  return (
    <>
      {props.inactive ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDialog("reactivate")} className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white">
            <PlayCircle className="size-4" /> Reativar lead
          </button>
          <button type="button" onClick={() => setDialog("contact")} className="flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-sm font-bold">
            <CalendarClock className="size-4" /> Próximo contato
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setDialog("inactive")} className={props.compact ? "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50" : "flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800"}>
          <PauseCircle className="size-4" /> Inativar lead
        </button>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-xl font-bold">{dialog === "inactive" ? "Inativar lead" : dialog === "reactivate" ? "Reativar lead" : "Próximo contato"}</h2><p className="mt-1 text-sm text-slate-500">{props.leadName}</p></div>
              <button type="button" onClick={close} aria-label="Fechar"><X className="size-5" /></button>
            </div>
            <div className="mt-5 space-y-4">
              {dialog === "inactive" && <>
                <label className="field">Motivo<select className="input" value={reasonId} onChange={(event) => { const id = event.target.value; setReasonId(id); const reason = props.reasons.find((item) => item.id === id); if (reason) setFutureContact(reason.reativavel_padrao); }} required><option value="">— Selecione —</option>{props.reasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.rotulo}</option>)}</select></label>
                <label className="field">Detalhamento (opcional)<textarea className="input min-h-24" maxLength={500} value={details} onChange={(event) => setDetails(event.target.value)} /><span className="text-right text-xs font-normal text-slate-400">{details.length}/500</span></label>
              </>}
              {dialog === "reactivate" && <label className="field">Etapa de retorno<select className="input" value={stage} onChange={(event) => setStage(event.target.value)}>{props.stages?.map((item) => <option key={item}>{item}</option>)}</select></label>}
              {dialog !== "reactivate" && <>
                <fieldset><legend className="text-sm font-semibold">Vale contato posterior?</legend><div className="mt-2 flex gap-5"><label className="flex items-center gap-2 text-sm"><input type="radio" name="future-contact" checked={futureContact} onChange={() => setFutureContact(true)} /> Sim</label><label className="flex items-center gap-2 text-sm"><input type="radio" name="future-contact" checked={!futureContact} onChange={() => setFutureContact(false)} /> Não</label></div></fieldset>
                {futureContact && <label className="field">Data da próxima tentativa<input className="input" type="date" min={tomorrow} value={futureDate} onChange={(event) => setFutureDate(event.target.value)} /></label>}
              </>}
              {selectedReason && !selectedReason.reativavel_padrao && dialog === "inactive" && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Este motivo normalmente não prevê retomada, mas você pode agendar um contato manualmente.</p>}
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={close} className="rounded-full border px-5 py-2.5 text-sm font-bold">Cancelar</button><button type="button" disabled={pending} onClick={dialog === "inactive" ? submitInactive : dialog === "reactivate" ? submitReactivation : submitContact} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{pending ? "Salvando…" : "Confirmar"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
