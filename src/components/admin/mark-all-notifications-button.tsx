"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkAllNotificationsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/notificacoes/todas-lidas", { method: "PATCH" });
        setBusy(false);
        router.refresh();
      }}
      className="rounded-full border bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
    >
      {busy ? "Marcando…" : "Marcar todas como lidas"}
    </button>
  );
}
