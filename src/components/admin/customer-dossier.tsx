"use client";

import { useState, useTransition } from "react";
import { ExternalLink, FolderOpen, LoaderCircle, Pencil } from "lucide-react";

import { updateDossierLink } from "@/app/admin/clientes/actions";

export function CustomerDossier({
  customerId,
  initialLink,
}: {
  customerId: string;
  initialLink: string | null;
}) {
  const [editing, setEditing] = useState(!initialLink);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <FolderOpen className="size-5 text-primary" />
        <h2 className="text-lg font-bold">Dossiê no Drive</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        Cole aqui o link da pasta do Drive com contratos, propostas e documentos
        enviados pelo cliente.
      </p>
      {initialLink && !editing ? (
        <div className="mt-4">
          <a
            href={initialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 break-all text-sm font-semibold text-primary hover:underline"
          >
            <ExternalLink className="size-4 shrink-0" />
            Abrir pasta do cliente
          </a>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-3 flex items-center gap-1 text-xs font-bold text-slate-600"
          >
            <Pencil className="size-3.5" />
            Editar link
          </button>
        </div>
      ) : (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            setError("");
            startTransition(async () => {
              const result = await updateDossierLink(
                customerId,
                new FormData(form),
              );
              if (!result.ok)
                setError(result.error ?? "Não foi possível salvar.");
              else setEditing(false);
            });
          }}
        >
          <input
            className="input"
            type="url"
            name="link_dossie"
            placeholder="https://drive.google.com/..."
            defaultValue={initialLink ?? ""}
          />
          <button
            disabled={pending}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending && <LoaderCircle className="size-4 animate-spin" />}Salvar
            link
          </button>
          {initialLink && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="mt-2 w-full text-xs font-semibold text-slate-500"
            >
              Cancelar
            </button>
          )}
          {error && (
            <p className="mt-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
