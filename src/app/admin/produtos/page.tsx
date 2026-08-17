import {
  ProductsManager,
  type ProductItem,
} from "@/components/admin/products-manager";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function ProductsPage() {
  const supabase = createClient();
  const admin = createAdminClient();
  const [{ data: products, error }, { data: files }] = await Promise.all([
    supabase
      .from("produtos")
      .select("id,nome,slug,descricao,template_contrato_arq,ordem,ativo")
      .order("ordem")
      .order("nome"),
    admin.storage
      .from("templates")
      .list("", { limit: 100, sortBy: { column: "name", order: "asc" } }),
  ]);
  const templates = (files ?? [])
    .map((file) => file.name)
    .filter((name) => name.toLowerCase().endsWith(".docx"));
  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-primary">Administração</p>
        <h1 className="mt-1 text-3xl font-bold">Produtos</h1>
        <p className="mt-2 text-slate-500">
          Gerencie serviços, ordem dos dropdowns e templates de contrato.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-4 text-red-700"
          >
            Não foi possível carregar os produtos.
          </p>
        )}
        <ProductsManager
          initialProducts={(products ?? []) as ProductItem[]}
          templates={templates}
        />
      </div>
    </main>
  );
}
