"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Target,
  BookOpen,
  BookMarked,
  Layers,
} from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useSimpleMode } from "@/contexts/simple-mode-context";

// Full nav (advanced mode)
const navGroupsFull = [
  {
    label: "Synthèse",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
      { href: "/portfolio", icon: PieChart, label: "Portefeuille" },
      { href: "/transactions", icon: ArrowRightLeft, label: "Transactions" },
      { href: "/goals", icon: Target, label: "Objectifs" },
    ]
  },
  {
    label: "Planification",
    items: [
      { href: "/fiscal", icon: Calculator, label: "Fiscal", proBadge: true },
      { href: "/retirement", icon: Hourglass, label: "Retraite", proBadge: true },
    ]
  },
  {
    label: "Conseil IA",
    items: [
      { href: "/chat", icon: MessageSquare, label: "Conseiller IA" },
      { href: "/education", icon: BookOpen, label: "Hub Éducatif" },
      { href: "/lexique", icon: BookMarked, label: "Lexique" },
      { href: "/onboarding", icon: ClipboardList, label: "Évaluation" },
    ]
  },
  {
    label: "Compte",
    items: [
      { href: "/billing", icon: CreditCard, label: "Abonnement" },
      { href: "/achievements", icon: Trophy, label: "Réalisations" },
      { href: "/profile", icon: User, label: "Mon Profil" },
    ]
  }
];

// Simplified nav — only essentials for beginners
const navGroupsSimple = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
      { href: "/portfolio", icon: PieChart, label: "Mon portefeuille" },
      { href: "/goals", icon: Target, label: "Mes objectifs" },
    ]
  },
  {
    label: "Aide",
    items: [
      { href: "/chat", icon: MessageSquare, label: "Conseiller IA" },
      { href: "/education", icon: BookOpen, label: "Apprendre" },
      { href: "/lexique", icon: BookMarked, label: "Lexique" },
    ]
  },
  {
    label: "Compte",
    items: [
      { href: "/profile", icon: User, label: "Mon Profil" },
    ]
  }
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { isFree } = useSubscription();
  const { isSimple, toggle: toggleSimple } = useSimpleMode();

  const navGroups = isSimple ? navGroupsSimple : navGroupsFull;

  return (
    <aside
      role="navigation"
      aria-label="Navigation principale"
      className={cn(
        "hidden h-screen border-r bg-sidebar transition-all duration-300 md:flex md:flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-3 font-bold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <TrendingUp className="h-5 w-5 shrink-0" />
          </div>
          {!collapsed && (
            <span className="text-xl tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              WealthPilot
            </span>
          )}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-6 px-3">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!collapsed && (
                <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        aria-label={item.label}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "w-full justify-start gap-3 h-10 transition-all duration-200",
                          isActive && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary shadow-sm",
                          collapsed && "justify-center px-0"
                        )}
                      >
                        <item.icon className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )} aria-hidden="true" />
                        {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                        {!collapsed && (item as { proBadge?: boolean }).proBadge && isFree && (
                          <Badge variant="outline" className="ml-auto text-[9px] px-1 py-0 border-primary/20 text-primary bg-primary/5">
                            PRO
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t p-2 space-y-1">
        {/* Mode toggle — clear for beginners */}
        <Button
          variant="ghost"
          className={cn(
            "w-full gap-2 text-muted-foreground hover:text-foreground",
            collapsed && "justify-center px-0"
          )}
          onClick={toggleSimple}
          aria-label={isSimple ? "Afficher toutes les fonctionnalités" : "Passer en vue simplifiée"}
        >
          <Layers className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="text-xs flex-1 text-left">
                {isSimple ? "Vue simplifiée" : "Vue complète"}
              </span>
              <span className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                isSimple
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted text-muted-foreground border-border"
              )}>
                {isSimple ? "ACTIF" : "AVANCÉ"}
              </span>
            </>
          )}
        </Button>

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
