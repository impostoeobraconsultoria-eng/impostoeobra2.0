import type { Metadata } from "next";

import { PublicCaseCard } from "@/components/public/case-card";
import { getWhatsappUrl } from "@/lib/config";
import { getAllPublishedCases } from "@/lib/public-content";
import { getSiteConfig } from "@/lib/site-config";
import { TrackedPublicAnchor } from "@/components/analytics/tracked-anchor";
import { getSeoConfig } from "@/lib/seo/config";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { getSchemaCollectionPage } from "@/lib/seo/schema";

const description =
  "Veja resultados reais de clientes que regularizaram INSS de obra com nossa consultoria.";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await getSeoConfig(), {
    title: "Casos de sucesso — Imposto & Obra Consultoria",
    description,
    canonical: "/casos-de-sucesso",
  });
}

export default async function SuccessCasesPage() {
  const [cases, config] = await Promise.all([
    getAllPublishedCases().catch((error) => {
      console.error("Falha ao renderizar página de cases", error);
      return [];
    }),
    getSiteConfig(),
  ]);
  const whatsappUrl = await getWhatsappUrl(config.whatsapp_msg_padrao);
  const schema = getSchemaCollectionPage({
    name: "Resultados dos nossos clientes",
    description,
    url: "/casos-de-sucesso",
    numberOfItems: cases.length,
  });
  return (
    <main>
      <JsonLd data={schema} />
      <header className="border-b border-border bg-page py-20">
        <div className="site-container">
          <p className="editorial-label">Casos reais</p>
          <h1 className="mt-6 max-w-4xl text-5xl font-extrabold tracking-[-.055em] text-text sm:text-6xl">
            Resultados dos nossos clientes
          </h1>
          <p className="mt-6 text-lg text-brandMuted">
            {cases.length}{" "}
            {cases.length === 1
              ? "projeto regularizado"
              : "projetos regularizados"}
          </p>
        </div>
      </header>
      <section className="bg-white py-16" aria-label="Cases publicados">
        <div className="site-container">
          {cases.length ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3">
              {cases.map((item) => (
                <PublicCaseCard item={item} key={item.id} />
              ))}
            </div>
          ) : (
            <p className="border-y border-border py-16 text-center text-brandMuted">
              Novos resultados serão publicados em breve.
            </p>
          )}
        </div>
      </section>
      <section className="bg-primary py-20 text-white">
        <div className="site-container flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <h2 className="max-w-3xl text-4xl font-extrabold tracking-[-.04em]">
            Sua obra também pode economizar
          </h2>
          <TrackedPublicAnchor
            kind="whatsapp"
            origem="cases_cta_final"
            className="inline-flex min-h-14 items-center bg-white px-7 font-bold text-primary"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Falar no WhatsApp
          </TrackedPublicAnchor>
        </div>
      </section>
    </main>
  );
}
