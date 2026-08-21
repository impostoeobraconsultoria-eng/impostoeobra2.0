"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { UFS, VAU_COLUMNS } from "@/lib/vau-constants";

const moneyValue = z.preprocess(
  (value) => Number(String(value).replace(",", ".")),
  z.number().finite().positive().max(99999999.99),
);

export async function saveVau(formData: FormData) {
  const vigencia = z
    .string()
    .trim()
    .min(4)
    .max(80)
    .safeParse(formData.get("vigencia"));
  const rows = UFS.map((uf) => {
    const values = Object.fromEntries(
      VAU_COLUMNS.map(({ key }) => [key, formData.get(`${uf}.${key}`)]),
    );
    return z
      .object(
        Object.fromEntries(
          VAU_COLUMNS.map(({ key }) => [key, moneyValue]),
        ) as Record<(typeof VAU_COLUMNS)[number]["key"], typeof moneyValue>,
      )
      .safeParse(values);
  });
  if (!vigencia.success || rows.some((row) => !row.success))
    redirect("/admin/vau?error=invalid");

  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string") throw new Error("Sessão expirada.");
  const { data: admin } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .eq("ativo", true)
    .eq("perfil", "admin")
    .single();
  if (!admin) throw new Error("Acesso restrito a administradores.");

  const payload = UFS.map((uf, index) => ({
    uf,
    ...(rows[index].success ? rows[index].data : {}),
    vigencia: vigencia.data,
  }));
  const { error } = await supabase
    .from("vau")
    .upsert(payload, { onConflict: "uf" });
  if (error) {
    console.error("Falha ao salvar VAU", { code: error.code });
    redirect("/admin/vau?error=save");
  }
  const { error: configError } = await supabase
    .from("config")
    .upsert(
      { chave: "vau_vigencia", valor: vigencia.data },
      { onConflict: "chave" },
    );
  if (configError) {
    console.error("Falha ao atualizar vigência da VAU", {
      code: configError.code,
    });
    redirect("/admin/vau?error=save");
  }
  revalidateTag("config");
  revalidateTag("vau");
  revalidatePath("/api/vau");
  revalidatePath("/admin/vau");
  redirect("/admin/vau?saved=1");
}
