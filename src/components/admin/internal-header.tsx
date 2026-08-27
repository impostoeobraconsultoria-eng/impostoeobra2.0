import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { NotificationBell } from "@/components/admin/notification-bell";
import type { NotificationItem } from "@/lib/notifications";

type NavigationItem = { href: string; label: string; icon?: LucideIcon };

export function InternalHeader({
  area,
  homeHref,
  profile,
  notifications,
  unread,
  mobileNavigation = [],
  showBrand = false,
  switchHref,
  switchLabel,
}: {
  area: string;
  homeHref: string;
  profile: { nome?: string | null; perfil?: string | null } | null;
  notifications: NotificationItem[];
  unread: number;
  mobileNavigation?: NavigationItem[];
  showBrand?: boolean;
  switchHref?: string;
  switchLabel?: string;
}) {
  return (
    <header className="admin-header sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-20 items-center gap-3 px-4 sm:px-8">
        {mobileNavigation.length > 0 && (
          <details className="relative lg:hidden">
            <summary className="cursor-pointer list-none rounded-lg border px-3 py-2 text-sm font-semibold">
              Menu
            </summary>
            <nav className="absolute left-0 top-12 w-64 space-y-1 rounded-xl border bg-white p-3 shadow-xl">
              {mobileNavigation.map(({ href, label }) => (
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
        )}
        {showBrand && (
          <Link
            href={homeHref}
            className="flex min-w-0 items-center gap-3"
            aria-label={`Ir para o início de ${area}`}
          >
            <Image src="/logo/simbolo-azul.svg" alt="" width={40} height={40} />
            <span className="hidden font-bold leading-tight sm:block">
              Imposto &amp; Obra
              <small className="block text-xs font-medium text-slate-500">
                {area}
              </small>
            </span>
          </Link>
        )}
        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          {switchHref && switchLabel && (
            <Link
              href={switchHref}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              <ChevronLeft className="size-4" /> {switchLabel}
            </Link>
          )}
          <NotificationBell
            initialNotifications={notifications}
            initialUnread={unread}
            initialNow={Date.now()}
          />
          <div className="hidden text-right sm:block">
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
              className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 sm:px-4"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
