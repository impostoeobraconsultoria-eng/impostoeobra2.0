import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type Props = { searchParams?: Record<string, string | string[] | undefined> };
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });

function value(params: Props["searchParams"], key: string) {
  const item = params?.[key];
  return Array.isArray(item) ? item[0] ?? "" : item ?? "";
}

export default async function InactiveLeadsPage({ searchParams }: Props) {
  const supabase = createClient();
  const filters = {
    motivo: value(searchParams, "motivo"),
    responsavel: value(searchParams, "responsavel"),
    produto: value(searchParams, "produto"),
    origem: value(searchParams, "origem"),
    contato: value(searchParams, "contato"),
  };
  let query = supabase
    .from("leads")
    .select("id,nome,ddd,whatsapp,email,data_hora,produto,origem,status,ultima_etapa_kanban,ultimo_contato_em,inativado_em,detalhamento_inativacao,contato_futuro,data_contato_futuro,valor_potencial,motivo_inativacao_id,responsavel_id,motivo:motivos_inativacao(rotulo),responsavel:users!leads_responsavel_id_fkey(nome)")
    .eq("status_ativacao", "inativo")
    .is("deleted_at", null)
    .is("convertido_em", null)
    .order("inativado_em", { ascending: false })
    .limit(500);
  if (filters.motivo) query = query.eq("motivo_inativacao_id", filters.motivo);
  if (filters.responsavel) query = query.eq("responsavel_id", filters.responsavel);
  if (filters.produto) query = query.eq("produto", filters.produto);
  if (filters.origem) query = query.eq("origem", filters.origem);
  if (filters.contato === "sim") query = query.eq("contato_futuro", true);
  if (filters.contato === "nao") query = query.eq("contato_futuro", false);
  const now = new Date().toISOString().slice(0, 10);
  const plusDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
  if (filters.contato === "atrasado") query = query.eq("contato_futuro", true).lt("data_contato_futuro", now);
  if (filters.contato === "7") query = query.eq("contato_futuro", true).gte("data_contato_futuro", now).lte("data_contato_futuro", plusDays(7));
  if (filters.contato === "30") query = query.eq("contato_futuro", true).gte("data_contato_futuro", now).lte("data_contato_futuro", plusDays(30));
  if (filters.contato === "indefinido") query = query.is("data_contato_futuro", null);

  const [{ data: leads, error }, { data: reasons }, { data: users }, { data: products }] = await Promise.all([
    query,
    supabase.from("motivos_inativacao").select("id,rotulo").order("ordem"),
    supabase.from("users").select("id,nome").eq("ativo", true).order("nome"),
    supabase.from("produtos").select("slug,nome").eq("ativo", true).order("ordem"),
  ]);
  const origins = Array.from(new Set((leads ?? []).map((lead) => lead.origem).filter(Boolean))) as string[];

  return <main className="px-5 py-8 sm:px-8"><div className="mx-auto max-w-[1500px]">
    <Link href="/admin/leads" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary"><ArrowLeft className="size-4" /> Voltar para leads</Link>
    <div className="mt-5"><p className="text-sm font-semibold text-primary">CRM</p><h1 className="mt-1 text-3xl font-bold">Leads inativos</h1><p className="mt-2 text-slate-500">Oportunidades pausadas, preservadas para acompanhamento e eventual reativação.</p></div>
    <form className="mt-6 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
      <Select name="motivo" label="Todos os motivos" current={filters.motivo} options={(reasons ?? []).map((x) => [x.id, x.rotulo])} />
      <Select name="responsavel" label="Todos os consultores" current={filters.responsavel} options={(users ?? []).map((x) => [x.id, x.nome ?? "Sem nome"])} />
      <Select name="produto" label="Todos os produtos" current={filters.produto} options={(products ?? []).map((x) => [x.slug, x.nome])} />
      <Select name="origem" label="Todas as origens" current={filters.origem} options={origins.map((x) => [x, x])} />
      <select name="contato" defaultValue={filters.contato} className="rounded-lg border px-3 py-2 text-sm" onChange={undefined}><option value="">Próximo contato: todos</option><option value="sim">Com contato futuro</option><option value="nao">Sem contato futuro</option><option value="atrasado">Atrasados</option><option value="7">Próximos 7 dias</option><option value="30">Próximos 30 dias</option><option value="indefinido">Data indefinida</option></select>
      <div className="flex gap-2 xl:col-span-5"><button className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white">Filtrar</button><Link href="/admin/leads/inativos" className="rounded-full border px-5 py-2 text-sm font-bold">Limpar</Link></div>
    </form>
    {error ? <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">Não foi possível carregar os leads inativos.</p> : <div className="mt-6 overflow-hidden rounded-2xl border bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[1850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Nome</th><th className="px-4 py-3">Contato</th><th className="px-4 py-3">Entrada / origem</th><th className="px-4 py-3">Produto</th><th className="px-4 py-3">Consultor</th><th className="px-4 py-3">Última etapa</th><th className="px-4 py-3">Último contato</th><th className="px-4 py-3">Motivo / detalhe</th><th className="px-4 py-3">Contato futuro</th><th className="px-4 py-3">Próxima tentativa</th><th className="px-5 py-3">Potencial</th></tr></thead><tbody className="divide-y">{(leads ?? []).map((lead) => { const motivo = Array.isArray(lead.motivo) ? lead.motivo[0] : lead.motivo; const responsavel = Array.isArray(lead.responsavel) ? lead.responsavel[0] : lead.responsavel; return <tr key={lead.id} className="hover:bg-slate-50"><td className="px-5 py-4"><Link href={`/admin/leads/${lead.id}`} className="font-bold hover:text-primary">{lead.nome}</Link></td><td className="px-4 py-4"><span className="block">{phone(lead.ddd, lead.whatsapp)}</span><span className="text-xs text-slate-500">{lead.email || "—"}</span></td><td className="px-4 py-4"><span className="block">{date.format(new Date(lead.data_hora))}</span><span className="text-xs text-slate-500">{lead.origem || "—"}</span></td><td className="px-4 py-4">{lead.produto || "—"}</td><td className="px-4 py-4">{responsavel?.nome ?? "—"}</td><td className="px-4 py-4">{lead.ultima_etapa_kanban || lead.status || "—"}</td><td className="px-4 py-4">{lead.ultimo_contato_em ? date.format(new Date(lead.ultimo_contato_em)) : "—"}</td><td className="max-w-64 px-4 py-4"><span className="block font-semibold">{motivo?.rotulo ?? "—"}</span><span className="block truncate text-xs text-slate-500" title={lead.detalhamento_inativacao ?? ""}>{lead.detalhamento_inativacao || "Sem detalhamento"}</span></td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-xs font-bold ${lead.contato_futuro ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{lead.contato_futuro ? "Sim" : "Não"}</span></td><td className="px-4 py-4">{lead.contato_futuro && lead.data_contato_futuro ? <span className="inline-flex items-center gap-2"><CalendarClock className="size-4 text-primary" />{date.format(new Date(`${lead.data_contato_futuro}T12:00:00Z`))}</span> : "Sem previsão"}</td><td className="px-5 py-4 font-semibold">{lead.valor_potencial == null ? "—" : Number(lead.valor_potencial).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td></tr>;})}{!leads?.length && <tr><td colSpan={11} className="px-5 py-12 text-center text-slate-500">Nenhum lead inativo encontrado.</td></tr>}</tbody></table></div></div>}
  </div></main>;
}

function phone(ddd: string | null, number: string | null) {
  const digits = `${ddd ?? ""}${number ?? ""}`.replace(/\D/g, "");
  return digits.length === 11 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}` : digits || "—";
}

function Select({ name, label, current, options }: { name: string; label: string; current: string; options: string[][] }) {
  return <select name={name} defaultValue={current} className="rounded-lg border px-3 py-2 text-sm"><option value="">{label}</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>;
}
