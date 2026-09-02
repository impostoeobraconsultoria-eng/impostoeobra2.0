"use client";

import { useRouter } from "next/navigation";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type ConsultantLeadSlice = {
  id: string | null;
  nome: string;
  quantidade: number;
};

const COLORS = [
  "#ef4444",
  "#0071e3",
  "#3ab97a",
  "#8b5cf6",
  "#f59e0b",
  "#06b6d4",
];

export function LeadsByConsultantChart({
  values,
}: {
  values: ConsultantLeadSlice[];
}) {
  const router = useRouter();
  const uncovered = values.find((item) => item.id === null)?.quantidade ?? 0;
  return (
    <div>
      {uncovered > 0 && (
        <button
          type="button"
          onClick={() => router.push("/admin/leads?filtro=sem_consultor")}
          className="mb-2 text-left text-2xl font-bold text-red-700 hover:underline"
        >
          {uncovered} lead{uncovered === 1 ? "" : "s"} sem consultor
        </button>
      )}
      <div
        className="h-80 w-full"
        role="img"
        aria-label="Leads ativos distribuídos por consultor"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={values}
              dataKey="quantidade"
              nameKey="nome"
              innerRadius={68}
              outerRadius={112}
              paddingAngle={2}
              onClick={(_, index) => {
                const item = values[index];
                router.push(
                  item?.id
                    ? `/admin/leads?responsavel=${item.id}`
                    : "/admin/leads?filtro=sem_consultor",
                );
              }}
              className="cursor-pointer"
            >
              {values.map((item, index) => (
                <Cell
                  key={item.id ?? "sem_consultor"}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value} lead(s)`, "Quantidade"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
        {values.map((item, index) => (
          <span
            key={item.id ?? "sem_consultor"}
            className="inline-flex items-center gap-1.5"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            {item.nome}: {item.quantidade}
          </span>
        ))}
      </div>
    </div>
  );
}
