"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { financialSituationSchema, type FinancialSituationInput } from "@/lib/validations/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { ArrowLeft, ArrowRight, Loader2, Wallet } from "lucide-react";

interface Props {
  userId: string;
  onNext: () => void;
  onPrev: () => void;
}

export function FinancialSituationStep({ userId, onNext, onPrev }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FinancialSituationInput>({
    // Zod v4 coerce produces `unknown` input — cast needed for react-hook-form compat
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(financialSituationSchema) as any,
    defaultValues: {
      annual_income: undefined,
      monthly_expenses: undefined,
      total_assets: undefined,
      total_debts: undefined,
      monthly_savings: undefined,
      investment_experience: undefined,
      has_celi: false,
      has_reer: false,
      has_reee: false,
      celi_balance: undefined,
      reer_balance: undefined,
      reee_balance: undefined,
      tax_bracket: undefined,
    },
  });

  const hasCeli = form.watch("has_celi");
  const hasReer = form.watch("has_reer");
  const hasReee = form.watch("has_reee");

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data } = await supabase
        .from("client_info")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (data) {
        const fields: (keyof FinancialSituationInput)[] = [
          "annual_income", "monthly_expenses", "total_assets", "total_debts",
          "monthly_savings", "has_celi", "has_reer", "has_reee",
          "celi_balance", "reer_balance", "reee_balance",
        ];
        fields.forEach((key) => {
          if (data[key] !== null && data[key] !== undefined) {
            form.setValue(key, data[key] as never);
          }
        });
        if (data.investment_experience) {
          form.setValue("investment_experience", data.investment_experience as FinancialSituationInput["investment_experience"]);
        }
        if (data.tax_bracket) {
          form.setValue("tax_bracket", data.tax_bracket as FinancialSituationInput["tax_bracket"]);
        }
      }
    }
    if (userId) loadData();
  }, [userId, form]);

  async function onSubmit(data: FinancialSituationInput) {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.from("client_info").upsert({
        user_id: userId,
        annual_income: data.annual_income,
        monthly_expenses: data.monthly_expenses,
        total_assets: data.total_assets,
        total_debts: data.total_debts,
        monthly_savings: data.monthly_savings,
        investment_experience: data.investment_experience,
        has_celi: data.has_celi,
        has_reer: data.has_reer,
        has_reee: data.has_reee,
        celi_balance: data.has_celi ? data.celi_balance : null,
        reer_balance: data.has_reer ? data.reer_balance : null,
        reee_balance: data.has_reee ? data.reee_balance : null,
        tax_bracket: data.tax_bracket,
      }, { onConflict: "user_id" });
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
          <Wallet className="h-8 w-8 text-primary" />
          <div>
            <CardTitle>Situation financière</CardTitle>
            <CardDescription>Ces données restent confidentielles et nous permettent de calibrer nos recommandations.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Income & Expenses */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="annual_income"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revenu annuel brut ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="75000" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monthly_expenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dépenses mensuelles ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="3000" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Assets & Debts */}
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="total_assets"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actifs totaux ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="100000" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_debts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dettes totales ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="20000" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monthly_savings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Épargne mensuelle ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="1000" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Investment experience & Tax bracket */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="investment_experience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expérience en investissement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="aucune">Aucune</SelectItem>
                        <SelectItem value="débutant">Débutant</SelectItem>
                        <SelectItem value="intermédiaire">Intermédiaire</SelectItem>
                        <SelectItem value="avancé">Avancé</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tax_bracket"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tranche d&apos;imposition</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0-30k">0 - 30 000 $</SelectItem>
                        <SelectItem value="30k-50k">30 000 - 50 000 $</SelectItem>
                        <SelectItem value="50k-100k">50 000 - 100 000 $</SelectItem>
                        <SelectItem value="100k-150k">100 000 - 150 000 $</SelectItem>
                        <SelectItem value="150k+">150 000 $ et plus</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Registered accounts */}
            <div className="space-y-4 rounded-lg border p-4">
              <h4 className="font-medium">Comptes enregistrés</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="has_celi"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>CELI</FormLabel>
                        <FormDescription>Compte d&apos;épargne libre d&apos;impôt</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="has_reer"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>REER</FormLabel>
                        <FormDescription>Régime enregistré d&apos;épargne-retraite</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="has_reee"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>REEE</FormLabel>
                        <FormDescription>Régime enregistré d&apos;épargne-études</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              {hasCeli && (
                <FormField
                  control={form.control}
                  name="celi_balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Solde CELI ($)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {hasReer && (
                <FormField
                  control={form.control}
                  name="reer_balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Solde REER ($)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {hasReee && (
                <FormField
                  control={form.control}
                  name="reee_balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Solde REEE ($)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onPrev} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Précédent
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Suivant
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
