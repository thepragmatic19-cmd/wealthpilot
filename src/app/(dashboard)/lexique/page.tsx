"use client";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, BookMarked } from "lucide-react";
import { FINANCIAL_TERMS } from "@/lib/financial-terms";
import { useSimpleMode } from "@/contexts/simple-mode-context";

const TERM_CATEGORIES = [
  { label: "Comptes enregistrés",        terms: ["CELI","REER","REEE","CELIAPP","CRI","FRV"] },
  { label: "Indicateurs de performance", terms: ["Rendement attendu","Volatilité","Ratio de Sharpe","RFG moyen","RFG moyen pondéré","Perte max. historique","Drawdown"] },
  { label: "Concepts d'investissement",  terms: ["ETF","Rééquilibrage","Monte Carlo","Diversification"] },
  { label: "Retraite",                   terms: ["RRQ","PSV","Taux de remplacement"] },
];

const ALL_CATEGORIZED_TERMS = new Set(TERM_CATEGORIES.flatMap((c) => c.terms));

const BEGINNER_CATEGORY_LABELS = new Set([
  "Comptes enregistrés",
  "Concepts d'investissement",
]);

export default function LexiquePage() {
  const [search, setSearch] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const { isSimple } = useSimpleMode();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TERM_CATEGORIES;
    return TERM_CATEGORIES
      .map((cat) => ({
        ...cat,
        terms: cat.terms.filter(
          (t) =>
            t.toLowerCase().includes(q) ||
            (FINANCIAL_TERMS[t] ?? "").toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.terms.length > 0);
  }, [search]);

  const displayedCategories = useMemo(() => {
    if (isSimple && !search && !showAllCategories) {
      return filtered.filter((cat) => BEGINNER_CATEGORY_LABELS.has(cat.label));
    }
    return filtered;
  }, [filtered, isSimple, search, showAllCategories]);

  const uncategorizedMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return Object.entries(FINANCIAL_TERMS).filter(
      ([term, def]) =>
        !ALL_CATEGORIZED_TERMS.has(term) &&
        (term.toLowerCase().includes(q) || def.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <BookMarked className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Lexique financier</h1>
          <p className="text-sm text-muted-foreground">
            {isSimple
              ? "Les termes essentiels pour démarrer"
              : "Définitions claires de tous les termes utilisés dans WealthPilot"}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un terme… (ex: CELI, ETF, Sharpe)"
          className="pl-9"
        />
      </div>

      {/* Categories */}
      {filtered.length === 0 && uncategorizedMatches.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          Aucun résultat pour &ldquo;{search}&rdquo;
        </div>
      ) : (
        <>
          {displayedCategories.map((cat) => (
            <div key={cat.label} className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
                {cat.label}
              </h2>
              <div className="space-y-2">
                {cat.terms.map((term) => (
                  <div key={term} className="rounded-xl border bg-card p-4 space-y-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {term}
                    </Badge>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {FINANCIAL_TERMS[term] ?? "Définition à venir."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Simple mode toggle */}
          {isSimple && !search && (
            <button
              onClick={() => setShowAllCategories((v) => !v)}
              className="text-xs text-primary/70 hover:text-primary underline"
            >
              {showAllCategories
                ? "Voir moins"
                : "Voir tous les termes (indicateurs, retraite…)"}
            </button>
          )}

          {/* Uncategorized matches when searching */}
          {uncategorizedMatches.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
                Autres résultats
              </h2>
              <div className="space-y-2">
                {uncategorizedMatches.map(([term, def]) => (
                  <div key={term} className="rounded-xl border bg-card p-4 space-y-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {term}
                    </Badge>
                    <p className="text-sm text-muted-foreground leading-relaxed">{def}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
