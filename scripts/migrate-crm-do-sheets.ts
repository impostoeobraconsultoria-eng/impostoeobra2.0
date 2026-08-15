import { createSign } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  booleanValue,
  chunks,
  createMigrationClient,
  dateValue,
  deterministicUuid,
  emptyToNull,
  loadLocalEnv,
  normalizeHeader,
  numberOrNull,
  parseCliOptions,
  printPlan,
  requireEnv,
  upsertBatches,
} from "./lib/migration.ts";

loadLocalEnv();

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_ID ??
  "1HloRJ753r2iD5UTP7W34T8F9fC0sF2aXa1gT9ui68N8";
const SHEETS = [
  "Usuarios",
  "Config",
  "TabelaVAU",
  "Leads",
  "Clientes",
  "Contratos",
  "Atividades",
] as const;

type SourceRow = Record<string, unknown> & {
  __row: number;
  __sheet: string;
};
type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

async function main() {
  if (process.argv.includes("--help")) {
    console.log(
      "Uso: pnpm migrate:crm [--commit]\nSem --commit, lê e valida a planilha sem gravar no Supabase.",
    );
    return;
  }
  loadLocalEnv();
  const options = parseCliOptions();
  console.log(`Migração do CRM — ${options.commit ? "COMMIT" : "DRY-RUN"}`);
  const credential = parseServiceAccount(requireEnv("GOOGLE_SHEETS_SA_KEY"));
  const accessToken = await getGoogleAccessToken(credential);
  const source = Object.fromEntries(
    await Promise.all(
      SHEETS.map(async (sheet) => [sheet, await readSheet(sheet, accessToken)]),
    ),
  ) as Record<(typeof SHEETS)[number], SourceRow[]>;
  for (const sheet of SHEETS) printPlan(sheet, source[sheet]);

  const plan = buildPlan(source);
  validatePlan(plan, source);
  console.log("Plano validado:");
  printPlan("users", plan.users);
  printPlan("config", plan.config);
  printPlan("vau", plan.vau);
  printPlan("leads", plan.leads);
  printPlan("clientes", plan.clients);
  printPlan("contratos", plan.contracts);
  printPlan("atividades", plan.activities);

  if (!options.commit) {
    console.log(
      "Dry-run concluído sem escrita. Configure SUPABASE_SERVICE_ROLE_KEY e use --commit para migrar.",
    );
    return;
  }

  const supabase = createMigrationClient();
  await upsertBatches(supabase, "users", plan.users, "email");
  const userLookup = await loadUserLookup(supabase);
  attachUserReferences(plan, userLookup);
  await upsertBatches(supabase, "config", plan.config, "chave");
  await upsertBatches(supabase, "vau", plan.vau, "uf");
  await upsertBatches(supabase, "leads", plan.leads, "id");
  await upsertBatches(supabase, "clientes", plan.clients, "id");
  await upsertBatches(supabase, "leads", plan.leadsWithClients, "id");
  await upsertBatches(supabase, "contratos", plan.contracts, "id");
  await upsertBatches(supabase, "atividades", plan.activities, "id");

  await verifyMigration(supabase, plan);
  console.log("Migração do CRM concluída e verificada.");
  console.log(
    "Próximo passo manual: marcar a planilha como BACKUP — não editar mais. Fonte da verdade: plataforma nova.",
  );
}

