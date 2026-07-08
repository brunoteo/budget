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
import { formatMonthYear } from "@/lib/format/date";
import { copy } from "@/lib/copy";

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
            domain={[0, (max: number) => Math.max(100, max * 1.1)]}
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
            name={copy.trends.salaryPercentSeries}
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
