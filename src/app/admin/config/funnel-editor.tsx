"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type Stage = { id?: string; nome: string; cor: string; e_fechada: boolean };

export function FunnelEditor({
  initialStages,
  action,
}: {
  initialStages: Stage[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [stages, setStages] = useState(initialStages);
  const [dragged, setDragged] = useState<number | null>(null);
  const update = (index: number, patch: Partial<Stage>) =>
    setStages((items) =>
      items.map((item, position) =>
        position === index ? { ...item, ...patch } : item,
      ),
    );
  const move = (target: number) => {
    if (dragged == null || dragged === target) return;
    setStages((items) => {
      const next = [...items];
      const [item] = next.splice(dragged, 1);
      next.splice(target, 0, item);
      return next;
    });
    setDragged(null);
  };
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="etapas" value={JSON.stringify(stages)} />
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div
            key={stage.id ?? `new-${index}`}
            draggable
            onDragStart={() => setDragged(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => move(index)}
            className="grid items-center gap-3 rounded-xl border bg-white p-4 sm:grid-cols-[auto_1fr_110px_180px_auto]"
          >
            <GripVertical
              className="size-5 cursor-grab text-slate-400"
              aria-label="Arrastar para reordenar"
            />
            <label className="text-sm font-semibold">
              Nome
              <input
                className="input"
                value={stage.nome}
                maxLength={100}
                required
                onChange={(event) =>
                  update(index, { nome: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-semibold">
              Cor
              <input
                className="mt-1 h-11 w-full cursor-pointer rounded-lg border bg-white p-1"
                type="color"
                value={stage.cor}
                onChange={(event) => update(index, { cor: event.target.value })}
              />
            </label>
            <label className="mt-5 flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={stage.e_fechada}
                onChange={(event) =>
                  update(index, { e_fechada: event.target.checked })
                }
              />{" "}
              Considerar fechada
            </label>
            <button
              type="button"
              className="mt-5 grid size-10 place-items-center rounded-lg text-red-600 hover:bg-red-50"
              aria-label={`Remover ${stage.nome}`}
              onClick={() =>
                setStages((items) =>
                  items.filter((_, position) => position !== index),
                )
              }
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-bold"
          onClick={() =>
            setStages((items) => [
              ...items,
              { nome: "Nova etapa", cor: "#0B76C6", e_fechada: false },
            ])
          }
        >
          <Plus className="size-4" /> Adicionar etapa
        </button>
        <button
          type="submit"
          className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white"
        >
          Salvar alterações
        </button>
      </div>
    </form>
  );
}
