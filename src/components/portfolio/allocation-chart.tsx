"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ASSET_CLASS_COLORS } from "@/lib/utils";
import type { PortfolioAllocation } from "@/types/database";

interface Props {
  allocations: PortfolioAllocation[];
}

export function AllocationChart({ allocations }: Props) {
  // Group by asset class
  const grouped = allocations.reduce<Record<string, number>>((acc, alloc) => {
    acc[alloc.asset_class] = (acc[alloc.asset_class] || 0) + alloc.weight;
    return acc;
  }, {});

  const data = Object.entries(grouped).map(([name, value]) => ({
    name,
    value,
    color: ASSET_CLASS_COLORS[name] || "#6b7280",
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ value }) => `${value}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${value}%`, "Allocation"]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => (
              <span className="text-xs">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
