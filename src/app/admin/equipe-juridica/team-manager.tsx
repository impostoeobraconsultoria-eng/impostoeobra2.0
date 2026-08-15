"use client";

import { useState, useTransition } from "react";
import { GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";

import {
  createMember,
  deleteMember,
  reorderMembers,
  updateMember,
} from "./actions";

export type Member = {
  id: string;
  nome: string;
  oab: string | null;
  papel: string;
  descricao: string | null;
  foto_url: string | null;
  ordem: number;
  publicado: boolean;
};

export function TeamManager({ members, initialEdit }: { members: Member[]; initialEdit?: string }) {
  const [items, setItems] = useState(members);
  const [editing, setEditing] = useState<Member | null>(
    members.find((member) => member.id === initialEdit) ?? null,
  );
  const [creating, setCreating] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function drop(targetId: string) {
    if (!dragged || dragged === targetId) return;
    const next = [...items];
    const from = next.findIndex((item) => item.id === dragged);
    const to = next.findIndex((item) => item.id === targetId);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    setDragged(null);
    startTransition(async () => {
      const result = await reorderMembers(next.map((item) => item.id));
      if (!result.ok) {
        setItems(items);
        setMessage(result.error ?? "Não foi possível reordenar.");
      } else setMessage("Ordem atualizada.");
    });
  }

  function remove(member: Member) {
    if (!window.confirm(`Excluir ${member.nome} definitivamente?`)) return;
    startTransition(async () => {
      const result = await deleteMember(member.id);
      if (!result.ok) setMessage(result.error ?? "Não foi possível excluir.");
      else setItems((current) => current.filter((item) => item.id !== member.id));
    });
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Arraste os cards para alterar a ordem pública.</p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-white"
        >
          <Plus className="size-4" /> Novo membro
        </button>
      </div>
      {message && <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-primary">{message}</p>}
      <section className={`mt-5 grid gap-4 md:grid-cols-2 ${pending ? "opacity-70" : ""}`}>
        {items.map((member) => (
          <article
            key={member.id}
            draggable
            onDragStart={() => setDragged(member.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => drop(member.id)}
            className="relative border bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <GripVertical className="mt-1 size-5 cursor-grab text-slate-400" aria-label="Arrastar para reordenar" />
              {member.foto_url && (
                <div
                  role="img"
                  aria-label={`Foto de ${member.nome}`}
                  className="size-16 shrink-0 rounded-full bg-cover bg-center"
                  style={{ backgroundImage: `url("${member.foto_url}")` }}
                />
              )}
              <div className="min-w-0 flex-1">
                <span className={`float-right ml-3 rounded-full px-3 py-1 text-xs font-bold ${member.publicado ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                  {member.publicado ? "Publicado" : "Rascunho"}
                </span>
                <h2 className="font-bold">{member.nome}</h2>
                <p className="mt-1 text-sm font-semibold text-primary">{member.papel}</p>
                {member.oab && <p className="mt-1 text-xs text-slate-500">{member.oab}</p>}
              </div>
            </div>
            <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-600">{member.descricao || "Sem descrição."}</p>
            <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
              <span className="text-slate-500">Ordem {member.ordem}</span>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditing(member)} className="inline-flex items-center gap-1 font-semibold text-primary"><Pencil className="size-4" /> Editar</button>
                <button type="button" onClick={() => remove(member)} className="inline-flex items-center gap-1 font-semibold text-red-700"><Trash2 className="size-4" /> Excluir</button>
              </div>
            </div>
          </article>
        ))}
      </section>
      {(creating || editing) && (
        <MemberModal
          member={editing}
          close={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </>
  );
}

function MemberModal({ member, close }: { member: Member | null; close: () => void }) {
  const action = member ? updateMember.bind(null, member.id) : createMember;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4" role="dialog" aria-modal="true">
      <section className="my-8 w-full max-w-2xl bg-white p-6 shadow-2xl sm:p-8">
        <header className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">{member ? "Editar membro" : "Novo membro"}</h2>
          <button type="button" onClick={close} aria-label="Fechar"><X className="size-5" /></button>
        </header>
        <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="field">Nome *<input className="input" name="nome" required minLength={2} maxLength={160} defaultValue={member?.nome ?? ""} /></label>
          <label className="field">OAB<input className="input" name="oab" maxLength={100} defaultValue={member?.oab ?? ""} placeholder="OAB/DF nº 72.326" /></label>
          <label className="field sm:col-span-2">Papel *<input className="input" name="papel" required maxLength={180} defaultValue={member?.papel ?? ""} placeholder="Advogado tributarista · Fundador" /></label>
          <label className="field sm:col-span-2">Descrição<textarea className="input min-h-28" name="descricao" maxLength={3000} defaultValue={member?.descricao ?? ""} /></label>
          <label className="field">Foto<input className="mt-2 block w-full text-sm" type="file" name="foto" accept="image/png,image/jpeg,image/webp" /></label>
          <label className="field">Ordem<input className="input" type="number" name="ordem" min="0" max="9999" required defaultValue={member?.ordem ?? 100} /></label>
          <label className="flex items-center gap-3 font-semibold sm:col-span-2"><input className="size-5 accent-primary" type="checkbox" name="publicado" defaultChecked={member?.publicado ?? true} /> Publicado</label>
          <button className="rounded-full bg-accent px-6 py-3 font-bold text-white sm:col-span-2">{member ? "Salvar alterações" : "Criar membro"}</button>
        </form>
      </section>
    </div>
  );
}
