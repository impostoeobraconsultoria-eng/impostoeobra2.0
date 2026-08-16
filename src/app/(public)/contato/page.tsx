import type { Metadata } from "next";
import Link from "next/link";
import {
  FinalCta,
  InstitutionalPage,
} from "@/components/public/institutional-page";
import { getWhatsappUrl } from "@/lib/config";
import { getSiteConfig } from "@/lib/site-config";

const description =
  "Fale com a Imposto & Obra Consultoria. Atendimento online em todo o Brasil para regularização e redução do INSS de obras.";
export const metadata: Metadata = {
  title: "Contato",
  description,
  alternates: { canonical: "/contato" },
  openGraph: {
    title: "Contato | Imposto & Obra Consultoria",
    description,
    url: "/contato",
  },
};

export default async function ContatoPage() {
  const config = await getSiteConfig();
  const whatsappUrl = await getWhatsappUrl(config.whatsapp_msg_padrao);
  const schedule = [
    config.horario_atendimento_dias,
    config.horario_atendimento_horas,
    config.horario_atendimento_fuso,
  ];
  const contacts = [
    [
      "WhatsApp",
      config.empresa_telefone_institucional,
      whatsappUrl,
      "Canal mais rápido. Resposta em horário comercial.",
    ],
    [
      "E-mail",
      config.empresa_email,
      `mailto:${config.empresa_email}`,
      "Para envio de documentação ou consultas detalhadas.",
    ],
    [
      "Telefone",
      config.empresa_telefone_institucional,
      `tel:${config.empresa_telefone_institucional.replace(/\D/g, "")}`,
      "Para chamadas durante o horário comercial.",
    ],
    ...(schedule.every((value) => !value)
      ? []
      : [
          [
            "Horário de atendimento",
            schedule[0],
            "",
            [schedule[1], schedule[2]].filter(Boolean).join(" · "),
          ],
        ]),
  ];
  return (
    <InstitutionalPage
      eyebrow="Contato · Atualizado em 28 de maio de 2026"
      title="Fale com a Imposto & Obra"
    >
      <p className="lead">
        Nosso atendimento é 100% online, com cobertura nacional. O caminho mais
        rápido é fazer a{" "}
        <Link href="/#calculadora">simulação do INSS da sua obra</Link> — em 2
        minutos você recebe uma estimativa e, em até 24 horas, nossa equipe
        entra em contato.
      </p>
      <div className="my-7 grid gap-4 sm:grid-cols-2">
        {contacts.map(([title, value, href, note]) => (
          <section
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            key={title}
          >
            <h2 className="!m-0 !text-lg">{title}</h2>
            <p className="mt-2 break-words font-semibold text-primary">
              {href ? (
                <a
                  href={href}
                  rel={
                    href.startsWith("http") ? "noopener noreferrer" : undefined
                  }
                  target={href.startsWith("http") ? "_blank" : undefined}
                >
                  {value}
                </a>
              ) : (
                value
              )}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {note}
            </p>
          </section>
        ))}
      </div>
      <h2>Dados oficiais da empresa</h2>
      <ul>
        <li>
          <strong>Razão social:</strong> Imposto & Obra Consultoria
        </li>
        <li>
          <strong>CNPJ:</strong> 63.382.260/0001-99
        </li>
        <li>
          <strong>Sede:</strong> Brasília — Distrito Federal — Brasil
        </li>
        <li>
          <strong>Fundada em:</strong> 27 de outubro de 2025
        </li>
        <li>
          <strong>Forma de atendimento:</strong> 100% remoto, com cobertura
          nacional
        </li>
      </ul>
      <h2>Como iniciamos um atendimento</h2>
      <ol>
        <li>
          Você faz a{" "}
          <Link href="/#calculadora">simulação do INSS da sua obra</Link> no
          site.
        </li>
        <li>
          Em até 24 horas, um consultor entra em contato pelo canal cadastrado.
        </li>
        <li>
          Após a análise documental, enviamos a proposta com a estimativa de
          redução possível.
        </li>
        <li>
          Com a proposta aceita, conduzimos o processo até a entrega da CND.
        </li>
      </ol>
      <p className="rounded-xl bg-slate-50 px-5 py-4 text-[15px]">
        Conheça também: <Link href="/sobre">a equipe</Link>,{" "}
        <Link href="/guia-inss-de-obra">o guia completo</Link> e{" "}
        <Link href="/artigos">nossos artigos</Link>.
      </p>
      <FinalCta
        title="Quer reduzir o INSS da sua obra?"
        highlight="Nossa equipe especializada está pronta para ajudar."
        description="Tire suas dúvidas diretamente pelo WhatsApp."
        href={whatsappUrl}
        label="Fale conosco"
        external
      />
    </InstitutionalPage>
  );
}
