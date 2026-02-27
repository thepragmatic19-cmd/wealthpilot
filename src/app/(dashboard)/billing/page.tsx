"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSubscription, LAUNCH_END_DATE } from "@/hooks/use-subscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  CreditCard,
  Crown,
  Sparkles,
  Check,
  ExternalLink,
  Loader2,
  Timer,
  MessageSquare,
} from "lucide-react";
import { getPlanLabel, PLAN_PRICES } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/client";

function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      expired: false,
    };
  };
  const [remaining, setRemaining] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return remaining;
}

function LaunchCountdown() {
  const { days, hours, minutes, seconds, expired } = useCountdown(LAUNCH_END_DATE);
  if (expired) return null;
  return (
    <div className="rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Timer className="h-4 w-4 text-amber-500 animate-pulse" />
        <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
          L&apos;offre de lancement expire dans :
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { val: days, label: "Jours" },
          { val: hours, label: "Heures" },
          { val: minutes, label: "Minutes" },
          { val: seconds, label: "Secondes" },
        ].map(({ val, label }) => (
          <div key={label} className="rounded-lg bg-background/80 border border-amber-200/50 py-3">
            <p className="text-2xl font-black tabular-nums text-amber-600 dark:text-amber-400">
              {String(val).padStart(2, "0")}
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center">
        Après cette date, les fonctionnalités Pro redeviendront payantes (19$/mois).
      </p>
    </div>
  );
}

const AI_DAILY_LIMIT = 50;

export default function BillingPage() {
  const { subscription, plan, isLoading, isFree } = useSubscription();
  const searchParams = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [aiUsageToday, setAiUsageToday] = useState<number | null>(null);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Abonnement activé avec succès!");
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("Paiement annulé.");
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchAiUsage() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("role", "user")
        .gte("created_at", todayStart.toISOString());
      setAiUsageToday(count ?? 0);
    }
    fetchAiUsage();
  }, []);

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
      <Card className="relative overflow-hidden border-primary/50">
        <div className="absolute top-0 right-0">
           <div className="bg-primary text-primary-foreground text-[10px] font-bold px-4 py-1 rotate-45 translate-x-[25px] translate-y-[10px] shadow-sm uppercase tracking-widest">
              Launch
           </div>
        </div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Plan actuel
            <Badge variant="default">
              {getPlanLabel(plan)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
             <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                   <p className="text-sm font-bold">Offre de lancement active</p>
                   <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Pendant notre phase de lancement, tous les utilisateurs de WealthPilot bénéficient d&apos;un accès complet aux fonctionnalités <strong>Pro</strong> gratuitement. Profitez-en pour optimiser votre capital !
                   </p>
                </div>
             </div>
          </div>
          <LaunchCountdown />

          {/* AI usage gauge — always visible */}
          {aiUsageToday !== null && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Messages IA aujourd&apos;hui</p>
                </div>
                <span className="text-sm font-bold tabular-nums">
                  <span className={aiUsageToday >= AI_DAILY_LIMIT ? "text-destructive" : "text-primary"}>
                    {aiUsageToday}
                  </span>
                  <span className="text-muted-foreground font-normal"> / {AI_DAILY_LIMIT}</span>
                </span>
              </div>
              <Progress
                value={Math.min(100, (aiUsageToday / AI_DAILY_LIMIT) * 100)}
                className="h-2"
              />
              {aiUsageToday >= AI_DAILY_LIMIT ? (
                <p className="text-xs text-destructive">Limite atteinte — se réinitialise à minuit.</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {AI_DAILY_LIMIT - aiUsageToday} messages restants aujourd&apos;hui (plan Pro/Launch).
                </p>
              )}
            </div>
          )}

          {subscription?.current_period_end && (
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

          {subscription?.stripe_customer_id && (
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
              Gérer mon abonnement Stripe
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
                  "IA prioritaire (réponses plus rapides)",
                  "🔔 Alertes de rééquilibrage automatiques",
                  "📄 Rapports PDF mensuels automatisés",
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
