import Link from "next/link";
import { Plus, Settings } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createConfig, updateConfig } from "./actions";
import { ConfigForm } from "./config-form";

export default async function ConfigPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const { data: configs, error } = await createClient()
    .from("config")
    .select("chave,valor,descricao,updated_at")
    .order("chave");
  const creating = searchParams?.new === "1";
  const errorMessage = getErrorMessage(searchParams?.error);

  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Sistema</p>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="mt-2 text-sm text-slate-500">
              Parâmetros internos utilizados pelos módulos da plataforma.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-white"
            href={creating ? "/admin/config" : "/admin/config?new=1"}
          >
            <Plus className="size-4" />{" "}
            {creating ? "Fechar" : "Nova configuração"}
          </Link>
        </header>

        <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
          Altere somente parâmetros cujo efeito você conhece. Chaves existentes
          são imutáveis para não quebrar integrações.
        </div>
        {searchParams?.saved && (
          <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            Configuração salva com sucesso.
          </p>
        )}
        {errorMessage && (
          <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </p>
        )}
        {creating && (
          <section className="mt-6 rounded-2xl border bg-white p-6">
            <h2 className="mb-5 text-xl font-bold">Nova configuração</h2>
            <ConfigForm action={createConfig} />
          </section>
        )}

        {error ? (
          <p className="mt-6 rounded-2xl border bg-white p-10 text-center text-red-700">
            Não foi possível carregar as configurações.
          </p>
        ) : configs?.length ? (
          <section className="mt-6 space-y-3">
            {configs.map((config) => {
              const editing = searchParams?.edit === config.chave;
              return (
                <article
                  className="rounded-2xl border bg-white p-5"
                  key={config.chave}
                >
                  {editing ? (
                    <>
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <h2 className="text-lg font-bold">
                          Editar configuração
                        </h2>
                        <Link
                          className="text-sm font-semibold text-slate-500"
                          href="/admin/config"
                        >
                          Cancelar
                        </Link>
                      </div>
                      <ConfigForm
                        action={updateConfig.bind(null, config.chave)}
                        value={config}
                        editing
                      />
                    </>
                  ) : (
                    <div className="flex gap-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary">
                        <Settings className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h2 className="font-mono text-sm font-bold text-slate-900">
                            {config.chave}
                          </h2>
                          <Link
                            className="text-sm font-semibold text-primary hover:underline"
                            href={`/admin/config?edit=${encodeURIComponent(config.chave)}`}
                          >
                            Editar
                          </Link>
                        </div>
                        {config.descricao && (
                          <p className="mt-2 text-sm text-slate-500">
                            {config.descricao}
                          </p>
                        )}
                        <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                          {config.valor || "—"}
                        </pre>
                        <p className="mt-3 text-xs text-slate-400">
                          Atualizada em {formatDate(config.updated_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        ) : (
          <section className="mt-6 rounded-2xl border bg-white p-12 text-center">
            <Settings className="mx-auto size-10 text-slate-300" />
            <h2 className="mt-4 text-lg font-bold">
              Nenhuma configuração cadastrada
            </h2>
          </section>
        )}
      </div>
    </main>
  );
}

function getErrorMessage(code?: string) {
  if (code === "duplicate") return "Esta chave já está cadastrada.";
  if (code === "invalid") return "Revise a chave e os valores informados.";
  if (code) return "Não foi possível salvar a configuração.";
  return null;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
