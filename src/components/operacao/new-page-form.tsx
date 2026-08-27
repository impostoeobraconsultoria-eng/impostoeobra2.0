"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OperacaoParte } from "@/lib/operacao/types";

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function NewOperacaoPageForm({ partes }: { partes: OperacaoParte[] }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/operacao/paginas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parte_id: data.get("parte_id"), titulo, slug, resumo: data.get("resumo"), ordem: Number(data.get("ordem")) || 100 }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setSaving(false); setError(result.error ?? "Não foi possível criar a página."); return; }
    router.push(`/operacao/${result.parte_slug}/${result.slug}/editar`);
  }

  return <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5 rounded-3xl border bg-white p-6 shadow-sm sm:p-9">
    <div><p className="text-sm font-bold text-primary">Manual operacional</p><h1 className="mt-1 text-3xl font-bold">Nova página</h1></div>
    <label className="field">Parte *<select name="parte_id" className="input" required defaultValue=""><option value="" disabled>— Selecione —</option>{partes.map((parte) => <option key={parte.id} value={parte.id}>Parte {parte.numero} — {parte.titulo}</option>)}</select></label>
    <label className="field">Título *<input className="input" required maxLength={180} value={titulo} onChange={(e) => { setTitulo(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} /></label>
    <label className="field">Slug *<input className="input" required pattern="[a-z0-9-]+" value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} /></label>
    <label className="field">Resumo<textarea name="resumo" className="input min-h-24" maxLength={500} /></label>
    <label className="field">Ordem<input name="ordem" type="number" className="input" min="0" defaultValue="100" /></label>
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}
    <div className="flex justify-end"><button disabled={saving} className="rounded-full bg-primary px-6 py-3 font-bold text-white disabled:opacity-60">{saving ? "Criando…" : "Criar e editar"}</button></div>
  </form>;
}
