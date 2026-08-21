import Link from "next/link";
import { Plus, ShieldCheck, UserRoundCheck, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createUser, updateUser } from "./actions";
import { UserForm } from "./user-form";

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: Record<string, string | undefined>;
}) {
  const supabase = createClient();
  let query = supabase
    .from("users")
    .select("id,nome,email,perfil,ativo,criado_em,ultimo_acesso")
    .order("ativo", { ascending: false })
    .order("nome");
  if (searchParams?.perfil) query = query.eq("perfil", searchParams.perfil);
  if (searchParams?.status === "active") query = query.eq("ativo", true);
  if (searchParams?.status === "inactive") query = query.eq("ativo", false);
  const { data: users, error } = await query;
  const creating = searchParams?.new === "1";
  const message = getMessage(searchParams?.error);

  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Acesso</p>
            <h1 className="text-3xl font-bold">Usuários</h1>
            <p className="mt-2 text-sm text-slate-500">
              Autorize e gerencie a equipe que pode entrar com Google.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-white"
            href={creating ? "/admin/usuarios" : "/admin/usuarios?new=1"}
          >
            <Plus className="size-4" /> {creating ? "Fechar" : "Novo usuário"}
          </Link>
        </header>

        {searchParams?.saved && (
          <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            Usuário salvo com sucesso.
          </p>
        )}
        {message && (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {message}
          </p>
        )}
        {creating && (
          <section className="mt-6 rounded-2xl border bg-white p-6">
            <h2 className="mb-2 text-xl font-bold">Autorizar novo usuário</h2>
            <p className="mb-5 text-sm text-slate-500">
              Use exatamente o e-mail da conta Google que fará o login.
            </p>
            <UserForm action={createUser} />
          </section>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Metric icon={Users} label="Total" value={users?.length ?? 0} />
          <Metric
            icon={UserRoundCheck}
            label="Ativos"
            value={users?.filter((user) => user.ativo).length ?? 0}
          />
          <Metric
            icon={ShieldCheck}
            label="Administradores ativos"
            value={
              users?.filter((user) => user.ativo && user.perfil === "admin")
                .length ?? 0
            }
          />
        </section>

        <form className="mt-5 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
          <select
            className="input !mt-0"
            name="perfil"
            defaultValue={searchParams?.perfil ?? ""}
            aria-label="Perfil"
          >
            <option value="">Todos os perfis</option>
            <option value="admin">Administradores</option>
            <option value="consultor">Consultores</option>
          </select>
          <select
            className="input !mt-0"
            name="status"
            defaultValue={searchParams?.status ?? ""}
            aria-label="Status"
          >
            <option value="">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          <button className="rounded-full border px-5 py-2.5 font-semibold">
            Filtrar
          </button>
        </form>

        {error ? (
          <p className="mt-5 rounded-2xl border bg-white p-10 text-center text-red-700">
            Não foi possível carregar os usuários.
          </p>
        ) : users?.length ? (
          <section className="mt-5 space-y-3">
            {users.map((user) => {
              const editing = searchParams?.edit === user.id;
              return (
                <article
                  className="rounded-2xl border bg-white p-5"
                  key={user.id}
                >
                  {editing ? (
                    <>
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <h2 className="text-lg font-bold">Editar usuário</h2>
                        <Link
                          className="text-sm font-semibold text-slate-500"
                          href="/admin/usuarios"
                        >
                          Cancelar
                        </Link>
                      </div>
                      <UserForm
                        action={updateUser.bind(null, user.id)}
                        value={user}
                        editing
                      />
                    </>
                  ) : (
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="grid size-11 place-items-center rounded-full bg-blue-50 font-bold text-primary">
                        {(user.nome || user.email).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-bold">{user.nome || "Sem nome"}</h2>
                        <p className="truncate text-sm text-slate-500">
                          {user.email}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-primary">
                          {user.perfil}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.ativo
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {user.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <div className="w-44 text-right text-xs text-slate-500">
                        <p>Último acesso</p>
                        <p className="mt-1 font-medium text-slate-700">
                          {user.ultimo_acesso
                            ? formatDate(user.ultimo_acesso)
                            : "Nunca acessou"}
                        </p>
                      </div>
                      <Link
                        className="font-semibold text-primary hover:underline"
                        href={`/admin/usuarios?edit=${user.id}`}
                      >
                        Editar
                      </Link>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        ) : (
          <section className="mt-5 rounded-2xl border bg-white p-12 text-center">
            <Users className="mx-auto size-10 text-slate-300" />
            <h2 className="mt-4 text-lg font-bold">
              Nenhum usuário encontrado
            </h2>
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <Icon className="size-5 text-primary" aria-hidden="true" />
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function getMessage(code?: string) {
  if (code === "duplicate") return "Este e-mail já está cadastrado.";
  if (code === "self_access")
    return "Você não pode desativar ou rebaixar o próprio acesso.";
  if (code === "last_admin")
    return "O sistema precisa manter pelo menos um administrador ativo.";
  if (code === "not_found") return "Usuário não encontrado.";
  if (code) return "Não foi possível salvar. Revise os campos informados.";
  return null;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
