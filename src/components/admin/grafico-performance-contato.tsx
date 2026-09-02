"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ContactPerformancePoint = {
  day: string;
  verde: number;
  amarelo: number;
  vermelho: number;
};

export function ContactPerformanceChart({
  values,
}: {
  values: ContactPerformancePoint[];
}) {
  return (
    <div
      className="h-80 w-full"
      role="img"
      aria-label="Tempo até o primeiro contato nos últimos 30 dias"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={values}
          margin={{ top: 16, right: 8, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} minTickGap={20} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="verde"
            name="Contato em menos de 1h"
            stackId="sla"
            fill="#3ab97a"
          />
          <Bar
            dataKey="amarelo"
            name="Contato entre 1h e 3h"
            stackId="sla"
            fill="#f59e0b"
          />
          <Bar
            dataKey="vermelho"
            name="Acima de 3h ou sem contato"
            stackId="sla"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
