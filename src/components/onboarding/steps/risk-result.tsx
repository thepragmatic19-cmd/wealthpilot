"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RISK_PROFILES } from "@/lib/utils";
import { ArrowRight, Shield, AlertTriangle } from "lucide-react";

interface Props {
  userId: string;
  onNext: () => void;
}

interface RiskData {
  risk_score: number;
  risk_profile: string;
  ai_analysis: string;
  key_factors: string[];
}

export function RiskResultStep({ userId, onNext }: Props) {
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: assessment } = await supabase
        .from("risk_assessments")
        .select("risk_score, risk_profile, ai_analysis, key_factors")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (assessment) {
        setData(assessment as RiskData);
      }
      setLoading(false);
    }
    if (userId) load();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <AlertTriangle className="h-12 w-12 text-yellow-500" />
          <p>Aucun résultat trouvé. Veuillez recommencer le questionnaire.</p>
        </CardContent>
      </Card>
    );
  }

  const profile = RISK_PROFILES[data.risk_profile] || {
    label: data.risk_profile,
    color: "#6b7280",
    description: "",
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Votre profil de risque</CardTitle>
        <CardDescription>Résultat de l&apos;analyse IA de vos réponses</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="flex flex-col items-center gap-4"
        >
          <div
            className="flex h-32 w-32 items-center justify-center rounded-full border-4"
            style={{ borderColor: profile.color }}
          >
            <div className="text-center">
              <span className="text-4xl font-bold">{data.risk_score}</span>
              <span className="text-lg text-muted-foreground">/10</span>
            </div>
          </div>
          <Badge
            className="text-base px-4 py-1"
            style={{ backgroundColor: profile.color, color: "white" }}
          >
            {profile.label}
          </Badge>
          <p className="text-sm text-muted-foreground">{profile.description}</p>
        </motion.div>

        {/* Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div className="rounded-lg border p-4">
            <h3 className="mb-2 flex items-center gap-2 font-semibold">
              <Shield className="h-5 w-5 text-primary" />
              Analyse détaillée
            </h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {data.ai_analysis}
            </p>
          </div>

          {/* Key factors */}
          {data.key_factors && data.key_factors.length > 0 && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-3 font-semibold">Facteurs clés</h3>
              <div className="space-y-2">
                {data.key_factors.map((factor, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-start gap-2"
                  >
                    <div
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: profile.color }}
                    />
                    <span className="text-sm">{factor}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <div className="flex justify-end pt-4">
          <Button onClick={onNext} className="gap-2">
            Voir les portefeuilles recommandés
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
