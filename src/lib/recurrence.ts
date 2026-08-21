import "server-only";

import { createClient } from "@/lib/supabase/server";

export type RecurrenceMatch = {
  id: string;
  tipo: "lead" | "cliente";
  nome: string;
  data_hora?: string;
  status?: string;
  status_ativacao?: string;
};

export async function findRecurrencesForRecord({
  phone,
  email,
  excludeLeadId,
  excludeCustomerId,
}: {
  phone?: string | null;
  email?: string | null;
  excludeLeadId?: string;
  excludeCustomerId?: string;
}) {
  const supabase = createClient();
  const queries = [];
  const leadBase = () => {
    let query = supabase
      .from("leads")
      .select("id,nome,data_hora,status,status_ativacao")
      .is("deleted_at", null)
      .is("convertido_em", null)
      .limit(10);
    if (excludeLeadId) query = query.neq("id", excludeLeadId);
    return query;
  };
  const customerBase = () => {
    let query = supabase
      .from("clientes")
      .select("id,nome,criado_em")
      .is("deleted_at", null)
      .limit(10);
    if (excludeCustomerId) query = query.neq("id", excludeCustomerId);
    return query;
  };
  if (phone) {
    queries.push(leadBase().eq("telefone_normalizado", phone));
    queries.push(customerBase().eq("telefone_normalizado", phone));
  }
  if (email) {
    const safe = email
      .trim()
      .toLowerCase()
      .replace(/[\\%_]/g, "\\$&");
    queries.push(leadBase().ilike("email", safe));
    queries.push(customerBase().ilike("email", safe));
  }
  const results = await Promise.all(queries);
  const matches = new Map<string, RecurrenceMatch>();
  for (const result of results)
    for (const row of result.data ?? []) {
      const isLead = "status" in row;
      matches.set(`${isLead ? "lead" : "cliente"}:${row.id}`, {
        ...row,
        tipo: isLead ? "lead" : "cliente",
      } as RecurrenceMatch);
    }
  return Array.from(matches.values());
}
