"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    Target,
    Plus,
    Pencil,
    Trash2,
    TrendingUp,
    Home,
    GraduationCap,
    Plane,
    ShieldCheck,
    Star,
    CircleDollarSign,
    CheckCircle2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Goal, GoalType, GoalPriority } from "@/types/database";

const GOAL_TYPE_CONFIG: Record<GoalType, { label: string; icon: React.ElementType; color: string }> = {
    retraite: { label: "Retraite", icon: TrendingUp, color: "text-blue-500" },
    achat_maison: { label: "Achat maison", icon: Home, color: "text-green-500" },
    éducation: { label: "Éducation", icon: GraduationCap, color: "text-purple-500" },
    voyage: { label: "Voyage", icon: Plane, color: "text-sky-500" },
    fonds_urgence: { label: "Fonds d'urgence", icon: ShieldCheck, color: "text-orange-500" },
    liberté_financière: { label: "Liberté financière", icon: Star, color: "text-amber-500" },
    autre: { label: "Autre", icon: CircleDollarSign, color: "text-muted-foreground" },
};

const PRIORITY_LABELS: Record<GoalPriority, { label: string; variant: "default" | "secondary" | "outline" }> = {
    haute: { label: "Haute", variant: "default" },
    moyenne: { label: "Moyenne", variant: "secondary" },
    basse: { label: "Basse", variant: "outline" },
};

function daysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getTrajectory(goal: Goal, monthlySavings: number): { status: 'on_track' | 'tight' | 'off_track' | 'overdue'; required: number } | null {
    if (!goal.target_date || goal.current_amount >= goal.target_amount) return null;
    const months = (new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.4);
    if (months <= 0) return { status: 'overdue', required: 0 };
    const required = (goal.target_amount - goal.current_amount) / months;
    if (required <= monthlySavings * 0.6) return { status: 'on_track', required };
    if (required <= monthlySavings) return { status: 'tight', required };
    return { status: 'off_track', required };
}

interface GoalForm {
    type: GoalType;
    label: string;
    target_amount: string;
    current_amount: string;
    target_date: string;
    priority: GoalPriority;
    notes: string;
}

const EMPTY_FORM: GoalForm = {
    type: "autre",
    label: "",
    target_amount: "",
    current_amount: "0",
    target_date: "",
    priority: "moyenne",
    notes: "",
};

