"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, PhoneCall } from "lucide-react";

import { LeadAttemptModal } from "@/components/admin/lead-modal-tentativa";

export type LeadCadenceSnapshot = {
  id: string;
  nome: string;
  data_hora: string;
  responsavel_id: string | null;
  contato_inicial_em: string | null;
  tentativa_atual: number;
  proxima_tentativa_em: string | null;
  cadencia_finalizada_em: string | null;
};

export function LeadCadenceActions({
  lead,
  maxAttempts,
  slaHours,
  nowIso,
  compact = false,
  onUpdated,
  renderInactivate,
}: {
  lead: LeadCadenceSnapshot;
  maxAttempts: number;
  slaHours: number;
  nowIso: string;
  compact?: boolean;
  onUpdated?: (values: Partial<LeadCadenceSnapshot>) => void;
  renderInactivate?: React.ReactNode;
}) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const uncoveredHours =
    !lead.responsavel_id && !lead.contato_inicial_em
      ? Math.max(
          0,
          Math.floor(
            (Date.parse(nowIso) - Date.parse(lead.data_hora)) / 3_600_000,
          ),
        )
      : 0;

  async function initialContact() {
    setPending(true);
    setError("");
    const response = await fetch(`/api/leads/${lead.id}/contato-inicial`, {
      method: "POST",
    });
    const result = await response.json().catch(() => null);
    setPending(false);
    if (!response.ok) {
      setError(result?.error ?? "Não foi possível marcar o contato inicial.");
      return;
    }
    onUpdated?.(result.lead_atualizado);
    router.refresh();
  }

  async function registerAttempt(input: {
    resultado: string;
    observacoes: string;
  }) {
    setPending(true);
    setError("");
    const response = await fetch(`/api/leads/${lead.id}/registrar-tentativa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = await response.json().catch(() => null);
    setPending(false);
    if (!response.ok) {
      setError(result?.error ?? "Não foi possível registrar a tentativa.");
      return;
    }
    setModal(false);
    onUpdated?.(result.lead_atualizado);
    router.refresh();
  }

  return (
    <div
      className={
        compact ? "mt-3 space-y-2" : "flex flex-wrap items-center gap-2"
      }
    >
      {uncoveredHours >= slaHours && (
        <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-extrabold text-red-700">
          Sem cobertura há {uncoveredHours}h
        </span>
      )}
      {!lead.contato_inicial_em ? (
        <button
          type="button"
          disabled={pending}
          onClick={initialContact}
          className={`${compact ? "w-full justify-center" : ""} inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50`}
        >
          <PhoneCall className="size-4" />
          {pending ? "Salvando…" : "Marcar contato inicial"}
        </button>
      ) : lead.cadencia_finalizada_em ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-800">
            <CheckCircle2 className="size-3.5" /> Aguardando decisão
          </span>
          <Link
            href={`/admin/leads/${lead.id}?decidir=1`}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white"
          >
            Converter
          </Link>
          {renderInactivate}
        </div>
      ) : (
        <div
          className={
            compact ? "space-y-2" : "flex flex-wrap items-center gap-2"
          }
        >
          <p className="text-xs font-semibold text-slate-600">
            Tentativa {lead.tentativa_atual}/{maxAttempts}
            {lead.proxima_tentativa_em
              ? ` · Próximo follow-up: ${formatDate(lead.proxima_tentativa_em)}`
              : ""}
          </p>
          <button
            type="button"
            onClick={() => {
              setError("");
              setModal(true);
            }}
            className="rounded-full border border-primary px-3 py-1.5 text-xs font-bold text-primary"
          >
            Registrar tentativa
          </button>
        </div>
      )}
      {error && !modal && (
        <p role="alert" className="text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
      {modal && (
        <LeadAttemptModal
          leadName={lead.nome}
          pending={pending}
          error={error}
          onClose={() => !pending && setModal(false)}
          onSubmit={registerAttempt}
        />
      )}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${value}T12:00:00-03:00`));
}
