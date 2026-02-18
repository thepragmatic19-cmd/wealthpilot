"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Trophy,
    Target,
    Star,
    Flame,
    Shield,
    Sparkles,
    TrendingUp,
    MessageSquare,
    Award,
    Heart,
    Zap,
    Crown,
} from "lucide-react";
import type { Profile, Goal, Portfolio, ChatMessage } from "@/types/database";

// Badge definitions
const BADGE_DEFINITIONS = [
    {
        id: "first_login",
        name: "Bienvenue!",
        description: "Première connexion à WealthPilot",
        icon: Star,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        check: () => true, // Always earned
    },
    {
        id: "profile_complete",
        name: "Profil complet",
        description: "Compléter l'onboarding",
        icon: Shield,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        check: (data: GamificationData) => data.profile?.onboarding_completed === true,
    },
    {
        id: "first_portfolio",
        name: "Investisseur",
        description: "Obtenir votre premier portefeuille",
        icon: TrendingUp,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        check: (data: GamificationData) => data.portfolios.length > 0,
    },
    {
        id: "goal_setter",
        name: "Objectif fixé",
        description: "Définir au moins un objectif financier",
        icon: Target,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
        check: (data: GamificationData) => data.goals.length > 0,
    },
    {
        id: "goal_50",
        name: "À mi-chemin",
        description: "Atteindre 50% d'un objectif",
        icon: Flame,
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        check: (data: GamificationData) =>
            data.goals.some((g) => g.target_amount > 0 && g.current_amount / g.target_amount >= 0.5),
    },
    {
        id: "goal_achieved",
        name: "Objectif atteint! 🎉",
        description: "Atteindre 100% d'un objectif",
        icon: Trophy,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        check: (data: GamificationData) =>
            data.goals.some((g) => g.target_amount > 0 && g.current_amount >= g.target_amount),
    },
    {
        id: "chat_curious",
        name: "Curieux",
        description: "Poser 5 questions au conseiller IA",
        icon: MessageSquare,
        color: "text-cyan-500",
        bgColor: "bg-cyan-500/10",
        check: (data: GamificationData) =>
            data.chatMessages.filter((m) => m.role === "user").length >= 5,
    },
    {
        id: "chat_expert",
        name: "Expert en questions",
        description: "Poser 20 questions au conseiller IA",
        icon: Sparkles,
        color: "text-pink-500",
        bgColor: "bg-pink-500/10",
        check: (data: GamificationData) =>
            data.chatMessages.filter((m) => m.role === "user").length >= 20,
    },
    {
        id: "diversified",
        name: "Diversifié",
        description: "Avoir un portefeuille avec 5+ ETFs",
        icon: Zap,
        color: "text-indigo-500",
        bgColor: "bg-indigo-500/10",
        check: (data: GamificationData) =>
            data.portfolios.some((p) => ((p as PortfolioWithAllocations).allocations?.length ?? 0) >= 5),
    },
    {
        id: "big_saver",
        name: "Gros épargnant",
        description: "Avoir 100 000$ ou plus en actifs",
        icon: Crown,
        color: "text-amber-600",
        bgColor: "bg-amber-600/10",
        check: (data: GamificationData) => {
            const total = Number(data.profile?.total_assets || 0);
            return total >= 100000;
        },
    },
];

interface PortfolioWithAllocations extends Portfolio {
    allocations?: { id: string }[];
}

interface GamificationData {
    profile: (Profile & { total_assets?: number }) | null;
    goals: Goal[];
    portfolios: PortfolioWithAllocations[];
    chatMessages: ChatMessage[];
}

function calculateHealthScore(data: GamificationData): number {
    let score = 0;
    const maxScore = 100;

    // Profile completed (20 pts)
    if (data.profile?.onboarding_completed) score += 20;

    // Has portfolio (15 pts)
    if (data.portfolios.length > 0) score += 15;

    // Has goals (15 pts)
    if (data.goals.length > 0) score += 10;
    if (data.goals.length >= 3) score += 5;

    // Goal progress (20 pts)
    if (data.goals.length > 0) {
        const avgProgress = data.goals.reduce((sum, g) => {
            return sum + (g.target_amount > 0 ? Math.min(g.current_amount / g.target_amount, 1) : 0);
        }, 0) / data.goals.length;
        score += Math.round(avgProgress * 20);
    }

    // Diversification (15 pts)
    const selectedPortfolio = data.portfolios.find((p) => p.is_selected);
    if (selectedPortfolio) {
        const allocCount = (selectedPortfolio as PortfolioWithAllocations).allocations?.length || 0;
        score += Math.min(allocCount * 3, 15);
    }

    // Uses AI advisor (15 pts)
    const userMsgs = data.chatMessages.filter((m) => m.role === "user").length;
    score += Math.min(userMsgs * 3, 15);

    return Math.min(score, maxScore);
}

function getHealthLabel(score: number): { label: string; color: string } {
    if (score >= 80) return { label: "Excellent", color: "text-green-500" };
    if (score >= 60) return { label: "Bon", color: "text-blue-500" };
    if (score >= 40) return { label: "En progrès", color: "text-yellow-500" };
    return { label: "À améliorer", color: "text-orange-500" };
}

export default function GamificationPage() {
    const [data, setData] = useState<GamificationData>({
        profile: null,
        goals: [],
        portfolios: [],
        chatMessages: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [
                { data: profile },
                { data: goals },
                { data: portfolios },
                { data: chatMsgs },
            ] = await Promise.all([
                supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
                supabase.from("goals").select("*").eq("user_id", user.id),
                supabase.from("portfolios").select("*, portfolio_allocations(id)").eq("user_id", user.id),
                supabase.from("chat_messages").select("*").eq("user_id", user.id),
            ]);

            setData({
                profile: profile as GamificationData["profile"],
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
                                <p className="text-[10px] text-muted-foreground">/100</p>
                            </div>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <h2 className="text-lg font-semibold">Score de santé financière</h2>
                            <p className={`text-sm font-medium ${healthInfo.color}`}>
                                <Heart className="inline h-3 w-3 mr-1" />
                                {healthInfo.label}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Basé sur votre profil, portefeuille, objectifs et utilisation du conseiller IA.
                            </p>
                            <div className="mt-3">
                                <Progress value={healthScore} className="h-2" />
                            </div>
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
                            {lockedBadges.map((badge) => (
                                <div
                                    key={badge.id}
                                    className="flex items-center gap-3 rounded-xl p-3 border border-dashed opacity-50"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                        <badge.icon className="h-5 w-5 text-muted-foreground" />
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
            )}
        </div>
    );
}
