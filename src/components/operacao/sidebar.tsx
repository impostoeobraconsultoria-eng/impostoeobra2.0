"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontal, Plus, X } from "lucide-react";
import type { OperacaoParte } from "@/lib/operacao/types";

const STORAGE_KEY = "impostoeobra:operacao:partes-abertas";
type PartDraft = {
  titulo: string;
  numero: string;
  descricao: string;
  ordem: string;
  ativo: boolean;
};
const emptyDraft: PartDraft = {
  titulo: "",
  numero: "",
  descricao: "",
  ordem: "100",
  ativo: true,
};

export function OperacaoSidebar({
  tree,
  canCreatePages,
  isAdmin,
}: {
  tree: OperacaoParte[];
  canCreatePages: boolean;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const currentPart = useMemo(
    () =>
      tree.find(
        (part) =>
          pathname === `/operacao/${part.slug}` ||
          pathname.startsWith(`/operacao/${part.slug}/`),
      )?.slug,
    [pathname, tree],
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<OperacaoParte | "new" | null>(null);
  const [draft, setDraft] = useState<PartDraft>(emptyDraft);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let stored: string[] = [];
    try {
      stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      stored = [];
    }
    if (currentPart && !stored.includes(currentPart)) stored.push(currentPart);
    setExpanded(new Set(stored));
  }, [currentPart]);

  function toggle(slug: string, open: boolean) {
    if (expanded.has(slug) === open) return;
    const next = new Set(expanded);
    if (open) next.add(slug);
    else next.delete(slug);
    setExpanded(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
  }

  function openCreate() {
    setDraft(emptyDraft);
    setError("");
    setEditing("new");
    setMenuId(null);
  }
  function openEdit(part: OperacaoParte) {
    setDraft({
      titulo: part.titulo,
      numero: part.numero,
      descricao: part.descricao ?? "",
      ordem: String(part.ordem),
      ativo: part.ativo,
    });
    setError("");
    setEditing(part);
    setMenuId(null);
  }

  async function savePart(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const creating = editing === "new";
    const url = creating
      ? "/api/operacao/partes"
      : `/api/operacao/partes/${editing?.id}`;
    const response = await fetch(url, {
      method: creating ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: draft.titulo,
        ...(creating ? { numero: draft.numero } : {}),
        descricao: draft.descricao,
        ordem: Number(draft.ordem),
        ativo: draft.ativo,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(result.error ?? "Não foi possível salvar a Parte.");
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function deletePart(part: OperacaoParte) {
    setMenuId(null);
    if (
      !window.confirm(
        `Excluir permanentemente a Parte ${part.numero} — ${part.titulo}?`,
      )
    )
      return;
    const response = await fetch(`/api/operacao/partes/${part.id}`, {
      method: "DELETE",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      window.alert(result.error ?? "Não foi possível excluir a Parte.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
        >
          <Plus className="size-4" /> Nova Parte
        </button>
        {canCreatePages ? (
          <Link
            href="/operacao/nova"
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold hover:bg-slate-50"
          >
            <Plus className="size-4" /> Nova página
          </Link>
        ) : (
          <span />
        )}
      </div>
      <nav aria-label="Sumário do manual" className="space-y-2">
        {tree.map((parte) => (
          <details
            key={parte.id}
            open={expanded.has(parte.slug)}
            onToggle={(event) => toggle(parte.slug, event.currentTarget.open)}
            className={`group rounded-xl border bg-white ${parte.ativo ? "border-slate-200" : "border-dashed border-slate-300 opacity-70"}`}
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-slate-800">
              <span className="min-w-0 flex-1">
                Parte {parte.numero}{" "}
                <span className="font-medium text-slate-500">
                  — {parte.titulo}
                </span>
                {!parte.ativo && (
                  <small className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] uppercase">
                    Inativa
                  </small>
                )}
              </span>
              <span className="relative">
                <button
                  type="button"
                  aria-label={`Opções da Parte ${parte.numero}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setMenuId(menuId === parte.id ? null : parte.id);
                  }}
                  className="rounded-lg p-1 hover:bg-slate-100"
                >
                  <MoreHorizontal className="size-4" />
                </button>
                {menuId === parte.id && (
                  <span className="absolute right-0 top-7 z-20 w-32 rounded-xl border bg-white p-1 text-left font-medium shadow-lg">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        openEdit(parte);
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      Editar
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          void deletePart(parte);
                        }}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                      >
                        Excluir
                      </button>
                    )}
                  </span>
                )}
              </span>
            </summary>
            <div className="space-y-1 border-t border-slate-100 p-2">
              {(parte.paginas ?? []).map((pagina) => (
                <Link
                  key={pagina.id}
                  href={`/operacao/${parte.slug}/${pagina.slug}`}
                  className={`block rounded-lg px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 ${pathname.includes(`/${parte.slug}/${pagina.slug}`) ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600"}`}
                >
                  {pagina.titulo}
                </Link>
              ))}
              {!parte.paginas?.length && (
                <p className="px-3 py-2 text-xs text-slate-400">
                  Nenhuma página.
                </p>
              )}
            </div>
          </details>
        ))}
      </nav>
      {editing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="part-dialog-title"
        >
          <form
            onSubmit={savePart}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="part-dialog-title" className="text-xl font-bold">
                {editing === "new" ? "Nova Parte" : "Editar Parte"}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Fechar"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>
            <label className="field">
              Título *
              <input
                className="input"
                required
                maxLength={160}
                value={draft.titulo}
                onChange={(e) => setDraft({ ...draft, titulo: e.target.value })}
              />
            </label>
            {editing === "new" && (
              <label className="field">
                Número *
                <input
                  className="input"
                  required
                  maxLength={20}
                  placeholder="XII"
                  value={draft.numero}
                  onChange={(e) =>
                    setDraft({ ...draft, numero: e.target.value })
                  }
                />
              </label>
            )}
            <label className="field">
              Ordem *
              <input
                className="input"
                required
                type="number"
                min="0"
                value={draft.ordem}
                onChange={(e) => setDraft({ ...draft, ordem: e.target.value })}
              />
            </label>
            <label className="field">
              Descrição
              <textarea
                className="input min-h-20"
                maxLength={500}
                value={draft.descricao}
                onChange={(e) =>
                  setDraft({ ...draft, descricao: e.target.value })
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={draft.ativo}
                onChange={(e) =>
                  setDraft({ ...draft, ativo: e.target.checked })
                }
              />{" "}
              Parte ativa
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
              >
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-full border px-4 py-2 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                disabled={saving}
                className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
