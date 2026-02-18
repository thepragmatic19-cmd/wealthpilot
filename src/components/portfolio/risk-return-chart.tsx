"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatPercent } from "@/lib/utils";

interface PortfolioPoint {
  name: string;
  volatility: number;
  expectedReturn: number;
  color: string;
}

interface Props {
  portfolios: PortfolioPoint[];
}

const COLORS = {
  conservateur: "#3b82f6",
  suggéré: "#22c55e",
  ambitieux: "#f59e0b",
};

export function RiskReturnChart({ portfolios }: Props) {
  const data = portfolios.map((p) => ({
    x: p.volatility,
    y: p.expectedReturn,
    name: p.name,
    color: p.color,
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="x"
            name="Volatilité"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `${v}%`}
            label={{ value: "Volatilité (%)", position: "bottom", offset: -5, fontSize: 12 }}
          />
          <YAxis
            dataKey="y"
            name="Rendement"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `${v}%`}
            label={{ value: "Rendement (%)", angle: -90, position: "insideLeft", fontSize: 12 }}
          />
          <Tooltip
            formatter={(value, name) => [
              formatPercent(value as number),
              name === "x" ? "Volatilité" : "Rendement",
            ]}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.name || ""
            }
          />
          <Scatter data={data} fill="#8884d8">
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color || Object.values(COLORS)[index]} r={8} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
