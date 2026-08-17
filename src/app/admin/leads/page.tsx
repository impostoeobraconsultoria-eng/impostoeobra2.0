import Link from "next/link";
import { Plus, Trash2, X } from "lucide-react";

import { ManualLeadForm } from "@/components/admin/manual-lead-form";
import { LeadsBoard } from "@/components/admin/leads-board";
import { LEAD_STATUSES, type LeadRecord } from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams?: Record<string, string | string[] | undefined> };

export default async function LeadsPage({ searchParams }: Props) {
  const supabase = createClient();
  const [
    { data: leads, error },
    { data: users },
    { data: funnelStages },
    { data: products },
    { data: claims },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id,data_hora,nome,ddd,whatsapp,email,uf,cidade,produto,status,responsavel_id,valor_potencial,observacoes",
      )
      .is("deleted_at", null)
      .order("data_hora", { ascending: false })
      .limit(500),
    supabase.from("users").select("id,nome").eq("ativo", true).order("nome"),
    supabase.from("funil_etapas").select("nome,cor").order("ordem"),
    supabase
      .from("produtos")
      .select("slug,nome")
      .eq("ativo", true)
      .order("ordem"),
    supabase.auth.getClaims(),
  ]);
  const email = claims?.claims.email;
  const { data: profile } =
    typeof email === "string"
      ? await supabase
          .from("users")
          .select("perfil")
          .eq("email", email)
          .eq("ativo", true)
          .maybeSingle()
      : { data: null };
  const isAdmin = profile?.perfil === "admin";
  const stages = funnelStages?.length
    ? funnelStages
    : LEAD_STATUSES.map((nome) => ({ nome, cor: null }));
  const requestedStatus = Array.isArray(searchParams?.status)
    ? searchParams?.status[0]
    : searchParams?.status;
  const initialStatus = stages.some((stage) => stage.nome === requestedStatus)
    ? requestedStatus
    : "";
  const showNew = searchParams?.new === "1";

  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">CRM</p>
            <h1 className="mt-1 text-3xl font-bold">Leads</h1>
            <p className="mt-2 text-slate-500">
              Acompanhe contatos e oportunidades do primeiro atendimento ao
              fechamento.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Link
                href="/admin/leads/lixeira"
                className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700"
              >
                <Trash2 className="size-4" />
                Lixeira
              </Link>
            )}
            <Link
              href={showNew ? "/admin/leads" : "/admin/leads?new=1"}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white"
            >
              {showNew ? <X className="size-4" /> : <Plus className="size-4" />}
              {showNew ? "Fechar" : "Novo lead"}
            </Link>
          </div>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            Não foi possível carregar os leads.
          </p>
        )}
        {showNew && (
          <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Novo lead</h2>
            <ManualLeadForm stages={stages} products={products ?? []} />
          </section>
        )}
        <LeadsBoard
          initialLeads={(leads ?? []) as LeadRecord[]}
          users={users ?? []}
          stages={stages}
          isAdmin={isAdmin}
          initialStatus={initialStatus}
        />
      </div>
    </main>
  );
}
