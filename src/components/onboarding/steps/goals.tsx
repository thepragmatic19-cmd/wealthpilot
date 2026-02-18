"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { goalSchema, type GoalInput } from "@/lib/validations/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Target, Plus, Trash2 } from "lucide-react";
import { GOAL_ICONS } from "@/lib/utils";
import type { Goal } from "@/types/database";

interface Props {
  userId: string;
  onNext: () => void;
  onPrev: () => void;
}

export function GoalsStep({ userId, onNext, onPrev }: Props) {
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<GoalInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(goalSchema) as any,
    defaultValues: {
      type: "retraite",
      label: "",
      target_amount: undefined,
      current_amount: 0,
      target_date: "",
      priority: "moyenne",
      notes: "",
    },
  });

  useEffect(() => {
    async function loadGoals() {
      const supabase = createClient();
      const { data } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at");
      if (data) setGoals(data as Goal[]);
    }
    if (userId) loadGoals();
  }, [userId]);

  async function addGoal(data: GoalInput) {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: newGoal, error } = await supabase
        .from("goals")
        .insert({
          user_id: userId,
          type: data.type,
          label: data.label,
          target_amount: data.target_amount,
          current_amount: data.current_amount,
          target_date: data.target_date || null,
          priority: data.priority,
          notes: data.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      setGoals([...goals, newGoal as Goal]);
      form.reset();
      setShowForm(false);
    } catch {
      toast.error("Erreur lors de l'ajout de l'objectif");
    } finally {
      setLoading(false);
    }
  }

  async function removeGoal(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) {
      console.error("Error deleting goal:", error);
      toast.error("Erreur lors de la suppression de l'objectif");
      return;
    }
    setGoals(goals.filter((g) => g.id !== id));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          <div>
            <CardTitle>Objectifs d&apos;investissement</CardTitle>
            <CardDescription>Quels sont vos projets? Définissez au moins un objectif.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing goals */}
        {goals.map((goal) => (
          <div key={goal.id} className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{GOAL_ICONS[goal.type] || "🎯"}</span>
              <div>
                <p className="font-medium">{goal.label}</p>
                <p className="text-sm text-muted-foreground">
                  {new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0 }).format(goal.target_amount)}
                  {goal.target_date ? ` • ${goal.target_date}` : ""}
                  {` • Priorité ${goal.priority}`}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeGoal(goal.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}

        {/* Add goal form */}
        {showForm ? (
          <div className="rounded-lg border p-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(addGoal)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="retraite">🏖️ Retraite</SelectItem>
                            <SelectItem value="achat_maison">🏠 Achat maison</SelectItem>
                            <SelectItem value="éducation">🎓 Éducation</SelectItem>
                            <SelectItem value="voyage">✈️ Voyage</SelectItem>
                            <SelectItem value="fonds_urgence">🛡️ Fonds d&apos;urgence</SelectItem>
                            <SelectItem value="liberté_financière">💎 Liberté financière</SelectItem>
                            <SelectItem value="autre">🎯 Autre</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de l&apos;objectif</FormLabel>
                        <FormControl>
                          <Input placeholder="Ma retraite à 60 ans" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="target_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant cible ($)</FormLabel>
                        <FormControl>
                          <Input type="number" min={100} {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="current_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant actuel ($)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="target_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date cible</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priorité</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="haute">Haute</SelectItem>
                          <SelectItem value="moyenne">Moyenne</SelectItem>
                          <SelectItem value="basse">Basse</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading} size="sm">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Ajouter
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                    Annuler
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowForm(true)} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un objectif
          </Button>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrev} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </Button>
          <Button onClick={onNext} disabled={goals.length === 0} className="gap-2">
            Suivant
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
