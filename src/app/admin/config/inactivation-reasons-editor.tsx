"use client";

import { GripVertical, Plus } from "lucide-react";
import { useState } from "react";

type Reason = { id?: string; slug: string; rotulo: string; ativo: boolean; reativavel_padrao: boolean };

export function InactivationReasonsEditor({ initialReasons, action }: { initialReasons: Reason[]; action: (formData: FormData) => void | Promise<void> }) {
  const [reasons, setReasons] = useState(initialReasons);
  const [dragged, setDragged] = useState<number | null>(null);
  const update = (index: number, patch: Partial<Reason>) => setReasons((items) => items.map((item, position) => position === index ? { ...item, ...patch } : item));
  const move = (target: number) => {
    if (dragged == null || dragged === target) return;
    setReasons((items) => { const next = [...items]; const [item] = next.splice(dragged, 1); next.splice(target, 0, item); return next; });
    setDragged(null);
  };
  return <form action={action} className="space-y-5">
    <input type="hidden" name="motivos" value={JSON.stringify(reasons)} />
    <div className="space-y-3">{reasons.map((reason, index) => <div key={reason.id ?? `new-${index}`} draggable onDragStart={() => setDragged(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => move(index)} className="grid items-center gap-3 rounded-xl border p-4 sm:grid-cols-[auto_1fr_1fr_auto_auto]">
      <GripVertical className="size-5 cursor-grab text-slate-400" aria-label="Arrastar para reordenar" />
      <label className="text-sm font-semibold">Rótulo<input className="input" value={reason.rotulo} maxLength={100} required onChange={(event) => update(index, { rotulo: event.target.value })} /></label>
      <label className="text-sm font-semibold">Slug<input className="input disabled:bg-slate-100" value={reason.slug} disabled={Boolean(reason.id)} maxLength={100} required onChange={(event) => update(index, { slug: event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} /></label>
      <label className="mt-5 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={reason.reativavel_padrao} onChange={(event) => update(index, { reativavel_padrao: event.target.checked })} /> Contato futuro</label>
      <label className="mt-5 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={reason.ativo} onChange={(event) => update(index, { ativo: event.target.checked })} /> Ativo</label>
    </div>)}</div>
    <div className="flex flex-wrap gap-3"><button type="button" className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-bold" onClick={() => setReasons((items) => [...items, { slug: "novo-motivo", rotulo: "Novo motivo", ativo: true, reativavel_padrao: true }])}><Plus className="size-4" /> Adicionar motivo</button><button className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white">Salvar alterações</button></div>
  </form>;
}
