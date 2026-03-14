"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import type { GoalType } from "@/types/database";

interface Props {
  userId: string;
  onNext: () => void;
  onPrev: () => void;
}

const GOALS: { type: GoalType; emoji: string; label: string }[] = [
  { type: "retraite", emoji: "🏖️", label: "Ma retraite" },
  { type: "achat_maison", emoji: "🏠", label: "Acheter une maison" },
  { type: "fonds_urgence", emoji: "🛡️", label: "Mon fonds d'urgence" },
  { type: "liberté_financière", emoji: "🌟", label: "Ma liberté financière" },
];

export function SimpleStep2({ userId, onNext, onPrev }: Props) {
  const [hasCeli, setHasCeli] = useState(false);
  const [hasReer, setHasReer] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!selectedGoal) {
      toast.error("Choisis ton objectif principal pour continuer.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();

      // Upsert account info
      await supabase
        .from("client_info")
        .upsert(
          { user_id: userId, has_celi: hasCeli, has_reer: hasReer },
          { onConflict: "user_id" }
        );

      // Replace goals with selected one
      await supabase.from("goals").delete().eq("user_id", userId);
      await supabase.from("goals").insert({
        user_id: userId,
        type: selectedGoal,
        label: GOALS.find((g) => g.type === selectedGoal)!.label,
        target_amount: 0,
        current_amount: 0,
        priority: "haute",
      });

      await supabase
        .from("profiles")
        .update({ onboarding_step: "financial_situation" })
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
      {/* Account toggles */}
      <div className="space-y-4">
        <p className="text-sm font-semibold">Est-ce que tu utilises ces comptes ?</p>
        <div className="space-y-3">
          <div className="flex items-start gap-4 rounded-xl border p-4">
            <Switch
              checked={hasCeli}
              onCheckedChange={setHasCeli}
              className="mt-0.5 shrink-0"
            />
            <div>
              <p className="font-medium text-sm">CELI — Compte Épargne Libre d&apos;Impôt</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tes gains ne sont jamais taxés. Tu peux retirer quand tu veux.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-xl border p-4">
            <Switch
              checked={hasReer}
              onCheckedChange={setHasReer}
              className="mt-0.5 shrink-0"
            />
            <div>
              <p className="font-medium text-sm">REER — Régime d&apos;Épargne-Retraite</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tes cotisations réduisent tes impôts. Idéal pour préparer la retraite.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Goal selection */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">Pourquoi tu épargnes ?</p>
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map((goal) => (
            <button
              key={goal.type}
              type="button"
              onClick={() => setSelectedGoal(goal.type)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border px-4 py-5 transition-colors",
                selectedGoal === goal.type
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <span className="text-3xl">{goal.emoji}</span>
              <span
                className={cn(
                  "text-sm font-medium text-center",
                  selectedGoal === goal.type ? "text-primary" : ""
                )}
              >
                {goal.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onPrev} disabled={loading}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !selectedGoal}
          className="flex-1"
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
    </div>
  );
}
