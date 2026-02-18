"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { riskQuestionnaireSchema, type RiskQuestionnaireInput } from "@/lib/validations/onboarding";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

interface Props {
  userId: string;
  onNext: () => void;
  onPrev: () => void;
}

const QUESTIONS = [
  {
    name: "q1_loss_reaction" as const,
    question: "Si votre portefeuille perdait 20% en un mois, quelle serait votre réaction?",
    options: [
      { value: "sell_all", label: "Je vends tout immédiatement" },
      { value: "sell_some", label: "Je vends une partie pour limiter les pertes" },
      { value: "wait", label: "J'attends que le marché remonte" },
      { value: "buy_more", label: "J'en profite pour acheter davantage" },
    ],
  },
  {
    name: "q2_volatility_comfort" as const,
    question: "Quel niveau de fluctuation annuelle acceptez-vous sur votre portefeuille?",
    options: [
      { value: "minimal", label: "± 5% maximum" },
      { value: "low", label: "± 10% est acceptable" },
      { value: "moderate", label: "± 20% si le rendement est meilleur" },
      { value: "high", label: "± 30% ou plus ne me dérange pas" },
    ],
  },
  {
    name: "q3_investment_horizon" as const,
    question: "Sur combien de temps comptez-vous investir principalement?",
    options: [
      { value: "short", label: "Moins de 3 ans" },
      { value: "medium", label: "3 à 7 ans" },
      { value: "long", label: "7 à 15 ans" },
      { value: "very_long", label: "Plus de 15 ans" },
    ],
  },
  {
    name: "q4_loss_scenario" as const,
    question: "Vous investissez 10 000 $. Après 1 an, quel scénario préférez-vous?",
    options: [
      { value: "safe", label: "Garanti 10 200 $ (rendement 2%)" },
      { value: "balanced", label: "Entre 9 000 $ et 11 500 $" },
      { value: "growth", label: "Entre 7 500 $ et 14 000 $" },
      { value: "aggressive", label: "Entre 5 000 $ et 20 000 $" },
    ],
  },
  {
    name: "q5_gain_preference" as const,
    question: "Quelle est votre priorité principale en investissement?",
    options: [
      { value: "preserve", label: "Préserver mon capital à tout prix" },
      { value: "income", label: "Générer un revenu régulier" },
      { value: "balanced_growth", label: "Croissance modérée avec protection" },
      { value: "max_growth", label: "Maximiser la croissance à long terme" },
    ],
  },
  {
    name: "q6_market_crash" as const,
    question: "En cas de krach boursier (comme mars 2020), que faites-vous?",
    options: [
      { value: "panic", label: "Je panique et vends pour éviter plus de pertes" },
      { value: "worried", label: "Je suis inquiet mais je ne touche à rien" },
      { value: "calm", label: "Je reste calme, c'est normal sur les marchés" },
      { value: "excited", label: "C'est une opportunité, j'investis davantage" },
    ],
  },
  {
    name: "q7_income_stability" as const,
    question: "Comment décririez-vous la stabilité de vos revenus?",
    options: [
      { value: "unstable", label: "Très variable (travailleur autonome, commissions)" },
      { value: "somewhat_stable", label: "Plutôt stable mais pas garanti" },
      { value: "stable", label: "Stable (emploi permanent)" },
      { value: "very_stable", label: "Très stable (fonctionnaire, pension garantie)" },
    ],
  },
  {
    name: "q8_knowledge_level" as const,
    question: "Comment évaluez-vous votre compréhension des marchés financiers?",
    options: [
      { value: "none", label: "Très limitée, je ne connais pas les bases" },
      { value: "basic", label: "Je comprends les concepts de base" },
      { value: "good", label: "Bonne compréhension, je suis les marchés" },
      { value: "expert", label: "Excellente, j'analyse régulièrement les marchés" },
    ],
  },
  {
    name: "q9_portfolio_check" as const,
    question: "À quelle fréquence souhaitez-vous consulter votre portefeuille?",
    options: [
      { value: "daily", label: "Tous les jours" },
      { value: "weekly", label: "Une fois par semaine" },
      { value: "monthly", label: "Une fois par mois" },
      { value: "quarterly", label: "Quelques fois par an" },
    ],
  },
  {
    name: "q10_risk_return" as const,
    question: "Complétez cette phrase: \"Pour obtenir de meilleurs rendements...\"",
    options: [
      { value: "no_risk", label: "...je ne suis pas prêt à prendre plus de risques" },
      { value: "small_risk", label: "...je peux accepter un peu plus de risque" },
      { value: "moderate_risk", label: "...je suis prêt à prendre des risques significatifs" },
      { value: "high_risk", label: "...je suis prêt à risquer une perte importante" },
    ],
  },
];

export function RiskQuestionnaireStep({ userId, onNext, onPrev }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<RiskQuestionnaireInput>({
    resolver: zodResolver(riskQuestionnaireSchema),
  });

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data } = await supabase
        .from("risk_assessments")
        .select("answers")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data?.answers) {
        const answers = data.answers as Record<string, string>;
        Object.entries(answers).forEach(([key, value]) => {
          form.setValue(key as keyof RiskQuestionnaireInput, value);
        });
      }
    }
    if (userId) loadData();
  }, [userId, form]);

  async function onSubmit(data: RiskQuestionnaireInput) {
    setLoading(true);
    try {
      const supabase = createClient();
      // Upsert risk assessment
      const { data: existing } = await supabase
        .from("risk_assessments")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        await supabase
          .from("risk_assessments")
          .update({ answers: data })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("risk_assessments")
          .insert({ user_id: userId, answers: data });
      }
      onNext();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <CardTitle>Questionnaire de risque</CardTitle>
            <CardDescription>10 questions pour évaluer votre tolérance au risque. Répondez honnêtement, il n&apos;y a pas de mauvaise réponse.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {QUESTIONS.map((q, index) => (
              <FormField
                key={q.name}
                control={form.control}
                name={q.name}
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base">
                      {index + 1}. {q.question}
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="space-y-2"
                      >
                        {q.options.map((option) => (
                          <div
                            key={option.value}
                            className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                          >
                            <RadioGroupItem value={option.value} id={`${q.name}-${option.value}`} />
                            <label htmlFor={`${q.name}-${option.value}`} className="flex-1 cursor-pointer text-sm">
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onPrev} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Précédent
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Analyser mon profil
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
