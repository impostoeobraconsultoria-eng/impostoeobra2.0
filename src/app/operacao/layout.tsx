import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InternalHeader } from "@/components/admin/internal-header";
import { OperacaoSidebar } from "@/components/operacao/sidebar";
import { listNotifications } from "@/lib/notifications";
import { getOperacaoConfig } from "@/lib/operacao/get-config";
import { listOperacaoTree } from "@/lib/operacao/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Operação | Imposto & Obra",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default async function OperacaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string") redirect("/login?next=/operacao");

  const [{ data: profile }, config, tree, notificationData] = await Promise.all(
    [
      supabase
        .from("users")
        .select("nome,email,perfil")
        .eq("email", email)
        .eq("ativo", true)
        .maybeSingle(),
      getOperacaoConfig(),
      listOperacaoTree(),
      listNotifications(10),
    ],
  );
  if (!profile) redirect("/login?error=not_authorized");
  return (
    <div className="min-h-screen bg-[#f7f5f1] text-slate-900">
      <InternalHeader
        area="Operação"
        homeHref="/operacao"
        profile={profile}
        notifications={notificationData.notifications}
        unread={notificationData.unread}
        showBrand
        switchHref="/admin"
        switchLabel="CRM"
      />
      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
        <aside className="max-h-[calc(100vh-8rem)] overflow-y-auto lg:sticky lg:top-6">
          <OperacaoSidebar
            tree={tree}
            canCreatePages={config.habilitarCriacao}
            isAdmin={profile.perfil === "admin"}
          />
        </aside>
        <main className="operacao-content min-w-0">{children}</main>
      </div>
      <footer className="border-t border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-500">
        {config.rodape}
      </footer>
    </div>
  );
}
