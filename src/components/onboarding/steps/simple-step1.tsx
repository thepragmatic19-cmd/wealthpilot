"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

interface Props {
  userId: string;
  onNext: () => void;
}

const AGE_OPTIONS = [
  { label: "20–29 ans", value: 25 },
  { label: "30–39 ans", value: 35 },
  { label: "40–49 ans", value: 45 },
  { label: "50–59 ans", value: 55 },
  { label: "60 ans et +", value: 65 },
];

const INCOME_OPTIONS = [
  { label: "Moins de 40 000 $", value: 30000 },
  { label: "40 000 – 70 000 $", value: 55000 },
  { label: "70 000 – 100 000 $", value: 85000 },
  { label: "100 000 – 150 000 $", value: 125000 },
  { label: "Plus de 150 000 $", value: 175000 },
  { label: "Je préfère ne pas répondre", value: -1 },
];

const SAVINGS_OPTIONS = [
  { label: "Je ne sais pas encore", value: -1 },
  { label: "Moins de 100 $", value: 50 },
  { label: "100 – 300 $", value: 200 },
  { label: "300 – 600 $", value: 450 },
  { label: "Plus de 600 $", value: 750 },
];

// Map sentinel values to DB values
function toDbIncome(v: number) {
  return v === -1 ? 0 : v;
}
function toDbSavings(v: number) {
  return v === -1 ? 0 : v;
}

interface RadioCardProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
}

function RadioCard({ label, selected, onClick, className }: RadioCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm font-medium transition-colors text-left",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card hover:border-primary/50",
        className
      )}
    >
      {label}
    </button>
  );
}

export function SimpleStep1({ userId, onNext }: Props) {
  const [age, setAge] = useState<number | null>(null);
  const [income, setIncome] = useState<number | null>(null);
  const [savings, setSavings] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = age !== null && income !== null && savings !== null;

  async function handleSubmit() {
    if (!canSubmit) {
      toast.error("Veuillez répondre à toutes les questions.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase
        .from("client_info")
        .upsert(
          {
            user_id: userId,
            age,
            annual_income: toDbIncome(income),
            monthly_savings: toDbSavings(savings),
          },
          { onConflict: "user_id" }
        );
      await supabase
        .from("profiles")
        .update({ onboarding_step: "personal_info" })
        .eq("id", userId);
      onNext();
    } catch {
      toast.error("Une erreur est survenue. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Âge */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">Ton âge</p>
        <div className="flex flex-wrap gap-2">
          {AGE_OPTIONS.map((opt) => (
            <RadioCard
              key={opt.label}
              label={opt.label}
              selected={age === opt.value}
              onClick={() => setAge(opt.value)}
              className="flex-1 min-w-[120px]"
            />
          ))}
        </div>
      </div>

      {/* Revenu annuel */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">Ton revenu annuel brut</p>
        <div className="grid grid-cols-2 gap-2">
          {INCOME_OPTIONS.map((opt) => (
            <RadioCard
              key={opt.label}
              label={opt.label}
              selected={income === opt.value}
              onClick={() => setIncome(opt.value)}
            />
          ))}
        </div>
      </div>

      {/* Épargne mensuelle */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">Combien tu mets de côté chaque mois ?</p>
        <div className="flex flex-wrap gap-2">
          {SAVINGS_OPTIONS.map((opt) => (
            <RadioCard
              key={opt.label}
              label={opt.label}
              selected={savings === opt.value}
              onClick={() => setSavings(opt.value)}
              className="flex-1 min-w-[140px]"
            />
          ))}
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || !canSubmit}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="mr-2 h-4 w-4" />
        )}
        Continuer
      </Button>
    </div>
  );
}
