import type { Metadata } from "next";
import Link from "next/link";

import { CalculadoraInss } from "@/components/calculadora/calculadora-inss";
import { CasesSection } from "@/components/public/cases-section";
import { getWhatsappNumber, getWhatsappUrl } from "@/lib/config";
import { getSiteConfig } from "@/lib/site-config";
import { getDiagnosticoHabilitado } from "@/lib/diagnostico/config";

export const metadata: Metadata = {
  title: "Regularize sua obra e economize INSS",
  description:
    "Consultoria especializada em regularização de obras e redução de INSS. Simule o imposto da sua obra e descubra quanto pode economizar.",
  alternates: { canonical: "/" },
};

const professionalServiceSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "https://impostoeobra.com.br/#organization",
  name: "Imposto & Obra Consultoria",
  url: "https://impostoeobra.com.br/",
  logo: "https://impostoeobra.com.br/logo/avatar.png",
  image: "https://impostoeobra.com.br/og-cover.png",
  description:
    "Consultoria tributária especializada em INSS de construção civil, CNO, SERO e regularização perante a Receita Federal.",
  telephone: "+55-61-99398-2653",
  email: "impostoeobraconsultoria@gmail.com",
  taxID: "63.382.260/0001-99",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Brasília",
    addressRegion: "DF",
    addressCountry: "BR",
  },
  areaServed: { "@type": "Country", name: "Brasil" },
};

export default async function Home() {
  const config = await getSiteConfig();
  const [whatsappUrl, whatsappNumber, diagnosticoEnabled] = await Promise.all([
    getWhatsappUrl(config.whatsapp_msg_padrao),
    getWhatsappNumber(),
    getDiagnosticoHabilitado(),
  ]);

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

      <section className="border-b border-border bg-page">
        <div className="site-container grid min-h-[690px] lg:grid-cols-12">
          <div className="flex flex-col justify-center border-border py-16 lg:col-span-7 lg:border-r lg:py-24 lg:pr-16">
            <p className="editorial-label">
              Consultoria tributária especializada
            </p>
            <h1 className="mt-6 max-w-4xl text-[44px] font-extrabold leading-[.98] tracking-[-.055em] text-text sm:text-[58px] lg:text-[70px]">
              Sua obra regularizada. Seu imposto reduzido.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-brandMuted sm:text-xl">
              Estratégia jurídica e tributária para regularizar o INSS da sua
              construção com segurança, agilidade e a máxima redução prevista em
              lei.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a className="btn-primary" href="#calculadora">
                Simular minha obra
              </a>
            </div>
          </div>

          <aside className="flex flex-col justify-center py-12 lg:col-span-5 lg:pl-14">
            <p className="editorial-label">Exemplo real de economia</p>
            <div className="mt-6 border-y border-border">
              <div className="grid grid-cols-2 border-b border-border py-6">
                <span className="text-sm text-brandMuted">Imposto cheio</span>
                <strong className="text-right text-xl text-text line-through decoration-red-600">
                  {config.hero_exemplo_imposto_cheio}
                </strong>
              </div>
              <div className="grid grid-cols-2 py-6">
                <span className="text-sm text-brandMuted">
                  Com nossa consultoria
                </span>
                <strong className="text-right text-3xl font-extrabold text-primary">
                  {config.hero_exemplo_imposto_com_consultoria}
                </strong>
              </div>
            </div>
            <p className="mt-7 text-6xl font-extrabold tracking-[-.06em] text-accent">
              {config.hero_exemplo_economia_pct}%
            </p>
            <p className="mt-1 font-semibold text-text">de economia estimada</p>
            <p className="mt-5 text-sm leading-6 text-brandMuted">
              {config.hero_exemplo_descricao}
            </p>
          </aside>
        </div>
      </section>

      <section
        className="border-b border-border bg-white py-20"
        id="calculadora"
      >
        <div className="site-container">
          <div className="grid gap-10 lg:grid-cols-12">
            <header className="lg:col-span-4">
              <p className="editorial-label">Simulação gratuita</p>
              <h2 className="editorial-title mt-5">
                Descubra quanto você pode economizar.
              </h2>
              <p className="mt-5 max-w-md leading-7 text-brandMuted">
                Informe os dados da obra. O cálculo usa os parâmetros oficiais
                da Receita Federal e leva menos de dois minutos.
              </p>
            </header>
            <div className="calculator-editorial lg:col-span-8">
              <CalculadoraInss
                whatsappNumber={whatsappNumber}
                diagnosticoEnabled={diagnosticoEnabled}
                eventNames={{
                  started:
                    config.ga4_event_simulacao_iniciada || "simulacao_iniciada",
                  generateLead:
                    config.ga4_event_generate_lead || "generate_lead",
                }}
              />
              <Link
                className="mt-5 inline-flex border-b border-primary pb-1 text-sm font-bold text-primary"
                href="/calculadora-inss-de-obra"
              >
                Ver página completa da calculadora →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CasesSection />

      <section className="border-y border-border bg-page py-20">
        <div className="site-container grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="editorial-label">Conhecimento para decidir</p>
            <h2 className="editorial-title mt-5">
              INSS de obra, sem juridiquês.
            </h2>
          </div>
          <div className="lg:col-span-7 lg:border-l lg:border-border lg:pl-14">
            <p className="max-w-2xl text-lg leading-8 text-brandMuted">
              Entenda CNO, SERO, aferição, reduções legais, multas, CND e
              averbação em um guia feito por especialistas.
            </p>
            <Link
              className="mt-8 inline-flex border-b-2 border-primary pb-1 font-bold text-primary"
              href="/guia-inss-de-obra"
            >
              Ler o guia completo →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-primary py-20 text-white">
        <div className="site-container grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-white/70">
              Atendimento em todo o Brasil
            </p>
            <h2 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight tracking-[-.04em] sm:text-5xl">
              Regularize sua obra com quem conhece cada detalhe do processo.
            </h2>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <a
              className="inline-flex min-h-14 items-center justify-center bg-white px-7 font-bold text-primary"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
