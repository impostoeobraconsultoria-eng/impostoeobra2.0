import fs from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const sourcePath = path.join(process.cwd(), "docs", "seed-manual.md");
const dryRun = process.argv.includes("--dry-run");
const productionConfirmed = process.argv.includes("--confirm-production");

function slugify(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/^\d+[.)]?\s*/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 170);
}

function titleCase(value) {
  return value.toLocaleLowerCase("pt-BR").replace(/(^|[\s—-])([\p{L}])/gu, (_, prefix, letter) => prefix + letter.toLocaleUpperCase("pt-BR"));
}

function inlineNodes(text) {
  const nodes = [];
  const token = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|_([^_]+)_|\*([^*]+)\*)/g;
  let cursor = 0;
  for (const match of text.matchAll(token)) {
    if (match.index > cursor) nodes.push({ type: "text", text: text.slice(cursor, match.index) });
    if (match[2]) nodes.push({ type: "text", text: match[2], marks: [{ type: "link", attrs: { href: match[3], target: "_blank", rel: "noopener noreferrer", class: null } }] });
    else if (match[4]) nodes.push({ type: "text", text: match[4], marks: [{ type: "bold" }] });
    else nodes.push({ type: "text", text: match[5] ?? match[6], marks: [{ type: "italic" }] });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) nodes.push({ type: "text", text: text.slice(cursor) });
  return nodes.length ? nodes : [{ type: "text", text }];
}

function paragraph(text) { return { type: "paragraph", content: text ? inlineNodes(text) : undefined }; }

function parseTable(lines, start) {
  const rows = [];
  let index = start;
  while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
    const cells = lines[index].trim().slice(1, -1).split("|").map((cell) => cell.trim());
    if (!cells.every((cell) => /^:?-{3,}:?$/.test(cell))) rows.push(cells);
    index += 1;
  }
  const width = Math.max(...rows.map((row) => row.length));
  return { next: index, node: { type: "table", content: rows.map((row, rowIndex) => ({ type: "tableRow", content: Array.from({ length: width }, (_, cellIndex) => ({ type: rowIndex === 0 ? "tableHeader" : "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [paragraph(row[cellIndex] ?? "")] })) })) } };
}

function markdownToTiptap(markdown) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const content = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] ?? "")) { const table = parseTable(lines, i); content.push(table.node); i = table.next; continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { content.push({ type: "heading", attrs: { level: Math.min(heading[1].length, 3) }, content: inlineNodes(heading[2]) }); i += 1; continue; }
    if (/^\s*---+\s*$/.test(line)) { content.push({ type: "horizontalRule" }); i += 1; continue; }
    if (/^>\s?/.test(line)) { const quote = []; while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, "")); i += 1; } content.push({ type: "blockquote", content: [paragraph(quote.join(" "))] }); continue; }
    const task = line.match(/^\s*-\s+\[([ xX])\]\s+(.+)$/);
    if (task) { const items = []; while (i < lines.length) { const match = lines[i].match(/^\s*-\s+\[([ xX])\]\s+(.+)$/); if (!match) break; items.push({ type: "taskItem", attrs: { checked: match[1].toLowerCase() === "x" }, content: [paragraph(match[2])] }); i += 1; } content.push({ type: "taskList", content: items }); continue; }
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) { const items = []; while (i < lines.length) { const match = lines[i].match(/^\s*[-*]\s+(.+)$/); if (!match) break; items.push({ type: "listItem", content: [paragraph(match[1])] }); i += 1; } content.push({ type: "bulletList", content: items }); continue; }
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (ordered) { const items = []; while (i < lines.length) { const match = lines[i].match(/^\s*\d+[.)]\s+(.+)$/); if (!match) break; items.push({ type: "listItem", content: [paragraph(match[1])] }); i += 1; } content.push({ type: "orderedList", attrs: { start: 1, type: null }, content: items }); continue; }
    const paragraphLines = [line.trim()]; i += 1;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s|^\s*[-*]\s+|^\s*\d+[.)]\s+|^\s*>|^\s*\|/.test(lines[i])) { paragraphLines.push(lines[i].trim()); i += 1; }
    content.push(paragraph(paragraphLines.join(" ")));
  }
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

function splitPages(markdown) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const pages = [];
  let current = null;
  for (const line of lines) {
    const pageHeading = line.match(/^#\s+(\d+)\.\s+(.+)$/);
    if (pageHeading) {
      if (current) pages.push(current);
      const chapter = Number(pageHeading[1]);
      current = { chapter, partSlug: `parte-${["i","ii","iii","iv","v","vi","vii","viii","ix","x","xi"][chapter - 1]}`, title: `${chapter}. ${titleCase(pageHeading[2])}`, body: [] };
    } else if (current) current.body.push(line);
  }
  if (current) pages.push(current);
  return pages.map((page) => ({ ...page, slug: slugify(page.title), content: markdownToTiptap(page.body.join("\n")) }));
}

const markdown = await fs.readFile(sourcePath, "utf8");
const pages = splitPages(markdown);
console.log(`Arquivo analisado: ${pages.length} páginas.`);
if (dryRun) {
  for (const page of pages) console.log(`- ${page.partSlug}/${page.slug}`);
  process.exit(0);
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Defina SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
if (/hmlorleclimexexeysxq/.test(url) && !productionConfirmed) throw new Error("Produção bloqueada. Valide primeiro em dev; depois use --confirm-production conscientemente.");

const supabase = createClient(url, key, { auth: { persistSession: false } });
const [{ data: parts, error: partsError }, { data: admin, error: adminError }] = await Promise.all([
  supabase.from("operacao_partes").select("id,slug"),
  supabase.from("users").select("id").eq("perfil", "admin").eq("ativo", true).order("criado_em", { ascending: true }).limit(1).maybeSingle(),
]);
if (partsError) throw partsError;
if (adminError || !admin) throw adminError ?? new Error("Nenhum administrador ativo encontrado.");
const partIds = new Map(parts.map((part) => [part.slug, part.id]));
let imported = 0; const errors = [];
for (let index = 0; index < pages.length; index += 1) {
  const page = pages[index]; const parteId = partIds.get(page.partSlug);
  if (!parteId) { errors.push(`${page.title}: Parte ${page.partSlug} não encontrada`); continue; }
  const { error } = await supabase.from("operacao_paginas").upsert({ parte_id: parteId, slug: page.slug, titulo: page.title, conteudo: page.content, ordem: (index + 1) * 10, ativo: true, criado_por: admin.id, atualizado_por: admin.id }, { onConflict: "parte_id,slug" });
  if (error) errors.push(`${page.title}: ${error.message}`); else imported += 1;
}
console.log(`${imported} páginas importadas, ${errors.length} erros.`);
for (const error of errors) console.error(`- ${error}`);
if (errors.length) process.exitCode = 1;
