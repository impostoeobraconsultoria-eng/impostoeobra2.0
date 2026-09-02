import type { Metadata } from "next";
import Link from "next/link";

import { CalculadoraInss } from "@/components/calculadora/calculadora-inss";
import { getWhatsappNumber, getWhatsappUrl } from "@/lib/config";
import {
  getPublishedFaqByCategory,
  type PublicFaq,
} from "@/lib/public-content";
import { getSiteConfig } from "@/lib/site-config";
import { getDiagnosticoHabilitado } from "@/lib/diagnostico/config";

const title =
  "Calculadora INSS de Obra — Simulador Oficial IN RFB 2021 | Imposto & Obra";
const description =
  "Calcule quanto de INSS você paga pela sua obra em 2 minutos. Simulador oficial baseado na IN RFB 2.021/2021. Descubra reduções legais.";
const canonical = "https://impostoeobra.com.br/calculadora-inss-de-obra";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: canonical,
    title,
    description,
    images: [
      {
        url: "/og-cover.png",
        width: 1200,
        height: 630,
        alt: "Calculadora de INSS de Obra da Imposto & Obra",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-cover.png"],
  },
};

const applicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Calculadora de INSS de Obra",
  url: canonical,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  browserRequirements: "Requires JavaScript",
  description,
  offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
  provider: {
    "@type": "Organization",
    "@id": "https://impostoeobra.com.br/#organization",
    name: "Imposto & Obra Consultoria",
  },
};

const howItWorks = [
  [
    "Informe as características da obra",
    "Selecione responsável, destinação, tipo, categoria, materiais e UF.",
  ],
  [
    "Preencha as áreas",
    "Adicione construção, reforma, demolição e, quando houver, áreas de piscina.",
  ],
  [
    "Receba a estimativa",
    "O simulador aplica os parâmetros oficiais e compara o valor cheio com deduções típicas.",
  ],
  [
    "Valide com especialistas",
    "Nossa equipe pode conferir documentos e identificar outros benefícios aplicáveis ao seu caso.",
  ],
] as const;

const inputs = [
  "Responsável, destinação e tipo da obra",
  "Categoria da construção e estado (UF)",
  "Uso de concreto usinado ou pré-fabricados",
  "Áreas de construção, reforma, demolição e piscina",
  "Nome e WhatsApp para receber o resultado",
];

const factors = [
  [
    "Destinação",
    "Residencial, comercial e outras destinações possuem parâmetros próprios.",
  ],
  [
    "Categoria e tipo",
    "O padrão construtivo e a natureza da intervenção alteram a base estimada.",
  ],
  [
    "Área equivalente",
    "Reforma, demolição e piscinas recebem percentuais específicos no cálculo.",
  ],
  [
    "Materiais",
    "Concreto usinado e pré-fabricados podem gerar deduções previstas na norma.",
  ],
  [
    "Localização",
    "O VAU aplicado varia conforme a unidade federativa e a vigência oficial.",
  ],
];

