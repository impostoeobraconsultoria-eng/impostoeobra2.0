"use client";

import { BellRing, Loader2 } from "lucide-react";
import { useState } from "react";

export function TestPushButton({ disabled = false }: { disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function sendTest() {
    setState("sending");
    setMessage("");
    const response = await fetch("/api/push/teste", { method: "POST" });
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (!response.ok) {
      setState("error");
      setMessage(result?.error ?? "Não foi possível enviar o teste.");
      return;
    }
    setState("success");
    setMessage(
      "Teste enviado. A notificação deve aparecer em seus dispositivos ativos.",
    );
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={sendTest}
        disabled={disabled || state === "sending"}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "sending" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <BellRing className="size-4" />
        )}
        {state === "sending" ? "Enviando…" : "Enviar notificação de teste"}
      </button>
      {message && (
        <p
          className={`text-sm font-medium ${state === "error" ? "text-red-700" : "text-emerald-700"}`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
