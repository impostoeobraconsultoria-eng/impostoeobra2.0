"use client";

import { useState } from "react";
import { X } from "lucide-react";

export const CONTACT_RESULTS = [
  ["sem_resposta", "Sem resposta"],
  ["ocupado", "Ocupado"],
  ["nao_atende", "Não atende"],
  ["interessado", "Interessado"],
  ["sem_interesse", "Sem interesse"],
  ["retornar_depois", "Retornar depois"],
  ["outro", "Outro"],
] as const;

export function LeadAttemptModal({
  leadName,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  leadName: string;
  pending: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (input: { resultado: string; observacoes: string }) => void;
}) {
  const [result, setResult] = useState("");
  const [notes, setNotes] = useState("");
  const closesCadence = result === "interessado" || result === "sem_interesse";
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attempt-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="attempt-title" className="text-xl font-bold">
              Registrar tentativa
            </h2>
            <p className="mt-1 text-sm text-slate-500">{leadName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <label className="field">
            Resultado
            <select
              className="input"
              value={result}
              onChange={(event) => setResult(event.target.value)}
              required
            >
              <option value="">— Selecione —</option>
              {CONTACT_RESULTS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Observações
            <textarea
              className="input min-h-28"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
              placeholder="Contexto da ligação ou próximo passo..."
            />
          </label>
          {closesCadence && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Este resultado encerra a cadência. Depois, converta ou inative o
              lead conforme a decisão comercial.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border px-5 py-2.5 text-sm font-bold"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending || !result}
            onClick={() => onSubmit({ resultado: result, observacoes: notes })}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending ? "Registrando…" : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
