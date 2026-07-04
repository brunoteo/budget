"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalaryPercentPoint } from "@/lib/trends/types";

const MONTHS_IT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

function formatMonthYear(iso: string): string {
  const [yStr, mStr] = iso.split("-");
  const m = Number(mStr);
  if (!yStr || !m || m < 1 || m > 12) return iso;
  return `${MONTHS_IT[m - 1]} '${yStr.slice(-2)}`;
}

export function SalaryPercentChart({ data }: { data: SalaryPercentPoint[] }) {
  const chartData = data.map((p) => ({
    startDate: p.startDate,
    percent: p.percent === null ? null : p.percent * 100,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.924 0.022 60)" vertical={false} />
          <XAxis
            dataKey="startDate"
            tick={{ fontSize: 11 }}
            tickFormatter={formatMonthYear}
            tickMargin={6}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `${v}%`}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            formatter={(v) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(1)}%`)}
            labelFormatter={(label) => (typeof label === "string" ? formatMonthYear(label) : String(label))}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <ReferenceLine y={100} stroke="oklch(0.581 0.133 38)" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="percent"
            stroke="oklch(0.581 0.133 38)"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
