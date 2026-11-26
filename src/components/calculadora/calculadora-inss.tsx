"use client";

import { useEffect, useMemo, useState } from "react";
import { BrazilianPhoneInput } from "@/components/ui/brazilian-phone-input";
import { parseBrazilianMobile } from "@/lib/ddds-brasileiros";
import {
  CATEGORIAS,
  calcularInss,
  DESTINACOES,
  estimarDecadencia,
  formatBRL,
  hojeNaCalculadora,
  percEquivalencia,
  TIPOS_OBRA,
  UFS,
  VAU_HARDCODED,
  VAU_PERIODO,
  type EntradasCalculo,
  type ResultadoCalculo,
} from "@/lib/calculadora";
import { readAttribution, sendGaEvent } from "@/lib/analytics";
import { DiagnosticoDownload } from "@/components/calculadora/diagnostico-download";
import { TrackedPublicAnchor } from "@/components/analytics/tracked-anchor";

type FormInput = {
  [K in Exclude<
    keyof EntradasCalculo,
    "resp"
  >]: EntradasCalculo[K] extends number ? string : EntradasCalculo[K] | "";
};

const obraKeys = [
  "dest",
  "tipo",
  "categoria",
  "concreto",
  "prefab",
  "uf",
] as const;

const initial: FormInput = {
  dest: "",
  tipo: "",
  categoria: "",
  concreto: "",
  prefab: "",
  uf: "",
  a_construcao: "",
  a_reforma: "",
  a_demolicao: "",
  a_pcoberta: "",
  a_pdescoberta: "",
};
const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-foreground">
      {label}
      {children}
      {hint ? (
        <span className="mt-2 block text-xs font-normal leading-5 text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function CalculadoraInss({
  whatsappNumber,
  eventNames,
  pageLocation,
  diagnosticoEnabled = true,
}: {
  whatsappNumber: string;
  eventNames: { started: string; generateLead: string };
  pageLocation?: string;
  diagnosticoEnabled?: boolean;
}) {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState(initial);
  const [obraInicio, setObraInicio] = useState("");
  const [obraFim, setObraFim] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [tabela, setTabela] = useState<Record<string, number[]>>(VAU_HARDCODED);
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [vauStatus, setVauStatus] = useState<"loading" | "live" | "fallback">(
    "loading",
  );
  const [sending, setSending] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const hoje = hojeNaCalculadora();
  const decadencia = estimarDecadencia(obraInicio, obraFim, hoje);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    fetch("/api/vau", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body) => {
        if (!body?.data || !body.vigencia) return Promise.reject();
        setTabela(body.data);
        setPeriodo(formatVigencia(body.vigencia));
        setVauStatus("live");
      })
      .catch(() => {
        setPeriodo(VAU_PERIODO);
        setVauStatus("fallback");
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);
  const camposObraValidos = obraKeys.every((key) => input[key] !== "");
  const calculoInput = useMemo(
    (): EntradasCalculo => ({
      resp: "Pessoa Física",
      dest: input.dest as EntradasCalculo["dest"],
      tipo: input.tipo as EntradasCalculo["tipo"],
      categoria: input.categoria as EntradasCalculo["categoria"],
      concreto: input.concreto as EntradasCalculo["concreto"],
      prefab: input.prefab as EntradasCalculo["prefab"],
      uf: input.uf as EntradasCalculo["uf"],
      a_construcao: Number(input.a_construcao) || 0,
      a_reforma: Number(input.a_reforma) || 0,
      a_demolicao: Number(input.a_demolicao) || 0,
      a_pcoberta: Number(input.a_pcoberta) || 0,
      a_pdescoberta: Number(input.a_pdescoberta) || 0,
    }),
    [input],
  );
  const areas = useMemo(() => {
    const principal =
      calculoInput.a_construcao +
      calculoInput.a_reforma +
      calculoInput.a_demolicao;
    const pct = calculoInput.dest
      ? percEquivalencia(calculoInput.dest, principal)
      : 0;
    return {
      bruta: principal + calculoInput.a_pcoberta + calculoInput.a_pdescoberta,
      equivalente:
        (principal * pct) / 100 +
        calculoInput.a_pcoberta * 0.5 +
        calculoInput.a_pdescoberta * 0.25,
    };
  }, [calculoInput]);
  const update = <K extends keyof FormInput>(key: K, value: FormInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));
  const go = (next: number) => {
    setErro("");
    if (step === 1 && next === 2 && !camposObraValidos) {
      setErro("Preencha todos os campos antes de continuar");
      return;
    }
    if (next === 3 && areas.bruta <= 0) {
      setErro("A soma das áreas deve ser maior que zero.");
      return;
    }
    if (next === 3 && input.dest === "Casa Popular" && areas.bruta > 70) {
      setErro(
        "Para o Sero, Casa Popular tem área total de até 70 m². Volte e revise a destinação da obra.",
      );
      return;
    }
    if (
      step === 1 &&
      next === 2 &&
      [obraInicio, obraFim].some(
        (data) => data && (data < "1900-01-01" || data > hoje),
      )
    ) {
      setErro("Informe datas válidas, sem usar datas futuras.");
      return;
    }
    if (
      step === 1 &&
      next === 2 &&
      obraInicio &&
      obraFim &&
      obraInicio > obraFim
    ) {
      setErro(
        "A data de conclusão deve ser igual ou posterior à data de início.",
      );
      return;
    }
    setStep(next);
    document
      .getElementById("calculadora")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const trackStart = () => {
    if (step !== 1) return;
    const key = `imposto_obra_simulacao_iniciada:${pageLocation ?? "home"}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    sendGaEvent(eventNames.started, {
      step: 1,
      ...(pageLocation ? { page_location: pageLocation } : {}),
    });
  };
  const calcular = async () => {
    if (!nome.trim()) return setErro("Informe seu nome.");
    const phone = parseBrazilianMobile(telefone);
    if (!phone.ok) return setErro(phone.error);
    const r = calcularInss(calculoInput, tabela);
    setResultado(r);
    setErro("");
    setStep(4);
    sendGaEvent("simulacao_concluida", {
      event_category: "lead",
      event_label: "calculadora_inss_obra",
      value: r.economia || 0,
      ...(pageLocation ? { page_location: pageLocation } : {}),
    });
    setSending(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          nome: nome.trim(),
          telefone: phone.data.formatted,
          email: email.trim() || null,
          ...readAttribution(),
          ...calculoInput,
          ...(obraInicio ? { obra_inicio: obraInicio } : {}),
          ...(obraFim ? { obra_fim: obraFim } : {}),
          ...r,
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      const created =
        body && typeof body === "object" && "created" in body
          ? (body as { created?: unknown }).created
          : null;
      const returnedLeadId =
        body && typeof body === "object" && "id" in body
          ? (body as { id?: unknown }).id
          : null;
      if (!response.ok || typeof created !== "boolean")
        throw new Error("Resposta inválida ao registrar lead");
      if (created) {
        if (typeof returnedLeadId !== "string")
          throw new Error("Lead criado sem identificador");
        setLeadId(returnedLeadId);
        sendGaEvent(eventNames.generateLead, {
          lead_id: returnedLeadId,
          transaction_id: returnedLeadId,
          value: r.economia || 0,
          currency: "BRL",
          ...(pageLocation ? { page_location: pageLocation } : {}),
        });
      }
    } catch (error) {
      console.error("Erro ao enviar lead", error);
      setErro(
        "Sua simulação foi concluída, mas não conseguimos registrar seus dados. Tente novamente em alguns instantes.",
      );
    } finally {
      setSending(false);
    }
  };
  const waUrl =
    resultado && decadencia && decadencia.mesesDecadentes > 0
      ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(whatsappNumber)}&text=${encodeURIComponent(`Olá, me chamo ${nome}! A simulação indicou um possível período decadente. Gostaria de confirmar a documentação e a estimativa para minha obra.`)}`
      : resultado
        ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(whatsappNumber)}&text=${encodeURIComponent(resultado.economia > 0 ? `Olá, me chamo ${nome}!\n\nSimulei o INSS da minha obra no site.\nINSS sem deduções: ${formatBRL(resultado.inss_direto)}\nINSS estimado com deduções: ${formatBRL(resultado.inss_reduzido)}\nEconomia potencial: ${formatBRL(resultado.economia)}\n\nGostaria de um orçamento para regularizar a obra.` : `Olá, me chamo ${nome}!\n\nSimulei o INSS da minha obra no site.\nValor estimado pela norma: ${formatBRL(resultado.inss_direto)}\n\nNão declarei concreto usinado nem pré-fabricado na simulação, mas gostaria de saber se há outros benefícios fiscais aplicáveis ao meu caso. Pode me ajudar?`)}`
        : "#";

  return (
    <section
      id="calculadora"
      onFocusCapture={trackStart}
      className="shadow-soft scroll-mt-24 rounded-[14px] border border-border bg-white p-5 sm:p-8"
    >
      <div className="mb-7">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-extrabold tracking-tight">
            Simular agora o seu INSS
          </h2>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            VAU {periodo ?? "atualizando…"}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Calcule uma estimativa do imposto da sua obra e saiba até quanto pode
          reduzir.
        </p>
        {vauStatus === "fallback" ? (
          <p className="mt-2 text-xs leading-5 text-amber-700">
            A tabela atual não pôde ser carregada agora. A simulação usará a
            referência de segurança de {VAU_PERIODO}; confirme o resultado com
            nossa equipe.
          </p>
        ) : null}
      </div>
      <ol
        className="mb-8 grid grid-cols-4 gap-2"
        aria-label="Etapas da simulação"
      >
        {["Obra", "Áreas", "Dados", "Resultado"].map((label, index) => (
          <li
            key={label}
            className={`rounded-full px-2 py-2 text-center text-xs font-bold ${step === index + 1 ? "bg-primary text-white" : step > index + 1 ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}
          >
            {index + 1}. <span className="hidden sm:inline">{label}</span>
          </li>
        ))}
      </ol>
      {erro ? (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
        >
          {erro}
        </div>
      ) : null}
      {step === 1 ? (
        <div>
          <h3 className="mb-5 text-lg font-bold">1. Informações da obra</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Responsável pela obra"
              hint="A Imposto & Obra atende exclusivamente obras vinculadas a CPF."
            >
              <input
                className={inputClass}
                type="text"
                value="Pessoa Física (CPF)"
                readOnly
              />
            </Field>
            <Field label="Destinação">
              <select
                className={inputClass}
                value={input.dest}
                onChange={(e) =>
                  update("dest", e.target.value as EntradasCalculo["dest"])
                }
              >
                <option value="">— Selecione —</option>
                {DESTINACOES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de obra">
              <select
                className={inputClass}
                value={input.tipo}
                onChange={(e) =>
                  update("tipo", e.target.value as EntradasCalculo["tipo"])
                }
              >
                <option value="">— Selecione —</option>
                {TIPOS_OBRA.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Categoria">
              <select
                className={inputClass}
                value={input.categoria}
                onChange={(e) =>
                  update(
                    "categoria",
                    e.target.value as EntradasCalculo["categoria"],
                  )
                }
              >
                <option value="">— Selecione —</option>
                {CATEGORIAS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Usou concreto usinado?"
              hint={
                <>
                  Marque <strong>Sim</strong> se puder confirmar o uso de
                  concreto usinado. A equipe pode conferir as notas fiscais
                  depois.
                </>
              }
            >
              <select
                className={inputClass}
                value={input.concreto}
                onChange={(e) =>
                  update("concreto", e.target.value as "Sim" | "Não")
                }
              >
                <option value="">— Selecione —</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </Field>
            <Field
              label="Pré-fabricado/pré-moldado (NF ≥ 40% do custo)?"
              hint={
                <>
                  💡 Inclui lajes pré-moldadas, estruturas pré-fabricadas e
                  paredes/painéis prontos. Se o fornecedor emite NF separada
                  desses materiais, marque <strong>Sim</strong>.
                </>
              }
            >
              <select
                className={inputClass}
                value={input.prefab}
                onChange={(e) =>
                  update("prefab", e.target.value as "Sim" | "Não")
                }
              >
                <option value="">— Selecione —</option>
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </Field>
            <Field label="UF">
              <select
                className={inputClass}
                value={input.uf}
                onChange={(e) =>
                  update("uf", e.target.value as EntradasCalculo["uf"])
                }
              >
                <option value="">— Selecione —</option>
                {UFS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="mb-2 mt-6 text-sm text-muted-foreground">
            Se souber, informe as datas da construção, ampliação, reforma ou
            demolição que você está simulando. Elas ajudam a estimar o período
            fora do prazo de cobrança.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Data de início (opcional)">
              <input
                className={inputClass}
                type="date"
                min="1900-01-01"
                max={hoje}
                value={obraInicio}
                onChange={(e) => setObraInicio(e.target.value)}
              />
            </Field>
            <Field
              label="Data de conclusão (opcional)"
              hint="Deixe em branco se a obra ainda não terminou ou se você não souber."
            >
              <input
                className={inputClass}
                type="date"
                min={obraInicio || "1900-01-01"}
                max={hoje}
                value={obraFim}
                onChange={(e) => setObraFim(e.target.value)}
              />
            </Field>
          </div>
          <Actions next={() => go(2)} disabled={!camposObraValidos} />
        </div>
      ) : null}
      {step === 2 ? (
        <div>
          <h3 className="mb-5 text-lg font-bold">2. Áreas da obra (m²)</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            {(
              [
                ["a_construcao", "Construção / ampliação"],
                ["a_reforma", "Reforma"],
                ["a_demolicao", "Demolição"],
                ["a_pcoberta", "Piscina coberta"],
                ["a_pdescoberta", "Piscina descoberta"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={input[key]}
                  onChange={(e) => update(key, e.target.value)}
                />
              </Field>
            ))}
          </div>
          <div className="mt-6 grid gap-3 rounded-xl bg-secondary p-4 sm:grid-cols-2">
            <p>
              <strong>Área total:</strong>{" "}
              {areas.bruta.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}{" "}
              m²
            </p>
            <p>
              <strong>Área equivalente:</strong>{" "}
              {areas.equivalente.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}{" "}
              m²
            </p>
          </div>
          <Actions prev={() => go(1)} next={() => go(3)} />
        </div>
      ) : null}
      {step === 3 ? (
        <div>
          <h3 className="mb-5 text-lg font-bold">3. Seus dados</h3>
          <div className="grid gap-5">
            <Field label="Nome completo">
              <input
                className={inputClass}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </Field>
            <Field label="WhatsApp com DDD">
              <BrazilianPhoneInput
                className={inputClass}
                value={telefone}
                onValueChange={setTelefone}
                required
              />
            </Field>
            <Field label="E-mail (opcional)">
              <input
                className={inputClass}
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </div>
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            Ao avançar você concorda em ser contatado pela Imposto &amp; Obra
            Consultoria via WhatsApp ou e-mail para receber sua simulação
            detalhada.
          </p>
          <Actions
            prev={() => go(2)}
            next={calcular}
            nextLabel={sending ? "Registrando…" : "Calcular agora"}
            disabled={sending}
            success
          />
        </div>
      ) : null}
      {step === 4 && resultado ? (
        <Resultado
          resultado={resultado}
          decadencia={decadencia}
          waUrl={waUrl}
          leadId={leadId}
          diagnosticoEnabled={diagnosticoEnabled}
          restart={() => {
            setInput(initial);
            setObraInicio("");
            setObraFim("");
            setNome("");
            setTelefone("");
            setEmail("");
            setResultado(null);
            setLeadId(null);
            go(1);
          }}
        />
      ) : null}
    </section>
  );
}

function formatVigencia(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const month = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "UTC",
  }).format(date);
  return `${month.charAt(0).toUpperCase()}${month.slice(1)}/${date.getUTCFullYear()}`;
}

function Actions({
  prev,
  next,
  nextLabel = "Próximo",
  success = false,
  disabled = false,
}: {
  prev?: () => void;
  next: () => void;
  nextLabel?: string;
  success?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="mt-7 flex flex-wrap justify-end gap-3">
      {prev ? (
        <button
          className="rounded-full border border-border px-5 py-2.5 text-sm font-bold"
          onClick={prev}
        >
          Voltar
        </button>
      ) : null}
      <button
        className={`rounded-full px-6 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-45 ${success ? "bg-accent" : "bg-primary"}`}
        onClick={next}
        disabled={disabled}
      >
        {nextLabel}
      </button>
    </div>
  );
}
function Resultado({
  resultado,
  decadencia,
  waUrl,
  leadId,
  diagnosticoEnabled,
  restart,
}: {
  resultado: ResultadoCalculo;
  decadencia: ReturnType<typeof estimarDecadencia>;
  waUrl: string;
  leadId: string | null;
  diagnosticoEnabled: boolean;
  restart: () => void;
}) {
  const comDecadencia =
    decadencia && decadencia.mesesDecadentes > 0 ? decadencia : null;
  const detail = [
    [
      "Área equivalente (cálculo)",
      `${resultado.area_total_calculo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} m² (princ. ${resultado.pct_equivalencia}%)`,
    ],
    ["Custo da Obra por Destinação (COD)", formatBRL(resultado.co)],
    ["Remuneração de Mão de Obra Total (RMT)", formatBRL(resultado.rmt)],
    ["VAU aplicado", `${formatBRL(resultado.vau)} /m²`],
    [
      "Fator Social (PF)",
      resultado.fator_social_pct !== null
        ? `${resultado.fator_social_pct}%`
        : "Não se aplica (PJ)",
    ],
    [
      "Dedução concreto usinado",
      resultado.ded_concreto_usinado > 0
        ? formatBRL(resultado.ded_concreto_usinado)
        : "Não declarado",
    ],
    [
      "Redução pré-fabricado",
      resultado.reducao_pre_fab_pct > 0
        ? `-${resultado.reducao_pre_fab_pct}% sobre a RMT`
        : "Não aplicável",
    ],
  ];
  return (
    <div>
      <h3 className="mb-5 text-lg font-bold">Resultado da simulação</h3>
      <div
        className={
          resultado.economia > 0 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"
        }
      >
        <ResultCard
          red
          title="❌ INSS sem deduções"
          value={resultado.inss_direto}
          sub="Estimativa antes de deduções e decadência"
        />
        {resultado.economia > 0 && (
          <ResultCard
            title="INSS estimado com deduções"
            value={resultado.inss_reduzido}
            sub="Considera os abatimentos informados"
          />
        )}
      </div>
      {comDecadencia ? (
        <div className="my-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
          <h4 className="font-bold">
            Estimativa com{" "}
            {comDecadencia.fracaoNaoDecadente === 0
              ? "decadência total"
              : "decadência parcial"}
          </h4>
          <p className="my-2 text-3xl font-extrabold">
            {formatBRL(
              resultado.inss_reduzido * comDecadencia.fracaoNaoDecadente,
            )}
          </p>
          <p>
            {comDecadencia.mesesDecadentes} de {comDecadencia.meses} meses podem
            estar fora do prazo de cobrança. O resultado depende da comprovação
            das datas e da confirmação no Sero.
          </p>
        </div>
      ) : (
        <div className="my-5 rounded-xl bg-secondary p-5 text-sm leading-6">
          {resultado.economia > 0 ? (
            <p>
              <strong>Economia estimada com os abatimentos informados:</strong>{" "}
              {formatBRL(resultado.economia)}
            </p>
          ) : null}
          {!decadencia ? (
            <p>
              Obras antigas podem ter parte ou todo o valor fora do prazo de
              cobrança. Nossa equipe pode verificar as datas e os documentos com
              você.
            </p>
          ) : (
            <p>
              As datas informadas não indicam período decadente. A análise dos
              documentos pode identificar outros créditos aplicáveis.
            </p>
          )}
        </div>
      )}
      <dl className="divide-y divide-border border-y border-border">
        {detail.map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col justify-between gap-1 py-3 text-sm sm:flex-row"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      {diagnosticoEnabled && <DiagnosticoDownload leadId={leadId} />}
      {diagnosticoEnabled && leadId && comDecadencia && (
        <p className="mt-2 text-xs text-muted-foreground">
          O PDF detalha a estimativa-base. O cenário por decadência está no
          resultado acima.
        </p>
      )}
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <button
          onClick={restart}
          className="rounded-full border border-border px-5 py-2.5 text-sm font-bold"
        >
          Nova simulação
        </button>
        <TrackedPublicAnchor
          kind="whatsapp"
          origem="resultado_calculadora"
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-white hover:no-underline"
        >
          Falar no WhatsApp
        </TrackedPublicAnchor>
      </div>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">
        Esta é uma simulação estimada com base nos parâmetros oficiais da
        Receita Federal (IN RFB nº 2.021/2021). Para o cálculo definitivo, entre
        em contato com a nossa consultoria.
      </p>
    </div>
  );
}
function ResultCard({
  title,
  value,
  sub,
  red = false,
}: {
  title: string;
  value: number;
  sub: string;
  red?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${red ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}
    >
      <p className="text-sm font-bold">{title}</p>
      <p
        className={`mt-2 text-2xl font-extrabold ${red ? "text-red-700" : "text-emerald-700"}`}
      >
        {formatBRL(value)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
