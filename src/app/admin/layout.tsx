import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  CircleHelp,
  FileText,
  Gauge,
  Settings,
  Star,
  TableProperties,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin | Imposto & Obra",
  robots: { index: false, follow: false },
};

const navigation = [
  { href: "/admin", label: "Dashboard", icon: Gauge },
  { href: "/admin/leads", label: "Leads", icon: BarChart3 },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/contratos", label: "Contratos", icon: BriefcaseBusiness },
  { href: "/admin/atividades", label: "Atividades", icon: FileText },
  { href: "/admin/artigos", label: "Artigos", icon: BookOpenText },
  { href: "/admin/cases", label: "Cases", icon: Star },
  { href: "/admin/faq", label: "FAQ", icon: CircleHelp },
];

const adminNavigation = [
  { href: "/admin/vau", label: "VAU", icon: TableProperties },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/config", label: "Config", icon: Settings },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const email = claimsData?.claims.email;
  const { data: profile } =
    typeof email === "string"
      ? await supabase
          .from("users")
          .select("nome,email,perfil")
          .eq("email", email)
          .eq("ativo", true)
          .maybeSingle()
      : { data: null };
  const links =
    profile?.perfil === "admin"
      ? [...navigation, ...adminNavigation]
      : navigation;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <Link
          href="/admin"
          className="flex h-20 items-center gap-3 border-b border-slate-200 px-6"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-primary font-extrabold text-white">
            I&amp;O
          </span>
          <span className="font-bold leading-tight">
            Imposto &amp; Obra
            <small className="block text-xs font-medium text-slate-500">
              Administração
            </small>
          </span>
        </Link>
        <nav
          className="flex-1 space-y-1 overflow-y-auto p-4"
          aria-label="Administração"
        >
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-primary"
            >
              <Icon aria-hidden="true" className="size-[18px]" />
              {label}
            </Link>
          ))}
        </nav>
        <Link
          href="/"
          className="m-4 flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Building2 aria-hidden="true" className="size-[18px]" />
          Ver site público
        </Link>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-4 px-5 sm:px-8">
            <details className="relative lg:hidden">
              <summary className="cursor-pointer list-none rounded-lg border px-3 py-2 text-sm font-semibold">
                Menu
              </summary>
              <nav className="absolute left-0 top-12 w-64 space-y-1 rounded-xl border bg-white p-3 shadow-xl">
                {links.map(({ href, label }) => (
                  <Link
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                    href={href}
                    key={href}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </details>
            <div className="ml-auto text-right">
              <p className="text-sm font-semibold">
                {profile?.nome || "Usuário"}
              </p>
              <p className="text-xs capitalize text-slate-500">
                {profile?.perfil || "equipe"}
              </p>
            </div>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Sair
              </button>
            </form>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
