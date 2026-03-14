import { NextRequest, NextResponse } from "next/server";

interface EtfQuote {
    symbol: string;
    price: number | null;
    change: number | null;
    changePercent: number | null;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get("tickers") || "";
    const tickers = tickersParam
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20);

    if (tickers.length === 0) {
        return NextResponse.json({ quotes: [] });
    }

    const fallback = (): NextResponse =>
        NextResponse.json({
            quotes: tickers.map((symbol): EtfQuote => ({ symbol, price: null, change: null, changePercent: null })),
        });

    try {
        const symbolList = tickers.join(",");
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolList)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent`;

        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 300 },
        });

        if (!res.ok) return fallback();

        const data = await res.json();
        const resultMap = new Map<string, EtfQuote>();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const q of (data.quoteResponse?.result || []) as any[]) {
            resultMap.set(q.symbol, {
                symbol: q.symbol,
                price: q.regularMarketPrice ?? null,
                change: q.regularMarketChange ?? null,
                changePercent: q.regularMarketChangePercent ?? null,
            });
        }

        const quotes: EtfQuote[] = tickers.map(
            (symbol) => resultMap.get(symbol) || { symbol, price: null, change: null, changePercent: null }
        );

        return NextResponse.json({ quotes });
    } catch {
        return fallback();
    }
}
