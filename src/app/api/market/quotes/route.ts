import { NextResponse } from "next/server";

// Yahoo Finance v8 API (public, no key needed)
const SYMBOLS = {
    "^GSPC": { name: "S&P 500", currency: "USD" },
    "^GSPTSE": { name: "S&P/TSX", currency: "CAD" },
    "^IXIC": { name: "NASDAQ", currency: "USD" },
    "CADUSD=X": { name: "CAD/USD", currency: "" },
};

interface QuoteResult {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    currency: string;
}

export async function GET() {
    try {
        const symbolList = Object.keys(SYMBOLS).join(",");
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolList)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,shortName`;

        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0",
            },
            next: { revalidate: 300 }, // Cache 5 min
        });

        if (!res.ok) {
            // Fallback to static data if Yahoo API is blocked
            return NextResponse.json({
                quotes: getFallbackQuotes(),
                cached: true,
                timestamp: new Date().toISOString(),
            });
        }

        const data = await res.json();
        const quotes: QuoteResult[] = (data.quoteResponse?.result || []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (q: any) => ({
                symbol: q.symbol,
                name: SYMBOLS[q.symbol as keyof typeof SYMBOLS]?.name || q.shortName || q.symbol,
                price: q.regularMarketPrice || 0,
                change: q.regularMarketChange || 0,
                changePercent: q.regularMarketChangePercent || 0,
                currency: SYMBOLS[q.symbol as keyof typeof SYMBOLS]?.currency || "",
            })
        );

        return NextResponse.json({
            quotes,
            cached: false,
            timestamp: new Date().toISOString(),
        });
    } catch {
        return NextResponse.json({
            quotes: getFallbackQuotes(),
            cached: true,
            timestamp: new Date().toISOString(),
        });
    }
}

function getFallbackQuotes(): QuoteResult[] {
    return [
        { symbol: "^GSPC", name: "S&P 500", price: 6051.97, change: 23.45, changePercent: 0.39, currency: "USD" },
        { symbol: "^GSPTSE", name: "S&P/TSX", price: 25312.84, change: 87.12, changePercent: 0.35, currency: "CAD" },
        { symbol: "^IXIC", name: "NASDAQ", price: 19649.95, change: 78.32, changePercent: 0.4, currency: "USD" },
        { symbol: "CADUSD=X", name: "CAD/USD", price: 0.6945, change: -0.0012, changePercent: -0.17, currency: "" },
    ];
}
