"use client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEur } from "@/lib/format/eur";
import type { TrendCycle } from "@/server/queries/trends";

export function TrendsChart({ data }: { data: TrendCycle[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.924 0.022 60)" />
          <XAxis dataKey="start_date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatEur(Number(v))} />
          <Tooltip formatter={(v) => formatEur(Number(v))} />
          <Legend />
          <Bar dataKey="total_budget" name="Budget" fill="oklch(0.648 0.052 60)" />
          <Bar dataKey="total_spent" name="Speso" fill="oklch(0.581 0.133 38)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
