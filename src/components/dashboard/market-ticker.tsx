"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Quote {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    currency: string;
}

function formatPrice(price: number, symbol: string): string {
    if (symbol === "CADUSD=X") return price.toFixed(4);
    if (price > 10000) return price.toLocaleString("fr-CA", { maximumFractionDigits: 0 });
    return price.toLocaleString("fr-CA", { maximumFractionDigits: 2 });
}

export function MarketTicker() {
  const { data, isLoading } = useQuery({
    queryKey: ["market-quotes"],
    queryFn: async () => {
      const res = await fetch("/api/market/quotes");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{
        quotes: Quote[];
        cached: boolean;
        timestamp: string;
      }>;
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 min
    staleTime: 4 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-hidden pb-2 -mx-2 px-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-[72px] w-[180px] shrink-0 rounded-2xl" />
        ))}
      </div>
    );
  }

  const quotes = data?.quotes || [];

  return (
    <div className="group relative">
      {/* Fade only on the right edge to hint at scrollable content */}
      <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 no-scrollbar scroll-smooth">
        <div className="flex gap-4 min-w-full">
          {quotes.map((q) => {
            const isUp = q.change > 0;
            const isFlat = q.change === 0;
            return (
              <div 
                key={q.symbol} 
                className="shrink-0 min-w-[180px] rounded-2xl border bg-card/40 backdrop-blur-sm p-3.5 shadow-sm hover:shadow-md hover:bg-card/60 transition-all duration-200 cursor-default"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full animate-pulse",
                      isUp ? "bg-green-500" : isFlat ? "bg-muted-foreground" : "bg-red-500"
                    )} />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                      {q.name}
                    </p>
                  </div>
                  {isUp ? (
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  ) : isFlat ? (
                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  )}
                </div>
                
                <div className="flex items-baseline gap-1.5">
                  <p className="text-lg font-black tracking-tight">
                    {formatPrice(q.price, q.symbol)}
                  </p>
                  <span className="text-[10px] font-bold opacity-50">{q.currency}</span>
                </div>
                
                <p className={cn(
                  "text-[11px] font-bold mt-1",
                  isUp ? "text-green-600 dark:text-green-400" : isFlat ? "text-muted-foreground" : "text-red-500"
                )}>
                  {isUp ? "▲" : isFlat ? "•" : "▼"} {Math.abs(q.changePercent).toFixed(2)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
