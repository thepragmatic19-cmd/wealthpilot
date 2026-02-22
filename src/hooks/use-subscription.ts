"use client";

import { useQuery } from "@tanstack/react-query";
import { canAccess, PLAN_LIMITS } from "@/lib/subscription";
import type { SubscriptionPlan, Subscription } from "@/types/database";
import type { Feature } from "@/lib/subscription";

// Date de fin de l'offre de lancement (31 mars 2026 à 23h59 EST)
export const LAUNCH_END_DATE = new Date("2026-03-31T23:59:59-04:00");

async function fetchSubscription(): Promise<Subscription> {
  const res = await fetch("/api/billing/subscription");
  if (!res.ok) throw new Error("Failed to fetch subscription");
  return res.json();
}

export function useSubscription() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscription,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const plan: SubscriptionPlan = data?.plan ?? "free";
  const isActuallyFree = plan === "free";
  const isInLaunchPeriod = new Date() < LAUNCH_END_DATE;

  // Pendant la période de lancement, tous les utilisateurs gratuits ont accès Pro
  const effectivePlan: SubscriptionPlan = isActuallyFree && isInLaunchPeriod ? "pro" : plan;

  return {
    subscription: data,
    plan: effectivePlan,
    actualPlan: plan,
    isLoading,
    error,
    isFree: isActuallyFree && !isInLaunchPeriod,
    isPro: effectivePlan === "pro",
    isElite: effectivePlan === "elite",
    isInLaunchPeriod,
    launchEndDate: LAUNCH_END_DATE,
    limits: PLAN_LIMITS[effectivePlan],
    canAccess: (feature: Feature) => canAccess(effectivePlan, feature),
  };
}