export default async function CalculadoraPage() {
  const config = await getSiteConfig();
  const [whatsappNumber, whatsappUrl, faq, diagnosticoEnabled] =
    await Promise.all([
      getWhatsappNumber(),
      getWhatsappUrl(config.whatsapp_msg_padrao),
      getPublishedFaqByCategory("calculadora").catch((error) => {
        console.error("Falha ao carregar FAQ da calculadora", error);
        return [] as PublicFaq[];
      }),
      getDiagnosticoHabilitado(),
    ]);
  const faqSchema = faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.pergunta,
          acceptedAnswer: { "@type": "Answer", text: item.resposta },
        })),
      }
    : null;

  return (
    <main>
      {[applicationSchema, faqSchema].filter(Boolean).map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
      ))}

      <section className="border-b border-border bg-page py-12 sm:py-16">
        <div className="site-container">
          <p className="editorial-label">Simulação gratuita em 2 minutos</p>
          <h1 className="mt-5 max-w-5xl text-4xl font-extrabold leading-tight tracking-[-.045em] text-text sm:text-5xl">
            Calculadora de INSS de Obra — Simulador Oficial da IN RFB 2.021/2021
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-brandMuted">
            Simule o INSS que você teria de pagar pela sua obra e descubra
            quanto pode reduzir legalmente. Estimativa em 2 minutos, sem
            cadastro para simular.
          </p>
          <Link
            className="mt-5 inline-flex text-sm font-bold text-primary"
            href="/"
          >
            ← Voltar para a home
          </Link>
        </div>
      </section>

      <section className="border-b border-border bg-white py-10 sm:py-14">
        <div className="site-container max-w-5xl">
          <CalculadoraInss
            whatsappNumber={whatsappNumber}
            diagnosticoEnabled={diagnosticoEnabled}
            pageLocation="/calculadora-inss-de-obra"
            eventNames={{
              started:
                config.ga4_event_simulacao_iniciada || "simulacao_iniciada",
              generateLead: config.ga4_event_generate_lead || "generate_lead",
            }}
          />
        </div>
      </section>

      <section className="border-b border-border bg-page py-16">
        <div className="site-container grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="editorial-label">Etapas da simulação</p>
            <h2 className="editorial-title mt-4">Como funciona</h2>
            <div className="mt-7 space-y-3">
              {howItWorks.map(([question, answer]) => (
                <details
                  key={question}
                  className="border border-border bg-white p-5"
                >
                  <summary className="cursor-pointer font-bold text-text">
                    {question}
                  </summary>
                  <p className="mt-3 leading-7 text-brandMuted">{answer}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="lg:col-span-6 lg:border-l lg:border-border lg:pl-12">
            <p className="editorial-label">Antes de começar</p>
            <h2 className="editorial-title mt-4">Dados necessários</h2>
            <ul className="mt-7 space-y-4">
              {inputs.map((item) => (
                <li key={item} className="flex gap-3 leading-7 text-brandMuted">
                  <span
                    aria-hidden="true"
                    className="font-extrabold text-accent"
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 border-l-4 border-amber-600 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
              <strong>Limitações da estimativa.</strong> Esta é uma estimativa —
              o valor definitivo depende de análise documental, enquadramento
              correto e validação no CNO e no SERO.
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-white py-16">
        <div className="site-container">
          <p className="editorial-label">Entenda o cálculo</p>
          <h2 className="editorial-title mt-4">
            Fatores que influenciam o resultado
          </h2>
          <div className="mt-8 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">
            {factors.map(([name, explanation]) => (
              <article key={name} className="bg-page p-6">
                <h3 className="font-extrabold text-text">{name}</h3>
                <p className="mt-3 text-sm leading-6 text-brandMuted">
                  {explanation}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {faq.length ? (
        <section
          className="border-b border-border bg-page py-16"
          aria-labelledby="faq-calculadora"
        >
          <div className="site-container max-w-4xl">
            <p className="editorial-label">Tire suas dúvidas</p>
            <h2 id="faq-calculadora" className="editorial-title mt-4">
              Perguntas frequentes
            </h2>
            <div className="mt-8 space-y-3">
              {faq.map((item) => (
                <details
                  key={item.id}
                  className="border border-border bg-white p-5"
                >
                  <summary className="cursor-pointer font-bold text-text">
                    {item.pergunta}
                  </summary>
                  <p className="mt-3 whitespace-pre-line leading-7 text-brandMuted">
                    {item.resposta}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-b border-border bg-white py-16">
        <div className="site-container">
          <h2 className="editorial-title">Aprofunde o tema</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {[
              [
                "Como regularizar o INSS da obra",
                "/artigos/artigo-regularizar-inss-obra",
              ],
              [
                "Como funciona a aferição indireta",
                "/artigos/afericao-indireta-receita",
              ],
              [
                "Documentos para regularização",
                "/artigos/documentos-regularizacao-obra",
              ],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="border border-border p-5 font-bold text-primary hover:bg-page hover:no-underline"
              >
                {label} →
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary py-16 text-white">
        <div className="site-container flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-white/70">
              Análise especializada
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-[-.035em] sm:text-4xl">
              Quer confirmar a economia possível na sua obra?
            </h2>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-14 shrink-0 items-center justify-center bg-white px-7 font-bold text-primary hover:no-underline"
          >
            Fale conosco pelo WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
