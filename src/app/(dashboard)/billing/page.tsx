"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CreditCard,
  Crown,
  Sparkles,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { getPlanLabel, PLAN_PRICES } from "@/lib/subscription";

export default function BillingPage() {
  const { subscription, plan, isLoading, isFree } = useSubscription();
  const searchParams = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Abonnement activé avec succès!");
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("Paiement annulé.");
    }
  }, [searchParams]);

  async function handleCheckout(targetPlan: "pro" | "elite") {
    setCheckoutLoading(targetPlan);
    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Erreur lors de la création du paiement");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setPortalLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Abonnement
        </h1>
        <p className="text-muted-foreground">
          Gérez votre plan et votre facturation
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Plan actuel
            <Badge variant={isFree ? "secondary" : "default"}>
              {getPlanLabel(plan)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription?.current_period_end && plan !== "free" && (
            <p className="text-sm text-muted-foreground">
              {subscription.cancel_at_period_end
                ? "Votre abonnement se termine le "
                : "Prochain renouvellement le "}
              <strong>
                {new Date(subscription.current_period_end).toLocaleDateString(
                  "fr-CA",
                  { dateStyle: "long" }
                )}
              </strong>
            </p>
          )}

          {!isFree && (
            <Button
              variant="outline"
              onClick={handlePortal}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Gérer mon abonnement
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      {isFree && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Pro */}
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-primary" />
                Pro
                <Badge>Populaire</Badge>
              </CardTitle>
              <p className="text-2xl font-bold">
                {PLAN_PRICES.pro}$
                <span className="text-sm font-normal text-muted-foreground">
                  /mois CAD
                </span>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {[
                  "Jusqu'à 5 portefeuilles",
                  "50 messages IA par jour",
                  "Planification fiscale",
                  "Simulateur de retraite",
                  "Export PDF",
                  "Insights IA",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                onClick={() => handleCheckout("pro")}
                disabled={checkoutLoading !== null}
              >
                {checkoutLoading === "pro" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Passer à Pro
              </Button>
            </CardContent>
          </Card>

          {/* Elite */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Crown className="h-5 w-5 text-amber-500" />
                Élite
              </CardTitle>
              <p className="text-2xl font-bold">
                {PLAN_PRICES.elite}$
                <span className="text-sm font-normal text-muted-foreground">
                  /mois CAD
                </span>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {[
                  "Tout du plan Pro",
                  "Portefeuilles illimités",
                  "Messages IA illimités",
                  "IA prioritaire",
                  "Support prioritaire",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleCheckout("elite")}
                disabled={checkoutLoading !== null}
              >
                {checkoutLoading === "elite" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Passer à Élite
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
