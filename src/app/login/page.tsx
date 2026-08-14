import type { Metadata } from "next";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export const metadata: Metadata = {
  title: "Login | Imposto & Obra",
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  not_authorized:
    "Acesso não autorizado. Seu e-mail não está habilitado para esta plataforma. Contate o administrador.",
  oauth_failed:
    "Não foi possível concluir o login com o Google. Tente novamente.",
  missing_code:
    "O Google não devolveu um código de acesso válido. Tente novamente.",
};

type LoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function safeNextPath(value: string | string[] | undefined) {
  if (typeof value !== "string") return "/admin";
  if (!value.startsWith("/admin") || value.startsWith("//")) return "/admin";
  return value;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const errorCode =
    typeof searchParams?.error === "string" ? searchParams.error : undefined;
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-6 py-12">
      <section className="w-full max-w-md rounded-[var(--radius)] border bg-card p-8 text-center shadow-soft sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Imposto &amp; Obra
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Acesso administrativo
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Entre com a conta Google autorizada pela equipe.
        </p>

        {errorMessage ? (
          <div
            className="mt-6 rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-left text-sm leading-6 text-destructive"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-7">
          <GoogleSignInButton nextPath={safeNextPath(searchParams?.next)} />
        </div>
      </section>
    </main>
  );
}
