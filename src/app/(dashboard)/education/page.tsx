"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Clock,
  Landmark,
  BarChart2,
  Layers,
  Receipt,
  Compass,
} from "lucide-react";

interface Article {
  id: string;
  category: string;
  categoryIcon: React.ElementType;
  title: string;
  summary: string;
  readTime: number;
  content: string;
  alexQuestion: string;
}

const EDUCATION_CONTENT: Article[] = [
  // Comptes enregistrés
  {
    id: "celi-vs-reer",
    category: "Comptes enregistrés",
    categoryIcon: Landmark,
    title: "CELI vs REER : lequel choisir ?",
    summary: "Comprendre les différences fondamentales entre le CELI et le REER pour optimiser votre stratégie fiscale canadienne.",
    readTime: 4,
    content: `Le CELI (Compte d'épargne libre d'impôt) et le REER (Régime enregistré d'épargne-retraite) sont les deux piliers de l'épargne canadienne.

**CELI :** Les cotisations ne sont pas déductibles d'impôt, mais les retraits sont entièrement libres d'impôt. Idéal si votre taux marginal est faible aujourd'hui ou si vous souhaitez une flexibilité totale. Droits accumulés depuis 2009 : jusqu'à 109 000 $ en 2026.

**REER :** Les cotisations réduisent votre revenu imposable aujourd'hui (économie immédiate), mais les retraits sont imposés à la retraite. Idéal si votre taux marginal est élevé maintenant et sera plus bas à la retraite. Plafond : 18 % du revenu, max 32 490 $ (2025).

**Règle générale :** Taux marginal ≥ 40 % → priorisez le REER. Taux < 30 % → priorisez le CELI. Entre les deux → split équilibré.`,
    alexQuestion: "Quelle est la meilleure stratégie CELI vs REER pour mon profil fiscal ?",
  },
  {
    id: "reee-guide",
    category: "Comptes enregistrés",
    categoryIcon: Landmark,
    title: "REEE — guide complet",
    summary: "Maximisez la Subvention canadienne pour l'épargne-études (SCEE) et faites fructifier l'éducation de vos enfants.",
    readTime: 5,
    content: `Le REEE (Régime enregistré d'épargne-études) est un compte d'épargne pour les études postsecondaires d'un enfant.

**SCEE (Subvention canadienne) :** Le gouvernement fédéral verse 20 % sur les 2 500 $ cotisés par an, soit 500 $ par an et 7 200 $ à vie par enfant. Pour maximiser la subvention, cotisez 2 500 $ par an.

**Avantages :** Croissance à l'abri de l'impôt jusqu'au retrait. Les retraits éducatifs sont imposés dans les mains de l'étudiant (souvent taux zéro). Jusqu'à 50 000 $ à vie par enfant.

**Stratégie :** Ouvrez le REEE dès la naissance. Cotisez 2 500 $/an pour maximiser la SCEE. Si vous avez du retard, vous pouvez doubler la cotisation une année pour récupérer la subvention manquée (max 1 000 $ de SCEE/an en rattrapage).`,
    alexQuestion: "Comment maximiser la SCEE dans mon REEE pour mes enfants ?",
  },
  {
    id: "celiapp",
    category: "Comptes enregistrés",
    categoryIcon: Landmark,
    title: "CELIAPP — premier achat immobilier",
    summary: "Le Compte d'épargne libre d'impôt pour l'achat d'une première propriété combine les avantages du CELI et du REER.",
    readTime: 3,
    content: `Le CELIAPP (Compte d'épargne libre d'impôt pour l'achat d'une première propriété) est disponible depuis 2023.

**Avantages :** Cotisations déductibles (comme le REER) + retraits libres d'impôt (comme le CELI). Le meilleur des deux mondes pour acheter une première maison.

**Limites :** 8 000 $/an de cotisation, plafond à vie de 40 000 $. Vous devez être primo-accédant. Droits non utilisés reportables sur 1 an seulement.

**Stratégie :** Si vous envisagez acheter dans les 5-15 prochaines années, ouvrez un CELIAPP maintenant même si vous n'y cotisez pas encore — les droits commencent à s'accumuler dès l'ouverture.`,
    alexQuestion: "Est-ce que le CELIAPP est adapté à ma situation pour acheter une maison ?",
  },
  // ETFs & Fonds
  {
    id: "etf-intro",
    category: "ETFs & Fonds",
    categoryIcon: BarChart2,
    title: "C'est quoi un ETF ?",
    summary: "Les fonds négociés en bourse offrent une diversification instantanée à faible coût — la base d'un portefeuille moderne.",
    readTime: 4,
    content: `Un ETF (Exchange-Traded Fund) est un fonds qui regroupe des dizaines ou centaines de titres et se négocie en bourse comme une action.

**Avantages :** Diversification instantanée, frais très bas (RFG souvent < 0,25 %), fiscalement efficaces, liquidité quotidienne.

**Types :** ETFs actions (ex : XEQT — tout le marché mondial), ETFs obligataires (ex : XBB), ETFs de dividendes, ETFs sectoriels.

**Pour débutants :** Un seul ETF comme XEQT (iShares Core Equity ETF Portfolio) donne une exposition à ~10 000 actions mondiales avec un RFG de 0,20 %. Simple, efficace, prouvé.

**RFG :** Le ratio des frais de gestion s'exprime en % annuel. 0,20 % vs 2 % sur 30 ans fait une différence de 40 % sur la valeur finale d'un portefeuille.`,
    alexQuestion: "Quels ETFs canadiens sont les plus adaptés à mon profil de risque ?",
  },
  {
    id: "replication-etf",
    category: "ETFs & Fonds",
    categoryIcon: BarChart2,
    title: "Réplication physique vs synthétique",
    summary: "Comprendre comment un ETF suit son indice — et pourquoi cela peut affecter votre rendement et votre risque.",
    readTime: 3,
    content: `La réplication est la méthode par laquelle un ETF suit son indice de référence.

**Physique (directe) :** L'ETF achète réellement les titres de l'indice. Transparence maximale. Risque de contrepartie nul. Exemple : XEQT, ZCN.

**Synthétique (via swaps) :** L'ETF utilise des contrats dérivés pour répliquer la performance. Peut être plus efficace fiscalement pour certains marchés, mais introduit un risque de contrepartie (risque que la banque contrepartie fasse défaut).

**Au Canada :** La quasi-totalité des grands ETFs populaires (iShares, BMO, Vanguard Canada) utilisent la réplication physique. Préférez les ETFs à réplication physique pour la sécurité.`,
    alexQuestion: "Est-ce que les ETFs de mon portefeuille utilisent la réplication physique ?",
  },
  {
    id: "top-etfs-canada",
    category: "ETFs & Fonds",
    categoryIcon: BarChart2,
    title: "Top ETFs canadiens",
    summary: "Les ETFs incontournables pour construire un portefeuille diversifié et fiscal à la canadienne.",
    readTime: 5,
    content: `**Actions mondiales :**
- XEQT (iShares) : 100 % actions, 10 000+ titres, RFG 0,20 %
- VEQT (Vanguard) : similaire à XEQT, RFG 0,24 %
- ZEQT (BMO) : alternatif, RFG 0,20 %

**Portefeuilles équilibrés (tout-en-un) :**
- XBAL : 60 % actions / 40 % obligations, RFG 0,20 %
- VBAL : même chose, version Vanguard
- XGRO : 80/20, pour croissance modérée

**Actions canadiennes :**
- ZCN (BMO) : S&P/TSX Composite, RFG 0,06 %
- XIC (iShares) : Canada complet, RFG 0,06 %

**Obligations :**
- XBB : obligations canadiennes totales, RFG 0,10 %
- ZAG : alternative BMO, RFG 0,09 %

**Conseil :** Pour la plupart des investisseurs, un seul ETF tout-en-un (XEQT ou XGRO selon l'horizon) suffit.`,
    alexQuestion: "Quel ETF tout-en-un est le mieux adapté à mon horizon de placement ?",
  },
  // Classes d'actifs
  {
    id: "actions-vs-obligations",
    category: "Classes d'actifs",
    categoryIcon: Layers,
    title: "Actions vs obligations",
    summary: "Les deux briques fondamentales d'un portefeuille — leurs risques, rendements et rôles complémentaires.",
    readTime: 4,
    content: `**Actions :** Parts de propriété d'une entreprise. Rendement historique ~7-10 %/an à long terme. Volatilité élevée (krach possible -30 à -50 %). Idéal pour horizon > 10 ans.

**Obligations :** Prêts à une entreprise ou gouvernement. Rendement plus faible (~2-5 %/an). Volatilité faible. Amorti les chutes des actions. Idéal pour réduire le risque global du portefeuille.

**Règle classique :** "100 moins votre âge" = % en actions. À 35 ans → 65 % actions, 35 % obligations. Règle simplifiée — à ajuster selon votre tolérance au risque et horizon.

**Corrélation :** Actions et obligations sont souvent inversement corrélées — quand l'une baisse, l'autre monte. C'est la clé de la diversification.`,
    alexQuestion: "Quelle répartition actions/obligations est optimale pour mon profil de risque ?",
  },
  {
    id: "or-diversifiant",
    category: "Classes d'actifs",
    categoryIcon: Layers,
    title: "L'or comme diversifiant",
    summary: "Le métal précieux protège en temps de crise, mais ses rendements à long terme restent inférieurs aux actions.",
    readTime: 3,
    content: `L'or est souvent présenté comme une valeur refuge en période d'inflation ou de crise géopolitique.

**Avantages :** Faible corrélation avec les actions. Protection contre l'inflation à long terme. Réserve de valeur mondiale.

**Inconvénients :** Pas de rendement (pas de dividendes ni d'intérêts). Volatilité significative. Sur 30 ans, sous-performe massivement les actions mondiales.

**Comment investir :** Via des ETFs aurifères (ex : CGL — iShares Gold Bullion ETF en CAD). Pas de stockage physique nécessaire.

**Allocation recommandée :** 5 à 10 % maximum pour un rôle de diversification. Au-delà, l'impact sur le rendement global devient négatif.`,
    alexQuestion: "Est-ce que l'or mérite une place dans mon portefeuille actuel ?",
  },
  {
    id: "reits",
    category: "Classes d'actifs",
    categoryIcon: Layers,
    title: "REITs et immobilier coté",
    summary: "Investir dans l'immobilier sans acheter de propriété, avec la liquidité d'un ETF.",
    readTime: 3,
    content: `Les REITs (Real Estate Investment Trusts) ou FPI (Fonds de placement immobilier) permettent d'investir dans l'immobilier commercial via la bourse.

**Avantages :** Accès à l'immobilier commercial (bureaux, centres commerciaux, résidentiel locatif) sans les contraintes de gestion. Dividendes élevés (souvent 3-6 %/an). Liquidité quotidienne.

**Inconvénients :** Sensibles aux taux d'intérêt (hausse des taux = baisse des prix). Fiscalité moins favorable que les gains en capital.

**Au Canada :** ETF XRE (iShares S&P/TSX Capped REIT) donne accès aux plus grands FPI canadiens. RFG : 0,61 %.

**Compte suggéré :** REER (distributions imposables protégées de l'impôt jusqu'au retrait).`,
    alexQuestion: "Les REITs sont-ils adaptés à mon portefeuille selon mon profil ?",
  },
  // Fiscalité canadienne
  {
    id: "gain-capital",
    category: "Fiscalité canadienne",
    categoryIcon: Receipt,
    title: "Gain en capital vs revenu ordinaire",
    summary: "Comprendre comment vos investissements sont imposés pour minimiser votre facture fiscale.",
    readTime: 4,
    content: `Au Canada, les revenus de placement sont imposés différemment selon leur nature.

**Gain en capital :** Profit réalisé à la vente d'un actif. Depuis juin 2024, 2/3 du gain est inclus dans le revenu imposable (taux d'inclusion = 2/3). Exemple : vente d'une action avec 10 000 $ de profit → 6 667 $ imposables.

**Dividendes canadiens :** Bénéficient d'un crédit d'impôt pour dividendes — souvent plus efficaces fiscalement que les revenus d'intérêts pour les résidents canadiens.

**Intérêts :** 100 % imposables au taux marginal. Les obligations et CPG dans un compte non-enregistré sont fiscalement inefficaces.

**Stratégie :** Mettez les obligations et les REITs dans votre REER. Mettez les actions canadiennes à dividendes dans votre compte non-enregistré. Le CELI accueille idéalement vos actifs à forte croissance.`,
    alexQuestion: "Comment optimiser la fiscalité de mes placements selon mes comptes ?",
  },
  {
    id: "recolte-pertes",
    category: "Fiscalité canadienne",
    categoryIcon: Receipt,
    title: "Récolte des pertes fiscales",
    summary: "Transformer vos pertes de placement en économies d'impôt tout en maintenant votre exposition au marché.",
    readTime: 4,
    content: `La récolte des pertes fiscales (tax-loss harvesting) consiste à vendre un placement en perte pour cristalliser une perte en capital utilisable pour compenser des gains.

**Comment ça marche :** Vous vendez un ETF en perte. Cette perte compense des gains en capital réalisés. Vous rachetez un ETF similaire (mais pas identique — règle de "disposition superficielle") pour maintenir votre exposition.

**Règle des 30 jours :** Au Canada, si vous rachetez le même titre dans les 30 jours avant ou après la vente à perte, la perte est refusée. Solution : vendre XIC et acheter ZCN (même exposition, fournisseurs différents).

**Quand l'utiliser :** En fin d'année, si vous avez des gains en capital à compenser. Économie potentielle = perte × taux marginal × taux d'inclusion (2/3).`,
    alexQuestion: "Est-ce que la récolte des pertes fiscales est pertinente dans ma situation ?",
  },
  {
    id: "impact-rfg",
    category: "Fiscalité canadienne",
    categoryIcon: Receipt,
    title: "Impact du RFG sur le long terme",
    summary: "Un écart de 1,5 % de frais peut coûter des centaines de milliers de dollars sur 30 ans.",
    readTime: 3,
    content: `Le RFG (Ratio des frais de gestion) est le coût annuel d'un fonds, exprimé en % des actifs.

**Impact cumulé :** Sur 100 000 $ investis pendant 30 ans avec un rendement brut de 7 % :
- RFG 0,20 % (ETF) → ~735 000 $
- RFG 2,00 % (fonds commun géré activement) → ~527 000 $
- Différence : **208 000 $** — soit 28 % de la valeur finale perdue en frais.

**Pourquoi les fonds communs coûtent-ils plus ?** Frais de gestion active, commissions de courtage, marketing (frais de trailer). La majorité des gestionnaires actifs sous-performent leur indice après frais.

**Règle d'or :** Priorisez les ETFs à faible coût (RFG < 0,30 %). Évitez les fonds avec des RFG > 1,5 % sauf raison exceptionnelle.`,
    alexQuestion: "Quel est le RFG moyen de mon portefeuille et son impact sur 20 ans ?",
  },
  // Stratégie d'investissement
  {
    id: "reequilibrage",
    category: "Stratégie d'investissement",
    categoryIcon: Compass,
    title: "Rééquilibrage automatique",
    summary: "Maintenir votre allocation cible pour garder votre risque sous contrôle — la discipline qui fait la différence.",
    readTime: 4,
    content: `Le rééquilibrage consiste à ramener votre portefeuille à son allocation cible après que les marchés l'ont fait dériver.

**Pourquoi rééquilibrer ?** Si vos actions montent à 80 % alors que votre cible est 60 %, votre risque a augmenté. Rééquilibrer force à "vendre haut, acheter bas".

**Fréquence :** Annuel ou semi-annuel suffit pour la plupart des investisseurs. Rééquilibrer trop souvent génère des frais et des impôts inutiles.

**Seuil de déclenchement :** Certains investisseurs rééquilibrent seulement quand une classe dépasse sa cible de 5 points (ex : cible 60 % → rééquilibrer si > 65 % ou < 55 %).

**Méthode sans vendre :** Dirigez vos nouvelles cotisations vers les classes sous-pondérées — évite les impôts sur les gains.`,
    alexQuestion: "Mon portefeuille a-t-il besoin d'être rééquilibré selon mon allocation cible ?",
  },
  {
    id: "dca",
    category: "Stratégie d'investissement",
    categoryIcon: Compass,
    title: "Dollar cost averaging (DCA)",
    summary: "Investir régulièrement une somme fixe, quelle que soit la conjoncture — la stratégie qui bat l'anxiété de marché.",
    readTime: 3,
    content: `Le DCA (investissement périodique à montant constant) consiste à investir une somme fixe à intervalles réguliers, indépendamment du niveau du marché.

**Avantages :** Élimine le risque de tout investir au mauvais moment. Achète plus d'unités quand les prix sont bas, moins quand ils sont hauts. Discipline et automatisme.

**Exemple :** Investir 500 $/mois dans XEQT peu importe la conjoncture. En période de krach, vos 500 $ achètent plus d'unités — vous bénéficiez de la reprise.

**DCA vs lump sum :** Statistiquement, investir une somme en une seule fois (lump sum) performe mieux 2/3 du temps. Mais le DCA est psychologiquement plus facile et réduit le regret de "timing raté".

**Pour WealthPilot :** Configurez un ordre automatique mensuel chez votre courtier.`,
    alexQuestion: "Comment mettre en place une stratégie DCA efficace avec mon budget mensuel ?",
  },
  {
    id: "horizon",
    category: "Stratégie d'investissement",
    categoryIcon: Compass,
    title: "Horizon d'investissement",
    summary: "Votre horizon temporel est le facteur le plus important pour choisir votre allocation — plus c'est long, plus vous pouvez prendre de risque.",
    readTime: 3,
    content: `L'horizon d'investissement est la durée pendant laquelle vous prévoyez de laisser votre argent investi avant d'en avoir besoin.

**Court terme (< 3 ans) :** Fonds du marché monétaire, CPG, obligations à court terme. Évitez les actions — une correction de marché pourrait réduire votre capital au mauvais moment.

**Moyen terme (3-10 ans) :** Mix 40-60 % actions / 60-40 % obligations. ETFs équilibrés comme XBAL.

**Long terme (> 10 ans) :** Actions à forte proportion (80-100 %). Les cycles de marché ont le temps de se corriger. Historiquement, aucune période de 15 ans n'a produit un rendement négatif pour un portefeuille d'actions mondiales diversifié.

**Erreur fréquente :** Adapter votre allocation à votre nervosité plutôt qu'à votre horizon réel. Plus votre horizon est long, plus vous pouvez ignorer la volatilité.`,
    alexQuestion: "Quelle allocation est la plus adaptée à mon horizon d'investissement et mes objectifs ?",
  },
];

