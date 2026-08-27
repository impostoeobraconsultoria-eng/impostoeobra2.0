import { notFound } from "next/navigation";
import { NewOperacaoPageForm } from "@/components/operacao/new-page-form";
import { getOperacaoConfig } from "@/lib/operacao/get-config";
import { listOperacaoTree } from "@/lib/operacao/queries";

export default async function NovaOperacaoPage() {
  const [config, partes] = await Promise.all([
    getOperacaoConfig(),
    listOperacaoTree(),
  ]);
  if (!config.habilitarCriacao) notFound();
  return <NewOperacaoPageForm partes={partes.filter((parte) => parte.ativo)} />;
}
