import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { TrashActions } from "./trash-actions";

type Props = { searchParams?: Record<string, string | string[] | undefined> };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function LeadsTrashPage({ searchParams }: Props) {
  const daysParam = Array.isArray(searchParams?.dias)
    ? searchParams?.dias[0]
    : searchParams?.dias;
  const days = [7, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const supabase = createClient();
  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      "id,nome,data_hora,deleted_at,updated_by,excluido_por:users!leads_updated_by_fkey(nome,email)",
    )
    .not("deleted_at", "is", null)
    .gte("deleted_at", since)
    .order("deleted_at", { ascending: false });

  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/leads"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="size-4" />
          Voltar para leads
        </Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Administração</p>
            <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold">
              <Trash2 className="size-7" />
              Lixeira de leads
            </h1>
            <p className="mt-2 text-slate-500">
              Restaure registros ou exclua-os permanentemente.
            </p>
          </div>
          <nav
            className="flex rounded-xl border bg-white p-1"
            aria-label="Período da lixeira"
          >
            {[7, 30, 90].map((value) => (
              <Link
                key={value}
                href={`/admin/leads/lixeira?dias=${value}`}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${days === value ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {value} dias
              </Link>
            ))}
          </nav>
        </div>
        {error && (
          <p
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            role="alert"
          >
            Não foi possível carregar a lixeira.
          </p>
        )}
        <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-4 py-3">Data original</th>
                  <th className="px-4 py-3">Excluído por</th>
                  <th className="px-4 py-3">Excluído em</th>
                  <th className="px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(leads ?? []).map((lead) => {
                  const author = Array.isArray(lead.excluido_por)
                    ? lead.excluido_por[0]
                    : lead.excluido_por;
                  return (
                    <tr key={lead.id}>
                      <td className="px-5 py-4 font-semibold">{lead.nome}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {dateTime.format(new Date(lead.data_hora))}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {author?.nome || author?.email || "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {lead.deleted_at
                          ? dateTime.format(new Date(lead.deleted_at))
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <TrashActions id={lead.id} nome={lead.nome} />
                      </td>
                    </tr>
                  );
                })}
                {!leads?.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Nenhum lead excluído nos últimos {days} dias.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
