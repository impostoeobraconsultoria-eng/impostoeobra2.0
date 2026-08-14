import type { Metadata } from "next";
import { CalculadoraInss } from "@/components/calculadora/calculadora-inss";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Regularize sua obra e economize INSS",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main>
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
      <section className="bg-primary py-10 text-white">
        <div className="site-container grid gap-8 text-center sm:grid-cols-3">
          <Stat value="R$ 1,5 mi+" label="em impostos reduzidos" />
          <Stat value="5 dias" label="prazo médio de regularização" />
          <Stat value="100%" label="atendimento especializado" />
        </div>
      </section>
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
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-3xl font-extrabold">{value}</p>
      <p className="mt-1 text-sm text-white/80">{label}</p>
    </div>
  );
}
