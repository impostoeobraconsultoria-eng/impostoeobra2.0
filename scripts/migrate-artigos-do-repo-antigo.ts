import { load } from "cheerio";
import sanitizeHtml from "sanitize-html";

import {
  createMigrationClient,
  loadLocalEnv,
  parseCliOptions,
  printPlan,
} from "./lib/migration.ts";

loadLocalEnv();

const REPOSITORY =
  process.env.ARTICLES_SOURCE_REPOSITORY ??
  "impostoeobraconsultoria-eng/impostoeobra";
const BRANCH = process.env.ARTICLES_SOURCE_BRANCH ?? "main";
const EXPECTED_ARTICLES = 10;

type ArticleRow = {
  slug: string;
  titulo: string;
  subtitulo: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  conteudo_html: string;
  faq: Array<{ pergunta: string; resposta: string }>;
  schema_type: string;
  prioridade_seo: number;
  categoria: string | null;
  tags: string[];
  publicado: boolean;
  data_publicacao: string | null;
  autor_id?: string | null;
  updated_by?: string | null;
};

async function main() {
  if (process.argv.includes("--help")) {
    console.log(
      "Uso: pnpm migrate:artigos [--commit] [--overwrite]\nSem --commit, apenas valida e exibe o plano.",
    );
    return;
  }
  loadLocalEnv();
  const options = parseCliOptions();
  console.log(
    `Migração de artigos — ${options.commit ? "COMMIT" : "DRY-RUN"}${options.overwrite ? " + OVERWRITE" : ""}`,
  );
  const paths = await listArticlePaths();
  if (paths.length !== EXPECTED_ARTICLES)
    throw new Error(
      `Esperados ${EXPECTED_ARTICLES} artigos, encontrados ${paths.length}. Revise a origem antes de continuar.`,
    );
  const articles = await Promise.all(
    paths.map(async (path) => parseArticle(path, await fetchRaw(path))),
  );
  validateArticles(articles);
  printPlan("artigos", articles);
  for (const article of articles)
    console.log(
      `  ${article.slug}: ${article.titulo} (${article.faq.length} FAQ)`,
    );

  if (!options.commit) {
    console.log("Dry-run concluído. Use --commit para gravar no Supabase.");
    return;
  }

  const supabase = createMigrationClient();
  const authorEmail = process.env.MIGRATION_AUTHOR_EMAIL?.trim().toLowerCase();
  let authorId: string | null = null;
  if (authorEmail) {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", authorEmail)
      .eq("ativo", true)
      .maybeSingle();
    if (error) throw new Error(`Falha ao localizar autor: ${error.message}`);
    if (!data)
      throw new Error(`MIGRATION_AUTHOR_EMAIL não encontrado: ${authorEmail}`);
    authorId = data.id;
  }
  const payload = articles.map((article) => ({
    ...article,
    autor_id: authorId,
    updated_by: authorId,
  }));
  const { error } = await supabase.from("artigos").upsert(payload, {
    onConflict: "slug",
    ignoreDuplicates: !options.overwrite,
  });
  if (error) throw new Error(`${error.code}: ${error.message}`);
  const { count, error: countError } = await supabase
    .from("artigos")
    .select("id", { count: "exact", head: true })
    .in(
      "slug",
      articles.map((article) => article.slug),
    );
  if (countError || count !== EXPECTED_ARTICLES)
    throw new Error(
      `Verificação falhou: ${count ?? 0}/${EXPECTED_ARTICLES} artigos encontrados após a gravação.`,
    );
  console.log(`Migração concluída e verificada: ${count} artigos.`);
}

async function listArticlePaths() {
  const response = await githubFetch(
    `https://api.github.com/repos/${REPOSITORY}/git/trees/${BRANCH}?recursive=1`,
  );
  const body = (await response.json()) as {
    truncated?: boolean;
    tree?: Array<{ path: string; type: string }>;
  };
  if (body.truncated) throw new Error("A árvore do GitHub veio truncada.");
  return (body.tree ?? [])
    .filter(
      (item) =>
        item.type === "blob" &&
        /^artigos\/[^/]+\.html$/.test(item.path) &&
        !item.path.endsWith("/index.html"),
    )
    .map((item) => item.path)
    .sort();
}

async function fetchRaw(path: string) {
  const response = await githubFetch(
    `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}/${path}`,
  );
  return response.text();
}

async function githubFetch(url: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "impostoeobra-migration",
  };
  if (process.env.GITHUB_TOKEN)
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(url, { headers });
  if (!response.ok)
    throw new Error(`GitHub ${response.status}: ${await response.text()}`);
  return response;
}

