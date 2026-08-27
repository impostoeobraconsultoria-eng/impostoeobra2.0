"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { OperacaoEditor } from "./tiptap-editor";

export function EditOperacaoPage({ pagina, backHref, canDelete }: { pagina: { id: string; titulo: string; resumo: string | null; conteudo: JSONContent }; backHref: string; canDelete: boolean }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(pagina.titulo);
  const [resumo, setResumo] = useState(pagina.resumo ?? "");
  const [message, setMessage] = useState("");

  const patch = useCallback(async (body: Record<string, unknown>) => {
    const response = await fetch(`/api/operacao/paginas/${pagina.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error("Não foi possível salvar.");
  }, [pagina.id]);

  async function saveMetadata() {
    setMessage("Salvando…");
    try { await patch({ titulo, resumo }); setMessage("Dados salvos."); router.refresh(); }
    catch { setMessage("Erro ao salvar os dados."); }
  }

  async function removePage() {
    if (!window.confirm("Excluir esta página permanentemente?")) return;
    const response = await fetch(`/api/operacao/paginas/${pagina.id}`, { method: "DELETE" });
    if (response.ok) router.push("/operacao"); else setMessage("Não foi possível excluir.");
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-primary">Modo de edição</p><h1 className="text-2xl font-bold">Editar página</h1></div><div className="flex gap-2"><Link href={backHref} className="rounded-full border bg-white px-4 py-2 text-sm font-bold">Concluir edição</Link>{canDelete && <button type="button" onClick={removePage} className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700">Excluir página</button>}</div></header>
    <section className="grid gap-4 rounded-2xl border bg-white p-5"><label className="field">Título<input className="input" value={titulo} maxLength={180} onChange={(e) => setTitulo(e.target.value)} /></label><label className="field">Resumo<textarea className="input min-h-20" value={resumo} maxLength={500} onChange={(e) => setResumo(e.target.value)} /></label><div className="flex items-center gap-3"><button type="button" onClick={saveMetadata} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white">Salvar dados</button><span className="text-sm text-slate-500" aria-live="polite">{message}</span></div></section>
    <OperacaoEditor initialContent={pagina.conteudo} onSave={(conteudo) => patch({ conteudo })} />
  </div>;
}
