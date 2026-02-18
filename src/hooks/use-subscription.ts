"use client";

import { useQuery } from "@tanstack/react-query";
import { canAccess, PLAN_LIMITS } from "@/lib/subscription";
import type { SubscriptionPlan, Subscription } from "@/types/database";
import type { Feature } from "@/lib/subscription";

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

  return {
    subscription: data,
    plan,
    isLoading,
    error,
    isFree: plan === "free",
    isPro: plan === "pro",
    isElite: plan === "elite",
    limits: PLAN_LIMITS[plan],
    canAccess: (feature: Feature) => canAccess(plan, feature),
  };
}
