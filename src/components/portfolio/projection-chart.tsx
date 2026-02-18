"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface Props {
  initialInvestment: number;
  monthlyContribution: number;
  expectedReturn: number;
  volatility: number;
  years?: number;
}

export function ProjectionChart({
  initialInvestment,
  monthlyContribution,
  expectedReturn,
  volatility,
  years = 20,
}: Props) {
  const data = [];
  const annualReturn = expectedReturn / 100;
  const optimisticReturn = (expectedReturn + volatility * 0.5) / 100;
  const pessimisticReturn = Math.max(0, (expectedReturn - volatility * 0.5)) / 100;

  for (let year = 0; year <= years; year++) {
    const base =
      initialInvestment * Math.pow(1 + annualReturn, year) +
      monthlyContribution * 12 * ((Math.pow(1 + annualReturn, year) - 1) / annualReturn || year);

    const optimistic =
      initialInvestment * Math.pow(1 + optimisticReturn, year) +
      monthlyContribution * 12 *
        ((Math.pow(1 + optimisticReturn, year) - 1) / optimisticReturn || year);

    const pessimistic =
      initialInvestment * Math.pow(1 + pessimisticReturn, year) +
      monthlyContribution * 12 *
        ((Math.pow(1 + pessimisticReturn, year) - 1) / (pessimisticReturn || 1) || year);

    data.push({
      year: `${year} an${year > 1 ? "s" : ""}`,
      "Scénario moyen": Math.round(base),
      "Scénario optimiste": Math.round(optimistic),
      "Scénario pessimiste": Math.round(pessimistic),
    });
  }

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} interval={4} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => formatCurrency(v)}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(value as number), ""]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="Scénario optimiste"
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Scénario moyen"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Scénario pessimiste"
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
