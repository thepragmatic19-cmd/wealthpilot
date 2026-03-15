"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import type { RiskProfile } from "@/types/database";

interface Props {
  userId: string;
  onPrev: () => void;
}

const STYLES: {
  emoji: string;
  title: string;
  desc: string;
  expectedReturn: string;
  profile: RiskProfile;
  score: number;
}[] = [
  {
    emoji: "🛡️",
    title: "Je m'inquiéterais beaucoup",
    desc: "La stabilité avant tout. Moins de gains, mais moins de stress.",
    expectedReturn: "~3–5 % / an",
    profile: "conservateur",
    score: 2,
  },
  {
    emoji: "⚖️",
    title: "Je serais inquiet, mais j'attendrais",
    desc: "Un bon équilibre entre sécurité et croissance.",
    expectedReturn: "~5–7 % / an",
    profile: "modéré",
    score: 3,
  },
  {
    emoji: "🚀",
    title: "Je resterais calme, voire j'achèterais plus",
    desc: "Je pense long terme. Les fluctuations font partie du jeu.",
    expectedReturn: "~7–9 % / an",
    profile: "croissance",
    score: 5,
  },
];

const LOADING_STEPS = [
  "Analyse de ta situation",
  "Sélection des meilleurs ETFs canadiens",
  "Optimisation fiscale...",
];

export function SimpleStep3({ userId, onPrev }: Props) {
  const router = useRouter();
  const [selectedStyle, setSelectedStyle] = useState(1); // default: équilibré
  const [generating, setGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const generatingRef = useRef(false);

  // Pre-select based on age
  useEffect(() => {
    async function loadAge() {
      const supabase = createClient();
      const { data } = await supabase
        .from("client_info")
        .select("age")
        .eq("user_id", userId)
        .single();
      if (data?.age && data.age >= 60) {
        setSelectedStyle(0); // Prudent for 60+
      }
    }
    if (userId) loadAge();
  }, [userId]);

  async function handleSubmit() {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setSubmitting(true);

    const style = STYLES[selectedStyle];
    const supabase = createClient();

    try {
      // 1. Replace risk assessment
      await supabase.from("risk_assessments").delete().eq("user_id", userId);
      await supabase.from("risk_assessments").insert({
        user_id: userId,
        answers: {},
        risk_profile: style.profile,
        risk_score: style.score,
        ai_analysis: "Onboarding simplifié",
        key_factors: [],
      });

      // 2. Set portfolio_preview step
      await supabase
        .from("profiles")
        .update({ onboarding_step: "portfolio_preview" })
        .eq("id", userId);

      // 3. Show generating UI
      setSubmitting(false);
      setGenerating(true);

      // Animate loading steps
      setTimeout(() => setLoadingStep(1), 1000);
      setTimeout(() => setLoadingStep(2), 2500);

      // 4. Call portfolio API
      const res = await fetch("/api/ai/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      // 5. Mark onboarding as completed
      await supabase
        .from("profiles")
        .update({ onboarding_step: "completed", onboarding_completed: true })
        .eq("id", userId);

      // 6. Navigate to portfolio
      router.push("/portfolio");
    } catch {
      toast.error(
        "Une erreur est survenue lors de la génération du portefeuille. Réessaie."
      );
      generatingRef.current = false;
      setGenerating(false);
      setSubmitting(false);
      setLoadingStep(0);
    }
  }

  if (generating) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">On construit ton plan personnalisé...</p>
          <div className="space-y-3 text-left">
            {LOADING_STEPS.map((step, i) => (
              <div
                key={step}
                className={cn(
                  "flex items-center gap-3 text-sm transition-all duration-500",
                  i <= loadingStep ? "opacity-100" : "opacity-30"
                )}
              >
                {i < loadingStep ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                ) : i === loadingStep ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <div className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/30" />
                )}
                <span
                  className={
                    i < loadingStep
                      ? "text-muted-foreground line-through"
                      : i === loadingStep
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                  }
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {STYLES.map((style, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelectedStyle(i)}
            className={cn(
              "w-full rounded-xl border p-5 text-left transition-all",
              selectedStyle === i
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl shrink-0">{style.emoji}</span>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-semibold",
                    selectedStyle === i ? "text-primary" : ""
                  )}
                >
                  {style.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{style.desc}</p>
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  Rendement attendu : {style.expectedReturn}
                </p>
              </div>
              <div
                className={cn(
                  "mt-1 h-5 w-5 shrink-0 rounded-full border-2 transition-colors",
                  selectedStyle === i
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30 bg-transparent"
                )}
              />
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={submitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1"
          size="lg"
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Créer mon portefeuille
        </Button>
      </div>
    </div>
  );
}
