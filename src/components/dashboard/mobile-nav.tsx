"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/onboarding", icon: ClipboardList, label: "Onboarding" },
  { href: "/portfolio", icon: PieChart, label: "Portefeuille" },
  { href: "/transactions", icon: ArrowRightLeft, label: "Transactions" },
  { href: "/fiscal", icon: Calculator, label: "Fiscal" },
  { href: "/retirement", icon: Hourglass, label: "Retraite" },
  { href: "/achievements", icon: Trophy, label: "Achievements" },
  { href: "/chat", icon: MessageSquare, label: "Conseiller IA" },
  { href: "/billing", icon: CreditCard, label: "Abonnement" },
  { href: "/profile", icon: User, label: "Profil" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <TrendingUp className="h-6 w-6 text-primary" />
          <span className="text-lg">WealthPilot</span>
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
                  className="w-full justify-start gap-3"
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}
