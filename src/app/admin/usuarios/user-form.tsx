export type UserValue = {
  nome?: string | null;
  email?: string | null;
  perfil?: string | null;
  ativo?: boolean;
};

export function UserForm({
  action,
  value = {},
  editing = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  value?: UserValue;
  editing?: boolean;
}) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="field">
        Nome *
        <input
          className="input"
          name="nome"
          required
          minLength={2}
          maxLength={160}
          defaultValue={value.nome ?? ""}
        />
      </label>
      <label className="field">
        E-mail Google *
        <input
          className="input disabled:bg-slate-100 disabled:text-slate-500"
          type="email"
          name="email"
          required
          maxLength={320}
          readOnly={editing}
          defaultValue={value.email ?? ""}
        />
        {editing && (
          <span className="mt-1 block text-xs font-normal text-slate-500">
            O e-mail não pode ser alterado após o cadastro.
          </span>
        )}
      </label>
      <label className="field">
        Perfil
        <select
          className="input"
          name="perfil"
          defaultValue={value.perfil ?? "consultor"}
        >
          <option value="consultor">Consultor</option>
          <option value="admin">Administrador</option>
        </select>
      </label>
      <label className="flex items-center gap-3 self-end pb-3 font-semibold">
        <input
          className="size-5 accent-primary"
          type="checkbox"
          name="ativo"
          defaultChecked={value.ativo ?? true}
        />
        Acesso ativo
      </label>
      <button className="rounded-full bg-accent px-6 py-3 font-bold text-white sm:col-span-2">
        {editing ? "Atualizar usuário" : "Cadastrar usuário"}
      </button>
    </form>
  );
}
