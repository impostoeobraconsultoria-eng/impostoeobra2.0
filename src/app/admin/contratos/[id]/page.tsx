import Link from "next/link";
import { notFound } from "next/navigation";
import { ContractForm } from "../page";
import { addContractNote, updateContract } from "../actions";
import { createClient } from "@/lib/supabase/server";
export default async function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | undefined>;
}) {
  const s = createClient();
  const [{ data: c }, { data: clients }, { data: a }] = await Promise.all([
    s
      .from("contratos")
      .select("*")
      .eq("id", params.id)
      .is("deleted_at", null)
      .maybeSingle(),
    s.from("clientes").select("id,nome").is("deleted_at", null).order("nome"),
    s
      .from("atividades")
      .select("id,tipo,descricao,data_hora")
      .eq("ref_tipo", "contrato")
      .eq("ref_id", params.id)
      .order("data_hora", { ascending: false }),
  ]);
  if (!c) notFound();
  const total = Number(c.valor_total ?? 0),
    paid = Number(c.valor_pago ?? 0);
  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/contratos" className="font-semibold text-slate-500">
          ← Contratos
        </Link>
        <h1 className="mt-4 text-3xl font-bold">
          Contrato {c.numero || "sem número"}
        </h1>
        {searchParams?.saved && (
          <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-800">
            Alterações salvas.
          </p>
        )}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Metric label="Valor total" value={money(total)} />
          <Metric label="Valor pago" value={money(paid)} />
          <Metric label="Saldo" value={money(Math.max(0, total - paid))} />
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-bold">Dados do contrato</h2>
            <ContractForm
              action={updateContract.bind(null, params.id)}
              clients={clients ?? []}
              values={c}
            />
          </section>
          <aside className="rounded-2xl border bg-white p-5">
            <h2 className="font-bold">Timeline</h2>
            <form
              action={addContractNote.bind(null, params.id)}
              className="mt-4"
            >
              <textarea
                className="input"
                name="nota"
                required
                placeholder="Adicionar nota..."
              />
              <button className="mt-2 w-full rounded-full bg-slate-900 px-4 py-2 text-white">
                Adicionar nota
              </button>
            </form>
            <ol className="mt-5 space-y-4">
              {a?.map((x) => (
                <li key={x.id} className="border-l-2 border-primary pl-3">
                  <p className="text-xs font-bold uppercase text-primary">
                    {x.tipo}
                  </p>
                  <p className="text-sm">{x.descricao}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(x.data_hora).toLocaleString("pt-BR")}
                  </p>
                </li>
              ))}
              {!a?.length && (
                <li className="text-sm text-slate-500">Sem atividades.</li>
              )}
            </ol>
          </aside>
        </div>
      </div>
    </main>
  );
}
const money = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v,
  );
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
