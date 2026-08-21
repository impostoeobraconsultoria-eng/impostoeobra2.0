import Link from "next/link";
import {
  Bell,
  CalendarClock,
  CircleAlert,
  Gauge,
  UserPlus,
} from "lucide-react";

import { MarkAllNotificationsButton } from "@/components/admin/mark-all-notifications-button";
import { listNotifications, NOTIFICATION_TYPES } from "@/lib/notifications";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const type = typeof searchParams?.tipo === "string" ? searchParams.tipo : "";
  const read = typeof searchParams?.lida === "string" ? searchParams.lida : "";
  const from = typeof searchParams?.de === "string" ? searchParams.de : "";
  const to = typeof searchParams?.ate === "string" ? searchParams.ate : "";
  const requestedPage = Number(
    typeof searchParams?.pagina === "string" ? searchParams.pagina : "1",
  );
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const { notifications } = await listNotifications(500);
  const filtered = notifications.filter((item) => {
    if (type && item.tipo !== type) return false;
    if (read === "sim" && !item.lida) return false;
    if (read === "nao" && item.lida) return false;
    if (from && item.criado_em < `${from}T00:00:00`) return false;
    if (to && item.criado_em > `${to}T23:59:59.999`) return false;
    return true;
  });
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">CRM</p>
            <h1 className="text-3xl font-bold">Notificações</h1>
            <p className="mt-2 text-sm text-slate-500">
              Alertas de leads, agenda e dados que exigem atenção.
            </p>
          </div>
          <MarkAllNotificationsButton />
        </header>
        <form className="mt-6 grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-5">
          <label className="field">
            Tipo
            <select className="input" name="tipo" defaultValue={type}>
              <option value="">Todos</option>
              {NOTIFICATION_TYPES.map((item) => (
                <option key={item} value={item}>
                  {labels[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Leitura
            <select className="input" name="lida" defaultValue={read}>
              <option value="">Todas</option>
              <option value="nao">Não lidas</option>
              <option value="sim">Lidas</option>
            </select>
          </label>
          <label className="field">
            De
            <input
              className="input"
              type="date"
              name="de"
              defaultValue={from}
            />
          </label>
          <label className="field">
            Até
            <input className="input" type="date" name="ate" defaultValue={to} />
          </label>
          <div className="flex items-end gap-2">
            <button className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white">
              Filtrar
            </button>
            <Link
              className="rounded-full border px-4 py-2.5 text-sm font-semibold"
              href="/admin/notificacoes"
            >
              Limpar
            </Link>
          </div>
        </form>
        <section className="mt-6 overflow-hidden rounded-2xl border bg-white">
          <ol className="divide-y">
            {pageItems.length ? (
              pageItems.map((item) => {
                const Icon = icons[item.tipo] ?? Bell;
                return (
                  <li
                    className={`flex gap-4 p-5 ${item.lida ? "" : "bg-blue-50/50"}`}
                    key={item.id}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-primary shadow-sm">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>{item.titulo}</strong>
                        {!item.lida && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                            Não lida
                          </span>
                        )}
                      </div>
                      {item.mensagem && (
                        <p className="mt-1 text-sm text-slate-600">
                          {item.mensagem}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        <time>
                          {new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "America/Sao_Paulo",
                          }).format(new Date(item.criado_em))}
                        </time>
                        {item.link && (
                          <Link
                            className="font-semibold text-primary hover:underline"
                            href={item.link}
                          >
                            Abrir registro
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="p-12 text-center text-slate-500">
                Nenhuma notificação encontrada.
              </li>
            )}
          </ol>
        </section>
        {totalPages > 1 && (
          <nav className="mt-5 flex items-center justify-between text-sm">
            <PageLink
              page={page - 1}
              disabled={page === 1}
              searchParams={searchParams}
            >
              Anterior
            </PageLink>
            <span className="text-slate-500">
              Página {Math.min(page, totalPages)} de {totalPages}
            </span>
            <PageLink
              page={page + 1}
              disabled={page >= totalPages}
              searchParams={searchParams}
            >
              Próxima
            </PageLink>
          </nav>
        )}
      </div>
    </main>
  );
}

const labels = {
  evento_agenda: "Agenda",
  lead_novo: "Novo lead",
  lead_parado: "Lead parado",
  vau_desatualizada: "VAU desatualizada",
  sistema: "Sistema",
};
const icons = {
  evento_agenda: CalendarClock,
  lead_novo: UserPlus,
  lead_parado: CircleAlert,
  vau_desatualizada: Gauge,
  sistema: Bell,
};

function PageLink({
  page,
  disabled,
  searchParams,
  children,
}: {
  page: number;
  disabled: boolean;
  searchParams?: SearchParams;
  children: React.ReactNode;
}) {
  const params = new URLSearchParams();
  for (const key of ["tipo", "lida", "de", "ate"]) {
    const value = searchParams?.[key];
    if (typeof value === "string" && value) params.set(key, value);
  }
  params.set("pagina", String(page));
  const classes = "rounded-full border bg-white px-4 py-2 font-semibold";
  return disabled ? (
    <span className={`${classes} opacity-40`}>{children}</span>
  ) : (
    <Link className={classes} href={`/admin/notificacoes?${params}`}>
      {children}
    </Link>
  );
}
