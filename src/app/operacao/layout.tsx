import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronLeft, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { OperacaoSidebar } from "@/components/operacao/sidebar";
import { getOperacaoConfig } from "@/lib/operacao/get-config";
import { listOperacaoTree } from "@/lib/operacao/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Operação | Imposto & Obra",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default async function OperacaoLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.email) redirect("/login?next=/operacao");

  const [config, tree] = await Promise.all([getOperacaoConfig(), listOperacaoTree()]);
  return (
    <div className="min-h-screen bg-[#f7f5f1] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-4 sm:px-6">
          <BookOpen className="size-8 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{config.titulo}</p>
            <p className="hidden truncate text-xs text-slate-500 sm:block">{config.subtitulo}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {config.habilitarCriacao && (
              <Link href="/operacao/nova" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                <Plus className="size-4" /> <span className="hidden sm:inline">Nova página</span>
              </Link>
            )}
            <Link href="/admin" className="inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              <ChevronLeft className="size-4" /> CRM
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
        <aside className="max-h-[calc(100vh-8rem)] overflow-y-auto lg:sticky lg:top-6">
          <OperacaoSidebar tree={tree} />
        </aside>
        <main className="operacao-content min-w-0">{children}</main>
      </div>
      <footer className="border-t border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-500">{config.rodape}</footer>
    </div>
  );
}
