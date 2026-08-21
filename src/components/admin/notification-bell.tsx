"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarClock,
  CircleAlert,
  Gauge,
  UserPlus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { NotificationItem } from "@/lib/notifications";

const icons = {
  evento_agenda: CalendarClock,
  lead_novo: UserPlus,
  lead_parado: CircleAlert,
  vau_desatualizada: Gauge,
  sistema: Bell,
};

export function NotificationBell({
  initialNotifications,
  initialUnread,
  initialNow,
}: {
  initialNotifications: NotificationItem[];
  initialUnread: number;
  initialNow: number;
}) {
  const router = useRouter();
  const details = useRef<HTMLDetailsElement>(null);
  const [items, setItems] = useState(initialNotifications);
  const [unread, setUnread] = useState(initialUnread);
  const [now, setNow] = useState(initialNow);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const response = await fetch("/api/notificacoes?limit=10", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json();
      setItems(data.notifications);
      setUnread(data.unread);
      setNow(Date.now());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  async function open(item: NotificationItem) {
    if (!item.lida) {
      const response = await fetch(`/api/notificacoes/${item.id}/lida`, {
        method: "PATCH",
      });
      if (response.ok) {
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, lida: true } : entry,
          ),
        );
        setUnread((current) => Math.max(0, current - 1));
      }
    }
    details.current?.removeAttribute("open");
    if (item.link) router.push(item.link);
  }

  async function markAll() {
    const response = await fetch("/api/notificacoes/todas-lidas", {
      method: "PATCH",
    });
    if (!response.ok) return;
    setItems((current) => current.map((item) => ({ ...item, lida: true })));
    setUnread(0);
  }

  return (
    <details className="relative" ref={details}>
      <summary
        className="relative grid size-10 cursor-pointer list-none place-items-center rounded-full border border-slate-200 bg-white hover:bg-slate-50"
        aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`}
      >
        <Bell className="size-5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-5 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </summary>
      <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-bold">Notificações</p>
          {unread > 0 && (
            <button
              className="text-xs font-semibold text-primary hover:underline"
              onClick={markAll}
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-[28rem] overflow-y-auto">
          {items.length ? (
            items.map((item) => {
              const Icon = icons[item.tipo] ?? Bell;
              return (
                <button
                  key={item.id}
                  onClick={() => open(item)}
                  className={`flex w-full gap-3 border-b p-4 text-left hover:bg-slate-50 ${item.lida ? "bg-white" : "bg-blue-50/60"}`}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-primary shadow-sm">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <strong className="text-sm">{item.titulo}</strong>
                      {!item.lida && (
                        <i className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </span>
                    {item.mensagem && (
                      <span className="mt-1 line-clamp-2 block text-xs text-slate-600">
                        {item.mensagem}
                      </span>
                    )}
                    <time
                      className="mt-1.5 block text-[11px] text-slate-400"
                      dateTime={item.criado_em}
                    >
                      {relativeTime(item.criado_em, now)}
                    </time>
                  </span>
                </button>
              );
            })
          ) : (
            <p className="p-8 text-center text-sm text-slate-500">
              Nenhuma notificação.
            </p>
          )}
        </div>
        <Link
          href="/admin/notificacoes"
          className="block px-4 py-3 text-center text-sm font-semibold text-primary hover:bg-slate-50"
        >
          Ver todas
        </Link>
      </div>
    </details>
  );
}

export function relativeTime(value: string, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(value)) / 1000));
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
