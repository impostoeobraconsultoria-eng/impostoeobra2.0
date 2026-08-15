import { getPublishedCases, type PublicCase } from "@/lib/public-content";

export async function CasesSection() {
  let cases: PublicCase[] = [];
  try {
    cases = await getPublishedCases();
  } catch (error) {
    console.error("Falha ao renderizar cases da home", error);
  }

  const featured = cases.slice(0, 2);
  return (
    <section className="bg-white py-20" aria-labelledby="cases-title">
      <div className="site-container">
        <div className="grid gap-8 border-b border-border pb-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="editorial-label">Resultados reais</p>
            <h2 className="editorial-title mt-5" id="cases-title">
              Economia que aparece nos números.
            </h2>
          </div>
          <p className="text-brandMuted lg:col-span-4">
            Casos reais de regularização conduzidos pela nossa equipe.
          </p>
        </div>
        {featured.length >= 2 ? (
          <div className="grid md:grid-cols-2">
            {featured.map((item, index) => (
              <article
                className={`py-10 ${index === 0 ? "md:border-r md:border-border md:pr-10" : "md:pl-10"}`}
                key={item.id}
              >
                <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.12em] text-primary">
                      {item.tipo_obra || "Regularização"}
                    </p>
                    <h3 className="mt-2 text-xl font-bold">
                      {item.cliente_display}
                    </h3>
                  </div>
                  {item.economia_pct != null && (
                    <strong className="text-2xl text-accent">
                      −{formatPercent(item.economia_pct)}
                    </strong>
                  )}
                </div>
                <p className="mt-7 text-5xl font-extrabold tracking-[-.05em] text-text">
                  {formatMoney(item.economia_valor)}
                </p>
                <p className="mt-2 text-sm uppercase tracking-[.1em] text-brandMuted">
                  economizados
                </p>
                {item.descricao && (
                  <p className="mt-6 max-w-xl leading-7 text-brandMuted">
                    {truncate(item.descricao, 200)}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <StatsFallback />
        )}
      </div>
    </section>
  );
}

function StatsFallback() {
  return (
    <div className="grid border-b border-border py-10 sm:grid-cols-3">
      <Stat value="R$ 1,5 mi+" label="em impostos reduzidos" />
      <Stat value="200+" label="obras regularizadas" />
      <Stat value="100%" label="atendimento especializado" />
    </div>
  );
}
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-border py-5 first:pl-0 last:border-0 sm:border-r sm:px-8">
      <p className="text-4xl font-extrabold tracking-tight text-primary">
        {value}
      </p>
      <p className="mt-2 text-sm text-brandMuted">{label}</p>
    </div>
  );
}
function formatMoney(value: number | null) {
  return value == null
    ? "Economia comprovada"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(value);
}
function formatPercent(value: number) {
  return `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}
function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}
