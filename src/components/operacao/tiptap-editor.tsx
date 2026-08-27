"use client";

import { useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  Bold, CheckSquare, Code2, Columns3, Heading1, Heading2, Heading3,
  Image as ImageIcon, Italic, Link as LinkIcon, List, ListOrdered,
  Minus, Quote, Redo2, Rows3, Strikethrough, Table2, Trash2,
  Underline as UnderlineIcon, Undo2,
} from "lucide-react";
import { operacaoExtensions } from "@/lib/tiptap/extensions";

type SaveState = "saved" | "saving" | "error";

export function OperacaoEditor({
  initialContent,
  onSave,
}: {
  initialContent: JSONContent;
  onSave: (content: JSONContent) => Promise<void>;
}) {
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(onSave);
  useEffect(() => { saveRef.current = onSave; }, [onSave]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: operacaoExtensions("Escreva o procedimento operacional…"),
    content: initialContent,
    editorProps: { attributes: { class: "operacao-prose min-h-[55vh] px-5 py-6 outline-none sm:px-8" } },
    onUpdate: ({ editor: current }) => {
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      const content = current.getJSON();
      timer.current = setTimeout(async () => {
        try { await saveRef.current(content); setSaveState("saved"); }
        catch { setSaveState("error"); }
      }, 3000);
    },
  });

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function setLink() {
    if (!editor) return;
    const href = window.prompt("URL do link", editor.getAttributes("link").href ?? "https://");
    if (href === null) return;
    if (!href.trim()) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  function addImage() {
    const src = window.prompt("URL pública da imagem", "https://");
    if (src?.trim()) editor?.chain().focus().setImage({ src: src.trim() }).run();
  }

  const button = (label: string, action: () => void, icon: React.ReactNode, active = false) => (
    <button type="button" title={label} aria-label={label} onClick={action}
      className={`rounded-lg p-2 transition ${active ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}>
      {icon}
    </button>
  );
  const iconClass = "size-4";

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b bg-white/95 p-2 backdrop-blur">
        {button("Negrito", () => editor?.chain().focus().toggleBold().run(), <Bold className={iconClass} />, editor?.isActive("bold"))}
        {button("Itálico", () => editor?.chain().focus().toggleItalic().run(), <Italic className={iconClass} />, editor?.isActive("italic"))}
        {button("Sublinhado", () => editor?.chain().focus().toggleUnderline().run(), <UnderlineIcon className={iconClass} />, editor?.isActive("underline"))}
        {button("Tachado", () => editor?.chain().focus().toggleStrike().run(), <Strikethrough className={iconClass} />, editor?.isActive("strike"))}
        {([1, 2, 3] as const).map((level) => button(`Título ${level}`, () => editor?.chain().focus().toggleHeading({ level }).run(), level === 1 ? <Heading1 className={iconClass} /> : level === 2 ? <Heading2 className={iconClass} /> : <Heading3 className={iconClass} />, editor?.isActive("heading", { level })))}
        {button("Lista", () => editor?.chain().focus().toggleBulletList().run(), <List className={iconClass} />, editor?.isActive("bulletList"))}
        {button("Lista numerada", () => editor?.chain().focus().toggleOrderedList().run(), <ListOrdered className={iconClass} />, editor?.isActive("orderedList"))}
        {button("Checklist", () => editor?.chain().focus().toggleTaskList().run(), <CheckSquare className={iconClass} />, editor?.isActive("taskList"))}
        {button("Citação", () => editor?.chain().focus().toggleBlockquote().run(), <Quote className={iconClass} />, editor?.isActive("blockquote"))}
        {button("Código", () => editor?.chain().focus().toggleCodeBlock().run(), <Code2 className={iconClass} />, editor?.isActive("codeBlock"))}
        {button("Link", setLink, <LinkIcon className={iconClass} />, editor?.isActive("link"))}
        {button("Imagem por URL", addImage, <ImageIcon className={iconClass} />)}
        {button("Linha horizontal", () => editor?.chain().focus().setHorizontalRule().run(), <Minus className={iconClass} />)}
        {button("Inserir tabela 3x3", () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), <Table2 className={iconClass} />)}
        {button("Adicionar linha", () => editor?.chain().focus().addRowAfter().run(), <Rows3 className={iconClass} />)}
        {button("Adicionar coluna", () => editor?.chain().focus().addColumnAfter().run(), <Columns3 className={iconClass} />)}
        {button("Excluir linha", () => editor?.chain().focus().deleteRow().run(), <Trash2 className={iconClass} />)}
        {button("Excluir coluna", () => editor?.chain().focus().deleteColumn().run(), <Trash2 className={iconClass} />)}
        {button("Excluir tabela", () => editor?.chain().focus().deleteTable().run(), <Trash2 className={iconClass} />)}
        {button("Desfazer", () => editor?.chain().focus().undo().run(), <Undo2 className={iconClass} />)}
        {button("Refazer", () => editor?.chain().focus().redo().run(), <Redo2 className={iconClass} />)}
        <span className={`ml-auto px-2 text-xs font-semibold ${saveState === "error" ? "text-red-600" : "text-slate-500"}`} aria-live="polite">
          {saveState === "saving" ? "Salvando…" : saveState === "error" ? "Erro ao salvar" : "Salvo"}
        </span>
      </div>
      <EditorContent editor={editor} />
    </section>
  );
}
