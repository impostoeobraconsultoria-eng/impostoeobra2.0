"use client";

import { useEffect, useState } from "react";
import { Download, FileText, LoaderCircle } from "lucide-react";
import { TrackedPublicAnchor } from "@/components/analytics/tracked-anchor";

type Status = "aguardando" | "consultando" | "pronto" | "demorado";

export function DiagnosticoDownload({ leadId }: { leadId: string | null }) {
  const [status, setStatus] = useState<Status>(
    leadId ? "consultando" : "aguardando",
  );

  useEffect(() => {
    if (!leadId) {
      setStatus("aguardando");
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async (attempt: number) => {
      try {
        const response = await fetch(
          `/api/diagnosticos/${leadId}/download?status=1`,
          { cache: "no-store" },
        );
        if (cancelled) return;
        if (response.ok) {
          setStatus("pronto");
          return;
        }
      } catch {
        // A mensagem final cobre indisponibilidade temporária sem expor detalhes.
      }
      if (attempt >= 5) {
        setStatus("demorado");
        return;
      }
      timer = setTimeout(() => void check(attempt + 1), 3000);
    };
    setStatus("consultando");
    void check(1);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [leadId]);

  return (
    <section className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
      <div className="flex gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h4 className="font-extrabold text-foreground">
            Seu Diagnóstico Preliminar
          </h4>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Baixe seu diagnóstico completo com fundamentação técnica.
          </p>
          {status === "demorado" && (
            <p className="mt-2 text-xs font-semibold text-amber-800">
              Diagnóstico em processamento. Verifique seu e-mail em alguns
              minutos.
            </p>
          )}
        </div>
      </div>
      {status === "pronto" && leadId ? (
        <TrackedPublicAnchor
          kind="diagnostico"
          origem="resultado_calculadora"
          href={`/api/diagnosticos/${leadId}/download`}
          className="mt-4 inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white hover:no-underline sm:mt-0"
        >
          <Download className="size-4" aria-hidden="true" />
          Baixar Diagnóstico Preliminar
        </TrackedPublicAnchor>
      ) : (
        <span className="mt-4 inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-primary sm:mt-0">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {status === "aguardando"
            ? "Registrando simulação…"
            : "Preparando PDF…"}
        </span>
      )}
    </section>
  );
}
