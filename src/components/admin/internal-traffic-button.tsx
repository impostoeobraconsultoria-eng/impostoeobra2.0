"use client";

import { useState } from "react";

export function InternalTrafficButton() {
  const [marked, setMarked] = useState(false);
  function markInternal() {
    document.cookie =
      "imposto_obra_internal=true; Path=/; Max-Age=31536000; SameSite=Lax; Secure";
    setMarked(true);
  }
  return (
    <button
      type="button"
      onClick={markInternal}
      className="mx-4 mb-2 text-left text-xs text-slate-400 hover:text-primary"
    >
      {marked
        ? "Navegador marcado como interno"
        : "Marcar navegador como interno"}
    </button>
  );
}
