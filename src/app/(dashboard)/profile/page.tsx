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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Wallet,
  Shield,
  Settings,
  Loader2,
  RefreshCw,
  Save,
  KeyRound,
  Pencil,
  X,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import type { Profile, ClientInfo, RiskAssessment } from "@/types/database";
import { useSimpleMode } from "@/contexts/simple-mode-context";

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

const clientInfoSchema = z.object({
  age: z.coerce.number().int().min(0).max(120).optional(),
  annual_income: z.coerce.number().min(0).optional(),
  monthly_expenses: z.coerce.number().min(0).optional(),
  monthly_savings: z.coerce.number().min(0).optional(),
  total_assets: z.coerce.number().min(0).optional(),
  total_debts: z.coerce.number().min(0).optional(),
  celi_balance: z.coerce.number().min(0).optional(),
  reer_balance: z.coerce.number().min(0).optional(),
  reee_balance: z.coerce.number().min(0).optional(),
  celiapp_balance: z.coerce.number().min(0).optional(),
  cri_balance: z.coerce.number().min(0).optional(),
  frv_balance: z.coerce.number().min(0).optional(),
});

type ProfileFormInput = z.infer<typeof profileFormSchema>;
type PasswordInput = z.infer<typeof passwordSchema>;
type ClientInfoInput = z.infer<typeof clientInfoSchema>;

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [editingFinancial, setEditingFinancial] = useState(false);
  const [savingFinancial, setSavingFinancial] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const router = useRouter();
  const { isSimple } = useSimpleMode();

  const profileForm = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { full_name: "", email: "" },
  });

  const passwordForm = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirm_password: "" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientInfoForm = useForm<ClientInfoInput>({
    resolver: zodResolver(clientInfoSchema) as any,
    defaultValues: {
      age: 0,
      annual_income: 0,
      monthly_expenses: 0,
      monthly_savings: 0,
      total_assets: 0,
      total_debts: 0,
      celi_balance: 0,
      reer_balance: 0,
      reee_balance: 0,
      celiapp_balance: 0,
      cri_balance: 0,
      frv_balance: 0,
    },
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
      if (ci) {
        const info = ci as ClientInfo;
        setClientInfo(info);
        clientInfoForm.reset({
          age: Number(info.age) || 0,
          annual_income: Number(info.annual_income) || 0,
          monthly_expenses: Number(info.monthly_expenses) || 0,
          monthly_savings: Number(info.monthly_savings) || 0,
          total_assets: Number(info.total_assets) || 0,
          total_debts: Number(info.total_debts) || 0,
          celi_balance: Number(info.celi_balance) || 0,
          reer_balance: Number(info.reer_balance) || 0,
          reee_balance: Number(info.reee_balance) || 0,
          celiapp_balance: Number(info.celiapp_balance) || 0,
          cri_balance: Number(info.cri_balance) || 0,
          frv_balance: Number(info.frv_balance) || 0,
        });
      }
      if (ra) setRiskAssessment(ra as RiskAssessment);
      setLoading(false);
    }
    load();
  }, [profileForm, clientInfoForm]);

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

  async function onSaveClientInfo(data: ClientInfoInput) {
    if (!clientInfo) return;

    // Cross-validation: registered accounts balances shouldn't exceed total assets by more than 10%
    const celiBalance = data.celi_balance ?? 0;
    const reerBalance = data.reer_balance ?? 0;
    const reeeBalance = data.reee_balance ?? 0;
    const celiappBalance = data.celiapp_balance ?? 0;
    const criBalance = data.cri_balance ?? 0;
    const frvBalance = data.frv_balance ?? 0;
    const totalAssets = data.total_assets ?? 0;
    const totalRegistered = celiBalance + reerBalance + reeeBalance + celiappBalance + criBalance + frvBalance;
    if (totalAssets > 0 && totalRegistered > totalAssets * 1.1) {
      toast.warning("Vérification : vos soldes de comptes enregistrés semblent supérieurs à vos actifs totaux. Veuillez vérifier vos données.");
    }

    setSavingFinancial(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("client_info")
      .update({
        age: data.age ?? null,
        annual_income: data.annual_income ?? null,
        monthly_expenses: data.monthly_expenses ?? null,
        monthly_savings: data.monthly_savings ?? null,
        total_assets: data.total_assets ?? null,
        total_debts: data.total_debts ?? null,
        celi_balance: data.celi_balance ?? null,
        reer_balance: data.reer_balance ?? null,
        reee_balance: data.reee_balance ?? null,
        celiapp_balance: data.celiapp_balance ?? null,
        cri_balance: data.cri_balance ?? null,
        frv_balance: data.frv_balance ?? null,
      })
      .eq("id", clientInfo.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      setClientInfo({
        ...clientInfo,
        age: data.age ?? null,
        annual_income: data.annual_income ?? null,
        monthly_expenses: data.monthly_expenses ?? null,
        monthly_savings: data.monthly_savings ?? null,
        total_assets: data.total_assets ?? null,
        total_debts: data.total_debts ?? null,
        celi_balance: data.celi_balance ?? null,
        reer_balance: data.reer_balance ?? null,
        reee_balance: data.reee_balance ?? null,
        celiapp_balance: data.celiapp_balance ?? null,
        cri_balance: data.cri_balance ?? null,
        frv_balance: data.frv_balance ?? null,
      });
      toast.success("Données financières mises à jour");
      setEditingFinancial(false);
    }
    setSavingFinancial(false);
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/auth/delete-account", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        toast.error(body.error || "Erreur lors de la suppression");
        setDeletingAccount(false);
        return;
      }
      toast.success("Compte supprimé");
      router.push("/login");
    } catch {
      toast.error("Erreur inattendue");
      setDeletingAccount(false);
    }
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
    <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
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

      {/* Financial Summary — editable */}
      {clientInfo && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Données financières
                </CardTitle>
                <CardDescription>
                  {editingFinancial ? "Modifiez vos informations financières." : "Cliquez sur Modifier pour mettre à jour vos données."}
                </CardDescription>
              </div>
              {!editingFinancial && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditingFinancial(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingFinancial ? (
              <Form {...clientInfoForm}>
                <form onSubmit={clientInfoForm.handleSubmit(onSaveClientInfo)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={clientInfoForm.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Âge</FormLabel>
                          <FormControl><Input type="number" min={0} max={120} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clientInfoForm.control}
                      name="annual_income"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Revenu annuel ($)</FormLabel>
                          <FormControl><Input type="number" min={0} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {!isSimple && (
                      <FormField
                        control={clientInfoForm.control}
                        name="monthly_expenses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dépenses mensuelles ($)</FormLabel>
                            <FormControl><Input type="number" min={0} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={clientInfoForm.control}
                      name="monthly_savings"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Épargne mensuelle ($)</FormLabel>
                          <FormControl><Input type="number" min={0} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clientInfoForm.control}
                      name="total_assets"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actifs totaux ($)</FormLabel>
                          <FormControl><Input type="number" min={0} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {!isSimple && (
                      <FormField
                        control={clientInfoForm.control}
                        name="total_debts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dettes totales ($)</FormLabel>
                            <FormControl><Input type="number" min={0} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {clientInfo.has_celi && (
                      <FormField
                        control={clientInfoForm.control}
                        name="celi_balance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Solde CELI ($)</FormLabel>
                            <FormControl><Input type="number" min={0} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {clientInfo.has_reer && (
                      <FormField
                        control={clientInfoForm.control}
                        name="reer_balance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Solde REER ($)</FormLabel>
                            <FormControl><Input type="number" min={0} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {clientInfo.has_reee && (
                      <FormField
                        control={clientInfoForm.control}
                        name="reee_balance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Solde REEE ($)</FormLabel>
                            <FormControl><Input type="number" min={0} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {!isSimple && clientInfo.has_celiapp && (
                      <FormField
                        control={clientInfoForm.control}
                        name="celiapp_balance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Solde CELIAPP ($)</FormLabel>
                            <FormControl><Input type="number" min={0} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {!isSimple && clientInfo.has_cri && (
                      <FormField
                        control={clientInfoForm.control}
                        name="cri_balance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Solde CRI ($)</FormLabel>
                            <FormControl><Input type="number" min={0} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {!isSimple && clientInfo.has_frv && (
                      <FormField
                        control={clientInfoForm.control}
                        name="frv_balance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Solde FRV ($)</FormLabel>
                            <FormControl><Input type="number" min={0} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={savingFinancial} className="gap-2">
                      {savingFinancial ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Enregistrer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setEditingFinancial(false);
                        clientInfoForm.reset({
                          age: Number(clientInfo.age) || 0,
                          annual_income: Number(clientInfo.annual_income) || 0,
                          monthly_expenses: Number(clientInfo.monthly_expenses) || 0,
                          monthly_savings: Number(clientInfo.monthly_savings) || 0,
                          total_assets: Number(clientInfo.total_assets) || 0,
                          total_debts: Number(clientInfo.total_debts) || 0,
                          celi_balance: Number(clientInfo.celi_balance) || 0,
                          reer_balance: Number(clientInfo.reer_balance) || 0,
                          reee_balance: Number(clientInfo.reee_balance) || 0,
                          celiapp_balance: Number(clientInfo.celiapp_balance) || 0,
                          cri_balance: Number(clientInfo.cri_balance) || 0,
                          frv_balance: Number(clientInfo.frv_balance) || 0,
                        });
                      }}
                    >
                      <X className="h-4 w-4" />
                      Annuler
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
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
                  {!isSimple && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Dettes totales</span>
                        <span className="font-medium">{formatCurrency(Number(clientInfo.total_debts || 0))}</span>
                      </div>
                      <Separator />
                    </>
                  )}
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
                  {!isSimple && (
                    <>
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
                    </>
                  )}
                  <Separator />
                  <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
                    <span className="text-muted-foreground">Comptes</span>
                    <div className="flex flex-wrap gap-1">
                      {clientInfo.has_celi && <Badge variant="outline">CELI {clientInfo.celi_balance ? `· ${formatCurrency(Number(clientInfo.celi_balance))}` : ""}</Badge>}
                      {clientInfo.has_reer && <Badge variant="outline">REER {clientInfo.reer_balance ? `· ${formatCurrency(Number(clientInfo.reer_balance))}` : ""}</Badge>}
                      {!isSimple && clientInfo.has_reee && <Badge variant="outline">REEE</Badge>}
                      {!isSimple && clientInfo.has_celiapp && <Badge variant="outline">CELIAPP {clientInfo.celiapp_balance ? `· ${formatCurrency(Number(clientInfo.celiapp_balance))}` : ""}</Badge>}
                      {!isSimple && clientInfo.has_cri && <Badge variant="outline">CRI {clientInfo.cri_balance ? `· ${formatCurrency(Number(clientInfo.cri_balance))}` : ""}</Badge>}
                      {!isSimple && clientInfo.has_frv && <Badge variant="outline">FRV {clientInfo.frv_balance ? `· ${formatCurrency(Number(clientInfo.frv_balance))}` : ""}</Badge>}
                    </div>
                  </div>
                </div>
              </div>
            )}
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

            {!isSimple && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => router.push("/onboarding")}
              >
                <RefreshCw className="h-4 w-4" />
                Refaire le questionnaire
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Password Change */}
      {!isSimple && (
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
      )}

      {/* Danger Zone */}
      {!isSimple && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Zone de danger
            </CardTitle>
            <CardDescription>
              Ces actions sont irréversibles. Procédez avec prudence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-sm">Supprimer mon compte</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Supprime définitivement votre compte et toutes vos données.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 sm:shrink-0"
                onClick={() => { setDeleteConfirm(""); setShowDeleteDialog(true); }}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Supprimer le compte
            </DialogTitle>
            <DialogDescription>
              Cette action est <strong>irréversible</strong>. Toutes vos données (profil, portefeuille, transactions, objectifs, historique de chat) seront définitivement supprimées.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Tapez <strong>SUPPRIMER</strong> pour confirmer :
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="SUPPRIMER"
              className="border-destructive/50 focus-visible:ring-destructive"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== "SUPPRIMER" || deletingAccount}
              onClick={handleDeleteAccount}
              className="gap-2"
            >
              {deletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
