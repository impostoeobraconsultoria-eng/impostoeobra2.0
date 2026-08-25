import { unstable_cache } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TelegramLinkManager } from "@/components/admin/telegram-link-manager";
import { getBotUsername } from "@/lib/telegram/client";
import { createClient } from "@/lib/supabase/server";

const linkedAtFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const cachedBotUsername = unstable_cache(
  async () => {
    try {
      return await getBotUsername();
    } catch (error) {
      console.error("Falha ao consultar identidade do bot Telegram", error);
      return null;
    }
  },
  ["telegram-bot-username"],
  { revalidate: 3600 },
);

export default async function TelegramSettingsPage() {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string") redirect("/login");
  const { data: profile } = await supabase
    .from("users")
    .select("telegram_user_id,telegram_username,telegram_vinculado_em")
    .eq("email", email.toLowerCase())
    .eq("ativo", true)
    .maybeSingle();
  if (!profile) redirect("/login?error=not_authorized");
  const botUsername = await cachedBotUsername();
  const linked = Boolean(profile.telegram_user_id);

  return (
    <main className="px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin"
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Voltar ao Dashboard
        </Link>
        <p className="mt-6 text-sm font-semibold text-primary">Integrações</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Telegram</h1>
        <p className="mt-2 text-slate-500">
          Vincule seu usuário para receber alertas e executar ações operacionais
          pelo bot.
        </p>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">Status</p>
              <p className="mt-1 text-xl font-bold">
                {linked ? "Telegram vinculado" : "Não vinculado"}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${linked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
            >
              {linked ? "Ativo" : "Pendente"}
            </span>
          </div>
          {linked && (
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                Conta:{" "}
                <strong className="text-slate-900">
                  {profile.telegram_username
                    ? `@${profile.telegram_username}`
                    : "usuário sem @username"}
                </strong>
              </p>
              {profile.telegram_vinculado_em && (
                <p className="mt-1">
                  Vinculado em{" "}
                  {linkedAtFormat.format(
                    new Date(profile.telegram_vinculado_em),
                  )}
                </p>
              )}
            </div>
          )}
          {!linked && (
            <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-slate-600">
              <li>Gere um código temporário abaixo.</li>
              <li>Abra o bot no Telegram pelo link exibido.</li>
              <li>Envie o código no chat privado antes do vencimento.</li>
            </ol>
          )}
          <TelegramLinkManager linked={linked} botUsername={botUsername} />
        </section>
      </div>
    </main>
  );
}
