export function CustomerForm({
  action,
  values = {},
}: {
  action: (f: FormData) => void | Promise<void>;
  values?: Record<string, unknown>;
}) {
  const fields = [
    ["nome", "Nome *"],
    ["cpf", "CPF"],
    ["cnpj", "CNPJ"],
    ["email", "E-mail"],
    ["ddd", "DDD"],
    ["telefone", "Telefone"],
    ["profissao", "Profissão"],
    ["end_logradouro", "Endereço"],
    ["end_bairro", "Bairro"],
    ["end_cidade", "Cidade"],
    ["end_uf", "UF"],
    ["end_cep", "CEP"],
    ["obra_end_logradouro", "Endereço da obra"],
    ["obra_end_cidade", "Cidade da obra"],
    ["obra_end_uf", "UF da obra"],
    ["obra_matricula", "Matrícula"],
    ["obra_iptu", "IPTU"],
    ["obra_tipo", "Tipo da obra"],
    ["pix", "PIX"],
    ["obs_contrato", "Observações"],
  ];
  return (
    <form
      action={action}
      className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {fields.map(([name, label]) => (
        <label className="field" key={name}>
          {label}
          <input
            className="input"
            name={name}
            required={name === "nome"}
            defaultValue={values[name] == null ? "" : String(values[name])}
          />
        </label>
      ))}
      <button className="rounded-full bg-accent px-5 py-3 font-bold text-white lg:col-span-3">
        Salvar cliente
      </button>
    </form>
  );
}
