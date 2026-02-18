import type { SubscriptionPlan } from "@/types/database";

export type Feature =
  | "fiscal_page"
  | "retirement_page"
  | "pdf_export"
  | "ai_insights"
  | "priority_ai"
  | "unlimited_chat";

interface PlanLimits {
  maxPortfolios: number;
  chatPerDay: number;
  features: Feature[];
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxPortfolios: 1,
    chatPerDay: 5,
    features: [],
  },
  pro: {
    maxPortfolios: 5,
    chatPerDay: 50,
    features: ["fiscal_page", "retirement_page", "pdf_export", "ai_insights"],
  },
  elite: {
    maxPortfolios: -1, // unlimited
    chatPerDay: -1, // unlimited
    features: [
      "fiscal_page",
      "retirement_page",
      "pdf_export",
      "ai_insights",
      "priority_ai",
      "unlimited_chat",
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
    free: "Gratuit",
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
