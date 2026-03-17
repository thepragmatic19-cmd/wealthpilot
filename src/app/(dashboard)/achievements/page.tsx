"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Trophy,
    Heart,
} from "lucide-react";
import type { Profile, ClientInfo, Goal, ChatMessage } from "@/types/database";
import { useSimpleMode } from "@/contexts/simple-mode-context";
import {
    BADGE_DEFINITIONS,
    GamificationData,
    PortfolioWithAllocations,
    calculateHealthScore,
    getHealthLabel,
    Award,
} from "@/lib/achievements";

interface ScoreFactor {
    label: string;
    earned: number;
    max: number;
}

function getScoreBreakdown(data: GamificationData): ScoreFactor[] {
    const selectedPortfolio = data.portfolios.find((p) => p.is_selected);
    const allocCount = (selectedPortfolio as PortfolioWithAllocations)?.allocations?.length || 0;
    const userMsgs = data.chatMessages.filter((m) => m.role === "user").length;
    let goalProgressPts = 0;
    if (data.goals.length > 0) {
        const avg = data.goals.reduce((sum, g) => sum + (g.target_amount > 0 ? Math.min(g.current_amount / g.target_amount, 1) : 0), 0) / data.goals.length;
        goalProgressPts = Math.round(avg * 20);
    }
    return [
        { label: "Profil complété", earned: data.profile?.onboarding_completed ? 20 : 0, max: 20 },
        { label: "Portefeuille créé", earned: data.portfolios.length > 0 ? 15 : 0, max: 15 },
        { label: "Objectifs définis", earned: data.goals.length === 0 ? 0 : data.goals.length >= 3 ? 15 : 10, max: 15 },
        { label: "Progression objectifs", earned: goalProgressPts, max: 20 },
        { label: "Diversification", earned: Math.min(allocCount * 3, 15), max: 15 },
        { label: "Utilisation du conseiller IA", earned: Math.min(userMsgs * 3, 15), max: 15 },
    ];
}

export default function GamificationPage() {
    const [data, setData] = useState<GamificationData>({
        profile: null,
        clientInfo: null,
        goals: [],
        portfolios: [],
        chatMessages: [],
    });
    const [loading, setLoading] = useState(true);
    const { isSimple } = useSimpleMode();

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [
                { data: profile },
                { data: clientInfo },
                { data: goals },
                { data: portfolios },
                { data: chatMsgs },
            ] = await Promise.all([
                supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
                supabase.from("client_info").select("total_assets").eq("user_id", user.id).maybeSingle(),
                supabase.from("goals").select("*").eq("user_id", user.id),
                supabase.from("portfolios").select("*, portfolio_allocations(id)").eq("user_id", user.id),
                supabase.from("chat_messages").select("*").eq("user_id", user.id),
            ]);

            setData({
                profile: profile as Profile | null,
                clientInfo: clientInfo as ClientInfo | null,
                goals: (goals as Goal[]) || [],
                portfolios: (portfolios as PortfolioWithAllocations[]) || [],
                chatMessages: (chatMsgs as ChatMessage[]) || [],
            });
            setLoading(false);
        }
        load();
    }, []);

    const earnedBadges = useMemo(
        () => BADGE_DEFINITIONS.filter((b) => b.check(data)),
        [data]
    );

    const lockedBadges = useMemo(
        () => BADGE_DEFINITIONS.filter((b) => !b.check(data)),
        [data]
    );

    const healthScore = useMemo(() => calculateHealthScore(data), [data]);
    const healthInfo = getHealthLabel(healthScore);
    const scoreBreakdown = useMemo(() => getScoreBreakdown(data), [data]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    Achievements & Santé financière
                </h1>
                <p className="text-muted-foreground">
                    Suivez vos progrès et débloquez des badges
                </p>
            </div>

            {/* Health Score */}
            <Card className="bg-gradient-to-r from-primary/5 via-chart-1/5 to-chart-2/5 border-primary/20">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative flex h-28 w-28 items-center justify-center">
                            <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/20" />
                                <circle
                                    cx="50" cy="50" r="42"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${healthScore * 2.64} 264`}
                                    strokeLinecap="round"
                                    className="text-primary transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute text-center">
                                <p className="text-2xl font-bold">{healthScore}</p>
                                <p className="text-xs text-muted-foreground">/100</p>
                            </div>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <h2 className="text-lg font-semibold">Score de santé financière</h2>
                            <p className={`text-sm font-medium ${healthInfo.color}`}>
                                <Heart className="inline h-3 w-3 mr-1" />
                                {healthInfo.label}
                            </p>
                            <div className="mt-3">
                                <Progress value={healthScore} className="h-2" />
                            </div>
                            {!isSimple && (
                            <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
                                {scoreBreakdown.map((factor) => (
                                    <div key={factor.label} className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">{factor.label}</span>
                                        <span className={`font-semibold tabular-nums ${factor.earned === factor.max ? "text-green-500" : factor.earned > 0 ? "text-yellow-500" : "text-muted-foreground/50"}`}>
                                            {factor.earned}/{factor.max}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            )}
                            {isSimple && lockedBadges.length > 0 && (
                                <p className="mt-3 text-xs text-muted-foreground">
                                    Prochaine étape : <span className="font-medium text-foreground">{lockedBadges[0].hint ?? lockedBadges[0].description}</span>
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Earned Badges */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Award className="h-5 w-5 text-yellow-500" />
                        Badges débloqués
                        <Badge variant="secondary" className="text-xs ml-auto">
                            {earnedBadges.length}/{BADGE_DEFINITIONS.length}
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        Vos accomplissements dans WealthPilot
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {earnedBadges.map((badge) => (
                            <div
                                key={badge.id}
                                className={`flex items-center gap-3 rounded-xl p-3 border ${badge.bgColor} border-transparent`}
                            >
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${badge.bgColor}`}>
                                    <badge.icon className={`h-5 w-5 ${badge.color}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{badge.name}</p>
                                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Locked Badges */}
            {lockedBadges.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            🔒 Badges à débloquer
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {lockedBadges.map((badge) => {
                                const prog = badge.getProgress ? badge.getProgress(data) : null;
                                const pct = prog ? Math.min(100, Math.round((prog.current / prog.target) * 100)) : null;
                                return (
                                    <div
                                        key={badge.id}
                                        className="flex flex-col gap-2 rounded-xl p-3 border border-dashed opacity-70"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                                                <badge.icon className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{badge.name}</p>
                                                <p className="text-xs text-muted-foreground">{badge.description}</p>
                                                {badge.hint && (
                                                    <p className="text-xs text-primary/70 mt-0.5">→ {badge.hint}</p>
                                                )}
                                            </div>
                                        </div>
                                        {prog && pct !== null && (
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>
                                                        {prog.formatValue ? prog.formatValue(prog.current) : prog.current} / {prog.formatValue ? prog.formatValue(prog.target) : prog.target} {prog.label}
                                                    </span>
                                                    <span className="font-semibold tabular-nums">{pct}%</span>
                                                </div>
                                                <Progress value={pct} className="h-1.5" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
