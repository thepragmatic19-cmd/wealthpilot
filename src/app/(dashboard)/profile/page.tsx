"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { formatCurrency, RISK_PROFILES } from "@/lib/utils";
import {
  User,
  Wallet,
  Shield,
  Settings,
  Loader2,
  RefreshCw,
  Save,
  KeyRound,
} from "lucide-react";
import type { Profile, ClientInfo, RiskAssessment } from "@/types/database";

const profileFormSchema = z.object({
  full_name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email(),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "Au moins 8 caractères"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  });

type ProfileFormInput = z.infer<typeof profileFormSchema>;
type PasswordInput = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const router = useRouter();

  const profileForm = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { full_name: "", email: "" },
  });

  const passwordForm = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirm_password: "" },
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: p }, { data: ci }, { data: ra }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("client_info").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("risk_assessments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (p) {
        setProfile(p as Profile);
        profileForm.setValue("full_name", p.full_name || "");
        profileForm.setValue("email", p.email);
      }
      if (ci) setClientInfo(ci as ClientInfo);
      if (ra) setRiskAssessment(ra as RiskAssessment);
      setLoading(false);
    }
    load();
  }, [profileForm]);

  async function onSaveProfile(data: ProfileFormInput) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: data.full_name })
      .eq("id", profile?.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Profil mis à jour");
    }
    setSaving(false);
  }

  async function onChangePassword(data: PasswordInput) {
    setChangingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Mot de passe mis à jour");
      passwordForm.reset();
    }
    setChangingPassword(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const riskProfile = riskAssessment?.risk_profile
    ? RISK_PROFILES[riskAssessment.risk_profile]
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Mon profil</h1>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations personnelles
          </CardTitle>
          <CardDescription>Modifiez vos informations de base.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Courriel</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      {clientInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Résumé financier
            </CardTitle>
            <CardDescription>Aperçu de votre situation (lecture seule).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Revenu annuel</span>
                  <span className="font-medium">{formatCurrency(Number(clientInfo.annual_income || 0))}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actifs totaux</span>
                  <span className="font-medium">{formatCurrency(Number(clientInfo.total_assets || 0))}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dettes totales</span>
                  <span className="font-medium">{formatCurrency(Number(clientInfo.total_debts || 0))}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Épargne mensuelle</span>
                  <span className="font-medium">{formatCurrency(Number(clientInfo.monthly_savings || 0))}/mois</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Âge</span>
                  <span className="font-medium">{clientInfo.age || "—"} ans</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profession</span>
                  <span className="font-medium">{clientInfo.profession || "—"}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expérience</span>
                  <span className="font-medium capitalize">{clientInfo.investment_experience || "—"}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Comptes</span>
                  <div className="flex gap-1">
                    {clientInfo.has_celi && <Badge variant="outline">CELI</Badge>}
                    {clientInfo.has_reer && <Badge variant="outline">REER</Badge>}
                    {clientInfo.has_reee && <Badge variant="outline">REEE</Badge>}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Profile */}
      {riskAssessment && riskProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Profil de risque
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full border-4"
                style={{ borderColor: riskProfile.color }}
              >
                <span className="text-xl font-bold">{riskAssessment.risk_score}</span>
              </div>
              <div>
                <Badge style={{ backgroundColor: riskProfile.color, color: "white" }}>
                  {riskProfile.label}
                </Badge>
                <p className="mt-1 text-sm text-muted-foreground">{riskProfile.description}</p>
              </div>
            </div>

            {riskAssessment.ai_analysis && (
              <p className="text-sm text-muted-foreground">{riskAssessment.ai_analysis}</p>
            )}

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push("/onboarding")}
            >
              <RefreshCw className="h-4 w-4" />
              Refaire le questionnaire
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Paramètres du compte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouveau mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" variant="outline" disabled={changingPassword} className="gap-2">
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Changer le mot de passe
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
