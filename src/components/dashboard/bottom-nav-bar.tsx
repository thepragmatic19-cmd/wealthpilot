"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    PieChart,
    MessageSquare,
    Target,
    User,
} from "lucide-react";

const TAB_ITEMS = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Accueil" },
    { href: "/portfolio", icon: PieChart, label: "Portefeuille" },
    { href: "/chat", icon: MessageSquare, label: "Chat IA" },
    { href: "/goals", icon: Target, label: "Objectifs" },
    { href: "/profile", icon: User, label: "Profil" },
];

export function BottomNavBar() {
    const pathname = usePathname();

    return (
        <nav
            aria-label="Navigation mobile"
            className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-border/50 bg-background/85 backdrop-blur-xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            {TAB_ITEMS.map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href;
                return (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-all duration-150 active:scale-95",
                            isActive ? "text-primary" : "text-muted-foreground"
                        )}
                        aria-current={isActive ? "page" : undefined}
                        aria-label={label}
                    >
                        {/* Active indicator pill */}
                        {isActive && (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />
                        )}
                        <Icon
                            className={cn(
                                "h-5 w-5 transition-transform duration-150",
                                isActive && "scale-110"
                            )}
                            aria-hidden="true"
                        />
                        <span
                            className={cn(
                                "text-[10px] font-semibold leading-none tracking-tight transition-all duration-150",
                                isActive ? "opacity-100" : "opacity-60"
                            )}
                        >
                            {label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
