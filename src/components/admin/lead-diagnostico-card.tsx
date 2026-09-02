"use client";

import { useState } from "react";
import { Download, FileText, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

type Diagnostico = {
  numero_publico: string;
  variante: "com_reducao" | "sem_reducao";
  gerado_em: string;
  regenerado_em: string | null;
  regeracoes_count: number;
};

export function LeadDiagnosticoCard({
  leadId,
  diagnostico,
  canRegenerate,
}: {
  leadId: string;
  diagnostico: Diagnostico | null;
  canRegenerate: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const regenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/diagnosticos/${leadId}/regerar`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        download_url?: string | null;
      } | null;
      if (!response.ok) throw new Error(body?.error || "Falha ao regerar.");
      router.refresh();
      if (body?.download_url)
        window.open(body.download_url, "_blank", "noopener,noreferrer");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível regerar o diagnóstico.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Documento automático
            </p>
            <h2 className="mt-1 text-xl font-bold">Diagnóstico Preliminar</h2>
            {diagnostico ? (
              <p className="mt-1 text-sm text-slate-500">
                Gerado em {formatDate(diagnostico.gerado_em)} · Nº{" "}
                {diagnostico.numero_publico}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">Não gerado ainda.</p>
            )}
          </div>
        </div>
        {diagnostico && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-extrabold ${
              diagnostico.variante === "com_reducao"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {diagnostico.variante === "com_reducao"
              ? "Com redução"
              : "Sem redução"}
          </span>
        )}
      </div>

      {diagnostico && diagnostico.regeracoes_count > 0 && (
        <p className="mt-4 text-sm text-slate-600">
          Regenerado {diagnostico.regeracoes_count}×
          {diagnostico.regenerado_em
            ? ` · última em ${formatDate(diagnostico.regenerado_em)}`
            : ""}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        {diagnostico && (
          <a
            href={`/api/diagnosticos/${leadId}/download`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white hover:no-underline"
          >
            <Download className="size-4" aria-hidden="true" />
            Ver PDF
          </a>
        )}
        {canRegenerate && (
          <button
            type="button"
            onClick={regenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            <RefreshCw
              className={`size-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {diagnostico ? "Regerar" : "Gerar agora"}
          </button>
        )}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
