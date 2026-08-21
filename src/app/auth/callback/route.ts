import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

function safeNextPath(value: string | null) {
  if (!value?.startsWith("/admin") || value.startsWith("//")) return "/admin";
  return value;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  const response = NextResponse.redirect(new URL(nextPath, request.url));

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", request.url),
    );
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headersToSet).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    },
  );

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("Falha ao trocar o código OAuth pela sessão", {
      code: exchangeError.code,
      message: exchangeError.message,
    });
    const loginUrl = new URL("/login?error=oauth_failed", request.url);
    return redirectWithCookies(loginUrl, response);
  }

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const email = claimsData?.claims.email;

  if (claimsError || typeof email !== "string") {
    await supabase.auth.signOut({ scope: "local" });
    return redirectWithCookies(
      new URL("/login?error=oauth_failed", request.url),
      response,
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, perfil, ativo")
    .eq("email", email)
    .eq("ativo", true)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    return redirectWithCookies(
      new URL("/login?error=not_authorized", request.url),
      response,
    );
  }

  const { error: lastAccessError } = await supabase.rpc(
    "registrar_ultimo_acesso",
  );

  if (lastAccessError) {
    console.warn("Não foi possível atualizar users.ultimo_acesso", {
      code: lastAccessError.code,
    });
  }

  return response;
}

function redirectWithCookies(destination: URL, authResponse: NextResponse) {
  const redirect = NextResponse.redirect(destination);
  authResponse.cookies
    .getAll()
    .forEach((cookie) => redirect.cookies.set(cookie));

  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = authResponse.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }

  return redirect;
}
