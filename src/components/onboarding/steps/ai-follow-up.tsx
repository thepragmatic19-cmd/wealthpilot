"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Brain, Sparkles, RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  userId: string;
  onNext: () => void;
  onPrev: () => void;
}

export function AIFollowUpStep({ userId, onNext, onPrev }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const loadOrGenerate = useCallback(async () => {
    setLoading(true);
    setError(false);
    const supabase = createClient();

    // Check if questions already exist
    const { data: assessment } = await supabase
      .from("risk_assessments")
      .select("id, ai_follow_up_questions, ai_follow_up_answers, answers")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (assessment?.ai_follow_up_questions?.length) {
      setQuestions(assessment.ai_follow_up_questions);
      if (assessment.ai_follow_up_answers) {
        setAnswers(assessment.ai_follow_up_answers);
      }
      setLoading(false);
      return;
    }

    // Generate via API
    try {
      const res = await fetch("/api/ai/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: assessment?.answers || {} }),
      });

      console.log("Response status:", res.status);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Follow-up API error:", errData);
        throw new Error(errData.error || "API error");
      }

      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        throw new Error("No questions returned");
      }
    } catch (err) {
      console.error("Failed to generate follow-up questions:", err);
      setError(true);
      toast.error("Erreur lors de la génération des questions IA");
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) loadOrGenerate();
  }, [userId, loadOrGenerate]);

  async function handleSubmit() {
    // If no questions were generated, skip the follow-up and go directly to risk profile
    if (questions.length === 0) {
      setSubmitting(true);
      try {
        const res = await fetch("/api/ai/risk-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ followUpAnswers: {} }),
        });
        if (!res.ok) throw new Error("API error");
        onNext();
      } catch {
        toast.error("Erreur lors de l'analyse du profil");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const unanswered = questions.some((_, i) => !answers[`q${i}`]?.trim());
    if (unanswered) {
      toast.error("Veuillez répondre à toutes les questions");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/ai/risk-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpAnswers: answers }),
      });

      if (!res.ok) throw new Error("API error");
      onNext();
    } catch {
      toast.error("Erreur lors de l'analyse du profil");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <Brain className="h-12 w-12 text-primary animate-pulse" />
            <Sparkles className="absolute -right-2 -top-2 h-5 w-5 text-yellow-500 animate-bounce" />
          </div>
          <p className="text-muted-foreground text-center">
            Notre IA analyse vos réponses et prépare des questions personnalisées...
          </p>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Error state - allow retry or skip
  if (error && questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>Questions de suivi personnalisées</CardTitle>
              <CardDescription>
                Notre IA a analysé vos réponses et souhaite approfondir certains points.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 py-8 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
            <AlertTriangle className="h-10 w-10 text-yellow-500" />
            <p className="text-center text-muted-foreground px-4">
              Une erreur est survenue lors de la génération des questions de suivi.
              Vous pouvez réessayer ou passer directement à l&apos;analyse de votre profil.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={loadOrGenerate} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Passer à l&apos;analyse
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onPrev} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Précédent
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <CardTitle>Questions de suivi personnalisées</CardTitle>
            <CardDescription>
              Notre IA a analysé vos réponses et souhaite approfondir certains points, comme le ferait un conseiller lors d&apos;un rendez-vous.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((question, index) => (
          <div key={index} className="space-y-2">
            <label className="text-sm font-medium leading-relaxed">
              {index + 1}. {question}
            </label>
            <Textarea
              value={answers[`q${index}`] || ""}
              onChange={(e) =>
                setAnswers({ ...answers, [`q${index}`]: e.target.value })
              }
              placeholder="Votre réponse..."
              rows={3}
            />
          </div>
        ))}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrev} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                Voir mon profil de risque
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
