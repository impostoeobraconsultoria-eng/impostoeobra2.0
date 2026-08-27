"use client";

import type { JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import { operacaoExtensions } from "@/lib/tiptap/extensions";

export function OperacaoViewer({ content }: { content: JSONContent }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: operacaoExtensions(),
    content,
    editorProps: { attributes: { class: "operacao-prose outline-none" } },
  });
  return <EditorContent editor={editor} />;
}
