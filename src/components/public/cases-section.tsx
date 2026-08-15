import { getPublishedCases, type PublicCase } from "@/lib/public-content";

export async function CasesSection() {
  let cases: PublicCase[] = [];
  try {
    cases = await getPublishedCases();
  } catch (error) {
    console.error("Falha ao renderizar cases da home", error);
  }

  if (cases.length < 3) return <StatsFallback />;

  return (
    <section className="bg-slate-50 py-16" aria-labelledby="cases-title">
      <div className="site-container">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-3xl font-extrabold tracking-tight"
            id="cases-title"
          >
            Resultados reais dos nossos clientes
          </h2>
          <p className="mt-3 text-slate-600">
            Economia validada em contratos reais de regularização de INSS de
            obra.
          </p>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((item) => (
            <article
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              key={item.id}
            >
              {item.imagem_url && (
                // A URL é cadastrada pelo admin e pode vir de provedores diversos.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`Obra de ${item.cliente_display}`}
                  className="aspect-video w-full object-cover"
                  loading="lazy"
                  src={item.imagem_url}
                />
              )}
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="mr-auto text-lg font-bold text-slate-950">
                    {item.cliente_display}
                  </h3>
                  {item.tipo_obra && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-primary">
                      {item.tipo_obra}
                    </span>
                  )}
                </div>
                <p className="mt-6 text-3xl font-extrabold tracking-tight text-accent">
                  {formatMoney(item.economia_valor)}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  de economia
                </p>
                {item.economia_pct != null && (
                  <span className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
                    {formatPercent(item.economia_pct)} de redução
                  </span>
                )}
                {item.descricao && (
                  <p className="mt-4 leading-7 text-slate-600">
                    {truncate(item.descricao, 200)}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
        <div className="mt-9 text-center">
          <a
            className="inline-flex rounded-full bg-accent px-6 py-3 font-bold text-white hover:no-underline"
            href="#calculadora"
          >
            Quero simular a minha obra
          </a>
        </div>
      </div>
    </section>
  );
}

function StatsFallback() {
  return (
    <section className="bg-primary py-10 text-white">
      <div className="site-container grid gap-8 text-center sm:grid-cols-3">
        <Stat value="R$ 1,5 mi+" label="em impostos reduzidos" />
        <Stat value="5 dias" label="prazo médio de regularização" />
        <Stat value="100%" label="atendimento especializado" />
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-3xl font-extrabold">{value}</p>
      <p className="mt-1 text-sm text-white/80">{label}</p>
    </div>
  );
}

function formatMoney(value: number | null) {
  if (value == null) return "Economia comprovada";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPercent(value: number) {
  return `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}