function parseArticle(path: string, html: string): ArticleRow {
  const $ = load(html);
  const container = $("article.article-content").first();
  if (!container.length)
    throw new Error(`${path}: article.article-content ausente`);
  const sourceSlug = path
    .split("/")
    .at(-1)!
    .replace(/\.html$/, "");
  const slug =
    sourceSlug === "artigo-notificacao-inss-obra"
      ? "aviso-regularizacao-obra-receita-federal"
      : sourceSlug;
  const titulo =
    container.find("h1").first().text().trim() ||
    $("meta[property='og:title']").attr("content")?.trim() ||
    "";
  const subtitulo = container.find("p.lead").first().text().trim() || null;
  const eyebrow = container.find(".article-eyebrow").first().text().trim();
  const categoria = eyebrow.split("·")[0]?.trim() || null;
  const faq = container
    .find(".faq details")
    .toArray()
    .map((element) => ({
      pergunta: $(element).find("summary").first().text().trim(),
      resposta: $(element).find("p").first().text().trim(),
    }))
    .filter((item) => item.pergunta && item.resposta);
  container.find(".faq").each((_index, element) => {
    const previous = $(element).prev("h2");
    if (/perguntas frequentes/i.test(previous.text())) previous.remove();
    $(element).remove();
  });
  container
    .find(".back-link,.article-eyebrow,h1.article-title,p.lead")
    .remove();
  container.find("a[href]").each((_index, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    $(element).attr(
      "href",
      href
        .replace(/\/artigos\/index\.html(?:#.*)?$/, "/artigos")
        .replace(/(\/artigos\/[^?#]+)\.html(?=([?#]|$))/, "$1")
        .replace(
          /\/artigos\/artigo-notificacao-inss-obra(?=([?#]|$))/,
          "/artigos/aviso-regularizacao-obra-receita-federal",
        ),
    );
  });
  const conteudoHtml = sanitizeContent(container.html() ?? "");
  const jsonLd = extractJsonLd($);
  const articleSchema = jsonLd.find((item) =>
    ["Article", "BlogPosting", "NewsArticle"].includes(String(item["@type"])),
  );
  const keywords = $("meta[name='keywords']")
    .attr("content")
    ?.split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return {
    slug,
    titulo,
    subtitulo,
    meta_description:
      $("meta[name='description']").attr("content")?.trim() || null,
    og_image_url:
      $("meta[property='og:image']").attr("content")?.trim() || null,
    conteudo_html: conteudoHtml,
    faq,
    schema_type: ["Article", "BlogPosting", "NewsArticle"].includes(
      String(articleSchema?.["@type"]),
    )
      ? String(articleSchema?.["@type"])
      : "Article",
    prioridade_seo: SEO_PRIORITY[slug] ?? 0.8,
    categoria,
    tags: keywords ?? [],
    publicado: true,
    data_publicacao: normalizePublishedDate(articleSchema?.datePublished),
  };
}

function extractJsonLd($: ReturnType<typeof load>) {
  const values: Array<Record<string, unknown>> = [];
  $("script[type='application/ld+json']").each((_index, element) => {
    try {
      const parsed = JSON.parse($(element).text()) as unknown;
      if (Array.isArray(parsed))
        values.push(
          ...parsed.filter(
            (item): item is Record<string, unknown> =>
              typeof item === "object" && item !== null,
          ),
        );
      else if (typeof parsed === "object" && parsed !== null)
        values.push(parsed as Record<string, unknown>);
    } catch {
      // JSON-LD inválido não impede a extração do HTML; a validação final cobre campos essenciais.
    }
  });
  return values;
}

function sanitizeContent(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img",
      "figure",
      "figcaption",
      "details",
      "summary",
      "aside",
      "section",
      "h2",
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      "*": ["id"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      h1: "h2",
      a: (_tagName, attributes) => ({
        tagName: "a",
        attribs: {
          ...attributes,
          ...(attributes.target === "_blank"
            ? { rel: "noopener noreferrer" }
            : {}),
        },
      }),
    },
  }).trim();
}

function normalizePublishedDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function validateArticles(articles: ArticleRow[]) {
  const slugs = new Set<string>();
  for (const article of articles) {
    if (!article.slug || slugs.has(article.slug))
      throw new Error(`Slug inválido ou duplicado: ${article.slug}`);
    slugs.add(article.slug);
    if (!article.titulo || article.conteudo_html.length < 200)
      throw new Error(`${article.slug}: título ou conteúdo insuficiente`);
    if (/\/artigos\/[^\s"']+\.html(?:[?#]|$)/.test(article.conteudo_html))
      throw new Error(`${article.slug}: link interno .html não convertido`);
  }
  const notification = articles.find(
    (article) =>
      article.slug === "aviso-regularizacao-obra-receita-federal",
  );
  if (!notification?.faq.length)
    throw new Error("FAQ do artigo de notificação não foi extraída.");
}

const SEO_PRIORITY: Record<string, number> = {
  "aviso-regularizacao-obra-receita-federal": 0.9,
  "artigo-regularizar-inss-obra": 0.9,
  "custo-regularizar-inss-obra": 0.9,
  "afericao-indireta-receita": 0.8,
  "cobranca-inss-obra-alta": 0.8,
  "erro-cno-receita": 0.8,
  "erro-sero": 0.8,
  "erros-aumentam-inss-obra": 0.8,
  "documentos-regularizacao-obra": 0.7,
  "consultar-pendencias-obra": 0.7,
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
