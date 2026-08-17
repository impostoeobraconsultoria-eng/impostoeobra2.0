"use client";

import { Copy, GripVertical, Pencil, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";

import {
  duplicateProduct,
  reorderProducts,
  saveProduct,
} from "@/app/admin/produtos/actions";

export type ProductItem = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  template_contrato_arq: string | null;
  ordem: number | null;
  ativo: boolean;
};

export function ProductsManager({
  initialProducts,
  templates,
}: {
  initialProducts: ProductItem[];
  templates: string[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [editing, setEditing] = useState<ProductItem | "new" | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [dragged, setDragged] = useState<string | null>(null);
  function drop(targetId: string) {
    if (!dragged || dragged === targetId) return;
    const next = [...products];
    const from = next.findIndex((item) => item.id === dragged),
      to = next.findIndex((item) => item.id === targetId);
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setProducts(next);
    setDragged(null);
    startTransition(async () => {
      const result = await reorderProducts(next.map((p) => p.id));
      if (!result.ok) {
        setProducts(initialProducts);
        setMessage(result.error ?? "Falha ao reordenar.");
      }
    });
  }
  function duplicate(id: string) {
    startTransition(async () => {
      const result = await duplicateProduct(id);
      if (!result.ok) setMessage(result.error ?? "Falha ao duplicar.");
      else window.location.reload();
    });
  }
  return (
    <>
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-white"
        >
          <Plus className="size-4" />
          Novo produto
        </button>
      </div>
      {message && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {message}
        </p>
      )}
      <div className="mt-5 overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-12 p-4"></th>
              <th>Nome</th>
              <th>Slug</th>
              <th>Template</th>
              <th>Ordem</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => (
              <tr
                key={product.id}
                draggable
                onDragStart={() => setDragged(product.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => drop(product.id)}
                className="hover:bg-slate-50"
              >
                <td className="p-4 text-slate-400">
                  <GripVertical className="size-5 cursor-grab" />
                </td>
                <td className="font-semibold">{product.nome}</td>
                <td className="font-mono text-xs">{product.slug}</td>
                <td>{product.template_contrato_arq || "—"}</td>
                <td>{product.ordem ?? "—"}</td>
                <td>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${product.ativo ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                  >
                    {product.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      disabled={pending}
                      onClick={() => setEditing(product)}
                      title="Editar"
                      className="rounded-lg border p-2"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => duplicate(product.id)}
                      title="Duplicar"
                      className="rounded-lg border p-2"
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <ProductModal
          product={editing === "new" ? null : editing}
          templates={templates}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function ProductModal({
  product,
  templates,
  onClose,
}: {
  product: ProductItem | null;
  templates: string[];
  onClose: () => void;
}) {
  const [name, setName] = useState(product?.nome ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await saveProduct({
        id: product?.id,
        nome: name,
        slug: product?.slug ?? (slug || slugify(name)),
        descricao: String(formData.get("descricao") ?? "").trim() || null,
        template_contrato_arq:
          String(formData.get("template") ?? "").trim() || null,
        ordem: Number(formData.get("ordem") ?? 100),
        ativo: formData.get("ativo") === "on",
      });
      if (!result.ok) setError(result.error ?? "Falha ao salvar.");
      else window.location.reload();
    });
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex justify-between">
          <h2 className="text-xl font-bold">
            {product ? "Editar produto" : "Novo produto"}
          </h2>
          <button onClick={onClose} aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        <form action={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="field">
            Nome *
            <input
              className="input"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!product) setSlug(slugify(e.target.value));
              }}
            />
          </label>
          <label className="field">
            Slug *
            <input
              className="input disabled:bg-slate-100"
              required
              readOnly={Boolean(product)}
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
            />
          </label>
          <label className="field sm:col-span-2">
            Descrição
            <textarea
              className="input min-h-24"
              name="descricao"
              defaultValue={product?.descricao ?? ""}
            />
          </label>
          <label className="field">
            Template de contrato
            <select
              className="input"
              name="template"
              defaultValue={product?.template_contrato_arq ?? ""}
            >
              <option value="">Sem template</option>
              {templates.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Ordem
            <input
              className="input"
              type="number"
              name="ordem"
              min="0"
              defaultValue={product?.ordem ?? 100}
            />
          </label>
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              name="ativo"
              defaultChecked={product?.ativo ?? true}
            />
            Ativo
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700 sm:col-span-2">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border px-5 py-2"
            >
              Cancelar
            </button>
            <button
              disabled={pending}
              className="rounded-full bg-primary px-5 py-2 font-bold text-white"
            >
              {pending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
