"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Lightbulb,
    TrendingUp,
    PiggyBank,
    Target,
    RefreshCcw,
    ArrowRightLeft,
    Sparkles,
    X,
    ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Insight {
    id: string;
    type: string;
    title: string;
    content: string;
    priority: string;
    is_read: boolean;
    created_at: string;
}

const TYPE_CONFIG: Record<
    string,
    { icon: typeof Lightbulb; color: string; bg: string }
> = {
    market_update: {
        icon: TrendingUp,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
    },
    portfolio_alert: {
        icon: ArrowRightLeft,
        color: "text-orange-500",
        bg: "bg-orange-500/10",
    },
    tax_optimization: {
        icon: PiggyBank,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
    },
    goal_progress: {
        icon: Target,
        color: "text-violet-500",
        bg: "bg-violet-500/10",
    },
    rebalancing: {
        icon: RefreshCcw,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
    },
    general_tip: {
        icon: Lightbulb,
        color: "text-sky-500",
        bg: "bg-sky-500/10",
    },
};

const PRIORITY_STYLES: Record<string, string> = {
    urgent: "border-l-red-500 bg-red-500/5",
    high: "border-l-orange-500 bg-orange-500/5",
    normal: "border-l-blue-500/50",
    low: "border-l-gray-400/50",
};

export function AiInsightsPanel() {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const supabase = createClient();

    const fetchInsights = useCallback(async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from("ai_insights")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5);

        setInsights(data || []);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchInsights();
    }, [fetchInsights]);

    const generateInsights = async () => {
        setGenerating(true);
        try {
            const res = await fetch("/api/ai/insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ force: true }),
            });
            if (res.ok) {
                // Wait a bit then refetch
                await new Promise((r) => setTimeout(r, 500));
                await fetchInsights();
            }
        } catch (error) {
            console.error("Error generating insights:", error);
        } finally {
            setGenerating(false);
        }
    };

    const dismissInsight = async (id: string) => {
        await supabase
            .from("ai_insights")
            .update({ is_read: true })
            .eq("id", id);
        setInsights((prev) => prev.filter((i) => i.id !== id));
    };

    const unreadInsights = insights.filter((i) => !i.is_read);

    if (loading) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-6">
                    <div className="flex items-center gap-3 animate-pulse">
                        <div className="w-10 h-10 rounded-xl bg-muted" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 rounded bg-muted w-3/4" />
                            <div className="h-3 rounded bg-muted w-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-background to-muted/30">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                            {unreadInsights.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            )}
                        </div>
                        <CardTitle className="text-lg">Insights IA</CardTitle>
                        {unreadInsights.length > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                {unreadInsights.length} nouveau{unreadInsights.length > 1 ? "x" : ""}
                            </span>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateInsights}
                        disabled={generating}
                        className="text-xs gap-1.5"
                    >
                        <RefreshCcw
                            className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`}
                        />
                        {generating ? "Génération..." : "Actualiser"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
                <AnimatePresence mode="popLayout">
                    {insights.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-8"
                        >
                            <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground mb-3">
                                Aucun insight généré. Cliquez pour recevoir des conseils
                                personnalisés.
                            </p>
                            <Button
                                onClick={generateInsights}
                                disabled={generating}
                                size="sm"
                                className="gap-2"
                            >
                                <Sparkles className="h-4 w-4" />
                                Générer mes insights
                            </Button>
                        </motion.div>
                    ) : (
                        insights.map((insight, index) => {
                            const config = TYPE_CONFIG[insight.type] || TYPE_CONFIG.general_tip;
                            const Icon = config.icon;
                            const priorityStyle =
                                PRIORITY_STYLES[insight.priority] || PRIORITY_STYLES.normal;

                            return (
                                <motion.div
                                    key={insight.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`group relative flex items-start gap-3 p-3 rounded-xl border-l-4 transition-all hover:shadow-md cursor-default ${priorityStyle} ${!insight.is_read ? "bg-primary/[0.02]" : ""
                                        }`}
                                >
                                    <div
                                        className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${config.bg}`}
                                    >
                                        <Icon className={`h-4.5 w-4.5 ${config.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="text-sm font-semibold leading-tight">
                                                {insight.title}
                                            </h4>
                                            <button
                                                onClick={() => dismissInsight(insight.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                            >
                                                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                            </button>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                            {insight.content}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] text-muted-foreground/60">
                                                {new Date(insight.created_at).toLocaleDateString(
                                                    "fr-CA",
                                                    {
                                                        day: "numeric",
                                                        month: "short",
                                                    }
                                                )}
                                            </span>
                                            {!insight.is_read && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 self-center" />
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}
