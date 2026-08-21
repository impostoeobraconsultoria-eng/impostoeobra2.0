import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          response = NextResponse.next({ request });

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

  return {
    supabase,
    getResponse: () => response,
  };
}

export function redirectWithAuthState(
  destination: URL,
  authResponse: NextResponse,
) {
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
