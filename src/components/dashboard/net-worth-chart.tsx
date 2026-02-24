"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface Snapshot {
  snapshot_date: string;
  total_assets: number | null;
  total_debts: number | null;
  net_worth: number | null;
}

interface Props {
  snapshots: Snapshot[];
}

const CAD = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-CA", { month: "short", year: "2-digit" });
}

export function NetWorthChart({ snapshots }: Props) {
  // Calculate 3-month variation
  let variationPct: number | null = null;
  if (snapshots.length >= 2) {
    const recent = Number(snapshots[snapshots.length - 1].net_worth || 0);
    const threeMonthsBack = snapshots.length >= 4
      ? Number(snapshots[snapshots.length - 4].net_worth || 0)
      : Number(snapshots[0].net_worth || 0);
    if (threeMonthsBack > 0) {
      variationPct = Math.round(((recent - threeMonthsBack) / threeMonthsBack) * 1000) / 10;
    }
  }

  const chartData = snapshots.map((s) => ({
    date: formatDate(s.snapshot_date),
    valeur: Number(s.net_worth || 0),
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Évolution du patrimoine
          </CardTitle>
          <CardDescription>
            {variationPct !== null ? (
              <span className={variationPct >= 0 ? "text-green-600" : "text-red-500"}>
                {variationPct >= 0 ? "+" : ""}{variationPct}% sur 3 mois
              </span>
            ) : (
              "Valeur nette sur les 12 derniers mois"
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {snapshots.length < 2 ? (
          <div className="flex h-[180px] items-center justify-center text-center">
            <p className="text-sm text-muted-foreground max-w-xs">
              Revenez dans un mois pour voir l&apos;évolution de votre patrimoine.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => CAD.format(v).replace("CA", "").trim()}
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip
                formatter={(value) => [CAD.format(Number(value)), "Valeur nette"]}
                labelFormatter={(label) => `${label}`}
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="valeur"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#netWorthGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#6366f1" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
