"use client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEur } from "@/lib/format/eur";
import { copy } from "@/lib/copy";
import type { CycleSummary } from "@/lib/trends/types";

export function TrendsChart({ data }: { data: CycleSummary[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.924 0.022 60)" />
          <XAxis dataKey="startDate" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatEur(Number(v))} />
          <Tooltip formatter={(v) => formatEur(Number(v))} />
          <Legend />
          <Bar dataKey="totalBudget" name={copy.trends.budgetSeries} fill="oklch(0.648 0.052 60)" />
          <Bar dataKey="totalSpent" name={copy.trends.spentSeries} fill="oklch(0.581 0.133 38)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
