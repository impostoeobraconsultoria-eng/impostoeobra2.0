import { notFound } from "next/navigation";

import { MaterialSupportToolbar } from "@/components/admin/material-support-toolbar";
import { getConfigMap, money } from "@/lib/documentos";
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
  const multas = numberParam(searchParams.multas, 0);
  const parcelas = Math.max(
    1,
    Math.round(numberParam(searchParams.parcelas, 5)),
  );
  const total = impostoReduzido + multas;
  const economia = Math.max(0, impostoDireto - impostoReduzido);
  const economiaPct =
    impostoDireto > 0 ? Math.min(100, (economia / impostoDireto) * 100) : 0;
  const circumference = 238.76;
  const fill = (circumference * economiaPct) / 100;
  const cliente = String(searchParams.cliente ?? lead.nome);
  const snapshot = {
    cliente,
    area_construcao: areaConstrucao,
    imposto_direto: impostoDireto,
    imposto_reduzido: impostoReduzido,
    multas,
    parcelas,
    area_piscina: areaPiscina,
    economia_pct: Number(economiaPct.toFixed(2)),
  };

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
            <div className={styles.mark}>I&amp;O</div>
            <div className={styles.brand}>
              Imposto
              <br />
              &amp; Obra
              <small>CONSULTORIA</small>
            </div>
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
              multas <strong>{money(multas)}</strong>
            </div>
          </div>
          <div className={styles.total}>
            <span>TOTAL</span>
            <strong>{money(total)}</strong>
          </div>
          <p className={styles.installments}>
            parcelamento em até {parcelas}x de {money(total / parcelas)}
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
          <div className={styles.badge}>CÁLCULO DE INSS DE OBRA</div>
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
            <text x="50" y="50" className={styles.donutBig}>
              {economiaPct.toFixed(0)}%
            </text>
            <text x="50" y="62" className={styles.donutSmall}>
              de economia
            </text>
            <text x="50" y="72" className={styles.donutSmall}>
              estimada
            </text>
          </svg>
          <p className={styles.panelText}>
            Para obter o imposto reduzido, você não precisa registrar
            funcionário na carteira, pois não requer vínculo empregatício.
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