const CATEGORIES = ["Tous", ...Array.from(new Set(EDUCATION_CONTENT.map((a) => a.category)))];

export default function EducationPage() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tous");

  const filtered = EDUCATION_CONTENT.filter((article) => {
    const matchesCategory = activeCategory === "Tous" || article.category === activeCategory;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      article.title.toLowerCase().includes(q) ||
      article.summary.toLowerCase().includes(q) ||
      article.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  function handleAlex(question: string) {
    router.push(`/chat?q=${encodeURIComponent(question)}`);
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Hub Éducatif
        </h1>
        <p className="text-muted-foreground mt-1">
          15 articles pour maîtriser les bases de l&apos;investissement canadien
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un article..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:border-primary/50 text-muted-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles grid */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Aucun article trouvé pour &quot;{search}&quot;
          </p>
        ) : (
          filtered.map((article) => {
            const Icon = article.categoryIcon;
            const isExpanded = expandedId === article.id;
            return (
              <Card key={article.id} className="transition-all hover:border-primary/30">
                <CardContent className="p-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary mt-0.5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {article.category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3" />
                            {article.readTime} min
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm leading-snug">{article.title}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-sm text-muted-foreground leading-relaxed pl-12">{article.summary}</p>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="pl-12 prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-line">
                      {article.content.split("\n").map((line, i) => {
                        if (line.startsWith("**") && line.endsWith("**")) {
                          return (
                            <p key={i} className="font-semibold mt-3 mb-1">
                              {line.slice(2, -2)}
                            </p>
                          );
                        }
                        // Bold inline
                        const parts = line.split(/(\*\*[^*]+\*\*)/g);
                        return (
                          <p key={i} className="mb-1">
                            {parts.map((part, j) =>
                              part.startsWith("**") && part.endsWith("**") ? (
                                <strong key={j}>{part.slice(2, -2)}</strong>
                              ) : (
                                part
                              )
                            )}
                          </p>
                        );
                      })}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pl-12 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => setExpandedId(isExpanded ? null : article.id)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" />
                          Réduire
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          Lire l&apos;article
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => handleAlex(article.alexQuestion)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Demander à Alex
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
