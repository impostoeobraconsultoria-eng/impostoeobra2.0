export type ConfigValue = {
  chave?: string | null;
  valor?: string | null;
  descricao?: string | null;
};

export function ConfigForm({
  action,
  value = {},
  editing = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  value?: ConfigValue;
  editing?: boolean;
}) {
  return (
    <form action={action} className="grid gap-4">
      <label className="field">
        Chave *
        <input
          className="input font-mono disabled:bg-slate-100 disabled:text-slate-500"
          name="chave"
          required
          minLength={2}
          maxLength={100}
          pattern="[a-z0-9]+(?:_[a-z0-9]+)*"
          readOnly={editing}
          defaultValue={value.chave ?? ""}
          placeholder="nome_da_configuracao"
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Letras minúsculas, números e sublinhado.
        </span>
      </label>
      <label className="field">
        Valor
        <textarea
          className="input min-h-32 font-mono text-sm"
          name="valor"
          maxLength={20_000}
          defaultValue={value.valor ?? ""}
        />
      </label>
      <label className="field">
        Descrição
        <textarea
          className="input min-h-20"
          name="descricao"
          maxLength={500}
          defaultValue={value.descricao ?? ""}
        />
      </label>
      <button className="rounded-full bg-accent px-6 py-3 font-bold text-white">
        {editing ? "Atualizar configuração" : "Criar configuração"}
      </button>
    </form>
  );
}
