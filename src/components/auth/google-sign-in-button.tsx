"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type GoogleSignInButtonProps = {
  nextPath: string;
};

export function GoogleSignInButton({ nextPath }: GoogleSignInButtonProps) {
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  async function signIn() {
    setError(undefined);
    setIsLoading(true);

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", nextPath);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (signInError) {
      setError(
        "Não foi possível iniciar o login com o Google. Tente novamente.",
      );
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={signIn}
        disabled={isLoading}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-soft transition hover:bg-[#006ae0] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        {isLoading ? "Redirecionando…" : "Entrar com Google"}
      </button>
      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.7 0 4.98-.9 6.63-2.35l-3.24-2.55c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="currentColor"
        d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z"
      />
      <path
        fill="currentColor"
        d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
      />
    </svg>
  );
}
