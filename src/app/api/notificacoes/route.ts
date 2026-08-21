import { NextRequest, NextResponse } from "next/server";

import { listNotifications, NOTIFICATION_TYPES } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limit = Math.min(
    Math.max(Number(request.nextUrl.searchParams.get("limit")) || 10, 1),
    100,
  );
  const result = await listNotifications(limit);
  if (!result.profile)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const type = request.nextUrl.searchParams.get("tipo");
  const unread = request.nextUrl.searchParams.get("lida");
  const from = request.nextUrl.searchParams.get("de");
  const to = request.nextUrl.searchParams.get("ate");
  let notifications = result.notifications;
  if (type && NOTIFICATION_TYPES.includes(type as never))
    notifications = notifications.filter((item) => item.tipo === type);
  if (unread === "true" || unread === "false")
    notifications = notifications.filter(
      (item) => item.lida === (unread === "true"),
    );
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from))
    notifications = notifications.filter(
      (item) => item.criado_em >= `${from}T00:00:00`,
    );
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to))
    notifications = notifications.filter(
      (item) => item.criado_em <= `${to}T23:59:59.999`,
    );
  return NextResponse.json({ notifications, unread: result.unread });
}
