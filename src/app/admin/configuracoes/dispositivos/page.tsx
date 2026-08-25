import Link from "next/link";
import { redirect } from "next/navigation";

import { RemovePushDevice } from "@/components/admin/remove-push-device";
import { createClient } from "@/lib/supabase/server";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function PushDevicesPage() {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string") redirect("/login");
  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase())
    .eq("ativo", true)
    .maybeSingle();
  if (!profile) redirect("/login?error=not_authorized");
  const { data: devices, error } = await supabase
    .from("push_subscriptions")
    .select("id,endpoint,device_label,criado_em,ultimo_envio_em,ativo")
    .eq("user_id", profile.id)
    .order("criado_em", { ascending: false });

  return (
    <main className="px-5 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Voltar ao Dashboard
        </Link>
        <p className="mt-6 text-sm font-semibold text-primary">Notificações</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Dispositivos conectados
        </h1>
        <p className="mt-2 text-slate-500">
          Gerencie os navegadores autorizados a receber seus alertas do CRM.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-8 rounded-xl bg-red-50 p-4 text-red-800"
          >
            Não foi possível carregar os dispositivos agora.
          </p>
        ) : (
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Dispositivo</th>
                    <th className="px-5 py-4">Criado em</th>
                    <th className="px-5 py-4">Último envio</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(devices ?? []).map((device) => (
                    <tr key={device.id}>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {device.device_label || "Dispositivo sem identificação"}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {dateTime.format(new Date(device.criado_em))}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {device.ultimo_envio_em
                          ? dateTime.format(new Date(device.ultimo_envio_em))
                          : "Ainda não enviado"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${device.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                        >
                          {device.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <RemovePushDevice endpoint={device.endpoint} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!devices?.length && (
              <p className="px-5 py-12 text-center text-sm text-slate-500">
                Nenhum dispositivo cadastrado. Ative as notificações pelo
                Dashboard.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
