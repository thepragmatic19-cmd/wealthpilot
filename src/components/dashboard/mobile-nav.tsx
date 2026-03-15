"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, PieChart, MessageSquare, BookOpen, Target } from "lucide-react";

const TABS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Accueil" },
  { href: "/portfolio", icon: PieChart, label: "Portefeuille" },
  { href: "/chat", icon: MessageSquare, label: "Conseiller" },
  { href: "/goals", icon: Target, label: "Objectifs" },
  { href: "/education", icon: BookOpen, label: "Apprendre" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden flex items-center justify-around border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-safe">
      {TABS.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 px-2 min-w-0 flex-1 transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", active && "stroke-[2.5]")} />
            <span className={cn("text-[10px] font-medium truncate w-full text-center", active && "font-bold")}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
