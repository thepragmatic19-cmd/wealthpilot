"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TrendingUp, LayoutDashboard, PieChart, MessageSquare, User, ClipboardList, ArrowRightLeft, Calculator, Hourglass, Trophy, CreditCard, Target, BookOpen, BookMarked } from "lucide-react";
import { useSimpleMode } from "@/contexts/simple-mode-context";

const NAV_FULL = [
  { label: "Synthèse", items: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    { href: "/portfolio", icon: PieChart, label: "Portefeuille" },
    { href: "/transactions", icon: ArrowRightLeft, label: "Transactions" },
    { href: "/goals", icon: Target, label: "Objectifs" },
  ]},
  { label: "Planification", items: [
    { href: "/fiscal", icon: Calculator, label: "Fiscal" },
    { href: "/retirement", icon: Hourglass, label: "Retraite" },
  ]},
  { label: "Conseil IA", items: [
    { href: "/chat", icon: MessageSquare, label: "Conseiller IA" },
    { href: "/education", icon: BookOpen, label: "Hub Éducatif" },
    { href: "/lexique", icon: BookMarked, label: "Lexique" },
    { href: "/onboarding", icon: ClipboardList, label: "Évaluation" },
  ]},
  { label: "Compte", items: [
    { href: "/billing", icon: CreditCard, label: "Abonnement" },
    { href: "/achievements", icon: Trophy, label: "Réalisations" },
    { href: "/profile", icon: User, label: "Mon Profil" },
  ]},
];

const NAV_SIMPLE = [
  { label: "Principal", items: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    { href: "/portfolio", icon: PieChart, label: "Mon portefeuille" },
    { href: "/goals", icon: Target, label: "Mes objectifs" },
  ]},
  { label: "Aide", items: [
    { href: "/chat", icon: MessageSquare, label: "Conseiller IA" },
    { href: "/education", icon: BookOpen, label: "Apprendre" },
    { href: "/lexique", icon: BookMarked, label: "Lexique" },
  ]},
  { label: "Compte", items: [
    { href: "/profile", icon: User, label: "Mon Profil" },
  ]},
];

export function MobileDrawerNav() {
  const pathname = usePathname();
  const { isSimple } = useSimpleMode();
  const groups = isSimple ? NAV_SIMPLE : NAV_FULL;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b px-4 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span>WealthPilot</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
