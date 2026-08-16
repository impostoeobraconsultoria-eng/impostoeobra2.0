import Link from "next/link";

import { PublicCaseCard } from "@/components/public/case-card";
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
          <>
          <div className="grid md:grid-cols-3">
            {featured.map((item) => <PublicCaseCard item={item} key={item.id} />)}
            <article className="flex flex-col justify-center border-b border-border bg-page px-8 py-10">
              <p className="editorial-label">Sua obra</p>
              <h3 className="mt-5 text-3xl font-extrabold tracking-[-.04em] text-text">
                Quanto a sua obra pode economizar?
              </h3>
              <p className="mt-4 leading-7 text-brandMuted">Faça uma simulação gratuita com os parâmetros oficiais.</p>
              <a className="btn-primary mt-7 self-start" href="#calculadora">Simular agora</a>
            </article>
          </div>
          {cases.length >= 3 && (
            <div className="mt-8 text-center">
              <Link className="inline-flex border-b-2 border-primary pb-1 font-bold text-primary" href="/casos-de-sucesso">
                Ver todos os casos →
              </Link>
            </div>
          )}
          </>
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
