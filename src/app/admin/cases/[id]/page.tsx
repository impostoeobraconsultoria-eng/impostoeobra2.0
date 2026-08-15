import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { updateCase } from "../actions";
import { CaseForm } from "../case-form";

export default async function CaseDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { saved?: string; error?: string; duplicated?: string };
}) {
  const supabase = createClient();
  const { data: item } = await supabase
    .from("cases")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!item) notFound();
  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          className="text-sm font-semibold text-slate-500 hover:text-primary"
          href="/admin/cases"
        >
          ← Voltar aos cases
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Editar case</h1>
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${item.publicado ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
          >
            {item.publicado ? "Publicado" : "Rascunho"}
          </span>
        </div>
        {searchParams?.saved && (
          <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            Case salvo com sucesso.
          </p>
        )}
        {searchParams?.duplicated && (
          <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm font-semibold text-primary">
            Cópia criada como rascunho. Revise os dados antes de publicar.
          </p>
        )}
        {searchParams?.error && (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            Não foi possível salvar. Revise os campos.
          </p>
        )}
        <section className="mt-6 rounded-2xl border bg-white p-6">
          <CaseForm action={updateCase.bind(null, item.id)} value={item} />
        </section>
      </div>
    </main>
  );
}
