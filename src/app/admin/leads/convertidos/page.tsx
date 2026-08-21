import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function ConvertedLeadsPage() {
  const supabase = createClient();
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id,nome,email,ddd,whatsapp,produto,convertido_em,cliente_id")
    .is("deleted_at", null)
    .not("convertido_em", "is", null)
    .order("convertido_em", { ascending: false })
    .limit(500);

  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/leads"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Voltar para leads ativos
        </Link>
        <div className="mt-5">
          <p className="text-sm font-semibold text-primary">CRM</p>
          <h1 className="mt-1 text-3xl font-bold">Leads convertidos</h1>
          <p className="mt-2 text-slate-500">
            Histórico dos leads que já avançaram para a carteira de clientes.
          </p>
        </div>

        {error ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Não foi possível carregar os leads convertidos.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border bg-white shadow-sm">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Lead</th>
                  <th className="px-5 py-4">Contato</th>
                  <th className="px-5 py-4">Produto</th>
                  <th className="px-5 py-4">Convertido em</th>
                  <th className="px-5 py-4">Cliente</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(leads ?? []).map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="font-bold text-slate-900 hover:text-primary"
                      >
                        {lead.nome}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <p>{lead.email || "—"}</p>
                      <p>
                        {[lead.ddd, lead.whatsapp].filter(Boolean).join(" ") ||
                          "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4">{lead.produto || "—"}</td>
                    <td className="px-5 py-4">
                      {lead.convertido_em
                        ? dateTime.format(new Date(lead.convertido_em))
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      {lead.cliente_id ? (
                        <Link
                          href={`/admin/clientes/${lead.cliente_id}`}
                          className="inline-flex items-center gap-1 font-bold text-primary"
                        >
                          Abrir cliente <ExternalLink className="size-3.5" />
                        </Link>
                      ) : (
                        "Registro indisponível"
                      )}
                    </td>
                  </tr>
                ))}
                {!leads?.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Nenhum lead convertido até o momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
