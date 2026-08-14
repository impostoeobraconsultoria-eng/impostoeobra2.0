import { createClient } from "@/lib/supabase/server";

type AdminPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const forbidden = searchParams?.error === "forbidden";
  const supabase = createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const email = claimsData?.claims.email;
  const { data: profile } =
    typeof email === "string"
      ? await supabase
          .from("users")
          .select("nome, perfil, ultimo_acesso")
          .eq("email", email)
          .maybeSingle()
      : { data: null };

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
        Imposto &amp; Obra
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">
        Admin protegido
      </h1>
      <p className="mt-4 text-muted-foreground">
        Autenticação concluída. O dashboard será construído na etapa de admin.
      </p>
      {profile?.ultimo_acesso ? (
        <p
          className="mt-2 text-sm text-muted-foreground"
          data-testid="last-access"
        >
          Último acesso registrado: {profile.ultimo_acesso}
        </p>
      ) : null}
      {forbidden ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-destructive"
        >
          Seu perfil não tem permissão para acessar essa área.
        </p>
      ) : null}
      <form action="/api/auth/signout" method="post" className="mt-8">
        <button
          type="submit"
          className="rounded-full border px-5 py-2.5 font-semibold hover:bg-muted"
        >
          Sair
        </button>
      </form>
    </main>
  );
}
