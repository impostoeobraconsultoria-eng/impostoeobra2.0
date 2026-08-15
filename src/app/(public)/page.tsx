import type { Metadata } from "next";
import { CalculadoraInss } from "@/components/calculadora/calculadora-inss";
import { CasesSection } from "@/components/public/cases-section";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Regularize sua obra e economize INSS",
  description:
    "Consultoria especializada em regularização de obras e redução de INSS. Simule o valor do imposto da sua obra e descubra quanto você pode economizar.",
  alternates: { canonical: "/" },
};

const professionalServiceSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "https://impostoeobra.com.br/#organization",
  name: "Imposto & Obra Consultoria",
  alternateName: "Imposto e Obra",
  url: "https://impostoeobra.com.br/",
  logo: "https://impostoeobra.com.br/og-logo.png",
  image: "https://impostoeobra.com.br/og-cover.png",
  description:
    "Consultoria especializada em regularização de obras e redução do INSS de construção civil. Atendimento nacional 100% remoto.",
  telephone: "+55-61-99398-2653",
  email: "impostoeobraconsultoria@gmail.com",
  taxID: "63.382.260/0001-99",
  foundingDate: "2025-10-27",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Brasília",
    addressRegion: "DF",
    addressCountry: "BR",
  },
  areaServed: { "@type": "Country", name: "Brasil" },
  serviceType:
    "Consultoria tributária especializada em INSS de obra, CNO, SERO e regularização perante a Receita Federal",
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "09:00",
    closes: "19:00",
  },
  potentialAction: {
    "@type": "Action",
    name: "Simular INSS da obra",
    target: "https://impostoeobra.com.br/#calc",
  },
};

export default function Home() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(professionalServiceSchema).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />
      <section className="site-container grid gap-12 py-12 lg:grid-cols-[1.02fr_.98fr] lg:py-16">
        <div className="pt-3">
          <p className="mb-4 text-sm font-bold uppercase tracking-[.14em] text-primary">
            Especialistas em INSS de obra
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-[-.035em] sm:text-5xl">
            A Receita Federal notificou sua obra?
            <br />
            <span className="text-primary">
              Calma, nós ajudamos você a resolver isso.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            A Imposto &amp; Obra Consultoria oferece{" "}
            <strong className="text-foreground">
              assessoria jurídico-tributária especializada para construção civil
            </strong>{" "}
            com foco em INSS de obra. Ajudamos você a regularizar sua obra e
            reduzir o imposto.
          </p>
          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex rounded-full bg-primary px-6 py-3 font-bold text-white shadow-soft hover:no-underline"
          >
            Fale conosco agora
          </a>
          <div className="mt-7 flex flex-wrap gap-3">
            <span className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold">
              Sua obra regularizada em 5 dias úteis
            </span>
            <span className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold">
              Redução legal da carga tributária
            </span>
          </div>
        </div>
        <CalculadoraInss />
      </section>
      <CasesSection />
      <section className="site-container py-16 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">
          Regularize sua obra com segurança e economia
        </h2>
        <p className="mt-3 font-semibold text-primary">
          Evite multas, bloqueios e cobranças indevidas.
        </p>
        <p className="mt-1 text-slate-600">
          Tenha uma equipe especializada cuidando do seu caso.
        </p>
        <a
          href={getWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 inline-flex rounded-full bg-accent px-6 py-3 font-bold text-white hover:no-underline"
        >
          Fale conosco
        </a>
      </section>
    </main>
  );
}