function buildPlan(source: Record<(typeof SHEETS)[number], SourceRow[]>) {
  const users = source.Usuarios.map((row) => ({
    email: requiredText(row, ["email", "e_mail"]).toLowerCase(),
    nome: text(row, ["nome", "name"]),
    perfil:
      normalizeHeader(pick(row, ["perfil", "role"])) === "admin"
        ? "admin"
        : "consultor",
    ativo: booleanValue(pick(row, ["ativo", "active"]), true),
    ultimo_acesso: dateValue(
      pick(row, ["ultimo_acesso", "ultimo_login"]),
      true,
    ),
  }));

  const config = source.Config.map((row) => ({
    chave: requiredText(row, ["chave", "key"]),
    valor: text(row, ["valor", "value"]),
    descricao: text(row, ["descricao", "description"]),
  }));

  const vau = source.TabelaVAU.map((row) => ({
    uf: requiredText(row, ["uf", "estado"]).toUpperCase(),
    casa_popular: numberOrNull(pick(row, ["casa_popular"])),
    comercial: numberOrNull(pick(row, ["comercial", "comercial_salas_lojas"])),
    conj_pop: numberOrNull(pick(row, ["conj_pop", "conj_hab_popular"])),
    galpao: numberOrNull(pick(row, ["galpao", "galpao_ind"])),
    res_multi: numberOrNull(
      pick(row, ["res_multi", "residencial_multifamiliar"]),
    ),
    res_uni: numberOrNull(pick(row, ["res_uni", "residencial_unifamiliar"])),
    garagens: numberOrNull(pick(row, ["garagens", "edificio_de_garagens"])),
    vigencia: text(row, ["vigencia"]),
  }));

  const leadSources = source.Leads.map((row) => ({
    row,
    legacyId: legacyId(row, "lead"),
  }));
  const leads = leadSources.map(({ row, legacyId }) => ({
    id: deterministicUuid("leads", legacyId),
    legacy_id: legacyId,
    ...mapFields(row, LEAD_TEXT_FIELDS, text),
    ...mapFields(row, LEAD_NUMBER_FIELDS, (item, keys) =>
      numberOrNull(pick(item, keys)),
    ),
    data_hora:
      dateValue(pick(row, ["data_hora", "data", "criado_em"]), true) ??
      new Date(0).toISOString(),
    nome: requiredText(row, ["nome"]),
    status: text(row, ["status"]) ?? "Novo Lead",
    origem: text(row, ["origem"]) ?? "planilha",
    __responsavel: text(row, ["responsavel_email", "responsavel", "consultor"]),
    __clienteLegacy: text(row, [
      "cliente_id",
      "id_cliente",
      "cliente_legacy_id",
    ]),
  }));
  const leadsByLegacy = new Map(
    leadSources.map(({ legacyId }, index) => [legacyId, leads[index].id]),
  );
  const leadsByName = uniqueNameMap(
    leads.map((lead) => ({ id: lead.id, nome: lead.nome })),
  );

  const clientSources = source.Clientes.map((row) => ({
    row,
    legacyId: legacyId(row, "cliente"),
  }));
  const clients = clientSources.map(({ row, legacyId }) => {
    const leadReference = text(row, ["lead_id_origem", "lead_id", "id_lead"]);
    return {
      id: deterministicUuid("clientes", legacyId),
      legacy_id: legacyId,
      ...mapFields(row, CLIENT_TEXT_FIELDS, text),
      data_nascimento: dateValue(pick(row, ["data_nascimento", "nascimento"])),
      nome: requiredText(row, ["nome"]),
      lead_id_origem:
        (leadReference ? leadsByLegacy.get(leadReference) : null) ??
        leadsByName.get(normalizeName(requiredText(row, ["nome"]))) ??
        null,
      __criadoPor: text(row, ["criado_por_email", "criado_por"]),
    };
  });
  const clientsByLegacy = new Map(
    clientSources.map(({ legacyId }, index) => [legacyId, clients[index].id]),
  );
  const clientsByName = uniqueNameMap(
    clients.map((client) => ({ id: client.id, nome: client.nome })),
  );

  const leadsWithClients = leads.map((lead) => ({
    ...lead,
    cliente_id:
      (lead.__clienteLegacy
        ? clientsByLegacy.get(lead.__clienteLegacy)
        : null) ??
      clientsByName.get(normalizeName(lead.nome)) ??
      null,
  }));

  const contracts = source.Contratos.map((row) => {
    const legacy = legacyId(row, "contrato");
    const clientReference = text(row, [
      "cliente_id",
      "id_cliente",
      "cliente_legacy_id",
    ]);
    const clientName = text(row, ["cliente", "cliente_nome", "nome"]);
    const clienteId =
      (clientReference ? clientsByLegacy.get(clientReference) : null) ??
      (clientName ? clientsByName.get(normalizeName(clientName)) : null);
    if (!clienteId)
      throw sourceError(row, "cliente do contrato não localizado");
    return {
      id: deterministicUuid("contratos", legacy),
      legacy_id: legacy,
      cliente_id: clienteId,
      ...mapFields(row, CONTRACT_TEXT_FIELDS, text),
      ...mapFields(row, CONTRACT_NUMBER_FIELDS, (item, keys) =>
        numberOrNull(pick(item, keys)),
      ),
      ...mapFields(row, CONTRACT_DATE_FIELDS, (item, keys) =>
        dateValue(pick(item, keys)),
      ),
      status: text(row, ["status"]) ?? "em vigor",
      criado_em: dateValue(pick(row, ["criado_em", "data_hora"]), true),
    };
  });
  const contractsByLegacy = new Map(
    source.Contratos.map((row, index) => [
      legacyId(row, "contrato"),
      contracts[index].id,
    ]),
  );

  const activities = source.Atividades.map((row) => {
    const legacy = legacyId(row, "atividade");
    const refTipo = normalizeRefType(
      requiredText(row, ["ref_tipo", "tipo_referencia"]),
    );
    const rawReference = requiredText(row, [
      "ref_id",
      "id_referencia",
      "referencia_id",
    ]);
    const refId =
      refTipo === "lead"
        ? leadsByLegacy.get(rawReference)
        : refTipo === "cliente"
          ? clientsByLegacy.get(rawReference)
          : refTipo === "contrato"
            ? contractsByLegacy.get(rawReference)
            : deterministicUuid("sistema", rawReference);
    if (!refId)
      throw sourceError(
        row,
        `referência ${refTipo}/${rawReference} não localizada`,
      );
    return {
      id: deterministicUuid("atividades", legacy),
      legacy_id: legacy,
      ref_tipo: refTipo,
      ref_id: refId,
      tipo: text(row, ["tipo", "tipo_atividade"]) ?? "nota",
      descricao: text(row, ["descricao", "observacao", "nota"]),
      metadata_json: jsonValue(pick(row, ["metadata_json", "metadata"])),
      data_hora:
        dateValue(pick(row, ["data_hora", "data", "criado_em"]), true) ??
        new Date(0).toISOString(),
      __autor: text(row, ["autor_email", "autor", "responsavel"]),
    };
  });

  return {
    users,
    config,
    vau,
    leads,
    leadsWithClients,
    clients,
    contracts,
    activities,
  };
}

