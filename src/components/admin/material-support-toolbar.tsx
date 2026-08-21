"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Copy, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

export function MaterialSupportToolbar({
  leadId,
  params,
  autoPrint,
}: {
  leadId: string;
  params: Record<string, string | number>;
  autoPrint: boolean;
}) {
  const router = useRouter();
  const registered = useRef(false);
  const [message, setMessage] = useState("");

  async function registerAndPrint() {
    if (!registered.current) {
      registered.current = true;
      const response = await fetch("/api/documentos/material-apoio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, params }),
      });
      if (!response.ok) {
        registered.current = false;
        const body = await response.json().catch(() => ({}));
        setMessage(body.error || "Não foi possível registrar a geração.");
        return;
      }
    }
    window.print();
  }

  useEffect(() => {
    if (!autoPrint) return;
    const timer = window.setTimeout(registerAndPrint, 500);
    return () => window.clearTimeout(timer);
    // Executa uma vez na abertura da pré-visualização.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint]);

  async function copyLink() {
    await navigator.clipboard.writeText(
      window.location.href
        .replace(/([?&])print=1(&|$)/, "$1")
        .replace(/[?&]$/, ""),
    );
    setMessage("Link copiado.");
  }

  return (
    <div className="material-toolbar print:hidden">
      <button type="button" onClick={() => router.back()}>
        <ArrowLeft className="size-4" /> Voltar
      </button>
      <div className="flex flex-wrap items-center gap-2">
        {message && <span className="text-sm text-slate-600">{message}</span>}
        <button type="button" onClick={copyLink}>
          <Copy className="size-4" /> Copiar link público
        </button>
        <button type="button" className="primary" onClick={registerAndPrint}>
          <Printer className="size-4" /> Salvar como PDF
        </button>
      </div>
    </div>
  );
}
