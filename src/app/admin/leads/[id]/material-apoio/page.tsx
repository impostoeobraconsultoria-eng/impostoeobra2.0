import { notFound } from "next/navigation";
import Image from "next/image";

import { MaterialSupportToolbar } from "@/components/admin/material-support-toolbar";
import { getConfigMap, money } from "@/lib/documentos";
import {
  calculateMaterialSupport,
  isMultaStatus,
  isObraStatus,
  PARCELAMENTO_PF,
} from "@/lib/material-support";
import { createClient } from "@/lib/supabase/server";
import styles from "./material-apoio.module.css";

type Props = {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
};

function numberParam(value: string | string[] | undefined, fallback: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed =
    raw == null || raw === "" ? Number(fallback ?? 0) : Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export default async function MaterialApoioPage({
  params,
  searchParams,
}: Props) {
  const { data: lead } = await createClient()
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!lead) notFound();
  const config = await getConfigMap();
  const areaConstrucao = numberParam(
    searchParams.area_construcao,
    lead.area_total ?? lead.a_construcao,
  );
  const areaPiscina = numberParam(
    searchParams.area_piscina,
    Number(lead.a_pcoberta ?? 0) + Number(lead.a_pdescoberta ?? 0),
  );
  const impostoDireto = numberParam(
    searchParams.imposto_direto,
    lead.inss_direto,
  );
  const impostoReduzido = numberParam(
    searchParams.imposto_reduzido,
    lead.inss_reduzido,
  );
  const rawMultaStatus = Array.isArray(searchParams.multa_status)
    ? searchParams.multa_status[0]
    : searchParams.multa_status;
  const multaStatus = isMultaStatus(rawMultaStatus)
    ? rawMultaStatus
    : "nao_apuradas";
  const multas = numberParam(searchParams.multas, 0);
  const rawObraStatus = Array.isArray(searchParams.obra_status)
    ? searchParams.obra_status[0]
    : searchParams.obra_status;
  const obraStatus = isObraStatus(rawObraStatus) ? rawObraStatus : "concluida";
  const calculo = calculateMaterialSupport({
    impostoDireto,
    impostoReduzido,
    multaStatus,
    multasInformadas: multas,
  });
  const { economia, economiaPct } = calculo;
  const circumference = 238.76;
  const fill = (circumference * economiaPct) / 100;
  const cliente = String(searchParams.cliente ?? lead.nome);
  const snapshot = {
    cliente,
    area_construcao: areaConstrucao,
    imposto_direto: impostoDireto,
    imposto_reduzido: impostoReduzido,
    multa_status: multaStatus,
    multas: calculo.multasIdentificadas,
    obra_status: obraStatus,
    multa_mora_parcelamento: Number(calculo.multaMoraParcelamento.toFixed(2)),
    parcelas: calculo.parcelas,
    area_piscina: areaPiscina,
    economia_pct: Number(economiaPct.toFixed(2)),
  };
  const multaLabel =
    multaStatus === "identificadas"
      ? money(calculo.multasIdentificadas)
      : multaStatus === "nao_identificadas"
        ? "não identificadas"
        : "sujeitas à apuração";

  return (
    <main className={styles.page}>
      <MaterialSupportToolbar
        leadId={lead.id}
        params={snapshot}
        autoPrint={searchParams.print === "1"}
      />
      <article className={styles.sheet}>
        <section className={styles.info}>
          <div className={styles.logo}>
            <Image
              src="/logo/logo-horizontal.svg"
              alt="Imposto & Obra Consultoria"
              width={190}
              height={52}
              priority
            />
          </div>
          <div>
            <h1 className={styles.infoTitle}>INFORMAÇÕES DA OBRA</h1>
            <div className={styles.infoList}>
              <p>
                Cliente: <strong>{cliente}</strong>
              </p>
              <p>
                Responsável: <strong>{lead.resp || "—"}</strong>
              </p>
              <p>
                Destinação: <strong>{lead.dest || "—"}</strong>
              </p>
              <p>
                Tipo de obra: <strong>{lead.tipo || "—"}</strong>
              </p>
              <p>
                Concreto usinado: <strong>{lead.concreto || "—"}</strong>
              </p>
              <p>
                Situação da obra:{" "}
                <strong>
                  {obraStatus === "em_andamento" ? "Em andamento" : "Concluída"}
                </strong>
              </p>
              <p>
                Área total de construção:{" "}
                <strong>{areaConstrucao.toLocaleString("pt-BR")} m²</strong>
              </p>
              {areaPiscina > 0 && (
                <p>
                  Área de piscina:{" "}
                  <strong>{areaPiscina.toLocaleString("pt-BR")} m²</strong>
                </p>
              )}
            </div>
          </div>
          <div className={styles.values}>
            <div className={styles.blueBox}>
              <span className={styles.boxLabel}>IMPOSTO CHEIO</span>
              <strong className={styles.boxValue}>
                {money(impostoDireto)}
              </strong>
            </div>
            <div className={styles.yellowBox}>
              <div className={styles.boxLabel}>IMPOSTO REDUZIDO</div>
              <strong className={styles.boxValue}>
                {money(impostoReduzido)}
              </strong>
            </div>
            <div className={`${styles.yellowBox} ${styles.fineBox}`}>
              multas <strong>{multaLabel}</strong>
            </div>
          </div>
          <div className={styles.total}>
            <span>TOTAL À VISTA</span>
            <strong>{money(calculo.totalAVista)}</strong>
          </div>
          <p className={styles.installments}>
            cenário parcelado: {calculo.parcelas}x de{" "}
            {money(calculo.valorParcela)}
          </p>
          <div className={styles.conditions}>
            <strong>Condições para o benefício do Imposto Reduzido</strong>
            <ul>
              <li>Obra de pessoa física</li>
              <li>Recolhimento contínuo no período da obra</li>
              <li>Atingir mínimo necessário de 50% a 70% da RMT</li>
            </ul>
          </div>
        </section>
        <section className={styles.center}>
          <p className={styles.kicker}>PLANEJAMENTO TRIBUTÁRIO</p>
          <h2 className={styles.centerTitle}>
            Pague o justo. Regularize com segurança.
          </h2>
          <p className={styles.centerText}>
            Aplicamos as reduções previstas na legislação para encontrar o
            cenário mais eficiente para sua obra.
          </p>
          <div className={styles.savingCard}>
            <span>ECONOMIA ESTIMADA</span>
            <strong>{money(economia)}</strong>
          </div>
          <div className={styles.scenarios}>
            <div className={styles.scenarioCard}>
              <span>PAGAMENTO À VISTA</span>
              <strong>{money(calculo.totalAVista)}</strong>
              <small>Principal e multas identificadas, se houver.</small>
            </div>
            <div className={styles.scenarioCard}>
              <span>PAGAMENTO PARCELADO</span>
              <strong>
                {calculo.parcelas}x de {money(calculo.valorParcela)}
              </strong>
              <small>
                Total estimado {money(calculo.totalParcelado)}, incluindo multa
                de mora de 20% ({money(calculo.multaMoraParcelamento)}).
              </small>
            </div>
            <div className={styles.scenarioCard}>
              <span>OBRA EM ANDAMENTO</span>
              <strong>{money(impostoReduzido)}</strong>
              <small>
                Estimativa atual do principal. O valor final depende da aferição
                e dos créditos comprovados até a conclusão.
              </small>
            </div>
          </div>
          <p className={styles.legalNote}>
            Parcelamento disponível após o vencimento. Estimativa para pessoa
            física: até {PARCELAMENTO_PF.maxParcelas} parcelas, com parcela
            mínima de {money(PARCELAMENTO_PF.parcelaMinima)}. Juros Selic e
            consolidação final não incluídos.
          </p>
        </section>
        <section className={styles.panel}>
          <svg
            className={styles.donut}
            viewBox="0 0 100 100"
            aria-label={`${economiaPct.toFixed(0)}% de economia estimada`}
          >
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="#fff"
              strokeWidth="16"
            />
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="#FFD439"
              strokeWidth="16"
              strokeDasharray={`${fill} ${circumference - fill}`}
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="47" className={styles.donutBig}>
              {economiaPct.toFixed(0)}%
            </text>
            <text x="50" y="59" className={styles.donutSmall}>
              de economia
            </text>
            <text x="50" y="68" className={styles.donutSmall}>
              estimada
            </text>
          </svg>
          <p className={styles.panelText}>
            Aplicamos as reduções legalmente previstas, considerando as
            características da obra e a forma de contratação da mão de obra.
          </p>
          <p className={styles.highlight}>
            Te ajudamos a pagar o INSS com o<br />
            MÁXIMO de redução legal
          </p>
          <div className={styles.contact}>
            <h2>FALE CONOSCO</h2>
            <p>@ {config.empresa_email || "—"}</p>
            <p>W {config.empresa_whatsapp_display || "—"}</p>
            <p>{config.empresa_endereco_completo || "—"}</p>
          </div>
        </section>
      </article>
    </main>
  );
}
