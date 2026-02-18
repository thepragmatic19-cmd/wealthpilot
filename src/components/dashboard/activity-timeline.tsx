"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Activity,
    MessageSquare,
    Target,
    PieChart,
    UserCheck,
} from "lucide-react";
import type { Goal, ChatMessage, Portfolio } from "@/types/database";

interface ActivityItem {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    time: string;
    href?: string;
    type: "portfolio" | "goal" | "chat" | "profile";
}

const TYPE_COLORS: Record<string, string> = {
    portfolio: "text-blue-500",
    goal: "text-green-500",
    chat: "text-purple-500",
    profile: "text-orange-500",
};

interface ActivityTimelineProps {
    goals: Goal[];
    chatMessages: ChatMessage[];
    portfolios: Portfolio[];
    profileUpdated?: string | null;
}

function formatRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Il y a ${diffD}j`;
    return date.toLocaleDateString("fr-CA");
}

export function ActivityTimeline({ goals, chatMessages, portfolios, profileUpdated }: ActivityTimelineProps) {
    const activities = useMemo(() => {
        const items: ActivityItem[] = [];

        // Portfolio creation
        for (const p of portfolios) {
            items.push({
                id: `portfolio-${p.id}`,
                icon: <PieChart className="h-4 w-4" />,
                title: `Portefeuille "${p.name}" créé`,
                description: p.is_selected ? "Portefeuille sélectionné" : p.type,
                time: p.created_at,
                href: "/portfolio",
                type: "portfolio",
            });
        }

        // Goals
        for (const g of goals) {
            const progress = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
            items.push({
                id: `goal-${g.id}`,
                icon: <Target className="h-4 w-4" />,
                title: `Objectif "${g.label}"`,
                description: `${progress}% atteint`,
                time: g.updated_at || g.created_at,
                href: "/dashboard",
                type: "goal",
            });
        }

        // Recent chat messages (last 3)
        const recentChats = chatMessages
            .filter((m) => m.role === "user")
            .slice(-3);
        for (const m of recentChats) {
            items.push({
                id: `chat-${m.id}`,
                icon: <MessageSquare className="h-4 w-4" />,
                title: "Question au conseiller IA",
                description: m.content.length > 60 ? m.content.slice(0, 60) + "..." : m.content,
                time: m.created_at,
                href: "/chat",
                type: "chat",
            });
        }

        // Profile update
        if (profileUpdated) {
            items.push({
                id: "profile-update",
                icon: <UserCheck className="h-4 w-4" />,
                title: "Profil mis à jour",
                description: "Informations personnelles",
                time: profileUpdated,
                href: "/profile",
                type: "profile",
            });
        }

        // Sort by time descending
        items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        return items.slice(0, 8);
    }, [goals, chatMessages, portfolios, profileUpdated]);

    if (activities.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Activity className="h-5 w-5" />
                        Activité récente
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune activité pour le moment
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-5 w-5" />
                    Activité récente
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative space-y-0">
                    {activities.map((activity, index) => (
                        <div key={activity.id} className="relative flex gap-3 pb-4 last:pb-0">
                            {/* Timeline line */}
                            {index < activities.length - 1 && (
                                <div className="absolute left-[11px] top-6 h-full w-px bg-border" />
                            )}
                            {/* Icon */}
                            <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted ${TYPE_COLORS[activity.type]}`}>
                                {activity.icon}
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                {activity.href ? (
                                    <Link href={activity.href} className="hover:underline">
                                        <p className="text-sm font-medium truncate">{activity.title}</p>
                                    </Link>
                                ) : (
                                    <p className="text-sm font-medium truncate">{activity.title}</p>
                                )}
                                <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {formatRelativeTime(activity.time)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
