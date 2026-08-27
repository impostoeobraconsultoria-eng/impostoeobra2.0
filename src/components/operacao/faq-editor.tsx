"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { OperacaoFaq } from "@/lib/operacao/types";

export function OperacaoFaqEditor({ paginaId, initialFaqs }: { paginaId: string; initialFaqs: OperacaoFaq[] }) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [draft, setDraft] = useState({ pergunta: "", resposta: "" });
  const [status, setStatus] = useState("");
  const [dragged, setDragged] = useState<number | null>(null);

  async function add() {
    setStatus("Salvando…");
    const response = await fetch("/api/operacao/faqs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pagina_id: paginaId, ...draft, ordem: (faqs.length + 1) * 10 }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setStatus(result.error ?? "Erro ao adicionar."); return; }
    setFaqs([...faqs, result]); setDraft({ pergunta: "", resposta: "" }); setStatus("Salvo");
  }

  async function update(faq: OperacaoFaq) {
    setStatus("Salvando…");
    const response = await fetch("/api/operacao/faqs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: faq.id, pergunta: faq.pergunta, resposta: faq.resposta, ordem: faq.ordem }) });
    setStatus(response.ok ? "Salvo" : "Erro ao salvar");
  }

  async function remove(id: string) {
    const response = await fetch(`/api/operacao/faqs?id=${id}`, { method: "DELETE" });
    if (response.ok) setFaqs(faqs.filter((faq) => faq.id !== id)); else setStatus("Erro ao remover");
  }

  async function drop(target: number) {
    if (dragged === null || dragged === target) return;
    const reordered = [...faqs]; const [item] = reordered.splice(dragged, 1); reordered.splice(target, 0, item);
    const numbered = reordered.map((faq, index) => ({ ...faq, ordem: (index + 1) * 10 })); setFaqs(numbered); setDragged(null);
    await Promise.all(numbered.map(update));
  }

  return <section className="rounded-2xl border bg-white p-5 sm:p-6">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">FAQ</h2><p className="text-sm text-slate-500">Perguntas exibidas ao final desta página.</p></div><span className="text-xs text-slate-500" aria-live="polite">{status}</span></div>
    <div className="mt-5 space-y-3">{faqs.map((faq, index) => <div key={faq.id} draggable onDragStart={() => setDragged(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(index)} className="grid gap-3 rounded-xl border bg-slate-50 p-3 sm:grid-cols-[auto_1fr_auto]">
      <GripVertical className="mt-3 size-5 cursor-grab text-slate-400" aria-label="Arraste para reordenar" />
      <div className="space-y-2"><input className="input !mt-0" aria-label={`Pergunta ${index + 1}`} value={faq.pergunta} onChange={(e) => setFaqs(faqs.map((item) => item.id === faq.id ? { ...item, pergunta: e.target.value } : item))} onBlur={() => update(faq)} /><textarea className="input !mt-0 min-h-24" aria-label={`Resposta ${index + 1}`} value={faq.resposta} onChange={(e) => setFaqs(faqs.map((item) => item.id === faq.id ? { ...item, resposta: e.target.value } : item))} onBlur={() => update(faq)} /></div>
      <button type="button" onClick={() => remove(faq.id)} className="self-start rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Remover pergunta"><Trash2 className="size-5" /></button>
    </div>)}</div>
    <div className="mt-5 grid gap-3 rounded-xl border border-dashed p-4"><h3 className="font-bold">Adicionar pergunta</h3><input className="input !mt-0" placeholder="Pergunta" value={draft.pergunta} onChange={(e) => setDraft({ ...draft, pergunta: e.target.value })} /><textarea className="input !mt-0 min-h-24" placeholder="Resposta" value={draft.resposta} onChange={(e) => setDraft({ ...draft, resposta: e.target.value })} /><button type="button" disabled={!draft.pergunta.trim() || !draft.resposta.trim()} onClick={add} className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Plus className="size-4" /> Adicionar pergunta</button></div>
  </section>;
}
