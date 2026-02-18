"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { simulatePerformance } from "@/lib/portfolio/performance-simulator";
import { TrendingUp } from "lucide-react";
import type { Transaction } from "@/types/database";

interface Props {
  transactions: Transaction[];
  expectedReturn: number; // e.g. 7.5
}

export function PerformanceChart({ transactions, expectedReturn }: Props) {
  const data = useMemo(
    () => simulatePerformance(transactions, expectedReturn),
    [transactions, expectedReturn]
  );

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <TrendingUp className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Aucune transaction enregistrée. Ajoutez vos premières transactions pour voir
          l&apos;évolution de votre portefeuille.
        </p>
      </div>
    );
  }

  // Show every Nth label to avoid crowding
  const interval = Math.max(1, Math.floor(data.length / 8));

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gradCapital" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradValeur" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            interval={interval}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => formatCurrency(v)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--card-foreground))",
            }}
            formatter={(value) => [formatCurrency(value as number), ""]}
            labelStyle={{ fontWeight: "bold", marginBottom: 4 }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="capitalInvesti"
            name="Capital investi"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#gradCapital)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="valeurEstimee"
            name="Valeur estimée"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#gradValeur)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="benchmark"
            name="Benchmark marché (7%)"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            fill="none"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
