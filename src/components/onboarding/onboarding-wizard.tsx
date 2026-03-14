"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { SimpleStep1 } from "./steps/simple-step1";
import { SimpleStep2 } from "./steps/simple-step2";
import { SimpleStep3 } from "./steps/simple-step3";
import type { OnboardingStep } from "@/types/database";

const SIMPLE_STEPS: OnboardingStep[] = [
  "personal_info",
  "financial_situation",
  "portfolio_preview",
  "completed",
];

const STEP_TITLES: Partial<Record<OnboardingStep, string>> = {
  personal_info: "Parlons de toi",
  financial_situation: "Tes comptes & ton objectif",
  portfolio_preview: "Ton style d'investisseur",
};

function mapToSimpleStep(step: OnboardingStep): OnboardingStep {
  if (SIMPLE_STEPS.includes(step)) return step;
  // Map old flow steps to closest simple step
  if (step === "goals") return "financial_situation";
  return "personal_info";
}

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("personal_info");
  const [userId, setUserId] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStep() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_step, full_name")
          .eq("id", user.id)
          .single();
        if (profile && profile.onboarding_step !== "completed") {
          setCurrentStep(mapToSimpleStep(profile.onboarding_step as OnboardingStep));
        }
        if (profile?.full_name) {
          setFirstName(profile.full_name.split(" ")[0]);
        } else if (user.email) {
          setFirstName(user.email.split("@")[0]);
        }
      }
      setLoading(false);
    }
    loadStep();
  }, []);

  const goToStep = useCallback(
    async (step: OnboardingStep) => {
      const supabase = createClient();
      await supabase
        .from("profiles")
        .update({ onboarding_step: step })
        .eq("id", userId);
      setCurrentStep(step);
    },
    [userId]
  );

  const nextStep = useCallback(() => {
    const currentIndex = SIMPLE_STEPS.indexOf(currentStep);
    if (currentIndex < SIMPLE_STEPS.length - 1) {
      goToStep(SIMPLE_STEPS[currentIndex + 1]);
    }
  }, [currentStep, goToStep]);

  const prevStep = useCallback(() => {
    const currentIndex = SIMPLE_STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      goToStep(SIMPLE_STEPS[currentIndex - 1]);
    }
  }, [currentStep, goToStep]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const stepIndex = SIMPLE_STEPS.indexOf(currentStep);
  const displayStep = Math.min(stepIndex + 1, 3);
  const progress = (stepIndex / 3) * 100;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress header */}
      {currentStep !== "completed" && (
        <div className="mb-8 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-base">
              {STEP_TITLES[currentStep] ?? ""}
            </span>
            <span className="text-sm text-muted-foreground">
              Étape {displayStep} sur 3
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          {currentStep === "personal_info" && firstName && (
            <p className="text-sm text-muted-foreground pt-1">
              Bonjour {firstName} 👋 — ça ne prend que 3 minutes
            </p>
          )}
        </div>
      )}

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === "personal_info" && (
            <SimpleStep1 userId={userId} onNext={nextStep} />
          )}
          {currentStep === "financial_situation" && (
            <SimpleStep2 userId={userId} onNext={nextStep} onPrev={prevStep} />
          )}
          {currentStep === "portfolio_preview" && (
            <SimpleStep3 userId={userId} onPrev={prevStep} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
