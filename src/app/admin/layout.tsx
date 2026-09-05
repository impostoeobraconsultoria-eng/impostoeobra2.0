import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Archive,
  BookOpenText,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Building2,
  CircleHelp,
  FileText,
  Gauge,
  Settings,
  Send,
  Smartphone,
  Scale,
  PackageOpen,
  Star,
  TableProperties,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listNotifications } from "@/lib/notifications";
import { InternalHeader } from "@/components/admin/internal-header";
import { InternalTrafficButton } from "@/components/admin/internal-traffic-button";

export const metadata: Metadata = {
  title: "Admin | Imposto & Obra",
  robots: { index: false, follow: false },
  manifest: "/admin-manifest.json",
  icons: {
    apple: {
      url: "/icons/admin-icon-192.png",
      sizes: "192x192",
      type: "image/png",
    },
  },
  appleWebApp: {
    capable: true,
    title: "IeO CRM",
    statusBarStyle: "default",
  },
};

const navigation = [
  { href: "/admin", label: "Dashboard", icon: Gauge },
  { href: "/operacao", label: "Operação →", icon: BookOpen },
  { href: "/admin/leads", label: "Leads", icon: BarChart3 },
  { href: "/admin/leads/inativos", label: "Leads inativos", icon: Archive },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/contratos", label: "Contratos", icon: BriefcaseBusiness },
  { href: "/admin/atividades", label: "Atividades", icon: FileText },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  {
    href: "/admin/configuracoes/dispositivos",
    label: "Dispositivos",
    icon: Smartphone,
  },
  {
    href: "/admin/configuracoes/telegram",
    label: "Telegram",
    icon: Send,
  },
  { href: "/admin/artigos", label: "Artigos", icon: BookOpenText },
  { href: "/admin/cases", label: "Cases", icon: Star },
  { href: "/admin/faq", label: "FAQ", icon: CircleHelp },
];

const adminNavigation = [
  { href: "/admin/vau", label: "VAU", icon: TableProperties },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/equipe-juridica", label: "Equipe Jurídica", icon: Scale },
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
  const { data: agendaConfig } = await supabase
    .from("config")
    .select("valor")
    .eq("chave", "agenda_habilitada")
    .maybeSingle();
  const baseNavigation =
    agendaConfig?.valor?.toLowerCase() === "false"
      ? navigation.filter((item) => item.href !== "/admin/agenda")
      : navigation;
  const links =
    profile?.perfil === "admin"
      ? [
          ...baseNavigation.slice(0, 5),
          { href: "/admin/produtos", label: "Produtos", icon: PackageOpen },
          ...baseNavigation.slice(5),
          ...adminNavigation,
        ]
      : baseNavigation;
  const notificationData = profile
    ? await listNotifications(10)
    : { notifications: [], unread: 0 };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="admin-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <Link
          href="/admin"
          className="flex h-20 items-center gap-3 border-b border-slate-200 px-6"
        >
          <Image src="/logo/simbolo-azul.svg" alt="" width={40} height={40} />
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
        <InternalTrafficButton />
        <Link
          href="/"
          className="m-4 flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Building2 aria-hidden="true" className="size-[18px]" />
          Ver site público
        </Link>
      </aside>
      <div className="admin-shell lg:pl-64">
        <InternalHeader
          area="Administração"
          homeHref="/admin"
          profile={profile}
          notifications={notificationData.notifications}
          unread={notificationData.unread}
          mobileNavigation={links}
        />
        {children}
      </div>
    </div>
  );
}
