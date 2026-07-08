"use client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEur } from "@/lib/format/eur";
import { formatMonthYear } from "@/lib/format/date";
import { copy } from "@/lib/copy";
import type { CycleSummary } from "@/lib/trends/types";

function formatCompactEur(v: number): string {
  if (v === 0) return "0";
  if (Math.abs(v) >= 1000) {
    const k = v / 1000;
    const digits = k % 1 === 0 ? 0 : 1;
    return `${k.toLocaleString("it-IT", { minimumFractionDigits: digits, maximumFractionDigits: digits })}k`;
  }
  return v.toLocaleString("it-IT");
}

export function TrendsChart({ data }: { data: CycleSummary[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
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
            tickFormatter={formatCompactEur}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            formatter={(v) => formatEur(Number(v))}
            labelFormatter={(label) => (typeof label === "string" ? formatMonthYear(label) : String(label))}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />
          <Bar dataKey="totalBudget" name={copy.trends.budgetSeries} fill="oklch(0.648 0.052 60)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="totalSpent" name={copy.trends.spentSeries} fill="oklch(0.581 0.133 38)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
