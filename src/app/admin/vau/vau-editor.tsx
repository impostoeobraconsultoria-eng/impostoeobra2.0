"use client";

import { useState, useTransition } from "react";
import { Download, LoaderCircle, Save, TableProperties } from "lucide-react";

import { saveVau } from "./actions";
import { UFS, VAU_COLUMNS } from "@/lib/vau-constants";

type Row = { uf: string; vigencia?: string | null } & Record<
  string,
  string | number | null | undefined
>;

export function VauEditor({
  initialRows,
  initialVigencia,
  disabled,
}: {
  initialRows: Row[];
  initialVigencia: string;
  disabled: boolean;
}) {
  const [rows, setRows] = useState(initialRows);
  const [vigencia, setVigencia] = useState(initialVigencia);
  const [message, setMessage] = useState<{
    tone: "error" | "warning" | "success";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const byUf = new Map(rows.map((row) => [row.uf, row]));

  function sync() {
    if (
      !window.confirm(
        "Isso vai carregar no formulário os valores publicados no SERO Assessoria para o mês corrente. Você ainda precisará revisar e clicar em Salvar tudo. Continuar?",
      )
    )
      return;
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/vau/sync-sero", { method: "POST" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setRows(result.rows);
        setVigencia(result.vigencia);
        setMessage(
          result.warnings?.length
            ? {
                tone: "warning",
                text: `Valores carregados com ${result.warnings.length} aviso(s). Revise todas as UFs antes de salvar.`,
              }
            : {
                tone: "success",
                text: "Valores carregados do SERO. Revise a tabela e clique em Salvar tudo para aplicar.",
              },
        );
      } catch (error) {
        setMessage({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "Não foi possível carregar do SERO. Edição manual continua disponível.",
        });
      }
    });
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={sync}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Atualizar da fonte oficial (SERO)
        </button>
      </div>
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`mt-4 rounded-xl p-4 text-sm font-semibold ${message.tone === "error" ? "bg-red-50 text-red-700" : message.tone === "warning" ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-700"}`}
        >
          {message.text}
        </p>
      )}
      <form action={saveVau} className="mt-6">
        <section className="mb-4 flex flex-wrap items-end gap-4 rounded-2xl border bg-white p-5">
          <label className="field w-full max-w-xs">
            Vigência *
            <input
              className="input"
              name="vigencia"
              required
              maxLength={80}
              value={vigencia}
              onChange={(event) => setVigencia(event.target.value)}
              placeholder="Ex.: Agosto de 2026"
            />
          </label>
          <p className="max-w-xl text-sm leading-relaxed text-slate-500">
            Os dados importados só entram em produção depois da revisão e do
            clique em Salvar tudo.
          </p>
        </section>
        <div className="max-h-[70vh] overflow-auto rounded-2xl border bg-white shadow-sm">
          <table className="w-full min-w-[1450px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs text-slate-700 shadow-sm">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-100 p-3">UF</th>
                {VAU_COLUMNS.map((column) => (
                  <th className="min-w-[185px] p-3" key={column.key}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {UFS.map((uf) => {
                const row = byUf.get(uf);
                return (
                  <tr className="hover:bg-blue-50/40" key={uf}>
                    <th className="sticky left-0 bg-white p-3 font-bold text-primary">
                      {uf}
                    </th>
                    {VAU_COLUMNS.map((column) => (
                      <td className="p-2" key={column.key}>
                        <div className="flex items-center rounded-lg border bg-white px-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                          <span className="text-xs text-slate-400">R$</span>
                          <input
                            className="w-full px-2 py-2 text-right tabular-nums outline-none"
                            type="number"
                            name={`${uf}.${column.key}`}
                            min="0.01"
                            max="99999999.99"
                            step="0.01"
                            required
                            value={String(row?.[column.key] ?? "")}
                            onChange={(event) =>
                              setRows((current) => {
                                const copy = current.map((item) =>
                                  item.uf === uf
                                    ? {
                                        ...item,
                                        [column.key]: event.target.value,
                                      }
                                    : item,
                                );
                                if (!copy.some((item) => item.uf === uf))
                                  copy.push({
                                    uf,
                                    [column.key]: event.target.value,
                                  });
                                return copy;
                              })
                            }
                            aria-label={`${column.label} — ${uf}`}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="sticky bottom-4 z-20 mt-4 flex items-center justify-between gap-4 rounded-2xl border bg-white/95 p-4 shadow-xl backdrop-blur">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <TableProperties className="size-4 text-primary" />
            27 UFs × 7 destinações
          </p>
          <button
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-bold text-white disabled:opacity-50"
            disabled={disabled || pending}
          >
            <Save className="size-4" />
            Salvar tudo
          </button>
        </div>
      </form>
    </>
  );
}
