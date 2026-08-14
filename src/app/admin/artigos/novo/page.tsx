import Link from "next/link";

import { ArticleEditor } from "@/components/admin/article-editor";
import { createArticle } from "../actions";

export default function NewArticlePage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          className="text-sm font-semibold text-slate-500 hover:text-primary"
          href="/admin/artigos"
        >
          ← Voltar aos artigos
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Novo artigo</h1>
        {searchParams?.error && <ErrorMessage code={searchParams.error} />}
        <ArticleEditor action={createArticle} />
      </div>
    </main>
  );
}

function ErrorMessage({ code }: { code: string }) {
  const text =
    code === "image"
      ? "A imagem é inválida ou não pôde ser enviada."
      : code === "save"
        ? "Não foi possível salvar. Verifique se o slug já existe."
        : "Revise os campos obrigatórios.";
  return (
    <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
      {text}
    </p>
  );
}
