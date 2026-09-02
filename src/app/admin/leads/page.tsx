import Link from "next/link";
import { Archive, Plus, Trash2, X } from "lucide-react";

import { ManualLeadForm } from "@/components/admin/manual-lead-form";
import { LeadsBoard } from "@/components/admin/leads-board";
import { LEAD_STATUSES, type LeadRecord } from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";
import { getCadenciaConfig } from "@/lib/cadencia/config";
import {
  leadListFilterLabel,
  normalizeLeadListFilters,
  singleSearchParam,
} from "@/lib/lead-list-filters";

type Props = { searchParams?: Record<string, string | string[] | undefined> };

export default async function LeadsPage({ searchParams }: Props) {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  const { data: profile } =
    typeof email === "string"
      ? await supabase
          .from("users")
          .select("id,perfil")
          .eq("email", email.toLowerCase())
          .eq("ativo", true)
          .maybeSingle()
      : { data: null };
  const isAdmin = profile?.perfil === "admin";
  const requested = normalizeLeadListFilters({
    filter: singleSearchParam(searchParams?.filtro),
    responsible: singleSearchParam(searchParams?.responsavel),
    isAdmin,
    currentUserId: profile?.id,
  });
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  let leadQuery = supabase
    .from("leads")
    .select(
      "id,data_hora,nome,ddd,whatsapp,email,uf,cidade,produto,status,responsavel_id,valor_potencial,observacoes,contato_inicial_em,contato_inicial_por,tentativa_atual,proxima_tentativa_em,ultima_tentativa_em,cadencia_finalizada_em,ultimo_alerta_cobertura_h",
    )
    .is("deleted_at", null)
    .is("convertido_em", null)
    .eq("status_ativacao", "ativo");
  if (requested.filter === "sem_consultor")
    leadQuery = leadQuery.is("responsavel_id", null);
  else if (requested.responsible)
    leadQuery = leadQuery.eq("responsavel_id", requested.responsible);
  if (requested.filter === "followup_hoje")
    leadQuery = leadQuery
      .eq("proxima_tentativa_em", today)
      .is("cadencia_finalizada_em", null);
  else if (requested.filter === "followup_atrasado")
    leadQuery = leadQuery
      .lt("proxima_tentativa_em", today)
      .is("cadencia_finalizada_em", null);
  else if (requested.filter === "decidir_hoje")
    leadQuery = leadQuery.not("cadencia_finalizada_em", "is", null);
  leadQuery = leadQuery
    .order("proxima_tentativa_em", { ascending: true, nullsFirst: false })
    .order("data_hora", { ascending: false })
    .limit(500);
  const [
    { data: leads, error },
    { data: users },
    { data: funnelStages },
    { data: products },
    { data: reasons },
    cadenceConfig,
  ] = await Promise.all([
    leadQuery,
    supabase.from("users").select("id,nome").eq("ativo", true).order("nome"),
    supabase.from("funil_etapas").select("nome,cor").order("ordem"),
    supabase
      .from("produtos")
      .select("slug,nome")
      .eq("ativo", true)
      .order("ordem"),
    supabase
      .from("motivos_inativacao")
      .select("id,rotulo,reativavel_padrao")
      .eq("ativo", true)
      .order("ordem"),
    getCadenciaConfig(),
  ]);
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
  const activeFilter = leadListFilterLabel(
    requested.filter,
    requested.responsible,
    users ?? [],
  );

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
            <Link
              href="/admin/leads/convertidos"
              className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700"
            >
              Convertidos
            </Link>
            <Link
              href="/admin/leads/inativos"
              className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700"
            >
              <Archive className="size-4" /> Inativos
            </Link>
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
        {activeFilter && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-primary">
            {activeFilter}
            <Link
              href="/admin/leads"
              aria-label="Limpar filtro"
              className="rounded-full p-0.5 hover:bg-blue-100"
            >
              <X className="size-4" />
            </Link>
          </div>
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
          reasons={reasons ?? []}
          initialStatus={initialStatus}
          maxAttempts={cadenceConfig.maxTentativas}
          slaHours={cadenceConfig.slaInicialHoras}
          nowIso={new Date().toISOString()}
        />
      </div>
    </main>
  );
}
