"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  PieChart,
  MessageSquare,
  User,
  ClipboardList,
  TrendingUp,
  ArrowRightLeft,
  Calculator,
  Hourglass,
  Trophy,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/onboarding", icon: ClipboardList, label: "Onboarding" },
  { href: "/portfolio", icon: PieChart, label: "Portefeuille" },
  { href: "/transactions", icon: ArrowRightLeft, label: "Transactions" },
  { href: "/fiscal", icon: Calculator, label: "Fiscal", proBadge: true },
  { href: "/retirement", icon: Hourglass, label: "Retraite", proBadge: true },
  { href: "/achievements", icon: Trophy, label: "Achievements" },
  { href: "/chat", icon: MessageSquare, label: "Conseiller IA" },
  { href: "/billing", icon: CreditCard, label: "Abonnement" },
  { href: "/profile", icon: User, label: "Profil" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { isFree } = useSubscription();

  return (
    <aside
      role="navigation"
      aria-label="Navigation principale"
      className={cn(
        "hidden h-screen border-r bg-sidebar transition-all duration-300 md:flex md:flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <TrendingUp className="h-6 w-6 shrink-0 text-primary" />
          {!collapsed && <span className="text-lg">WealthPilot</span>}
        </Link>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "w-full justify-start gap-3",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.proBadge && isFree && (
                    <Badge variant="outline" className="ml-auto text-[10px] px-1 py-0">
                      Pro
                    </Badge>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-2">
        <Button variant="ghost" className="w-full" onClick={onToggle} aria-label={collapsed ? "Ouvrir le menu" : "Réduire le menu"}>
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Réduire</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
