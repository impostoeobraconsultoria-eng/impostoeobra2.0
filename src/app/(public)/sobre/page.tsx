import type { Metadata } from "next";
import Link from "next/link";

import {
  FinalCta,
  InstitutionalPage,
} from "@/components/public/institutional-page";
import { createPublicClient } from "@/lib/supabase/public";

const description =
  "Consultoria tributária especializada em INSS de construção civil, com equipe jurídica e atendimento 100% online em todo o Brasil.";

export const metadata: Metadata = {
  title: "Sobre a Imposto & Obra Consultoria",
  description,
  alternates: { canonical: "/sobre" },
  openGraph: {
    title: "Sobre a Imposto & Obra Consultoria",
    description,
    url: "/sobre",
  },
};

export default async function SobrePage() {
  const { data: team } = await createPublicClient()
    .from("equipe_juridica")
    .select("id,nome,oab,papel,descricao,foto_url")
    .eq("publicado", true)
    .order("ordem");
  return (
    <InstitutionalPage
      eyebrow="Sobre nós · Atualizado em 28 de maio de 2026"
      title="A Imposto & Obra Consultoria"
    >
      <p className="lead">
        Somos uma consultoria tributária especializada em{" "}
        <strong>
          regularização de obras e redução do INSS de construção civil
        </strong>
        . Atuamos em todo o Brasil de forma 100% remota, atendendo proprietários
        pessoa física, condomínios e construtoras que precisam regularizar obras
        perante a Receita Federal — pagando exatamente o que é justo, com todas
        as reduções legais aplicadas.
      </p>
      <div className="my-6 rounded-lg border-l-4 border-amber-700 bg-orange-50 px-5 py-4 text-[15px] leading-relaxed text-slate-900">
        <strong className="!text-amber-700">
          Por que uma consultoria especializada importa.
        </strong>{" "}
        O INSS de obra é calculado pelo SERO com base em parâmetros técnicos da
        IN RFB nº 2.021/2021. A aplicação correta do Fator de Ajuste, da
        decadência parcial e da dedução por materiais industrializados reduz o
        valor cobrado em 40% a 70% em casos típicos. É matéria tributária —
        deixar com quem entende é o que separa pagar o devido de pagar valor
        inflado.
      </div>

      <h2>O que fazemos</h2>
      <ul>
        <li>
          <strong>Diagnóstico tributário</strong> da obra — análise documental,
          identificação do método de aferição correto e simulação do INSS
          efetivo.
        </li>
        <li>
          <strong>Cadastro e correção de CNO</strong> — inscrição inicial ou
          atualização do Cadastro Nacional de Obras.
        </li>
        <li>
          <strong>Condução completa do SERO</strong> — operação do serviço de
          ponta a ponta, com aplicação do Fator de Ajuste e demais deduções
          legais.
        </li>
        <li>
          <strong>Resposta a Aviso de Regularização de Obra (ARO)</strong> —
          análise, estratégia de resposta e eventual impugnação administrativa.
        </li>
        <li>
          <strong>Parcelamento e emissão da CND</strong> — orientação e
          acompanhamento até a Certidão Negativa de Débitos.
        </li>
        <li>
          <strong>Suporte para averbação em cartório</strong> — checklist
          documental para o registro do imóvel.
        </li>
      </ul>

      <h2>Nossa equipe jurídica</h2>
      <p>
        A consultoria é conduzida por advogados tributaristas com experiência em
        direito previdenciário aplicado à construção civil.
      </p>
      <div className="my-6 grid gap-5 sm:grid-cols-2">
        {(team ?? []).map((member) => (
          <section className="rounded-xl border-l-4 border-primary bg-slate-50 p-6" key={member.id}>
            <div className="flex items-start gap-4">
              {member.foto_url && (
                <div
                  role="img"
                  aria-label={`Foto de ${member.nome}`}
                  className="size-16 shrink-0 rounded-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${member.foto_url})` }}
                />
              )}
              <div>
                <h3 className="!m-0 !text-lg">{member.nome}</h3>
                <p className="mt-1 text-sm font-semibold text-primary">{member.papel}</p>
                {member.oab && <p className="mt-1 text-sm text-slate-500"><strong>{member.oab}</strong></p>}
              </div>
            </div>
            {member.descricao && <p className="mt-3 text-sm leading-relaxed text-slate-700">{member.descricao}</p>}
          </section>
        ))}
      </div>

      <h2>Como atendemos</h2>
      <p>
        Nosso atendimento é <strong>100% online</strong>, com cobertura
        nacional. O processo é estruturado em quatro etapas:
      </p>
      <ol>
        <li>
          <strong>Simulação inicial</strong> pela calculadora do site, com
          parâmetros oficiais da Receita Federal.
        </li>
        <li>
          <strong>Diagnóstico personalizado em até 24 horas</strong>, com
          análise do caso, proposta e estimativa de redução.
        </li>
        <li>
          <strong>Execução do trabalho</strong>, da coleta documental e operação
          do SERO até o acompanhamento da CND.
        </li>
        <li>
          <strong>Entrega da CND</strong> e orientação para averbação no
          registro de imóveis.
        </li>
      </ol>

      <h2>Resultados</h2>
      <p>
        Já realizamos <strong>mais de 200 regularizações de obras</strong> em
        todo o Brasil, com redução média do valor presumido pelo SERO entre 40%
        e 70% — em casos com decadência parcial reconhecida, chegando a 90%.
        Cada caso é individual; resultados anteriores não constituem garantia de
        resultado futuro.
      </p>

      <h2>Por que escolher a Imposto & Obra</h2>
      <ul>
        <li>
          <strong>Time jurídico tributário especializado</strong> em construção
          civil.
        </li>
        <li>
          <strong>Atendimento 100% online</strong>, com cobertura nacional.
        </li>
        <li>
          <strong>Resposta em até 24 horas</strong> após a simulação inicial.
        </li>
        <li>
          <strong>Aplicação rigorosa das reduções legais</strong> previstas na
          IN RFB nº 2.021/2021.
        </li>
        <li>
          <strong>Estratégia documentada e transparente</strong> em todas as
          etapas.
        </li>
      </ul>

      <FinalCta
        title="Quer entender quanto você realmente deve pagar?"
        highlight="Simule o INSS da sua obra em 2 minutos."
        description="Diagnóstico jurídico em 24h, sem compromisso."
        href="/#calculadora"
        label="Simular agora"
      />
      <p className="rounded-xl bg-slate-50 px-5 py-4 text-[15px]">
        Conheça também: <Link href="/contato">página de contato</Link>,{" "}
        <Link href="/guia-inss-de-obra">guia completo do INSS de obra</Link> e{" "}
        <Link href="/artigos">nossos artigos</Link>.
      </p>
    </InstitutionalPage>
  );
}
