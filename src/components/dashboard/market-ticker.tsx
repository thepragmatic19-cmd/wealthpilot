"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
            return res.json() as Promise<{ quotes: Quote[]; cached: boolean; timestamp: string }>;
        },
        refetchInterval: 5 * 60 * 1000, // Refresh every 5 min
        staleTime: 4 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="flex gap-3 overflow-x-auto pb-1">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 w-40 shrink-0" />
                ))}
            </div>
        );
    }

    const quotes = data?.quotes || [];

    return (
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {quotes.map((q) => {
                const isUp = q.change > 0;
                const isFlat = q.change === 0;
                return (
                    <Card key={q.symbol} className="shrink-0 min-w-[140px] border-border/50">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium text-muted-foreground truncate">{q.name}</p>
                                {isFlat ? (
                                    <Minus className="h-3 w-3 text-muted-foreground" />
                                ) : isUp ? (
                                    <TrendingUp className="h-3 w-3 text-green-500" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 text-red-500" />
                                )}
                            </div>
                            <p className="text-lg font-bold mt-0.5">
                                {q.currency && <span className="text-xs font-normal text-muted-foreground mr-0.5">{q.currency}</span>}
                                {formatPrice(q.price, q.symbol)}
                            </p>
                            <p className={`text-xs font-medium ${isUp ? "text-green-500" : isFlat ? "text-muted-foreground" : "text-red-500"}`}>
                                {isUp ? "+" : ""}{q.change.toFixed(2)} ({isUp ? "+" : ""}{q.changePercent.toFixed(2)}%)
                            </p>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
