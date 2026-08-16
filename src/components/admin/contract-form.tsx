export function ContractForm({
  action,
  clients,
  values = {},
}: {
  action: (f: FormData) => void | Promise<void>;
  clients: Array<{ id: string; nome: string }>;
  values?: Record<string, unknown>;
}) {
  const currentProduct = String(values.produto ?? "");
  const productValue = ["obra_andamento", "obra_finalizada"].includes(
    currentProduct,
  )
    ? currentProduct
    : "";
  return (
    <form
      action={action}
      className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <label className="field">
        Cliente *
        <select
          name="cliente_id"
          required
          defaultValue={String(values.cliente_id ?? "")}
          className="input"
        >
          <option value="">Selecione</option>
          {clients.map((client) => (
            <option value={client.id} key={client.id}>
              {client.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Modalidade *
        <select
          name="produto"
          required
          defaultValue={productValue}
          className="input"
        >
          <option value="">Selecione</option>
          <option value="obra_andamento">Obra em andamento</option>
          <option value="obra_finalizada">Obra finalizada</option>
        </select>
        {currentProduct && !productValue && (
          <span className="mt-1 block text-xs font-semibold text-amber-700">
            Modalidade legada inválida: {currentProduct}. Escolha uma opção
            válida antes de salvar.
          </span>
        )}
      </label>
      {[
        ["numero", "Número", "text"],
        ["valor_total", "Valor total", "number"],
        ["valor_pago", "Valor pago", "number"],
        ["forma_pagamento", "Forma de pagamento", "text"],
        ["parcelas", "Parcelas", "number"],
        ["data_assinatura", "Assinatura", "date"],
        ["data_inicio", "Início", "date"],
        ["data_conclusao", "Conclusão", "date"],
      ].map(([name, label, type]) => (
        <label className="field" key={name}>
          {label}
          <input
            name={name}
            type={type}
            step={type === "number" ? "0.01" : undefined}
            defaultValue={String(values[name] ?? "")}
            className="input"
          />
        </label>
      ))}
      <label className="field">
        Status
        <select
          name="status"
          defaultValue={String(values.status ?? "em vigor")}
          className="input"
        >
          <option>em vigor</option>
          <option>concluído</option>
          <option>cancelado</option>
        </select>
      </label>
      <label className="field sm:col-span-2">
        Observações
        <textarea
          name="observacoes"
          defaultValue={String(values.observacoes ?? "")}
          className="input"
        />
      </label>
      <button className="rounded-full bg-accent px-5 py-3 font-bold text-white lg:col-span-3">
        Salvar contrato
      </button>
    </form>
  );
}
