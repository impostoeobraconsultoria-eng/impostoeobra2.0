import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  createMiddlewareClient,
  redirectWithAuthState,
} from "@/lib/supabase/middleware";

const ADMIN_ONLY_PATHS = [
  "/admin/usuarios",
  "/admin/config",
  "/admin/vau",
  "/admin/leads/lixeira",
  "/admin/equipe-juridica",
] as const;

function isWithinPath(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export async function middleware(request: NextRequest) {
  const legacyPath = request.nextUrl.pathname;

  if (legacyPath.endsWith(".html")) {
    const destination = request.nextUrl.clone();
    destination.pathname = legacyPath.slice(0, -".html".length);
    return NextResponse.redirect(destination, 301);
  }

  const { supabase, getResponse } = createMiddlewareClient(request);
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const email = claimsData?.claims.email;

  if (claimsError || typeof email !== "string") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return redirectWithAuthState(loginUrl, getResponse());
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, nome, perfil, ativo")
    .eq("email", email)
    .eq("ativo", true)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "not_authorized");
    return redirectWithAuthState(loginUrl, getResponse());
  }

  const requiresAdmin = ADMIN_ONLY_PATHS.some((path) =>
    isWithinPath(request.nextUrl.pathname, path),
  );

  if (requiresAdmin && profile.perfil !== "admin") {
    const adminUrl = new URL("/admin", request.url);
    adminUrl.searchParams.set("error", "forbidden");
    return redirectWithAuthState(adminUrl, getResponse());
  }

  return getResponse();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/artigos/:slug*.html",
    "/politica/aviso-de-privacidade.html",
  ],
};
