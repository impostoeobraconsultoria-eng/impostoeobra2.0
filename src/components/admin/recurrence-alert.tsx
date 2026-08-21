import Link from "next/link";
import type { RecurrenceMatch } from "@/lib/recurrence";

export function RecurrenceAlert({ matches }: { matches: RecurrenceMatch[] }) {
  if (!matches.length) return null;
  return (
    <aside className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-bold">
        ⚠️ Outros cadastros com o mesmo telefone ou e-mail
      </p>
      <ul className="mt-2 space-y-1">
        {matches.map((match) => (
          <li key={`${match.tipo}:${match.id}`}>
            <strong>{match.nome}</strong> —{" "}
            {match.tipo === "lead"
              ? `lead ${match.status_ativacao === "inativo" ? "inativo" : `em ${match.status}`}`
              : "cliente"}
            .{" "}
            <Link
              href={`/admin/${match.tipo === "lead" ? "leads" : "clientes"}/${match.id}`}
              className="font-bold underline"
            >
              Ver ficha
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
