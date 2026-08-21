import { Scale } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { TeamManager } from "./team-manager";

export default async function LegalTeamPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const supabase = createClient();
  const { data: members, error } = await supabase
    .from("equipe_juridica")
    .select("id,nome,oab,papel,descricao,foto_url,ordem,publicado")
    .order("ordem");
  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-semibold text-primary">Institucional</p>
          <h1 className="mt-1 text-3xl font-bold">Equipe Jurídica</h1>
          <p className="mt-2 text-sm text-slate-500">
            Gerencie os profissionais exibidos na página Sobre.
          </p>
        </header>
        {searchParams?.saved && (
          <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            Membro salvo com sucesso.
          </p>
        )}
        {searchParams?.error && (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {searchParams.error === "image_invalid"
              ? "Foto rejeitada: use JPG, PNG ou WebP de até 5 MB."
              : searchParams.error === "image_upload"
                ? "A foto é válida, mas não pôde ser enviada ao Storage. Tente novamente."
                : searchParams.error === "not_found"
                  ? "O membro informado não foi encontrado."
                  : "Não foi possível salvar. Revise os dados informados."}
          </p>
        )}
        {error ? (
          <p className="mt-6 rounded-xl border bg-white p-10 text-center text-red-700">
            Não foi possível carregar a equipe.
          </p>
        ) : members?.length ? (
          <TeamManager members={members} initialEdit={searchParams?.edit} />
        ) : (
          <section className="mt-6 border bg-white p-12 text-center">
            <Scale className="mx-auto size-10 text-slate-300" />
            <h2 className="mt-4 text-lg font-bold">Nenhum membro cadastrado</h2>
            <TeamManager members={[]} />
          </section>
        )}
      </div>
    </main>
  );
}
