export type FaqValue = {
  pergunta?: string | null;
  resposta?: string | null;
  categoria?: string | null;
  ordem?: number | null;
  publicado?: boolean;
};

export function FaqForm({
  action,
  value = {},
  submitLabel = "Salvar pergunta",
}: {
  action: (formData: FormData) => void | Promise<void>;
  value?: FaqValue;
  submitLabel?: string;
}) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="field sm:col-span-2">
        Pergunta *
        <input
          className="input"
          name="pergunta"
          required
          minLength={5}
          maxLength={500}
          defaultValue={value.pergunta ?? ""}
        />
      </label>
      <label className="field sm:col-span-2">
        Resposta *
        <textarea
          className="input min-h-32"
          name="resposta"
          required
          minLength={5}
          maxLength={5000}
          defaultValue={value.resposta ?? ""}
        />
      </label>
      <label className="field">
        Categoria
        <input
          className="input"
          name="categoria"
          maxLength={100}
          defaultValue={value.categoria ?? ""}
          placeholder="Ex.: CNO e regularização"
        />
      </label>
      <label className="field">
        Ordem de exibição
        <input
          className="input"
          type="number"
          name="ordem"
          min="0"
          max="9999"
          defaultValue={String(value.ordem ?? 100)}
        />
      </label>
      <label className="flex items-center gap-3 font-semibold sm:col-span-2">
        <input
          className="size-5 accent-primary"
          type="checkbox"
          name="publicado"
          defaultChecked={value.publicado ?? true}
        />
        Publicada
      </label>
      <button className="rounded-full bg-accent px-6 py-3 font-bold text-white sm:col-span-2">
        {submitLabel}
      </button>
    </form>
  );
}
