"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, AlertTriangle, TrendingUp, Target, Receipt, Info } from "lucide-react";
import type { Notification } from "@/types/database";
import { useInterval } from "@/hooks/use-interval";

const SEVERITY_STYLES: Record<string, string> = {
    info: "text-blue-500",
    warning: "text-yellow-500",
    success: "text-green-500",
    danger: "text-red-500",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
    rééquilibrage: <TrendingUp className="h-4 w-4" />,
    objectif: <Target className="h-4 w-4" />,
    marché: <AlertTriangle className="h-4 w-4" />,
    fiscal: <Receipt className="h-4 w-4" />,
    système: <Info className="h-4 w-4" />,
};

function computeTimeAgo(dateStr: string, now: number) {
    const diff = now - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}j`;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const router = useRouter();

    const loadNotifications = useCallback(async () => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(10);

            if (data) {
                setNotifications(data as Notification[]);
                setUnreadCount(data.filter((n) => !n.is_read).length);
            }
        } catch (err) {
            logger.error("Error loading notifications:", err);
        }
    }, []);

    // Use a custom hook to avoid calling setState directly inside useEffect
    useInterval(() => {
        loadNotifications();
        setNow(Date.now());
    }, 60_000, true); // true = run immediately on mount

    // Pre-compute timeAgo for all notifications to avoid impure calls during render
    const timeAgoMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const n of notifications) {
            map[n.id] = computeTimeAgo(n.created_at, now);
        }
        return map;
    }, [notifications, now]);

    async function markAllRead() {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", user.id)
                .eq("is_read", false);

            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            logger.error("Error marking notifications read:", err);
        }
    }

    async function handleClick(notification: Notification) {
        if (!notification.is_read) {
            const supabase = createClient();
            await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", notification.id);

            setNotifications((prev) =>
                prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
            );
            setUnreadCount((c) => Math.max(0, c - 1));
        }

        if (notification.action_url) {
            router.push(notification.action_url);
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-sm font-semibold">Notifications</p>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                            onClick={markAllRead}
                        >
                            <CheckCheck className="mr-1 h-3 w-3" />
                            Tout lire
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        Aucune notification
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <DropdownMenuItem
                            key={notification.id}
                            className="flex items-start gap-3 px-3 py-2.5 cursor-pointer"
                            onClick={() => handleClick(notification)}
                        >
                            <div className={`mt-0.5 ${SEVERITY_STYLES[notification.severity] || ""}`}>
                                {TYPE_ICONS[notification.type] || <Info className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className={`text-xs font-medium truncate ${!notification.is_read ? "font-semibold" : "text-muted-foreground"}`}>
                                        {notification.title}
                                    </p>
                                    {!notification.is_read && (
                                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                    {notification.message}
                                </p>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                                {timeAgoMap[notification.id] || ""}
                            </span>
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
