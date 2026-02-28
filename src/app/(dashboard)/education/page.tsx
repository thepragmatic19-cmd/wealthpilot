"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
  CheckCircle2,
  Bot,
  Send,
  Sparkles,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ClientInfo } from "@/types/database";
import { useSimpleMode } from "@/contexts/simple-mode-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type Difficulty = "Débutant" | "Intermédiaire" | "Avancé";
type CategoryColor = "emerald" | "blue" | "violet" | "amber" | "indigo";

interface Article {
  id: string;
  category: string;
  categoryIcon: React.ElementType;
  categoryColor: CategoryColor;
  title: string;
  difficulty: Difficulty;
  summary: string;
  readTime: number;
  takeaways: string[];
  content: string;
  suggestedQuestions: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Category color maps ──────────────────────────────────────────────────────

const categoryStyles: Record<
  CategoryColor,
  { icon: string; badge: string; chip: string }
> = {
  emerald: {
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  blue: {
    icon: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    chip: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  },
  violet: {
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
    badge: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800",
    chip: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  },
  indigo: {
    icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800",
    chip: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800",
  },
};

const difficultyStyles: Record<Difficulty, string> = {
  Débutant: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800",
  Intermédiaire: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-500 dark:border-yellow-800",
  Avancé: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800",
};

// ─── Content ──────────────────────────────────────────────────────────────────

const EDUCATION_CONTENT: Article[] = [
  // Comptes enregistrés
  {
    id: "celi-vs-reer",
    category: "Comptes enregistrés",
    categoryIcon: Landmark,
    categoryColor: "emerald",
    difficulty: "Débutant",
    title: "CELI vs REER : lequel choisir ?",
    summary: "Comprendre les différences fondamentales entre le CELI et le REER pour optimiser votre stratégie fiscale canadienne.",
    readTime: 4,
    takeaways: [
      "REER : déduction immédiate, imposition au retrait",
      "CELI : croissance et retraits entièrement libres d'impôt",
      "≥40% taux marginal → REER | <30% → CELI",
    ],
    content: `Le CELI (Compte d'épargne libre d'impôt) et le REER (Régime enregistré d'épargne-retraite) sont les deux piliers de l'épargne canadienne.

**CELI :** Les cotisations ne sont pas déductibles d'impôt, mais les retraits sont entièrement libres d'impôt. Idéal si votre taux marginal est faible aujourd'hui ou si vous souhaitez une flexibilité totale. Droits accumulés depuis 2009 : jusqu'à 109 000 $ en 2026.

**REER :** Les cotisations réduisent votre revenu imposable aujourd'hui (économie immédiate), mais les retraits sont imposés à la retraite. Idéal si votre taux marginal est élevé maintenant et sera plus bas à la retraite. Plafond : 18 % du revenu, max 32 490 $ (2025).

**Règle générale :** Taux marginal ≥ 40 % → priorisez le REER. Taux < 30 % → priorisez le CELI. Entre les deux → split équilibré.`,
    suggestedQuestions: [
      "Quelle est la meilleure stratégie CELI vs REER pour mon profil fiscal ?",
      "Puis-je cotiser au CELI et au REER en même temps ?",
      "Comment calculer mon espace de cotisation REER disponible ?",
    ],
  },
  {
    id: "reee-guide",
    category: "Comptes enregistrés",
    categoryIcon: Landmark,
    categoryColor: "emerald",
    difficulty: "Intermédiaire",
    title: "REEE — guide complet",
    summary: "Maximisez la Subvention canadienne pour l'épargne-études (SCEE) et faites fructifier l'éducation de vos enfants.",
    readTime: 5,
    takeaways: [
      "SCEE : 20% sur 2 500$/an = 500$ de subvention gratuite",
      "Retrait étudiant imposé dans ses mains (souvent taux zéro)",
      "Ouvrir dès la naissance pour maximiser les subventions",
    ],
    content: `Le REEE (Régime enregistré d'épargne-études) est un compte d'épargne pour les études postsecondaires d'un enfant.

**SCEE (Subvention canadienne) :** Le gouvernement fédéral verse 20 % sur les 2 500 $ cotisés par an, soit 500 $ par an et 7 200 $ à vie par enfant. Pour maximiser la subvention, cotisez 2 500 $ par an.

**Avantages :** Croissance à l'abri de l'impôt jusqu'au retrait. Les retraits éducatifs sont imposés dans les mains de l'étudiant (souvent taux zéro). Jusqu'à 50 000 $ à vie par enfant.

**Stratégie :** Ouvrez le REEE dès la naissance. Cotisez 2 500 $/an pour maximiser la SCEE. Si vous avez du retard, vous pouvez doubler la cotisation une année pour récupérer la subvention manquée (max 1 000 $ de SCEE/an en rattrapage).`,
    suggestedQuestions: [
      "Comment maximiser la SCEE dans mon REEE pour mes enfants ?",
      "Que se passe-t-il si mon enfant ne fait pas d'études postsecondaires ?",
      "Quel type de placement mettre dans le REEE selon l'âge de l'enfant ?",
    ],
  },
  {
    id: "celiapp",
    category: "Comptes enregistrés",
    categoryIcon: Landmark,
    categoryColor: "emerald",
    difficulty: "Débutant",
    title: "CELIAPP — premier achat immobilier",
    summary: "Le Compte d'épargne libre d'impôt pour l'achat d'une première propriété combine les avantages du CELI et du REER.",
    readTime: 3,
    takeaways: [
      "Cotisations déductibles + retraits libres d'impôt",
      "8 000$/an, 40 000$ à vie, primo-accédants seulement",
      "Ouvrir maintenant — les droits commencent à s'accumuler",
    ],
    content: `Le CELIAPP (Compte d'épargne libre d'impôt pour l'achat d'une première propriété) est disponible depuis 2023.

**Avantages :** Cotisations déductibles (comme le REER) + retraits libres d'impôt (comme le CELI). Le meilleur des deux mondes pour acheter une première maison.

**Limites :** 8 000 $/an de cotisation, plafond à vie de 40 000 $. Vous devez être primo-accédant. Droits non utilisés reportables sur 1 an seulement.

**Stratégie :** Si vous envisagez acheter dans les 5-15 prochaines années, ouvrez un CELIAPP maintenant même si vous n'y cotisez pas encore — les droits commencent à s'accumuler dès l'ouverture.`,
    suggestedQuestions: [
      "Est-ce que le CELIAPP est adapté à ma situation pour acheter une maison ?",
      "Puis-je utiliser le CELIAPP et le RAP REER ensemble pour un premier achat ?",
      "Que se passe-t-il si je n'utilise pas mon CELIAPP pour acheter une maison ?",
    ],
  },
  // ETFs & Fonds
  {
    id: "etf-intro",
    category: "ETFs & Fonds",
    categoryIcon: BarChart2,
    categoryColor: "blue",
    difficulty: "Débutant",
    title: "C'est quoi un ETF ?",
    summary: "Les fonds négociés en bourse offrent une diversification instantanée à faible coût — la base d'un portefeuille moderne.",
    readTime: 4,
    takeaways: [
      "Diversification instantanée à très faible coût (RFG ~0,20%)",
      "XEQT = 10 000+ actions mondiales en un seul achat",
      "1 ETF tout-en-un suffit pour la plupart des investisseurs",
    ],
    content: `Un ETF (Exchange-Traded Fund) est un fonds qui regroupe des dizaines ou centaines de titres et se négocie en bourse comme une action.

**Avantages :** Diversification instantanée, frais très bas (RFG souvent < 0,25 %), fiscalement efficaces, liquidité quotidienne.

**Types :** ETFs actions (ex : XEQT — tout le marché mondial), ETFs obligataires (ex : XBB), ETFs de dividendes, ETFs sectoriels.

**Pour débutants :** Un seul ETF comme XEQT (iShares Core Equity ETF Portfolio) donne une exposition à ~10 000 actions mondiales avec un RFG de 0,20 %. Simple, efficace, prouvé.

**RFG :** Le ratio des frais de gestion s'exprime en % annuel. 0,20 % vs 2 % sur 30 ans fait une différence de 40 % sur la valeur finale d'un portefeuille.`,
    suggestedQuestions: [
      "Quels ETFs canadiens sont les plus adaptés à mon profil de risque ?",
      "Quelle est la différence entre un ETF et un fonds commun de placement ?",
      "Comment acheter un ETF depuis un compte CELI chez un courtier canadien ?",
    ],
  },
  {
    id: "replication-etf",
    category: "ETFs & Fonds",
    categoryIcon: BarChart2,
    categoryColor: "blue",
    difficulty: "Avancé",
    title: "Réplication physique vs synthétique",
    summary: "Comprendre comment un ETF suit son indice — et pourquoi cela peut affecter votre rendement et votre risque.",
    readTime: 3,
    takeaways: [
      "Physique = achète réellement les titres (transparent, sans risque contrepartie)",
      "Synthétique = dérivés, peut être fiscalement efficace mais risque contrepartie",
      "Les grands ETFs canadiens utilisent presque tous la réplication physique",
    ],
    content: `La réplication est la méthode par laquelle un ETF suit son indice de référence.

**Physique (directe) :** L'ETF achète réellement les titres de l'indice. Transparence maximale. Risque de contrepartie nul. Exemple : XEQT, ZCN.

**Synthétique (via swaps) :** L'ETF utilise des contrats dérivés pour répliquer la performance. Peut être plus efficace fiscalement pour certains marchés, mais introduit un risque de contrepartie (risque que la banque contrepartie fasse défaut).

**Au Canada :** La quasi-totalité des grands ETFs populaires (iShares, BMO, Vanguard Canada) utilisent la réplication physique. Préférez les ETFs à réplication physique pour la sécurité.`,
    suggestedQuestions: [
      "Est-ce que les ETFs de mon portefeuille utilisent la réplication physique ?",
      "Pourquoi certains ETFs européens utilisent-ils la réplication synthétique ?",
      "Le risque de contrepartie est-il réel pour un investisseur particulier canadien ?",
    ],
  },
  {
    id: "top-etfs-canada",
    category: "ETFs & Fonds",
    categoryIcon: BarChart2,
    categoryColor: "blue",
    difficulty: "Débutant",
    title: "Top ETFs canadiens",
    summary: "Les ETFs incontournables pour construire un portefeuille diversifié et fiscalement efficace à la canadienne.",
    readTime: 5,
    takeaways: [
      "XEQT / VEQT = 100% actions mondiales tout-en-un",
      "XBAL / XGRO = équilibrés pour réduire la volatilité",
      "ZCN / XIC = exposition au marché canadien seul (RFG 0,06%)",
    ],
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
    suggestedQuestions: [
      "Quel ETF tout-en-un est le mieux adapté à mon horizon de placement ?",
      "Quelle est la différence entre XEQT et VEQT en pratique ?",
      "Est-ce que je dois posséder des ETFs canadiens si j'ai déjà XEQT ?",
    ],
  },
  // Classes d'actifs
  {
    id: "actions-vs-obligations",
    category: "Classes d'actifs",
    categoryIcon: Layers,
    categoryColor: "violet",
    difficulty: "Débutant",
    title: "Actions vs obligations",
    summary: "Les deux briques fondamentales d'un portefeuille — leurs risques, rendements et rôles complémentaires.",
    readTime: 4,
    takeaways: [
      "Actions : +7-10%/an à long terme, forte volatilité",
      "Obligations : stabilité 2-5%/an, amortisseur de risque",
      "Corrélation inverse = diversification efficace",
    ],
    content: `**Actions :** Parts de propriété d'une entreprise. Rendement historique ~7-10 %/an à long terme. Volatilité élevée (krach possible -30 à -50 %). Idéal pour horizon > 10 ans.

**Obligations :** Prêts à une entreprise ou gouvernement. Rendement plus faible (~2-5 %/an). Volatilité faible. Amorti les chutes des actions. Idéal pour réduire le risque global du portefeuille.

**Règle classique :** "100 moins votre âge" = % en actions. À 35 ans → 65 % actions, 35 % obligations. Règle simplifiée — à ajuster selon votre tolérance au risque et horizon.

**Corrélation :** Actions et obligations sont souvent inversement corrélées — quand l'une baisse, l'autre monte. C'est la clé de la diversification.`,
    suggestedQuestions: [
      "Quelle répartition actions/obligations est optimale pour mon profil de risque ?",
      "Est-ce que les obligations sont utiles si mon horizon est de 20 ans ?",
      "Comment les obligations se comportent-elles lors d'une hausse des taux d'intérêt ?",
    ],
  },
  {
    id: "or-diversifiant",
    category: "Classes d'actifs",
    categoryIcon: Layers,
    categoryColor: "violet",
    difficulty: "Intermédiaire",
    title: "L'or comme diversifiant",
    summary: "Le métal précieux protège en temps de crise, mais ses rendements à long terme restent inférieurs aux actions.",
    readTime: 3,
    takeaways: [
      "Protège en période d'inflation et de crise géopolitique",
      "Pas de dividendes — sous-performe les actions sur 30 ans",
      "5-10% max via ETF CGL (iShares Gold Bullion en CAD)",
    ],
    content: `L'or est souvent présenté comme une valeur refuge en période d'inflation ou de crise géopolitique.

**Avantages :** Faible corrélation avec les actions. Protection contre l'inflation à long terme. Réserve de valeur mondiale.

**Inconvénients :** Pas de rendement (pas de dividendes ni d'intérêts). Volatilité significative. Sur 30 ans, sous-performe massivement les actions mondiales.

**Comment investir :** Via des ETFs aurifères (ex : CGL — iShares Gold Bullion ETF en CAD). Pas de stockage physique nécessaire.

**Allocation recommandée :** 5 à 10 % maximum pour un rôle de diversification. Au-delà, l'impact sur le rendement global devient négatif.`,
    suggestedQuestions: [
      "Est-ce que l'or mérite une place dans mon portefeuille actuel ?",
      "L'or protège-t-il vraiment contre l'inflation au Canada ?",
      "Vaut-il mieux acheter de l'or physique ou un ETF comme CGL ?",
    ],
  },
  {
    id: "reits",
    category: "Classes d'actifs",
    categoryIcon: Layers,
    categoryColor: "violet",
    difficulty: "Intermédiaire",
    title: "REITs et immobilier coté",
    summary: "Investir dans l'immobilier sans acheter de propriété, avec la liquidité d'un ETF.",
    readTime: 3,
    takeaways: [
      "Dividendes élevés 3-6%/an, liquidité quotidienne",
      "Sensibles aux hausses de taux d'intérêt",
      "À loger dans le REER — distributions imposables protégées",
    ],
    content: `Les REITs (Real Estate Investment Trusts) ou FPI (Fonds de placement immobilier) permettent d'investir dans l'immobilier commercial via la bourse.

**Avantages :** Accès à l'immobilier commercial (bureaux, centres commerciaux, résidentiel locatif) sans les contraintes de gestion. Dividendes élevés (souvent 3-6 %/an). Liquidité quotidienne.

**Inconvénients :** Sensibles aux taux d'intérêt (hausse des taux = baisse des prix). Fiscalité moins favorable que les gains en capital.

**Au Canada :** ETF XRE (iShares S&P/TSX Capped REIT) donne accès aux plus grands FPI canadiens. RFG : 0,61 %.

**Compte suggéré :** REER (distributions imposables protégées de l'impôt jusqu'au retrait).`,
    suggestedQuestions: [
      "Les REITs sont-ils adaptés à mon portefeuille selon mon profil ?",
      "Quelle proportion de REITs est raisonnable dans un portefeuille diversifié ?",
      "Comment les REITs se comparent-ils à posséder un immeuble locatif ?",
    ],
  },
  // Fiscalité canadienne
  {
    id: "gain-capital",
    category: "Fiscalité canadienne",
    categoryIcon: Receipt,
    categoryColor: "amber",
    difficulty: "Intermédiaire",
    title: "Gain en capital vs revenu ordinaire",
    summary: "Comprendre comment vos investissements sont imposés pour minimiser votre facture fiscale.",
    readTime: 4,
    takeaways: [
      "2/3 du gain en capital inclus dans le revenu (depuis 2024)",
      "Dividendes canadiens : crédit d'impôt avantageux",
      "Intérêts : 100% imposables — à loger en REER",
    ],
    content: `Au Canada, les revenus de placement sont imposés différemment selon leur nature.

**Gain en capital :** Profit réalisé à la vente d'un actif. Depuis juin 2024, 2/3 du gain est inclus dans le revenu imposable (taux d'inclusion = 2/3). Exemple : vente d'une action avec 10 000 $ de profit → 6 667 $ imposables.

**Dividendes canadiens :** Bénéficient d'un crédit d'impôt pour dividendes — souvent plus efficaces fiscalement que les revenus d'intérêts pour les résidents canadiens.

**Intérêts :** 100 % imposables au taux marginal. Les obligations et CPG dans un compte non-enregistré sont fiscalement inefficaces.

**Stratégie :** Mettez les obligations et les REITs dans votre REER. Mettez les actions canadiennes à dividendes dans votre compte non-enregistré. Le CELI accueille idéalement vos actifs à forte croissance.`,
    suggestedQuestions: [
      "Comment optimiser la fiscalité de mes placements selon mes comptes ?",
      "Quel est l'impact concret du nouveau taux d'inclusion de 2/3 sur mes gains ?",
      "Quelle est la stratégie de localisation d'actifs optimale pour mon profil ?",
    ],
  },
  {
    id: "recolte-pertes",
    category: "Fiscalité canadienne",
    categoryIcon: Receipt,
    categoryColor: "amber",
    difficulty: "Avancé",
    title: "Récolte des pertes fiscales",
    summary: "Transformer vos pertes de placement en économies d'impôt tout en maintenant votre exposition au marché.",
    readTime: 4,
    takeaways: [
      "Vendre à perte pour compenser des gains en capital réalisés",
      "Règle 30 jours : vendre XIC → acheter ZCN (même expo, pas refusé)",
      "Économie = perte × taux marginal × 2/3",
    ],
    content: `La récolte des pertes fiscales (tax-loss harvesting) consiste à vendre un placement en perte pour cristalliser une perte en capital utilisable pour compenser des gains.

**Comment ça marche :** Vous vendez un ETF en perte. Cette perte compense des gains en capital réalisés. Vous rachetez un ETF similaire (mais pas identique — règle de "disposition superficielle") pour maintenir votre exposition.

**Règle des 30 jours :** Au Canada, si vous rachetez le même titre dans les 30 jours avant ou après la vente à perte, la perte est refusée. Solution : vendre XIC et acheter ZCN (même exposition, fournisseurs différents).

**Quand l'utiliser :** En fin d'année, si vous avez des gains en capital à compenser. Économie potentielle = perte × taux marginal × taux d'inclusion (2/3).`,
    suggestedQuestions: [
      "Est-ce que la récolte des pertes fiscales est pertinente dans ma situation ?",
      "Quelles paires d'ETFs canadiens puis-je utiliser pour le tax-loss harvesting ?",
      "Comment calculer l'économie fiscale potentielle de cette stratégie ?",
    ],
  },
  {
    id: "impact-rfg",
    category: "Fiscalité canadienne",
    categoryIcon: Receipt,
    categoryColor: "amber",
    difficulty: "Débutant",
    title: "Impact du RFG sur le long terme",
    summary: "Un écart de 1,5 % de frais peut coûter des centaines de milliers de dollars sur 30 ans.",
    readTime: 3,
    takeaways: [
      "RFG 0,20% vs 2% = 208 000$ de différence sur 30 ans (100k$)",
      "La majorité des gestionnaires actifs sous-performent après frais",
      "Prioriser RFG < 0,30% pour maximiser la valeur finale",
    ],
    content: `Le RFG (Ratio des frais de gestion) est le coût annuel d'un fonds, exprimé en % des actifs.

**Impact cumulé :** Sur 100 000 $ investis pendant 30 ans avec un rendement brut de 7 % :
- RFG 0,20 % (ETF) → ~735 000 $
- RFG 2,00 % (fonds commun géré activement) → ~527 000 $
- Différence : **208 000 $** — soit 28 % de la valeur finale perdue en frais.

**Pourquoi les fonds communs coûtent-ils plus ?** Frais de gestion active, commissions de courtage, marketing (frais de trailer). La majorité des gestionnaires actifs sous-performent leur indice après frais.

**Règle d'or :** Priorisez les ETFs à faible coût (RFG < 0,30 %). Évitez les fonds avec des RFG > 1,5 % sauf raison exceptionnelle.`,
    suggestedQuestions: [
      "Quel est le RFG moyen de mon portefeuille et son impact sur 20 ans ?",
      "Est-ce que la gestion active peut valoir son coût dans certains cas ?",
      "Comment comparer les frais de différents fonds communs canadiens ?",
    ],
  },
  // Stratégie d'investissement
  {
    id: "reequilibrage",
    category: "Stratégie d'investissement",
    categoryIcon: Compass,
    categoryColor: "indigo",
    difficulty: "Intermédiaire",
    title: "Rééquilibrage automatique",
    summary: "Maintenir votre allocation cible pour garder votre risque sous contrôle — la discipline qui fait la différence.",
    readTime: 4,
    takeaways: [
      "Force à vendre haut et acheter bas automatiquement",
      "Annuel ou semi-annuel suffit — rééquilibrer trop souvent coûte cher",
      "Rediriger les cotisations = rééquilibrer sans déclencher d'impôt",
    ],
    content: `Le rééquilibrage consiste à ramener votre portefeuille à son allocation cible après que les marchés l'ont fait dériver.

**Pourquoi rééquilibrer ?** Si vos actions montent à 80 % alors que votre cible est 60 %, votre risque a augmenté. Rééquilibrer force à "vendre haut, acheter bas".

**Fréquence :** Annuel ou semi-annuel suffit pour la plupart des investisseurs. Rééquilibrer trop souvent génère des frais et des impôts inutiles.

**Seuil de déclenchement :** Certains investisseurs rééquilibrent seulement quand une classe dépasse sa cible de 5 points (ex : cible 60 % → rééquilibrer si > 65 % ou < 55 %).

**Méthode sans vendre :** Dirigez vos nouvelles cotisations vers les classes sous-pondérées — évite les impôts sur les gains.`,
    suggestedQuestions: [
      "Mon portefeuille a-t-il besoin d'être rééquilibré selon mon allocation cible ?",
      "Quelle est la fréquence de rééquilibrage optimale pour un investisseur à long terme ?",
      "Comment rééquilibrer efficacement sans déclencher de gain en capital imposable ?",
    ],
  },
  {
    id: "dca",
    category: "Stratégie d'investissement",
    categoryIcon: Compass,
    categoryColor: "indigo",
    difficulty: "Débutant",
    title: "Dollar cost averaging (DCA)",
    summary: "Investir régulièrement une somme fixe, quelle que soit la conjoncture — la stratégie qui bat l'anxiété de marché.",
    readTime: 3,
    takeaways: [
      "Investissement fixe régulier — élimine le stress du timing",
      "Achète plus d'unités quand les prix baissent",
      "Disciplinant et automatisable chez n'importe quel courtier",
    ],
    content: `Le DCA (investissement périodique à montant constant) consiste à investir une somme fixe à intervalles réguliers, indépendamment du niveau du marché.

**Avantages :** Élimine le risque de tout investir au mauvais moment. Achète plus d'unités quand les prix sont bas, moins quand ils sont hauts. Discipline et automatisme.

**Exemple :** Investir 500 $/mois dans XEQT peu importe la conjoncture. En période de krach, vos 500 $ achètent plus d'unités — vous bénéficiez de la reprise.

**DCA vs lump sum :** Statistiquement, investir une somme en une seule fois (lump sum) performe mieux 2/3 du temps. Mais le DCA est psychologiquement plus facile et réduit le regret de "timing raté".

**Pour WealthPilot :** Configurez un ordre automatique mensuel chez votre courtier.`,
    suggestedQuestions: [
      "Comment mettre en place une stratégie DCA efficace avec mon budget mensuel ?",
      "Est-ce préférable d'investir d'un coup (lump sum) ou graduellement (DCA) ?",
      "À quelle fréquence investir dans le cadre d'une stratégie DCA — mensuel ou bimensuel ?",
    ],
  },
  {
    id: "horizon",
    category: "Stratégie d'investissement",
    categoryIcon: Compass,
    categoryColor: "indigo",
    difficulty: "Débutant",
    title: "Horizon d'investissement",
    summary: "Votre horizon temporel est le facteur le plus important pour choisir votre allocation — plus c'est long, plus vous pouvez prendre de risque.",
    readTime: 3,
    takeaways: [
      "> 10 ans = 80-100% actions (les marchés corrigent toujours)",
      "< 3 ans = obligations/CPG uniquement — pas d'actions",
      "Adapter l'allocation à l'horizon réel, pas aux émotions",
    ],
    content: `L'horizon d'investissement est la durée pendant laquelle vous prévoyez de laisser votre argent investi avant d'en avoir besoin.

**Court terme (< 3 ans) :** Fonds du marché monétaire, CPG, obligations à court terme. Évitez les actions — une correction de marché pourrait réduire votre capital au mauvais moment.

**Moyen terme (3-10 ans) :** Mix 40-60 % actions / 60-40 % obligations. ETFs équilibrés comme XBAL.

**Long terme (> 10 ans) :** Actions à forte proportion (80-100 %). Les cycles de marché ont le temps de se corriger. Historiquement, aucune période de 15 ans n'a produit un rendement négatif pour un portefeuille d'actions mondiales diversifié.

**Erreur fréquente :** Adapter votre allocation à votre nervosité plutôt qu'à votre horizon réel. Plus votre horizon est long, plus vous pouvez ignorer la volatilité.`,
    suggestedQuestions: [
      "Quelle allocation est la plus adaptée à mon horizon d'investissement et mes objectifs ?",
      "Comment adapter mon portefeuille à l'approche de la retraite ?",
      "Est-ce que je dois avoir des allocations différentes pour chaque objectif de vie ?",
    ],
  },
];

const CATEGORIES = ["Tous", ...Array.from(new Set(EDUCATION_CONTENT.map((a) => a.category)))];
const TOTAL = EDUCATION_CONTENT.length;
const LS_KEY = "wp_edu_read";

// Tags mapping for personalized recommendations (based on user's accounts)
const ARTICLE_TAGS: Record<string, string[]> = {
  "celi-vs-reer": ["celi", "reer"],
  "reee-guide": ["reee"],
  "celiapp": ["celiapp"],
  "reits": ["reer"],
  "gain-capital": ["celi", "reer"],
  "recolte-pertes": ["celi", "reer"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderContent(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, j) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={j}>{part.slice(2, -2)}</strong>
      ) : (
        part
      )
    );
    return (
      <p key={i} className={`mb-1.5 ${line.startsWith("**") && line.endsWith("**") ? "font-semibold mt-3" : ""}`}>
        {rendered}
      </p>
    );
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Ordered beginner learning path (5 articles)
const BEGINNER_PATH = [
  { id: "celi-vs-reer", label: "CELI vs REER" },
  { id: "etf-intro", label: "C'est quoi un ETF ?" },
  { id: "actions-vs-obligations", label: "Actions vs obligations" },
  { id: "dca", label: "Stratégie DCA" },
  { id: "reequilibrage", label: "Rééquilibrer son portefeuille" },
];

export default function EducationPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [readArticles, setReadArticles] = useState<Set<string>>(new Set());
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const { isSimple } = useSimpleMode();

  // Chat panel
  const [chatOpen, setChatOpen] = useState(false);
  const [chatArticle, setChatArticle] = useState<Article | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load reading progress: localStorage first, then sync from Supabase + load clientInfo
  useEffect(() => {
    // Immediate local load
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) setReadArticles(new Set(JSON.parse(stored) as string[]));
    } catch { /* ignore */ }

    // Supabase sync
    async function syncFromSupabase() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: reads }, { data: ci }] = await Promise.all([
        supabase.from("education_reads").select("article_id").eq("user_id", user.id),
        supabase.from("client_info").select("has_celi,has_reer,has_reee,has_celiapp").eq("user_id", user.id).maybeSingle(),
      ]);

      if (reads && reads.length > 0) {
        const ids = reads.map((r: { article_id: string }) => r.article_id);
        setReadArticles(new Set(ids));
        try { localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
      }
      if (ci) setClientInfo(ci as ClientInfo);
    }
    syncFromSupabase();
  }, []);

  async function markRead(id: string) {
    if (readArticles.has(id)) return;
    const next = new Set([...readArticles, id]);
    setReadArticles(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify([...next]));
    } catch { /* ignore */ }
    // Persist to Supabase for cross-device sync
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("education_reads").upsert(
        { user_id: user.id, article_id: id },
        { onConflict: "user_id,article_id" }
      );
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => {
      if (prev === id) return null;
      markRead(id);
      return id;
    });
  }

  function openAlexChat(article: Article) {
    setChatArticle(article);
    setChatMessages([]);
    setChatInput("");
    setChatOpen(true);
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatOpen]);

  const sendChat = useCallback(
    async (question: string, currentMessages: ChatMessage[] = chatMessages) => {
      if (!question.trim() || chatLoading || !chatArticle) return;

      const userMsg: ChatMessage = { role: "user", content: question };
      const messagesWithUser = [...currentMessages, userMsg];
      setChatMessages([...messagesWithUser, { role: "assistant", content: "" }]);
      setChatInput("");
      setChatLoading(true);

      try {
        const res = await fetch("/api/ai/education-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            articleTitle: chatArticle.title,
            articleContent: chatArticle.content,
            history: currentMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!res.ok || !res.body) {
          if (res.status === 429) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Trop de messages. Réessayez plus tard.");
          }
          throw new Error("Erreur serveur");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data) as { text?: string };
              if (parsed.text) {
                accumulated += parsed.text;
                setChatMessages([
                  ...messagesWithUser,
                  { role: "assistant", content: accumulated },
                ]);
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      } catch (error: any) {
        setChatMessages([
          ...messagesWithUser,
          { 
            role: "assistant", 
            content: error?.message === "Erreur serveur" 
              ? "Désolé, une erreur s'est produite. Réessayez." 
              : error?.message || "Désolé, une erreur s'est produite. Réessayez." 
          },
        ]);
      } finally {
        setChatLoading(false);
      }
    },
    [chatLoading, chatArticle, chatMessages]
  );

  // Compute recommended article IDs based on user's registered accounts
  const recommendedIds = useMemo(() => {
    if (!clientInfo) return new Set<string>();
    const userTags: string[] = [];
    if (clientInfo.has_celi) userTags.push("celi");
    if (clientInfo.has_reer) userTags.push("reer");
    if (clientInfo.has_reee) userTags.push("reee");
    // has_celiapp may not exist yet on ClientInfo type (added by migration FM-3)
    if ((clientInfo as ClientInfo & { has_celiapp?: boolean }).has_celiapp) userTags.push("celiapp");
    if (userTags.length === 0) return new Set<string>();
    const scored = Object.entries(ARTICLE_TAGS)
      .map(([id, tags]) => ({ id, score: tags.filter((t) => userTags.includes(t)).length }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ id }) => id);
    return new Set(scored);
  }, [clientInfo]);

  const filtered = useMemo(() => {
    const base = EDUCATION_CONTENT.filter((article) => {
      const matchesCategory = activeCategory === "Tous" || article.category === activeCategory;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        article.title.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q) ||
        article.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
    // Sort: recommended unread articles first (only when no active search/category filter)
    if (recommendedIds.size > 0 && !search && activeCategory === "Tous") {
      return [...base].sort((a, b) => {
        const aRec = recommendedIds.has(a.id) && !readArticles.has(a.id) ? -1 : 0;
        const bRec = recommendedIds.has(b.id) && !readArticles.has(b.id) ? -1 : 0;
        return aRec - bRec;
      });
    }
    return base;
  }, [activeCategory, search, recommendedIds, readArticles]);

  const readCount = readArticles.size;
  const progressPct = Math.round((readCount / TOTAL) * 100);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Hub Éducatif
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              15 articles pour maîtriser les bases de l&apos;investissement canadien
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{readCount}</span> / {TOTAL} lus
            </p>
            <div className="mt-1 h-1.5 w-32 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
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

      {/* Beginner path — shown in simple mode or when no search/category active */}
      {(isSimple || (!search && activeCategory === "Tous")) && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold text-primary">Par où commencer ?</p>
            <Badge variant="outline" className="text-[9px] border-primary/20 text-primary bg-primary/5 ml-auto">
              {BEGINNER_PATH.filter(p => readArticles.has(p.id)).length}/{BEGINNER_PATH.length} lus
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">5 articles essentiels pour tout investisseur canadien, dans l&apos;ordre recommandé.</p>
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            {BEGINNER_PATH.map((step, i) => {
              const isRead = readArticles.has(step.id);
              const article = EDUCATION_CONTENT.find(a => a.id === step.id);
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    setSearch("");
                    setActiveCategory("Tous");
                    setExpandedId(step.id);
                    setTimeout(() => {
                      document.getElementById(`article-${step.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 100);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all text-left ${
                    isRead
                      ? "border-primary/30 bg-primary/10 text-primary line-through opacity-60"
                      : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isRead ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                    {isRead ? "✓" : i + 1}
                  </span>
                  <span>{article?.title || step.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Articles */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Aucun article trouvé pour &quot;{search}&quot;
          </p>
        ) : (
          filtered.map((article) => {
            const Icon = article.categoryIcon;
            const isExpanded = expandedId === article.id;
            const isRead = readArticles.has(article.id);
            const isRecommended = recommendedIds.has(article.id) && !isRead;
            const styles = categoryStyles[article.categoryColor];

            return (
              <Card
                key={article.id}
                id={`article-${article.id}`}
                className={`transition-all ${isExpanded ? "border-primary/40 shadow-sm" : isRecommended ? "border-amber-400/50 dark:border-amber-500/40" : "hover:border-primary/20"}`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center mt-0.5 ${styles.icon}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Meta badges row */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {isRecommended && (
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-full px-1.5 py-0">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            Recommandé
                          </span>
                        )}
                        <Badge variant="outline" className={`text-[10px] border px-1.5 py-0 ${styles.badge}`}>
                          {article.category}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] border px-1.5 py-0 ${difficultyStyles[article.difficulty]}`}>
                          {article.difficulty}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {article.readTime} min
                        </span>
                        {isRead && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Lu
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm leading-snug">{article.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{article.summary}</p>
                    </div>
                  </div>

                  {/* Takeaways (always visible) */}
                  <div className="flex flex-wrap gap-1.5 pl-[52px]">
                    {article.takeaways.map((t, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2.5 py-0.5 border font-medium ${styles.chip}`}
                      >
                        <Sparkles className="h-2.5 w-2.5 shrink-0" />
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="pl-[52px] mt-2">
                      <div className="text-sm text-foreground leading-relaxed border-l-2 border-primary/20 pl-3">
                        {renderContent(article.content)}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pl-[52px] pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => toggleExpand(article.id)}
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
                      onClick={() => openAlexChat(article)}
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

      {/* ─── Inline Alex Chat Panel ──────────────────────────────────────────── */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent
          side="right"
          className="sm:max-w-md flex flex-col p-0 gap-0"
          showCloseButton={false}
        >
          {/* Header */}
          <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <SheetTitle className="text-sm font-semibold">Alex — Conseiller IA</SheetTitle>
                  {chatArticle && (
                    <SheetDescription className="text-[11px] truncate max-w-[240px] mt-0.5">
                      {chatArticle.title}
                    </SheetDescription>
                  )}
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="rounded-md p-1.5 opacity-70 hover:opacity-100 hover:bg-muted transition-all shrink-0 mt-0.5"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="sr-only">Fermer</span>
              </button>
            </div>
          </SheetHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="px-4 py-3 space-y-1 min-h-full">
              {chatMessages.length === 0 && chatArticle && (
                <div className="py-3 space-y-2">
                  <p className="text-[11px] text-muted-foreground text-center pb-1">
                    Questions suggérées sur cet article
                  </p>
                  {chatArticle.suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendChat(q, [])}
                      disabled={chatLoading}
                      className="w-full text-left text-xs p-2.5 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/40 transition-colors leading-relaxed"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} py-1`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0 mt-1 mr-1.5">
                      <Bot className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    {msg.content || (
                      <span className="flex gap-1 items-center py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <SheetFooter className="p-3 border-t shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChat(chatInput);
              }}
              className="flex gap-2 w-full"
            >
              <Input
                placeholder="Posez votre question..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                className="text-xs h-9 flex-1"
              />
              <Button
                type="submit"
                size="sm"
                className="h-9 w-9 p-0 shrink-0"
                disabled={chatLoading || !chatInput.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
