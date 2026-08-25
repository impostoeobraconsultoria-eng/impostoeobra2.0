"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type GeneratedCode = { codigo: string; expira_em: string };

export function TelegramLinkManager({
  linked,
  botUsername,
}: {
  linked: boolean;
  botUsername: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState<GeneratedCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/telegram/gerar-codigo", {
        method: "POST",
      });
      const result = (await response.json()) as GeneratedCode & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "Falha ao gerar código.");
      setCode(result);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Falha ao gerar código.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function unlink() {
    if (!window.confirm("Desvincular este Telegram do seu usuário?")) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/telegram/vinculo", {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error || "Falha ao desvincular Telegram.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Falha ao desvincular Telegram.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (linked)
    return (
      <div className="mt-6">
        <button
          type="button"
          disabled={loading}
          onClick={unlink}
          className="inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Desvincular
        </button>
        {error && (
          <p className="mt-3 text-sm font-medium text-red-700">{error}</p>
        )}
      </div>
    );

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={loading}
        onClick={generate}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Gerar código
      </button>
      {error && (
        <p className="mt-3 text-sm font-medium text-red-700">{error}</p>
      )}
      {code && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
          <p className="text-sm font-semibold text-slate-600">
            Seu código temporário
          </p>
          <p className="mt-2 font-mono text-4xl font-black tracking-[0.2em] text-primary">
            {code.codigo}
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Envie este código ao bot antes das{" "}
            {new Intl.DateTimeFormat("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(code.expira_em))}
            .
          </p>
          {botUsername ? (
            <a
              href={`https://t.me/${botUsername}?start=vincular`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex font-bold text-primary hover:underline"
            >
              Abrir @{botUsername} no Telegram
            </a>
          ) : (
            <p className="mt-4 text-sm font-medium text-amber-800">
              Abra o bot no Telegram e envie o código acima.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
