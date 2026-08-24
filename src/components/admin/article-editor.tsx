"use client";

import { useState } from "react";
import Link from "next/link";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Plus,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";
import { articleLinkAttributes } from "@/lib/article-links";

export type ArticleEditorValue = {
  id?: string;
  titulo?: string | null;
  subtitulo?: string | null;
  slug?: string | null;
  meta_description?: string | null;
  og_image_url?: string | null;
  conteudo_html?: string | null;
  faq?: Array<{ pergunta: string; resposta: string }>;
  schema_type?: string | null;
  prioridade_seo?: number | string | null;
  categoria?: string | null;
  cluster?: string | null;
  tags?: string[] | null;
  publicado?: boolean;
};

export function ArticleEditor({
  action,
  value = {},
}: {
  action: (formData: FormData) => void | Promise<void>;
  value?: ArticleEditorValue;
}) {
  const editing = Boolean(value.id);
  const [title, setTitle] = useState(value.titulo ?? "");
  const [slug, setSlug] = useState(value.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [faq, setFaq] = useState(value.faq ?? []);
  const [html, setHtml] = useState(value.conteudo_html ?? "");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: { target: null, rel: null },
        },
      }),
      Placeholder.configure({ placeholder: "Escreva o conteúdo do artigo…" }),
    ],
    content: value.conteudo_html ?? "",
    onUpdate: ({ editor: currentEditor }) => setHtml(currentEditor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "article-html min-h-[420px] rounded-b-xl bg-white px-5 py-4 outline-none",
      },
    },
  });

  function changeTitle(nextTitle: string) {
    setTitle(nextTitle);
    if (!slugTouched) setSlug(slugify(nextTitle));
  }

  function setEditorLink() {
    if (!editor) return;
    const current = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("URL do link", current ?? "https://");
    if (href === null) return;
    if (!href.trim()) editor.chain().focus().unsetLink().run();
    else {
      const normalizedHref = href.trim();
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({
          href: normalizedHref,
          ...articleLinkAttributes(normalizedHref),
        })
        .run();
    }
  }

  return (
    <form action={action} className="mt-6 space-y-6">
      <input type="hidden" name="conteudo_html" value={html} readOnly />
      <input type="hidden" name="faq" value={JSON.stringify(faq)} readOnly />

      <section className="grid gap-5 rounded-2xl border bg-white p-6 lg:grid-cols-2">
        <label className="field lg:col-span-2">
          Título *
          <input
            className="input"
            name="titulo"
            required
            maxLength={180}
            value={title}
            onChange={(event) => changeTitle(event.target.value)}
          />
        </label>
        <label className="field lg:col-span-2">
          Subtítulo
          <input
            className="input"
            name="subtitulo"
            maxLength={300}
            defaultValue={value.subtitulo ?? ""}
          />
        </label>
        <label className="field">
          Slug *
          <input
            className="input disabled:bg-slate-100 disabled:text-slate-500"
            name="slug"
            required
            readOnly={editing}
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
          />
          {editing && (
            <span className="mt-1 block text-xs font-normal text-slate-500">
              A URL não muda após a criação.
            </span>
          )}
        </label>
        <label className="field">
          Categoria
          <input
            className="input"
            name="categoria"
            maxLength={80}
            defaultValue={value.categoria ?? ""}
          />
        </label>
        <label className="field">
          Cluster de conteúdo
          <select
            className="input"
            name="cluster"
            defaultValue={value.cluster ?? ""}
          >
            <option value="">— Selecione —</option>
            {[
              "Regularização",
              "Cobranças",
              "Erros",
              "Custos",
              "Sistemas RFB",
            ].map((cluster) => (
              <option key={cluster}>{cluster}</option>
            ))}
          </select>
        </label>
        <label className="field lg:col-span-2">
          Meta description
          <textarea
            className="input min-h-24"
            name="meta_description"
            maxLength={170}
            defaultValue={value.meta_description ?? ""}
          />
        </label>
        <label className="field lg:col-span-2">
          Tags
          <input
            className="input"
            name="tags"
            defaultValue={value.tags?.join(", ") ?? ""}
            placeholder="CNO, SERO, CND"
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Separe as tags por vírgula.
          </span>
        </label>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-slate-50">
        <div className="flex flex-wrap gap-1 border-b p-2">
          <ToolbarButton
            label="Negrito"
            active={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold />
          </ToolbarButton>
          <ToolbarButton
            label="Itálico"
            active={editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic />
          </ToolbarButton>
          <ToolbarButton
            label="Título 2"
            active={editor?.isActive("heading", { level: 2 })}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 />
          </ToolbarButton>
          <ToolbarButton
            label="Título 3"
            active={editor?.isActive("heading", { level: 3 })}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            <Heading3 />
          </ToolbarButton>
          <ToolbarButton
            label="Lista"
            active={editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List />
          </ToolbarButton>
          <ToolbarButton
            label="Lista numerada"
            active={editor?.isActive("orderedList")}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered />
          </ToolbarButton>
          <ToolbarButton
            label="Link"
            active={editor?.isActive("link")}
            onClick={setEditorLink}
          >
            <LinkIcon />
          </ToolbarButton>
          <ToolbarButton
            label="Desfazer"
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 />
          </ToolbarButton>
          <ToolbarButton
            label="Refazer"
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 />
          </ToolbarButton>
        </div>
        <EditorContent editor={editor} />
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Perguntas frequentes</h2>
            <p className="mt-1 text-sm text-slate-500">
              Geram também o schema FAQPage no artigo público.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
            type="button"
            onClick={() => setFaq([...faq, { pergunta: "", resposta: "" }])}
          >
            <Plus className="size-4" /> Adicionar
          </button>
        </div>
        <div className="mt-5 space-y-4">
          {faq.map((item, index) => (
            <div
              className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[1fr_auto]"
              key={index}
            >
              <div className="grid gap-3">
                <input
                  className="input !mt-0"
                  aria-label={`Pergunta ${index + 1}`}
                  placeholder="Pergunta"
                  value={item.pergunta}
                  onChange={(event) =>
                    updateFaq(
                      setFaq,
                      faq,
                      index,
                      "pergunta",
                      event.target.value,
                    )
                  }
                />
                <textarea
                  className="input !mt-0 min-h-24"
                  aria-label={`Resposta ${index + 1}`}
                  placeholder="Resposta"
                  value={item.resposta}
                  onChange={(event) =>
                    updateFaq(
                      setFaq,
                      faq,
                      index,
                      "resposta",
                      event.target.value,
                    )
                  }
                />
              </div>
              <button
                className="self-start rounded-lg p-2 text-red-600 hover:bg-red-50"
                type="button"
                aria-label={`Remover pergunta ${index + 1}`}
                onClick={() =>
                  setFaq(faq.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                <Trash2 className="size-5" />
              </button>
            </div>
          ))}
          {!faq.length && (
            <p className="text-sm text-slate-500">
              Nenhuma pergunta adicionada.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-5 rounded-2xl border bg-white p-6 md:grid-cols-2 lg:grid-cols-4">
        <label className="field lg:col-span-2">
          Imagem OG
          <input
            className="input"
            type="file"
            name="og_image"
            accept="image/png,image/jpeg,image/webp"
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            PNG, JPG ou WebP, até 5 MB. Recomendado: 1200 × 630 px.
          </span>
        </label>
        <label className="field">
          Schema
          <select
            className="input"
            name="schema_type"
            defaultValue={value.schema_type ?? "Article"}
          >
            <option>Article</option>
            <option>BlogPosting</option>
            <option>NewsArticle</option>
          </select>
        </label>
        <label className="field">
          Prioridade SEO
          <input
            className="input"
            type="number"
            name="prioridade_seo"
            min="0"
            max="1"
            step="0.1"
            defaultValue={String(value.prioridade_seo ?? 0.8)}
          />
        </label>
        {value.og_image_url && (
          <a
            className="text-sm font-semibold text-primary"
            href={value.og_image_url}
            target="_blank"
            rel="noreferrer"
          >
            Ver imagem OG atual
          </a>
        )}
        <label className="flex items-center gap-3 font-semibold lg:col-span-2">
          <input
            className="size-5 accent-primary"
            type="checkbox"
            name="publicado"
            defaultChecked={value.publicado}
          />
          Publicado
        </label>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-wrap justify-end gap-3 rounded-2xl border bg-white/95 p-4 shadow-xl backdrop-blur">
        {value.id && (
          <Link
            className="rounded-full border px-5 py-3 font-bold"
            href={`/admin/artigos/${value.id}/preview`}
            target="_blank"
          >
            Preview
          </Link>
        )}
        <button className="rounded-full bg-accent px-6 py-3 font-bold text-white">
          Salvar artigo
        </button>
      </div>
    </form>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`rounded-lg p-2 ${active ? "bg-primary text-white" : "text-slate-600 hover:bg-white"}`}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="block size-4 [&>svg]:size-4">{children}</span>
    </button>
  );
}

function updateFaq(
  setFaq: React.Dispatch<
    React.SetStateAction<Array<{ pergunta: string; resposta: string }>>
  >,
  faq: Array<{ pergunta: string; resposta: string }>,
  index: number,
  field: "pergunta" | "resposta",
  value: string,
) {
  setFaq(
    faq.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    ),
  );
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);
}
