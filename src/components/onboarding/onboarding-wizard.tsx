"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { PersonalInfoStep } from "./steps/personal-info";
import { FinancialSituationStep } from "./steps/financial-situation";
import { GoalsStep } from "./steps/goals";
import { RiskQuestionnaireStep } from "./steps/risk-questionnaire";
import { AIFollowUpStep } from "./steps/ai-follow-up";
import { RiskResultStep } from "./steps/risk-result";
import { PortfolioPreviewStep } from "./steps/portfolio-preview";
import type { OnboardingStep } from "@/types/database";

const STEPS: OnboardingStep[] = [
  "personal_info",
  "financial_situation",
  "goals",
  "risk_questionnaire",
  "ai_follow_up",
  "risk_result",
  "portfolio_preview",
  "completed",
];

const STEP_LABELS: Record<string, string> = {
  personal_info: "Informations personnelles",
  financial_situation: "Situation financière",
  goals: "Objectifs d'investissement",
  risk_questionnaire: "Questionnaire de risque",
  ai_follow_up: "Questions de suivi IA",
  risk_result: "Votre profil de risque",
  portfolio_preview: "Aperçu portefeuille",
};

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("personal_info");
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStep() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_step")
          .eq("id", user.id)
          .single();
        if (profile && profile.onboarding_step !== "completed") {
          setCurrentStep(profile.onboarding_step as OnboardingStep);
        }
      }
      setLoading(false);
    }
    loadStep();
  }, []);

  const goToStep = useCallback(async (step: OnboardingStep) => {
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ onboarding_step: step })
      .eq("id", userId);
    setCurrentStep(step);
  }, [userId]);

  const nextStep = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      goToStep(STEPS[currentIndex + 1]);
    }
  }, [currentStep, goToStep]);

  const prevStep = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      goToStep(STEPS[currentIndex - 1]);
    }
  }, [currentStep, goToStep]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const stepIndex = STEPS.indexOf(currentStep);
  const maxIndex = Math.max(STEPS.length - 2, 1);
  const progress = (stepIndex / maxIndex) * 100;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">{STEP_LABELS[currentStep]}</span>
          <span className="text-muted-foreground">
            Étape {stepIndex + 1} / {STEPS.length - 1}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="mt-3 flex justify-between">
          {STEPS.slice(0, -1).map((step, i) => (
            <div
              key={step}
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                i <= stepIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

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
            <PersonalInfoStep userId={userId} onNext={nextStep} />
          )}
          {currentStep === "financial_situation" && (
            <FinancialSituationStep userId={userId} onNext={nextStep} onPrev={prevStep} />
          )}
          {currentStep === "goals" && (
            <GoalsStep userId={userId} onNext={nextStep} onPrev={prevStep} />
          )}
          {currentStep === "risk_questionnaire" && (
            <RiskQuestionnaireStep userId={userId} onNext={nextStep} onPrev={prevStep} />
          )}
          {currentStep === "ai_follow_up" && (
            <AIFollowUpStep userId={userId} onNext={nextStep} onPrev={prevStep} />
          )}
          {currentStep === "risk_result" && (
            <RiskResultStep userId={userId} onNext={nextStep} />
          )}
          {currentStep === "portfolio_preview" && (
            <PortfolioPreviewStep userId={userId} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