async function loadUserLookup(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("users")
    .select("id,email,nome")
    .eq("ativo", true);
  if (error) throw new Error(`users: ${error.message}`);
  const lookup = new Map<string, string>();
  for (const user of data ?? []) {
    lookup.set(normalizeHeader(user.email), user.id);
    if (user.nome) lookup.set(normalizeHeader(user.nome), user.id);
  }
  return lookup;
}

function attachUserReferences(
  plan: ReturnType<typeof buildPlan>,
  users: Map<string, string>,
) {
  for (const lead of plan.leads) {
    const writableLead = lead as Record<string, unknown>;
    writableLead.responsavel_id = lead.__responsavel
      ? (users.get(normalizeHeader(lead.__responsavel)) ?? null)
      : null;
    delete writableLead.__responsavel;
    delete writableLead.__clienteLegacy;
  }
  for (const lead of plan.leadsWithClients) {
    const writableLead = lead as Record<string, unknown>;
    writableLead.responsavel_id = lead.__responsavel
      ? (users.get(normalizeHeader(lead.__responsavel)) ?? null)
      : null;
    delete writableLead.__responsavel;
    delete writableLead.__clienteLegacy;
  }
  for (const client of plan.clients) {
    const writableClient = client as Record<string, unknown>;
    writableClient.criado_por = client.__criadoPor
      ? (users.get(normalizeHeader(client.__criadoPor)) ?? null)
      : null;
    delete writableClient.__criadoPor;
  }
  for (const activity of plan.activities) {
    const writableActivity = activity as Record<string, unknown>;
    writableActivity.autor_id = activity.__autor
      ? (users.get(normalizeHeader(activity.__autor)) ?? null)
      : null;
    delete writableActivity.__autor;
  }
}

function validatePlan(
  plan: ReturnType<typeof buildPlan>,
  source: Record<(typeof SHEETS)[number], SourceRow[]>,
) {
  assertUnique(
    plan.users.map((row) => row.email),
    "users.email",
  );
  assertUnique(
    plan.config.map((row) => row.chave),
    "config.chave",
  );
  assertUnique(
    plan.vau.map((row) => row.uf),
    "vau.uf",
  );
  assertUnique(
    plan.leads.map((row) => row.id),
    "leads.id",
  );
  assertUnique(
    plan.clients.map((row) => row.id),
    "clientes.id",
  );
  assertUnique(
    plan.contracts.map((row) => row.id),
    "contratos.id",
  );
  assertUnique(
    plan.activities.map((row) => row.id),
    "atividades.id",
    source.Atividades,
  );
  if (plan.leads.length !== source.Leads.length)
    throw new Error("Contagem de leads divergente no plano.");
  const invalidVau = plan.vau.find(
    (row) =>
      !/^[A-Z]{2}$/.test(row.uf) ||
      [
        row.casa_popular,
        row.comercial,
        row.conj_pop,
        row.galpao,
        row.res_multi,
        row.res_uni,
        row.garagens,
      ].some((value) => value === null || value <= 0),
  );
  if (invalidVau) throw new Error(`VAU inválido para ${invalidVau.uf}.`);
}

