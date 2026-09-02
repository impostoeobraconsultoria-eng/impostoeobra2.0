import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";

import { CORES, styles } from "@/lib/diagnostico/pdf/tema";
import type { DiagnosticoDocumento } from "@/lib/diagnostico/types";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const shortDate = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

export function DiagnosticoPreliminar({
  lead,
  config,
  variante,
  numeroPublico,
  dataGeracao,
}: DiagnosticoDocumento) {
  const direto = n(lead.inss_direto);
  const reduzido = n(lead.inss_reduzido);
  const economia = Math.max(0, n(lead.economia));
  const economiaPct = direto > 0 ? Math.min(100, (economia / direto) * 100) : 0;
  const withReduction = variante === "com_reducao";
  const accent = withReduction ? CORES.verdeSucesso : CORES.amareloAtencao;
  const background = withReduction ? CORES.verdeFundo : CORES.amareloFundo;
  const place =
    [lead.cidade, lead.uf].filter(Boolean).join(" / ") || "Não informado";

  return (
    <Document
      title={config.titulo}
      author={config.assinaturaLinha1}
      subject={config.disclaimer}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Imposto &amp; Obra</Text>
            <Text style={styles.brandSub}>{config.subtituloMarca}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaNumber}>Nº {numeroPublico}</Text>
            <Text>Emitido em {shortDate.format(dataGeracao)}</Text>
          </View>
        </View>
        <Text style={styles.title}>{config.titulo}</Text>
        <Text style={styles.reference}>
          Referência: {lead.nome} · {place}
        </Text>

        <View
          style={[
            styles.hero,
            { backgroundColor: background, borderLeftColor: accent },
          ]}
        >
          <View style={[styles.heroIcon, { color: accent }]}>
            <Text>{withReduction ? "$" : "!"}</Text>
          </View>
          <View style={styles.heroContent}>
            <Text
              style={[
                styles.heroLabel,
                { color: withReduction ? CORES.verdeEscuro : accent },
              ]}
            >
              {withReduction
                ? "Sua economia potencial estimada"
                : "Análise preliminar"}
            </Text>
            <Text
              style={[
                styles.heroValue,
                { color: accent, fontSize: withReduction ? 27 : 19.5 },
              ]}
            >
              {withReduction
                ? money.format(economia)
                : "Sem redução identificada"}
            </Text>
            <Text style={styles.heroSub}>
              {withReduction
                ? `Redução de ${decimal.format(economiaPct)}% sobre o INSS apurado - de ${money.format(direto)} para ${money.format(reduzido)}`
                : `Valor apurado: ${money.format(direto)} · Regularização continua sendo obrigatória`}
            </Text>
          </View>
        </View>

        {withReduction ? (
          <View>
            <View style={styles.progressHeader}>
              <Text>INSS apurado</Text>
              <Text>Economia potencial: {decimal.format(economiaPct)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${economiaPct}%` }]}
              />
            </View>
            <View style={styles.progressLegend}>
              <Text>R$ 0</Text>
              <Text>{money.format(direto)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.alert}>
            <View style={styles.alertIcon}>
              <Text>!</Text>
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                Sua obra ainda precisa ser regularizada
              </Text>
              <Text style={styles.alertText}>
                Independentemente da redução, o INSS de {money.format(direto)}{" "}
                precisa ser recolhido para emissão da CND, averbação da
                construção, transferência ou financiamento do imóvel.
              </Text>
            </View>
          </View>
        )}

        <SectionTitle>Identificação da obra</SectionTitle>
        <View style={styles.dataGrid}>
          <Data label="Localização" value={place} />
          <Data label="Destinação" value={lead.dest} />
          <Data label="Categoria" value={lead.categoria} />
          <Data
            label="Área principal"
            value={`${decimal.format(n(lead.area_total))} m²`}
          />
          <Data
            label="Área equivalente"
            value={`${decimal.format(n(lead.area_total_calculo))} m²`}
          />
          <Data label="Concreto usinado" value={lead.concreto} />
          <Data label="Pré-fabricados" value={lead.prefab} />
          <Data
            label="VAU / UF"
            value={`${money.format(n(lead.vau))} (${lead.uf || "-"})`}
          />
          <Data
            label="Alíquota INSS"
            value={`${decimal.format(n(lead.aliquota_pct))}%`}
          />
        </View>

        {withReduction ? (
          <>
            <SectionTitle>Base de cálculo aplicada</SectionTitle>
            <View style={styles.chips}>
              <Chip label="VAU" value={`${money.format(n(lead.vau))} / m²`} />
              <Chip
                label="CO (custo operacional)"
                value={money.format(n(lead.co))}
              />
              <Chip
                label="RMT (mão de obra)"
                value={money.format(n(lead.rmt))}
              />
              <Chip
                label="Alíquota INSS"
                value={`${decimal.format(n(lead.aliquota_pct))}%`}
              />
              <Chip
                label="Fator social"
                value={`${decimal.format(n(lead.fator_social_pct))}%`}
              />
            </View>
            <SectionTitle>Análise técnica preliminar</SectionTitle>
            <Text style={styles.paragraph}>
              A obra classifica-se como {lower(lead.categoria)} de{" "}
              {lower(lead.dest)} em {lead.uf || "UF não informada"}. Aplicando o
              VAU vigente, o INSS pela metodologia direta seria de{" "}
              {money.format(direto)}. Os dados declarados habilitam redução
              estimada de {decimal.format(economiaPct)}%, sujeita à confirmação
              documental e à aferição definitiva no SERO/DCTFWeb.
            </Text>
            <SectionTitle>Próximos passos</SectionTitle>
            <Checklist
              first={[
                "Verificação do CNO / matrícula CEI",
                "Notas fiscais de materiais e serviços",
                "Confirmação de destinação e área efetiva",
              ]}
              second={[
                "Análise do alvará e habite-se",
                "Recolhimentos anteriores (GFIP, eSocial, GPS)",
                "Revisão do regime de contratação da mão de obra",
              ]}
            />
          </>
        ) : (
          <>
            <SectionTitle>Por que não foi identificada redução</SectionTitle>
            <View style={styles.reasonRow}>
              <Reason
                title="Sem materiais dedutíveis"
                text="Os principais materiais habilitadores de redução não foram informados."
              />
              <Reason
                title='Categoria "reforma"'
                text="Reformas têm tratamento específico e potencial de redução geralmente menor."
              />
              <Reason
                title="Área reduzida"
                text="Obras menores têm INSS absoluto mais baixo, reduzindo o impacto das deduções."
              />
            </View>
            <SectionTitle>O simulador pode ter subestimado</SectionTitle>
            <Text style={styles.paragraph}>
              O simulador considera apenas as informações preenchidas. Uma
              análise documental completa pode identificar redutores adicionais:
            </Text>
            <Checklist
              first={[
                "Regime de contratação da mão de obra",
                "Decadência de períodos",
                "Reclassificação de destinação ou categoria",
              ]}
              second={[
                "Aferição parcial em regimes distintos",
                "Notas fiscais de materiais não citados",
                "Aplicação de fator social específico",
              ]}
            />
          </>
        )}

        <View style={styles.contact}>
          <Text style={styles.contactMessage}>
            {withReduction
              ? "Fale com a Imposto & Obra - nossa equipe conduz o processo até a emissão da CND."
              : "Vamos analisar juntos. Conduzimos a regularização até a emissão da CND."}
          </Text>
          <Text style={styles.contactValue}>
            {config.whatsappDisplay} · E-mail
          </Text>
        </View>
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerBrand}>{config.assinaturaLinha1}</Text>
            <Text>{config.assinaturaLinha2}</Text>
          </View>
          <View style={styles.footerRight}>
            <Text>Documento gerado eletronicamente</Text>
            <Text>Válido para consulta preliminar</Text>
          </View>
        </View>
        <Text style={styles.disclaimer}>{config.disclaimer}</Text>
      </Page>
    </Document>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionMark} />
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  );
}
function Data({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.dataItem}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text>{value || "Não informado"}</Text>
    </View>
  );
}
function Chip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}
function Reason({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.reasonCard}>
      <Text style={styles.reasonTitle}>{title}</Text>
      <Text style={styles.reasonText}>{text}</Text>
    </View>
  );
}
function Checklist({ first, second }: { first: string[]; second: string[] }) {
  return (
    <View style={styles.checklist}>
      <View style={styles.checklistColumn}>
        {first.map((text) => (
          <Bullet key={text} text={text} />
        ))}
      </View>
      <View style={styles.checklistColumn}>
        {second.map((text) => (
          <Bullet key={text} text={text} />
        ))}
      </View>
    </View>
  );
}
function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletMark} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}
function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function lower(value?: string | null) {
  return value?.trim().toLocaleLowerCase("pt-BR") || "obra informada";
}
