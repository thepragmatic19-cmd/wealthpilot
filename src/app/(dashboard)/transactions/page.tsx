"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    ArrowUpRight,
    ArrowDownRight,
    Plus,
    Search,
    DollarSign,
    TrendingUp,
    Receipt,
    Trash2,
    BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionType, Portfolio } from "@/types/database";

const TYPE_LABELS: Record<TransactionType, string> = {
    achat: "Achat",
    vente: "Vente",
    dividende: "Dividende",
    rééquilibrage: "Rééquilibrage",
    cotisation: "Cotisation",
};

const TYPE_COLORS: Record<TransactionType, string> = {
    achat: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    vente: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    dividende: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    rééquilibrage: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    cotisation: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

interface Position {
    ticker: string;
    name: string;
    sharesHeld: number;
    avgCost: number;
    totalCostBasis: number;
    realizedGainLoss: number;
}

function computePositions(transactions: Transaction[]): Position[] {
    const positions: Record<string, Position> = {};

    // Process in chronological order for correct average cost
    const sorted = [...transactions].sort(
        (a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
    );

    for (const tx of sorted) {
        const ticker = tx.instrument_ticker;
        if (!ticker || ticker === "-") continue;

        if (!positions[ticker]) {
            positions[ticker] = {
                ticker,
                name: tx.instrument_name,
                sharesHeld: 0,
                avgCost: 0,
                totalCostBasis: 0,
                realizedGainLoss: 0,
            };
        }

        const pos = positions[ticker];

        if (tx.type === "achat" && tx.quantity && tx.price) {
            const newCostBasis = pos.totalCostBasis + tx.quantity * tx.price;
            const newShares = pos.sharesHeld + tx.quantity;
            pos.avgCost = newCostBasis / newShares;
            pos.sharesHeld = newShares;
            pos.totalCostBasis = newCostBasis;
        } else if (tx.type === "vente" && tx.quantity && tx.price) {
            const saleProceeds = tx.quantity * tx.price;
            const costOfSold = pos.avgCost * tx.quantity;
            pos.realizedGainLoss += saleProceeds - costOfSold;
            pos.sharesHeld = Math.max(0, pos.sharesHeld - tx.quantity);
            pos.totalCostBasis = Math.max(0, pos.totalCostBasis - costOfSold);
        }
    }

    return Object.values(positions).filter(
        (p) => p.sharesHeld > 0.0001 || p.realizedGainLoss !== 0
    );
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [txToDelete, setTxToDelete] = useState<string | null>(null);

    // New transaction form state
    const [newTx, setNewTx] = useState({
        type: "achat" as TransactionType,
        instrument_ticker: "",
        instrument_name: "",
        quantity: "",
        price: "",
        amount: "",
        account: "",
        notes: "",
        executed_at: new Date().toISOString().split("T")[0],
    });

    const loadData = useCallback(async () => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [{ data: txData }, { data: pData }] = await Promise.all([
                supabase
                    .from("transactions")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("executed_at", { ascending: false }),
                supabase
                    .from("portfolios")
                    .select("*")
                    .eq("user_id", user.id),
            ]);

            if (txData) setTransactions(txData as Transaction[]);
            if (pData) setPortfolios(pData as Portfolio[]);
        } catch (err) {
            console.error("Error loading transactions:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    async function handleAddTransaction() {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const selectedPortfolio = portfolios.find((p) => p.is_selected) || portfolios[0];
            if (!selectedPortfolio) return;

            const { error } = await supabase.from("transactions").insert({
                user_id: user.id,
                portfolio_id: selectedPortfolio.id,
                type: newTx.type,
                instrument_ticker: newTx.instrument_ticker,
                instrument_name: newTx.instrument_name,
                quantity: newTx.quantity ? parseFloat(newTx.quantity) : null,
                price: newTx.price ? parseFloat(newTx.price) : null,
                amount: parseFloat(newTx.amount) || 0,
                account: newTx.account || null,
                notes: newTx.notes || null,
                executed_at: newTx.executed_at || new Date().toISOString(),
            });

            if (error) {
                toast.error("Erreur lors de l'enregistrement de la transaction");
            } else {
                toast.success("Transaction enregistrée");
                setShowAddDialog(false);
                setNewTx({
                    type: "achat",
                    instrument_ticker: "",
                    instrument_name: "",
                    quantity: "",
                    price: "",
                    amount: "",
                    account: "",
                    notes: "",
                    executed_at: new Date().toISOString().split("T")[0],
                });
                loadData();
            }
        } catch (err) {
            console.error("Error adding transaction:", err);
            toast.error("Erreur inattendue");
        }
    }

    async function handleDeleteTransaction(id: string) {
        try {
            const supabase = createClient();
            const { error } = await supabase.from("transactions").delete().eq("id", id);
            if (error) {
                toast.error("Erreur lors de la suppression");
            } else {
                toast.success("Transaction supprimée");
                setTxToDelete(null);
                loadData();
            }
        } catch (err) {
            console.error("Error deleting transaction:", err);
            toast.error("Erreur inattendue");
        }
    }

    const filteredTransactions = transactions.filter((tx) => {
        if (filter !== "all" && tx.type !== filter) return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                tx.instrument_name.toLowerCase().includes(q) ||
                tx.instrument_ticker.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const positions = computePositions(transactions);
    const totalRealizedGain = positions.reduce((sum, p) => sum + p.realizedGainLoss, 0);

    // Summary stats
    const totalInvested = transactions
        .filter((t) => t.type === "achat" || t.type === "cotisation")
        .reduce((sum, t) => sum + t.amount, 0);
    const totalSold = transactions
        .filter((t) => t.type === "vente")
        .reduce((sum, t) => sum + t.amount, 0);
    const totalDividends = transactions
        .filter((t) => t.type === "dividende")
        .reduce((sum, t) => sum + t.amount, 0);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 animate-pulse rounded bg-muted" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
                    ))}
                </div>
                <div className="h-96 animate-pulse rounded-lg bg-muted" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Transactions</h1>
                    <p className="text-sm text-muted-foreground">
                        Historique de vos opérations financières
                    </p>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Ajouter
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nouvelle transaction</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Type</Label>
                                <Select value={newTx.type} onValueChange={(v) => setNewTx({ ...newTx, type: v as TransactionType })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(TYPE_LABELS).map(([k, v]) => (
                                            <SelectItem key={k} value={k}>{v}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>Symbole</Label>
                                    <Input
                                        placeholder="ex: VFV.TO"
                                        value={newTx.instrument_ticker}
                                        onChange={(e) => setNewTx({ ...newTx, instrument_ticker: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Nom</Label>
                                    <Input
                                        placeholder="ex: Vanguard S&P 500"
                                        value={newTx.instrument_name}
                                        onChange={(e) => setNewTx({ ...newTx, instrument_name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label>Quantité</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={newTx.quantity}
                                        onChange={(e) => {
                                            const qty = e.target.value;
                                            const computed = qty && newTx.price
                                                ? String((parseFloat(qty) * parseFloat(newTx.price)).toFixed(2))
                                                : newTx.amount;
                                            setNewTx({ ...newTx, quantity: qty, amount: computed });
                                        }}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Prix unitaire ($)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={newTx.price}
                                        onChange={(e) => {
                                            const price = e.target.value;
                                            const computed = newTx.quantity && price
                                                ? String((parseFloat(newTx.quantity) * parseFloat(price)).toFixed(2))
                                                : newTx.amount;
                                            setNewTx({ ...newTx, price, amount: computed });
                                        }}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Montant ($)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={newTx.amount}
                                        onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="executed_at">Date d&apos;exécution</Label>
                                <Input
                                    id="executed_at"
                                    type="date"
                                    value={newTx.executed_at}
                                    onChange={(e) => setNewTx({ ...newTx, executed_at: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Compte</Label>
                                <Select value={newTx.account} onValueChange={(v) => setNewTx({ ...newTx, account: v })}>
                                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CELI">CELI</SelectItem>
                                        <SelectItem value="REER">REER</SelectItem>
                                        <SelectItem value="REEE">REEE</SelectItem>
                                        <SelectItem value="non_enregistré">Non enregistré</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Notes</Label>
                                <Input
                                    placeholder="Notes optionnelles..."
                                    value={newTx.notes}
                                    onChange={(e) => setNewTx({ ...newTx, notes: e.target.value })}
                                />
                            </div>
                            <Button onClick={handleAddTransaction} disabled={!newTx.instrument_ticker || !newTx.amount}>
                                Enregistrer
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Card>
                    <CardContent className="flex items-center gap-3 p-4 sm:p-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                            <ArrowUpRight className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total investi</p>
                            <p className="text-2xl font-bold">${totalInvested.toLocaleString("fr-CA", { minimumFractionDigits: 2 })}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4 sm:p-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                            <ArrowDownRight className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total vendu</p>
                            <p className="text-2xl font-bold">${totalSold.toLocaleString("fr-CA", { minimumFractionDigits: 2 })}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4 sm:p-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Dividendes</p>
                            <p className="text-2xl font-bold">${totalDividends.toLocaleString("fr-CA", { minimumFractionDigits: 2 })}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Positions (Cost Basis) */}
            {positions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Mes positions
                            {totalRealizedGain !== 0 && (
                                <span className={cn(
                                    "ml-auto text-sm font-semibold",
                                    totalRealizedGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"
                                )}>
                                    G/P réalisé: {totalRealizedGain >= 0 ? "+" : ""}${totalRealizedGain.toLocaleString("fr-CA", { minimumFractionDigits: 2 })}
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="pb-2 text-left font-medium">Titre</th>
                                        <th className="pb-2 text-right font-medium">Parts</th>
                                        <th className="pb-2 text-right font-medium hidden sm:table-cell">Coût moyen</th>
                                        <th className="pb-2 text-right font-medium hidden sm:table-cell">Coût total</th>
                                        <th className="pb-2 text-right font-medium">G/P réalisé</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {positions.map((pos) => (
                                        <tr key={pos.ticker} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-medium">{pos.name}</div>
                                                    <Badge variant="outline" className="text-[10px]">{pos.ticker}</Badge>
                                                </div>
                                            </td>
                                            <td className="py-3 text-right font-mono text-xs">
                                                {pos.sharesHeld > 0 ? pos.sharesHeld.toFixed(4) : "—"}
                                            </td>
                                            <td className="py-3 text-right font-mono text-xs hidden sm:table-cell">
                                                {pos.avgCost > 0 ? `$${pos.avgCost.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                                            </td>
                                            <td className="py-3 text-right font-mono text-xs hidden sm:table-cell">
                                                {pos.totalCostBasis > 0 ? `$${pos.totalCostBasis.toLocaleString("fr-CA", { minimumFractionDigits: 2 })}` : "—"}
                                            </td>
                                            <td className={cn(
                                                "py-3 text-right font-semibold text-xs",
                                                pos.realizedGainLoss > 0 ? "text-green-600 dark:text-green-400" :
                                                pos.realizedGainLoss < 0 ? "text-red-500" : "text-muted-foreground"
                                            )}>
                                                {pos.realizedGainLoss === 0 ? "—" : (
                                                    `${pos.realizedGainLoss >= 0 ? "+" : ""}$${pos.realizedGainLoss.toLocaleString("fr-CA", { minimumFractionDigits: 2 })}`
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                            Méthode du coût moyen pondéré. G/P réalisé calculé sur les ventes seulement.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!txToDelete} onOpenChange={(open) => !open && setTxToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Supprimer la transaction</DialogTitle>
                        <DialogDescription>
                            Cette action est irréversible. La transaction sera définitivement supprimée.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setTxToDelete(null)}>
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => txToDelete && handleDeleteTransaction(txToDelete)}
                        >
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5" />
                            Historique ({filteredTransactions.length})
                        </CardTitle>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher..."
                                    className="pl-8 w-full sm:w-48"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Select value={filter} onValueChange={setFilter}>
                                <SelectTrigger className="w-full sm:w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les types</SelectItem>
                                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-4" />
                            <p className="text-muted-foreground">Aucune transaction trouvée</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Ajoutez votre première transaction pour commencer le suivi
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredTransactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between rounded-lg border p-3 sm:p-4 transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                            {tx.type === "achat" || tx.type === "cotisation" ? (
                                                <ArrowUpRight className="h-5 w-5 text-green-500" />
                                            ) : tx.type === "vente" ? (
                                                <ArrowDownRight className="h-5 w-5 text-red-500" />
                                            ) : (
                                                <DollarSign className="h-5 w-5 text-blue-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <p className="font-medium truncate text-sm sm:text-base">{tx.instrument_name}</p>
                                                <Badge variant="outline" className="text-[10px]">
                                                    {tx.instrument_ticker}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge className={`text-[10px] ${TYPE_COLORS[tx.type]}`}>
                                                    {TYPE_LABELS[tx.type]}
                                                </Badge>
                                                {tx.account && (
                                                    <span className="text-xs text-muted-foreground">{tx.account}</span>
                                                )}
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(tx.executed_at).toLocaleDateString("fr-CA")}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className={`font-semibold ${tx.type === "vente" ? "text-red-500" : "text-green-500"}`}>
                                                {tx.type === "vente" ? "-" : "+"}${Math.abs(tx.amount).toLocaleString("fr-CA", { minimumFractionDigits: 2 })}
                                            </p>
                                            {tx.quantity && tx.price && (
                                                <p className="text-xs text-muted-foreground">
                                                    {tx.quantity} × ${tx.price}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-muted-foreground hover:text-destructive"
                                            onClick={() => setTxToDelete(tx.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