async function verifyMigration(
  supabase: SupabaseClient,
  plan: ReturnType<typeof buildPlan>,
) {
  for (const [table, rows] of [
    ["leads", plan.leads],
    ["clientes", plan.clients],
    ["contratos", plan.contracts],
    ["atividades", plan.activities],
  ] as const) {
    let found = 0;
    for (const batch of chunks(
      rows.map((row) => row.id),
      100,
    )) {
      const { count, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .in("id", batch);
      if (error) throw new Error(`Verificação ${table}: ${error.message}`);
      found += count ?? 0;
    }
    if (found !== rows.length)
      throw new Error(`Verificação ${table}: ${found}/${rows.length}.`);
    console.log(`  verificado ${table}: ${found}`);
  }
  const referencedClientIds = new Set<string>();
  for (const batch of chunks(
    plan.leads.map((row) => row.id),
    100,
  )) {
    const { data, error } = await supabase
      .from("leads")
      .select("cliente_id")
      .in("id", batch)
      .not("cliente_id", "is", null);
    if (error)
      throw new Error(`Verificação leads.cliente_id: ${error.message}`);
    for (const lead of data ?? [])
      if (lead.cliente_id) referencedClientIds.add(lead.cliente_id);
  }

  const foundClientIds = new Set<string>();
  for (const batch of chunks(Array.from(referencedClientIds), 100)) {
    const { data, error } = await supabase
      .from("clientes")
      .select("id")
      .in("id", batch);
    if (error)
      throw new Error(`Verificação clientes referenciados: ${error.message}`);
    for (const client of data ?? []) foundClientIds.add(client.id);
  }
  const invalidClientIds = Array.from(referencedClientIds).filter(
    (id) => !foundClientIds.has(id),
  );
  if (invalidClientIds.length)
    throw new Error(
      `${invalidClientIds.length} cliente_id(s) de leads não localizado(s).`,
    );
  console.log(
    `  verificado leads.cliente_id: ${referencedClientIds.size} referência(s) válida(s)`,
  );
}

async function readSheet(sheet: string, accessToken: string) {
  const range = encodeURIComponent(`'${sheet}'!A:ZZZ`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok)
    throw new Error(
      `Google Sheets ${sheet}: ${response.status} ${await response.text()}`,
    );
  const body = (await response.json()) as { values?: unknown[][] };
  const [header = [], ...rows] = body.values ?? [];
  const keys = header.map(normalizeHeader);
  if (!keys.some(Boolean)) throw new Error(`${sheet}: cabeçalho vazio.`);
  return rows
    .map((values, index) => {
      const row = Object.fromEntries(
        keys.map((key, cell) => [key, values[cell]]),
      ) as SourceRow;
      row.__row = index + 2;
      row.__sheet = sheet;
      return row;
    })
    .filter((row) =>
      Object.entries(row).some(
        ([key, value]) => !key.startsWith("__") && emptyToNull(value) !== null,
      ),
    );
}

function parseServiceAccount(raw: string): ServiceAccount {
  // TODO operacional: fornecer GOOGLE_SHEETS_SA_KEY como JSON ou JSON em base64.
  let decoded = raw.trim();
  if (!decoded.startsWith("{"))
    decoded = Buffer.from(decoded, "base64").toString("utf8");
  const credential = JSON.parse(decoded) as Partial<ServiceAccount>;
  if (!credential.client_email || !credential.private_key)
    throw new Error(
      "GOOGLE_SHEETS_SA_KEY não contém client_email/private_key.",
    );
  return credential as ServiceAccount;
}

async function getGoogleAccessToken(credential: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: credential.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: credential.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(credential.private_key.replace(/\\n/g, "\n"), "base64url");
  const response = await fetch(
    credential.token_uri ?? "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${unsigned}.${signature}`,
      }),
    },
  );
  const body = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!response.ok || !body.access_token)
    throw new Error(
      `OAuth Google: ${body.error_description ?? response.status}`,
    );
  return body.access_token;
}

