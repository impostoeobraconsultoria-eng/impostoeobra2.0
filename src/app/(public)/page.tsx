import type { Metadata } from "next";
import Link from "next/link";

import { CalculadoraInss } from "@/components/calculadora/calculadora-inss";
import { CasesSection } from "@/components/public/cases-section";
import { getWhatsappNumber, getWhatsappUrl } from "@/lib/config";
import { getSiteConfig } from "@/lib/site-config";
import { getDiagnosticoHabilitado } from "@/lib/diagnostico/config";
import { TrackedPublicAnchor } from "@/components/analytics/tracked-anchor";
import { JsonLd } from "@/components/seo/json-ld";
import { getSeoConfig } from "@/lib/seo/config";
import { pageMetadata } from "@/lib/seo/metadata";
import { getSchemaLocalBusiness } from "@/lib/seo/schema";
import { getCachedVau } from "@/lib/vau";

const homeDescription =
  "Consultoria para pessoas físicas: regularize o INSS da obra, confira reduções legais e avance até a emissão da CND.";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await getSeoConfig(), {
    title: "Regularize sua obra e economize INSS",
    description: homeDescription,
    canonical: "/",
  });
}

export default async function Home() {
  const config = await getSiteConfig();
  const [whatsappUrl, whatsappNumber, diagnosticoEnabled, seo, vauRows] = await Promise.all([
    getWhatsappUrl(config.whatsapp_msg_padrao),
    getWhatsappNumber(),
    getDiagnosticoHabilitado(),
    getSeoConfig(),
    getCachedVau().catch(() => []),
  ]);
  const vauVigencia = formatVigencia(
    vauRows.find((row) => row.vigencia)?.vigencia ?? null,
  );
  const heroExampleDescription = config.hero_exemplo_descricao
    .replace(/\s*Simulação com VAU.+$/i, "")
    .trim();

  return (
    <main>
      <JsonLd data={getSchemaLocalBusiness(seo)} />

      <section className="border-b border-border bg-page">
        <div className="site-container grid min-h-[690px] lg:grid-cols-12">
          <div className="flex flex-col justify-center border-border py-16 lg:col-span-7 lg:border-r lg:py-24 lg:pr-16">
            <p className="editorial-label">
              Consultoria tributária especializada
            </p>
            <h1 className="mt-6 max-w-4xl text-[44px] font-extrabold leading-[.98] tracking-[-.055em] text-text sm:text-[58px] lg:text-[70px]">
              Regularize o INSS da sua obra no CPF e avance até a CND.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-brandMuted sm:text-xl">
              Conferimos CNO, SERO, documentos e reduções aplicáveis para você
              pagar apenas o que a lei exige e concluir a regularização.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a className="btn-primary" href="#calculadora">
                Simular gratuitamente
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-brandMuted">
              <span>Exclusivo para obras de pessoa física</span>
              <span>Análise individual</span>
              <span>Atendimento nacional</span>
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
                  Com nosso diagnóstico
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
              {heroExampleDescription}
              {vauVigencia ? ` Simulação com VAU de ${vauVigencia}.` : ""}
            </p>
          </aside>
        </div>
      </section>

      <span id="calc" className="block scroll-mt-24" aria-hidden="true" />
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

      <section className="border-b border-border bg-page py-20">
        <div className="site-container grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="editorial-label">Aviso da Receita Federal</p>
            <h2 className="editorial-title mt-5">
              Recebeu um aviso para regularizar a obra?
            </h2>
          </div>
          <div className="lg:col-span-7 lg:border-l lg:border-border lg:pl-14">
            <p className="max-w-2xl text-lg leading-8 text-brandMuted">
              Antes de concluir o SERO ou aceitar o primeiro valor apurado,
              confira o CNO, as áreas, as datas e os documentos da obra. Mesmo
              com o prazo correndo ou já vencido, a situação precisa ser
              analisada individualmente antes da regularização.
            </p>
            <Link
              className="mt-8 inline-flex border-b-2 border-primary pb-1 font-bold text-primary"
              href="/artigos/aviso-regularizacao-obra-receita-federal"
            >
              Entender o aviso e os próximos passos →
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-white py-20">
        <div className="site-container">
          <p className="editorial-label">Da simulação à certidão</p>
          <h2 className="editorial-title mt-5">O caminho até a CND</h2>
          <div className="mt-9 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["1", "Diagnóstico", "Conferimos a situação da obra e os documentos disponíveis."],
              ["2", "CNO e enquadramento", "Revisamos cadastro, áreas, destinação e período da construção."],
              ["3", "Cálculo no SERO", "Aplicamos os parâmetros e reduções admitidos para o caso."],
              ["4", "DCTFWeb", "Orientamos a transmissão e a emissão do DARF aplicável."],
              ["5", "Regularização", "Acompanhamos o pagamento ou parcelamento, quando necessário."],
              ["6", "Emissão da CND", "Concluímos o processo com a certidão da obra regularizada."],
            ].map(([number, name, explanation]) => (
              <article key={number} className="bg-page p-6">
                <span className="text-sm font-extrabold text-accent">{number}</span>
                <h3 className="mt-3 font-extrabold text-text">{name}</h3>
                <p className="mt-3 text-sm leading-6 text-brandMuted">
                  {explanation}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-16 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="editorial-label">Análise individual</p>
              <h2 className="editorial-title mt-5">
                O que pode alterar o valor?
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
              {[
                ["Área equivalente", "A natureza e as áreas da obra mudam a base utilizada no cálculo."],
                ["Fator social", "Obras de pessoa física podem ter percentuais próprios conforme a área."],
                ["Concreto e pré-moldados", "Notas fiscais podem gerar reduções quando cumprem os requisitos."],
                ["Contribuições anteriores", "Valores já declarados podem ser considerados após conferência."],
                ["Data da obra", "Períodos antigos exigem análise documental e das regras de decadência."],
                ["Enquadramento correto", "Erros no CNO ou na classificação podem aumentar a apuração."],
              ].map(([name, explanation]) => (
                <article key={name} className="border border-border p-5">
                  <h3 className="font-extrabold text-text">{name}</h3>
                  <p className="mt-2 text-sm leading-6 text-brandMuted">
                    {explanation}
                  </p>
                </article>
              ))}
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
            <TrackedPublicAnchor
              kind="whatsapp"
              origem="home_cta_final"
              className="inline-flex min-h-14 items-center justify-center bg-white px-7 font-bold text-primary"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Falar no WhatsApp
            </TrackedPublicAnchor>
          </div>
        </div>
      </section>
    </main>
  );
}


function formatVigencia(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
