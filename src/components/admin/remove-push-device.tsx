"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemovePushDevice({ endpoint }: { endpoint: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function remove() {
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/push/unsubscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      if (!response.ok) throw new Error("Falha ao remover dispositivo.");
      const registration = await navigator.serviceWorker?.getRegistration("/");
      const currentSubscription =
        await registration?.pushManager.getSubscription();
      if (currentSubscription?.endpoint === endpoint)
        await currentSubscription.unsubscribe();
      router.refresh();
    } catch (removeError) {
      console.error("Falha ao remover assinatura push", removeError);
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? "Removendo…" : "Remover"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">Tente novamente.</p>}
    </div>
  );
}