function mapFields(
  row: SourceRow,
  fields: readonly string[],
  mapper: (row: SourceRow, keys: string[]) => unknown,
) {
  return Object.fromEntries(
    fields.map((field) => [field, mapper(row, [field])]),
  );
}
function pick(row: SourceRow, keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeHeader(key)];
    if (emptyToNull(value) !== null) return value;
  }
  return null;
}
function text(row: SourceRow, keys: string[]) {
  const value = emptyToNull(pick(row, keys));
  return value === null ? null : String(value);
}
function requiredText(row: SourceRow, keys: string[]) {
  const value = text(row, keys);
  if (!value)
    throw sourceError(row, `campo obrigatório ausente: ${keys.join("/")}`);
  return value;
}
function legacyId(row: SourceRow, entity: string) {
  return (
    text(row, ["legacy_id", "id", `${entity}_id`, `id_${entity}`]) ??
    `${row.__sheet}:${row.__row}`
  );
}
function normalizeName(value: string) {
  return normalizeHeader(value).replace(/_/g, " ");
}
function uniqueNameMap(values: Array<{ id: string; nome: string }>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = normalizeName(value.nome);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Map(
    values
      .filter((value) => counts.get(normalizeName(value.nome)) === 1)
      .map((value) => [normalizeName(value.nome), value.id]),
  );
}
function normalizeRefType(value: string) {
  const normalized = normalizeHeader(value);
  if (["lead", "cliente", "contrato", "sistema"].includes(normalized))
    return normalized;
  throw new Error(`ref_tipo inválido: ${value}`);
}
function jsonValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value)) as unknown;
  } catch {
    return { legado: String(value) };
  }
}
function sourceError(row: SourceRow, message: string) {
  return new Error(`${row.__sheet}, linha ${row.__row}: ${message}`);
}
function assertUnique(values: string[], label: string, rows?: SourceRow[]) {
  const seen = new Map<string, number>();
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const previousIndex = seen.get(value);
    if (previousIndex !== undefined) {
      const locations = rows
        ? duplicateContext(rows[previousIndex], rows[index])
        : "";
      throw new Error(`${label} duplicado: ${value}${locations}`);
    }
    seen.set(value, index);
  }
}

function duplicateContext(first: SourceRow, second: SourceRow) {
  const sourceValues = (row: SourceRow) =>
    Object.fromEntries(
      Object.entries(row).filter(([key]) => !key.startsWith("__")),
    );
  const identical =
    JSON.stringify(sourceValues(first)) ===
    JSON.stringify(sourceValues(second));
  return ` (linhas ${first.__row} e ${second.__row}; legacy_id ${legacyId(first, "atividade")}; conteúdo idêntico: ${identical ? "sim" : "não"})`;
}

const LEAD_TEXT_FIELDS = [
  "ddd",
  "whatsapp",
  "email",
  "uf",
  "cidade",
  "produto",
  "observacoes",
  "resp",
  "dest",
  "tipo",
  "categoria",
  "concreto",
  "prefab",
] as const;
const LEAD_NUMBER_FIELDS = [
  "valor_potencial",
  "a_construcao",
  "a_reforma",
  "a_demolicao",
  "a_pcoberta",
  "a_pdescoberta",
  "area_total",
  "area_total_calculo",
  "area_principal_bruta",
  "area_principal_equiv",
  "pct_equivalencia",
  "vau",
  "co",
  "rmt",
  "cmo_pct",
  "pct_categoria",
  "fator_social_pct",
  "aliquota_pct",
  "reducao_pre_fab_pct",
  "ded_concreto_usinado",
  "pct_uso_usinado",
  "pct_abat_usinado_cat",
  "inss_direto",
  "inss_reduzido",
  "economia",
  "cmpl_folha_mensal",
  "cmpl_meses_folha",
  "cmpl_nf_concreto_usinado",
  "cmpl_nf_prefabricado",
] as const;
const CLIENT_TEXT_FIELDS = [
  "cpf",
  "cnpj",
  "rg",
  "estado_civil",
  "profissao",
  "ddd",
  "telefone",
  "email",
  "end_logradouro",
  "end_bairro",
  "end_cidade",
  "end_uf",
  "end_cep",
  "obra_end_logradouro",
  "obra_end_bairro",
  "obra_end_cidade",
  "obra_end_uf",
  "obra_matricula",
  "obra_iptu",
  "obra_tipo",
  "obra_descricao",
  "banco",
  "agencia",
  "conta",
  "tipo_conta",
  "pix",
  "obs_contrato",
] as const;
const CONTRACT_TEXT_FIELDS = [
  "numero",
  "produto",
  "forma_pagamento",
  "observacoes",
] as const;
const CONTRACT_NUMBER_FIELDS = [
  "valor_total",
  "valor_pago",
  "parcelas",
] as const;
const CONTRACT_DATE_FIELDS = [
  "data_assinatura",
  "data_inicio",
  "data_conclusao",
] as const;

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
