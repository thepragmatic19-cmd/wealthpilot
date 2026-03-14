"use client";

import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from "lucide-react";

interface EtfQuote {
    symbol: string;
    price: number | null;
    change: number | null;
    changePercent: number | null;
}

interface EtfPricesTableProps {
    tickers: string[];
}

export function EtfPricesTable({ tickers }: EtfPricesTableProps) {
    const [quotes, setQuotes] = useState<EtfQuote[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (!open || tickers.length === 0 || fetchedRef.current) return;
        fetchedRef.current = true;
        setLoading(true);
        fetch(`/api/market/etf-quotes?tickers=${tickers.join(",")}`)
            .then((r) => r.json())
            .then((data) => setQuotes(data.quotes || []))
            .catch(() =>
                setQuotes(tickers.map((symbol) => ({ symbol, price: null, change: null, changePercent: null })))
            )
            .finally(() => setLoading(false));
    }, [open, tickers]);

    if (tickers.length === 0) return null;

    return (
        <div className="mt-3 rounded-xl border bg-card">
            <button
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors rounded-xl"
                onClick={() => setOpen((prev) => !prev)}
            >
                <span className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Prix en direct
                </span>
                {open ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
            </button>

            {open && (
                <div className="border-t px-4 pb-4 pt-3">
                    {loading ? (
                        <div className="space-y-2">
                            {tickers.map((t) => (
                                <Skeleton key={t} className="h-8 w-full rounded-lg" />
                            ))}
                        </div>
                    ) : (
                        <div className="divide-y">
                            {quotes.map((q) => (
                                <div
                                    key={q.symbol}
                                    className="flex items-center justify-between py-2 text-sm"
                                >
                                    <span className="font-mono text-xs text-muted-foreground">{q.symbol}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold tabular-nums">
                                            {q.price != null ? `$${q.price.toFixed(2)}` : "—"}
                                        </span>
                                        {q.changePercent != null ? (
                                            <span
                                                className={`flex items-center gap-0.5 text-xs font-medium tabular-nums ${
                                                    q.changePercent >= 0
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-red-500 dark:text-red-400"
                                                }`}
                                            >
                                                {q.changePercent >= 0 ? (
                                                    <TrendingUp className="h-3 w-3" />
                                                ) : (
                                                    <TrendingDown className="h-3 w-3" />
                                                )}
                                                {q.changePercent >= 0 ? "+" : ""}
                                                {q.changePercent.toFixed(2)}%
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <p className="mt-3 text-[10px] text-muted-foreground/60">
                        Données Yahoo Finance · Cache 5 min · En temps différé
                    </p>
                </div>
            )}
        </div>
    );
}
