import { AlertTriangle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { UFS } from "@/lib/vau-constants";
import { VauEditor } from "./vau-editor";

type VauRow = {
  uf: string;
  casa_popular: number | string | null;
  comercial: number | string | null;
  conj_pop: number | string | null;
  galpao: number | string | null;
  res_multi: number | string | null;
  res_uni: number | string | null;
  garagens: number | string | null;
  vigencia: string | null;
  updated_at: string;
};

export default async function VauPage({
  searchParams,
}: {
  searchParams?: { saved?: string; error?: string };
}) {
  const { data, error } = await createClient()
    .from("vau")
    .select(
      "uf,casa_popular,comercial,conj_pop,galpao,res_multi,res_uni,garagens,vigencia,updated_at",
    )
    .order("uf");
  const rows = (data ?? []) as VauRow[];
  const byUf = new Map(rows.map((row) => [row.uf, row]));
  const missing = UFS.filter((uf) => !byUf.has(uf));
  const vigencia = rows.find((row) => row.vigencia)?.vigencia ?? "";
  const lastUpdate = rows.reduce(
    (latest, row) => (row.updated_at > latest ? row.updated_at : latest),
    "",
  );

  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">
              Configuração fiscal
            </p>
            <h1 className="text-3xl font-bold">Tabela VAU</h1>
            <p className="mt-2 text-sm text-slate-500">
              Valores por UF e destinação usados pela calculadora pública.
            </p>
          </div>
          {lastUpdate && (
            <p className="text-sm text-slate-500">
              Atualizada em {formatDate(lastUpdate)}
            </p>
          )}
        </header>

        {searchParams?.saved && (
          <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            Tabela VAU salva e cache público revalidado.
          </p>
        )}
        {searchParams?.error && (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            Não foi possível salvar. Todos os 189 valores devem ser números
            positivos.
          </p>
        )}
        {(error || missing.length > 0) && (
          <div className="mt-5 flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="size-5 shrink-0" />
            <p>
              {error
                ? "Não foi possível carregar a tabela atual. Não salve até recarregar a página."
                : `UFs ausentes no banco: ${missing.join(", ")}. Preencha todos os valores antes de salvar.`}
            </p>
          </div>
        )}

        <VauEditor
          initialRows={rows}
          initialVigencia={vigencia}
          disabled={Boolean(error)}
        />
      </div>
    </main>
  );
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
