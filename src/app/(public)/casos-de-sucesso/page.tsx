import type { Metadata } from "next";

import { PublicCaseCard } from "@/components/public/case-card";
import { getAllPublishedCases } from "@/lib/public-content";
import { getConfiguredWhatsAppUrl, getSiteConfig } from "@/lib/site-config";

const description =
  "Veja resultados reais de clientes que regularizaram INSS de obra com nossa consultoria.";

export const metadata: Metadata = {
  title: "Casos de sucesso — Imposto & Obra Consultoria",
  description,
  alternates: { canonical: "/casos-de-sucesso" },
  openGraph: {
    title: "Casos de sucesso — Imposto & Obra Consultoria",
    description,
    url: "/casos-de-sucesso",
  },
};

export default async function SuccessCasesPage() {
  const [cases, config] = await Promise.all([
    getAllPublishedCases().catch((error) => {
      console.error("Falha ao renderizar página de cases", error);
      return [];
    }),
    getSiteConfig(),
  ]);
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Resultados dos nossos clientes",
    description,
    url: "https://impostoeobra.com.br/casos-de-sucesso",
    numberOfItems: cases.length,
  };
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <header className="border-b border-border bg-page py-20">
        <div className="site-container">
          <p className="editorial-label">Casos reais</p>
          <h1 className="mt-6 max-w-4xl text-5xl font-extrabold tracking-[-.055em] text-text sm:text-6xl">
            Resultados dos nossos clientes
          </h1>
          <p className="mt-6 text-lg text-brandMuted">
            {cases.length} {cases.length === 1 ? "projeto regularizado" : "projetos regularizados"}
          </p>
        </div>
      </header>
      <section className="bg-white py-16" aria-label="Cases publicados">
        <div className="site-container">
          {cases.length ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3">
              {cases.map((item) => <PublicCaseCard item={item} key={item.id} />)}
            </div>
          ) : (
            <p className="border-y border-border py-16 text-center text-brandMuted">Novos resultados serão publicados em breve.</p>
          )}
        </div>
      </section>
      <section className="bg-primary py-20 text-white">
        <div className="site-container flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <h2 className="max-w-3xl text-4xl font-extrabold tracking-[-.04em]">Sua obra também pode economizar</h2>
          <a className="inline-flex min-h-14 items-center bg-white px-7 font-bold text-primary" href={getConfiguredWhatsAppUrl(config)} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
        </div>
      </section>
    </main>
  );
}