export default function GoalsPage() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [monthlySavings, setMonthlySavings] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
    const [form, setForm] = useState<GoalForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    // Quick progress update state per goal
    const [progressInputs, setProgressInputs] = useState<Record<string, string>>({});

    const loadGoals = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [{ data }, { data: ciData }] = await Promise.all([
            supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
            supabase.from("client_info").select("monthly_savings").eq("user_id", user.id).maybeSingle(),
        ]);
        if (ciData?.monthly_savings) setMonthlySavings(Number(ciData.monthly_savings));
        if (data) setGoals(data as Goal[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadGoals();
    }, [loadGoals]);

    function openAdd() {
        setEditingGoal(null);
        setForm(EMPTY_FORM);
        setShowDialog(true);
    }

    function openEdit(goal: Goal) {
        setEditingGoal(goal);
        setForm({
            type: goal.type,
            label: goal.label,
            target_amount: String(goal.target_amount),
            current_amount: String(goal.current_amount),
            target_date: goal.target_date ? goal.target_date.split("T")[0] : "",
            priority: goal.priority,
            notes: goal.notes || "",
        });
        setShowDialog(true);
    }

    async function handleSave() {
        if (!form.label || !form.target_amount) {
            toast.error("Nom et montant cible sont requis");
            return;
        }
        setSaving(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaving(false); return; }

        const payload = {
            type: form.type,
            label: form.label,
            target_amount: parseFloat(form.target_amount) || 0,
            current_amount: parseFloat(form.current_amount) || 0,
            target_date: form.target_date || null,
            priority: form.priority,
            notes: form.notes || null,
        };

        let error;
        if (editingGoal) {
            ({ error } = await supabase.from("goals").update(payload).eq("id", editingGoal.id));
        } else {
            ({ error } = await supabase.from("goals").insert({ ...payload, user_id: user.id }));
        }

        if (error) {
            toast.error("Erreur lors de la sauvegarde");
        } else {
            toast.success(editingGoal ? "Objectif mis à jour" : "Objectif créé");
            setShowDialog(false);
            loadGoals();
        }
        setSaving(false);
    }

    async function handleDelete(id: string) {
        const supabase = createClient();
        const { error } = await supabase.from("goals").delete().eq("id", id);
        if (error) {
            toast.error("Erreur lors de la suppression");
        } else {
            toast.success("Objectif supprimé");
            setDeleteGoalId(null);
            loadGoals();
        }
    }

    async function handleUpdateProgress(goal: Goal) {
        const newAmount = parseFloat(progressInputs[goal.id] || "");
        if (isNaN(newAmount) || newAmount < 0) {
            toast.error("Montant invalide");
            return;
        }
        const supabase = createClient();
        const { error } = await supabase
            .from("goals")
            .update({ current_amount: newAmount })
            .eq("id", goal.id);
        if (error) {
            toast.error("Erreur lors de la mise à jour");
        } else {
            toast.success("Progression mise à jour");
            setProgressInputs((prev) => ({ ...prev, [goal.id]: "" }));
            loadGoals();
        }
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 animate-pulse rounded bg-muted" />
                <div className="grid gap-4 sm:grid-cols-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
                    ))}
                </div>
            </div>
        );
    }

    const sortedGoals = [...goals].sort((a, b) => {
        const order: Record<GoalPriority, number> = { haute: 0, moyenne: 1, basse: 2 };
        return order[a.priority] - order[b.priority];
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Target className="h-6 w-6 text-primary" />
                        Mes objectifs
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Suivez et gérez vos objectifs financiers
                    </p>
                </div>
                <Button onClick={openAdd} className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Nouvel objectif</span>
                    <span className="sm:hidden">Nouveau</span>
                </Button>
            </div>

            {goals.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="font-medium text-muted-foreground">Aucun objectif défini</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Créez votre premier objectif financier pour commencer à suivre vos progrès
                        </p>
                        <Button onClick={openAdd} className="mt-4 gap-2" variant="outline">
                            <Plus className="h-4 w-4" />
                            Créer un objectif
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {sortedGoals.map((goal) => {
                        const progress = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
                        const cfg = GOAL_TYPE_CONFIG[goal.type] || GOAL_TYPE_CONFIG.autre;
                        const days = daysUntil(goal.target_date);
                        const completed = goal.current_amount >= goal.target_amount && goal.target_amount > 0;
                        return (
                            <Card key={goal.id} className={completed ? "border-green-200 dark:border-green-900/50" : ""}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-muted ${cfg.color}`}>
                                                <cfg.icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-sm font-semibold leading-tight">
                                                    {goal.label}
                                                    {completed && <CheckCircle2 className="inline h-4 w-4 ml-1 text-green-500" />}
                                                </CardTitle>
                                                <p className="text-xs text-muted-foreground">{cfg.label}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Badge {...PRIORITY_LABELS[goal.priority]} className="text-[10px]">
                                                {PRIORITY_LABELS[goal.priority].label}
                                            </Badge>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(goal)}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => setDeleteGoalId(goal.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1.5">
                                            <span className="text-muted-foreground">{formatCurrency(goal.current_amount)}</span>
                                            <span className="font-medium">{formatCurrency(goal.target_amount)}</span>
                                        </div>
                                        <Progress value={progress} className="h-2" />
                                        <div className="flex justify-between mt-1">
                                            <span className="text-xs text-muted-foreground">{progress.toFixed(0)}% atteint</span>
                                            {days !== null && (
                                                <span className={`text-xs font-medium ${days < 90 ? "text-orange-500" : "text-muted-foreground"}`}>
                                                    {days > 0 ? `${days} jours restants` : days === 0 ? "Aujourd'hui!" : "Dépassé"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {(() => {
                                        const traj = getTrajectory(goal, monthlySavings);
                                        if (!traj) return null;
                                        return (
                                            <div className={cn(
                                                "rounded-lg px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-1",
                                                traj.status === 'on_track' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
                                                traj.status === 'tight' && "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400",
                                                traj.status === 'off_track' && "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
                                                traj.status === 'overdue' && "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
                                            )}>
                                                <span>
                                                    {traj.status === 'on_track' && '✓ Sur la bonne voie'}
                                                    {traj.status === 'tight' && '⚠ Attention — objectif serré'}
                                                    {traj.status === 'off_track' && '✗ Hors trajectoire'}
                                                    {traj.status === 'overdue' && '✗ Date dépassée'}
                                                </span>
                                                {traj.status !== 'overdue' && (
                                                    <span className="font-semibold">
                                                        {formatCurrency(traj.required)}/mois requis
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    {/* Quick progress update */}
                                    {!completed && (
                                        <div className="flex gap-2 pt-1">
                                            <Input
                                                type="number"
                                                placeholder="Montant actuel…"
                                                className="h-10 text-sm min-w-0"
                                                value={progressInputs[goal.id] || ""}
                                                onChange={(e) => setProgressInputs((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-10 shrink-0 text-xs sm:text-sm"
                                                onClick={() => handleUpdateProgress(goal)}
                                            >
                                                <span className="hidden sm:inline">Mettre à jour</span>
                                                <span className="sm:hidden">Màj</span>
                                            </Button>
                                        </div>
                                    )}
                                    {goal.notes && (
                                        <p className="text-xs text-muted-foreground italic border-t pt-2">{goal.notes}</p>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingGoal ? "Modifier l'objectif" : "Nouvel objectif"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>Type</Label>
                            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as GoalType })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(GOAL_TYPE_CONFIG).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Nom de l&apos;objectif</Label>
                            <Input
                                placeholder="ex: Mise de fonds maison"
                                value={form.label}
                                onChange={(e) => setForm({ ...form, label: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Montant cible ($)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    placeholder="100 000"
                                    value={form.target_amount}
                                    onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Montant actuel ($)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    value={form.current_amount}
                                    onChange={(e) => setForm({ ...form, current_amount: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Date cible</Label>
                                <Input
                                    type="date"
                                    value={form.target_date}
                                    onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Priorité</Label>
                                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as GoalPriority })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="haute">Haute</SelectItem>
                                        <SelectItem value="moyenne">Moyenne</SelectItem>
                                        <SelectItem value="basse">Basse</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Notes (optionnel)</Label>
                            <Input
                                placeholder="Notes sur cet objectif…"
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {editingGoal ? "Enregistrer" : "Créer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog open={!!deleteGoalId} onOpenChange={(open) => !open && setDeleteGoalId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Supprimer l&apos;objectif</DialogTitle>
                        <DialogDescription>Cette action est irréversible.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteGoalId(null)}>Annuler</Button>
                        <Button variant="destructive" onClick={() => deleteGoalId && handleDelete(deleteGoalId)}>
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
