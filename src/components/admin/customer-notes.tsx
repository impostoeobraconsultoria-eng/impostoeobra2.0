"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle, Pencil, Trash2, X } from "lucide-react";

import {
  addCustomerNote,
  deleteCustomerNote,
  updateCustomerNote,
} from "@/app/admin/clientes/actions";

export type CustomerNote = {
  id: string;
  autor_id: string | null;
  conteudo: string;
  criado_em: string;
  autor?:
    | { nome: string | null; email: string }
    | { nome: string | null; email: string }[]
    | null;
};

export function CustomerNotes({
  customerId,
  notes,
  currentUserId,
  isAdmin,
}: {
  customerId: string;
  notes: CustomerNote[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    onSuccess?: () => void,
  ) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok)
        setError(result.error ?? "Não foi possível concluir a ação.");
      else onSuccess?.();
    });
  }

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Notas do cliente</h2>
      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          run(
            () => addCustomerNote(customerId, new FormData(form)),
            () => form.reset(),
          );
        }}
      >
        <label className="sr-only" htmlFor="customer-note">
          Adicionar nota
        </label>
        <textarea
          id="customer-note"
          name="conteudo"
          required
          minLength={2}
          rows={3}
          className="input"
          placeholder="Adicionar nota..."
        />
        <button
          disabled={pending}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending && <LoaderCircle className="size-4 animate-spin" />}Adicionar
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <ol className="mt-5 space-y-4">
        {notes.map((note) => {
          const author = Array.isArray(note.autor) ? note.autor[0] : note.autor;
          const canEdit = isAdmin || note.autor_id === currentUserId;
          return (
            <li key={note.id} className="border-l-2 border-primary pl-3">
              {editing === note.id ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(
                      () =>
                        updateCustomerNote(
                          note.id,
                          new FormData(event.currentTarget),
                        ),
                      () => setEditing(null),
                    );
                  }}
                >
                  <textarea
                    className="input"
                    name="conteudo"
                    defaultValue={note.conteudo}
                    required
                    minLength={2}
                    rows={3}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      disabled={pending}
                      className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white"
                    >
                      <Check className="size-3.5" />
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold"
                    >
                      <X className="size-3.5" />
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {note.conteudo}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {author?.nome || author?.email || "Equipe"} ·{" "}
                    {new Date(note.criado_em).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}
                  </p>
                  <div className="mt-2 flex gap-3">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setEditing(note.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-primary"
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Excluir esta nota? Esta ação não pode ser desfeita.",
                            )
                          )
                            run(() => deleteCustomerNote(note.id));
                        }}
                        className="flex items-center gap-1 text-xs font-semibold text-red-700"
                      >
                        <Trash2 className="size-3.5" />
                        Excluir
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          );
        })}
        {!notes.length && (
          <li className="text-sm text-slate-500">Nenhuma nota adicionada.</li>
        )}
      </ol>
    </section>
  );
}
