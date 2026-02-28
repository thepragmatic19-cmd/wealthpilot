import type { SubscriptionPlan } from "@/types/database";

export type Feature =
  | "fiscal_page"
  | "retirement_page"
  | "pdf_export"
  | "ai_insights"
  | "priority_ai"
  | "unlimited_chat"
  | "rebalancing_alerts"
  | "monthly_reports";

interface PlanLimits {
  maxPortfolios: number;
  chatPerDay: number;
  features: Feature[];
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxPortfolios: 10,
    chatPerDay: -1, // Illimité pour les tests
    features: ["fiscal_page", "retirement_page", "ai_insights"], // Activer plus de features par défaut
  },
  pro: {
    maxPortfolios: 5,
    chatPerDay: 50,
    features: ["fiscal_page", "retirement_page", "pdf_export", "ai_insights"],
  },
  elite: {
    maxPortfolios: -1, // illimité
    chatPerDay: -1,    // illimité
    features: [
      "fiscal_page",
      "retirement_page",
      "pdf_export",
      "ai_insights",
      "priority_ai",
      "unlimited_chat",
      "rebalancing_alerts",
      "monthly_reports",
    ],
  },
};

export function canAccess(plan: SubscriptionPlan, feature: Feature): boolean {
  return PLAN_LIMITS[plan].features.includes(feature);
}

export function getChatLimit(plan: SubscriptionPlan): number {
  return PLAN_LIMITS[plan].chatPerDay;
}

export function getMaxPortfolios(plan: SubscriptionPlan): number {
  return PLAN_LIMITS[plan].maxPortfolios;
}

export function getPlanLabel(plan: SubscriptionPlan): string {
  const labels: Record<SubscriptionPlan, string> = {
    free: "Pro (Lancement)",
    pro: "Pro",
    elite: "Élite",
  };
  return labels[plan];
}

export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  free: 0,
  pro: 19,
  elite: 39,
};
