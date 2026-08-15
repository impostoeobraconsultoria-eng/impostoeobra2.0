"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const eventTypes = ["reuniao", "follow_up", "prazo", "tarefa_interna"] as const;
const statuses = ["agendado", "concluido", "cancelado"] as const;

async function context() {
  const supabase = createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims.email;
  if (typeof email !== "string") throw new Error("Sessão expirada.");
  const { data: user } = await supabase
    .from("users")
    .select("id,perfil")
    .eq("email", email)
    .eq("ativo", true)
    .maybeSingle();
  if (!user) throw new Error("Usuário não autorizado.");
  return { supabase, user };
}

function localToIso(value: string) {
  if (!value) return null;
  const withZone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00-03:00`
    : value;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseEvent(formData: FormData) {
  const reference = String(formData.get("referencia") ?? "");
  const [refTipo, refId] = reference ? reference.split(":") : ["", ""];
  const reminderRaw = String(formData.get("lembrete") ?? "");
  const reminder =
    reminderRaw === "custom"
      ? Number(formData.get("lembrete_custom"))
      : reminderRaw === ""
        ? null
        : Number(reminderRaw);
  return z
    .object({
      titulo: z.string().trim().min(2).max(180),
      descricao: z.preprocess(
        (v) => String(v ?? "").trim() || null,
        z.string().max(3000).nullable(),
      ),
      tipo: z.enum(eventTypes),
      data_hora_inicio: z.string().datetime(),
      data_hora_fim: z.string().datetime().nullable(),
      dia_inteiro: z.boolean(),
      lembrete_minutos: z.number().int().min(0).max(525600).nullable(),
      ref_tipo: z.enum(["lead", "cliente", "contrato"]).nullable(),
      ref_id: z.string().uuid().nullable(),
      responsavel_id: z.string().uuid(),
    })
    .refine(
      (event) =>
        !event.data_hora_fim ||
        new Date(event.data_hora_fim) >= new Date(event.data_hora_inicio),
      {
        message: "A data de término deve ser posterior ao início.",
        path: ["data_hora_fim"],
      },
    )
    .safeParse({
      titulo: formData.get("titulo"),
      descricao: formData.get("descricao"),
      tipo: formData.get("tipo"),
      data_hora_inicio: localToIso(
        String(formData.get("data_hora_inicio") ?? ""),
      ),
      data_hora_fim: localToIso(String(formData.get("data_hora_fim") ?? "")),
      dia_inteiro: formData.get("dia_inteiro") === "on",
      lembrete_minutos: reminder,
      ref_tipo: refTipo || null,
      ref_id: refId || null,
      responsavel_id: formData.get("responsavel_id"),
    });
}

export async function createAgendaEvent(formData: FormData) {
  const parsed = parseEvent(formData);
  if (!parsed.success) redirect("/admin/agenda?error=invalid");
  const { supabase, user } = await context();
  const { data, error } = await supabase
    .from("eventos_agenda")
    .insert({ ...parsed.data, criado_por: user.id, status: "agendado" })
    .select("id")
    .single();
  if (error || !data) redirect("/admin/agenda?error=save");
  revalidatePath("/admin/agenda");
  if (parsed.data.ref_tipo && parsed.data.ref_id)
    revalidatePath(
      `/admin/${parsed.data.ref_tipo === "lead" ? "leads" : parsed.data.ref_tipo === "cliente" ? "clientes" : "contratos"}/${parsed.data.ref_id}`,
    );
  redirect(`/admin/agenda?evento=${data.id}&saved=1`);
}

export async function updateAgendaEvent(id: string, formData: FormData) {
  if (!z.string().uuid().safeParse(id).success)
    redirect("/admin/agenda?error=invalid");
  const parsed = parseEvent(formData);
  if (!parsed.success) redirect(`/admin/agenda?evento=${id}&error=invalid`);
  const { supabase } = await context();
  const { error } = await supabase
    .from("eventos_agenda")
    .update(parsed.data)
    .eq("id", id)
    .is("deleted_at", null);
  if (error) redirect(`/admin/agenda?evento=${id}&error=save`);
  revalidatePath("/admin/agenda");
  redirect(`/admin/agenda?evento=${id}&saved=1`);
}

export async function setAgendaEventStatus(id: string, status: string) {
  const parsed = z
    .object({ id: z.string().uuid(), status: z.enum(statuses) })
    .safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Evento inválido." };
  const { supabase } = await context();
  const { error } = await supabase
    .from("eventos_agenda")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/agenda");
  return { ok: true };
}

export async function deleteAgendaEvent(id: string) {
  if (!z.string().uuid().safeParse(id).success)
    return { ok: false, error: "Evento inválido." };
  const { supabase, user } = await context();
  if (user.perfil !== "admin")
    return {
      ok: false,
      error: "Somente administradores podem excluir eventos.",
    };
  const { error } = await supabase.from("eventos_agenda").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/agenda");
  return { ok: true };
}
