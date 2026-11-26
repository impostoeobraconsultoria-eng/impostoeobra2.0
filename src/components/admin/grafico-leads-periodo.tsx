"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type LeadChartPoint = {
  period: string;
  leads: number;
  converted?: number;
};

export function LeadPeriodChart({
  values,
  monthly = false,
}: {
  values: LeadChartPoint[];
  monthly?: boolean;
}) {
  const formatPeriod = (key: string) =>
    monthly
      ? `${key.slice(5)}/${key.slice(0, 4)}`
      : key.split("-").reverse().join("/");

  return (
    <div className="mt-5 h-72 min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={values}
          margin={{ top: 12, right: 16, left: -24, bottom: 4 }}
        >
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="period"
            tickFormatter={(key: string) =>
              formatPeriod(key).slice(0, monthly ? 7 : 5)
            }
            tick={{ fontSize: 11 }}
            minTickGap={20}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, (max: number) => Math.max(1, max)]}
            tick={{ fontSize: 11 }}
          />
          <Tooltip labelFormatter={(key) => formatPeriod(String(key))} />
          {monthly && <Legend />}
          <Line
            dataKey="leads"
            name="Leads recebidos"
            stroke="#0071e3"
            strokeWidth={2}
            dot={values.length <= 31}
            isAnimationActive={false}
          />
          {monthly && (
            <Line
              dataKey="converted"
              name="Convertidos em clientes"
              stroke="#157a4a"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={values.length <= 31}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
