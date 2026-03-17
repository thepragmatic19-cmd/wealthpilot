import {
  Trophy,
  Target,
  Star,
  Flame,
  Shield,
  Sparkles,
  TrendingUp,
  MessageSquare,
  Award,
  Zap,
  Crown,
} from "lucide-react";
import type { Profile, ClientInfo, Goal, Portfolio, ChatMessage } from "@/types/database";

export interface BadgeProgress {
  current: number;
  target: number;
  label: string;
  formatValue?: (v: number) => string;
}

export interface PortfolioWithAllocations extends Portfolio {
  allocations?: { id: string }[];
}

export interface GamificationData {
  profile: Profile | null;
  clientInfo: ClientInfo | null;
  goals: Goal[];
  portfolios: PortfolioWithAllocations[];
  chatMessages: ChatMessage[];
}

// Badge definitions
export const BADGE_DEFINITIONS = [
  {
    id: "first_login",
    name: "Bienvenue!",
    description: "Première connexion à WealthPilot",
    hint: null as string | null,
    icon: Star,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    check: () => true,
    getProgress: null as ((data: GamificationData) => BadgeProgress | null) | null,
  },
  {
    id: "profile_complete",
    name: "Profil complet",
    description: "Compléter l'onboarding",
    hint: "Terminez le questionnaire de profil pour débloquer ce badge." as string | null,
    icon: Shield,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    check: (data: GamificationData) => data.profile?.onboarding_completed === true,
    getProgress: null as ((data: GamificationData) => BadgeProgress | null) | null,
  },
  {
    id: "first_portfolio",
    name: "Investisseur",
    description: "Obtenir votre premier portefeuille",
    hint: "Complétez l'onboarding pour recevoir un portefeuille personnalisé." as string | null,
    icon: TrendingUp,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    check: (data: GamificationData) => data.portfolios.length > 0,
    getProgress: null as ((data: GamificationData) => BadgeProgress | null) | null,
  },
  {
    id: "goal_setter",
    name: "Objectif fixé",
    description: "Définir au moins un objectif financier",
    hint: "Ajoutez un objectif financier (retraite, achat maison, etc.) dans la section Objectifs." as string | null,
    icon: Target,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    check: (data: GamificationData) => data.goals.length > 0,
    getProgress: null as ((data: GamificationData) => BadgeProgress | null) | null,
  },
  {
    id: "goal_50",
    name: "À mi-chemin",
    description: "Atteindre 50% d'un objectif",
    hint: "Augmentez le montant actuel de l'un de vos objectifs jusqu'à 50% de la cible." as string | null,
    icon: Flame,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    check: (data: GamificationData) =>
      data.goals.some((g) => g.target_amount > 0 && g.current_amount / g.target_amount >= 0.5),
    getProgress: (data: GamificationData): BadgeProgress | null => {
      if (data.goals.length === 0) return null;
      const maxPct = Math.max(...data.goals.map((g) =>
        g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 50) : 0
      ));
      return { current: Math.round(maxPct), target: 50, label: "% de progression vers la cible" };
    },
  },
  {
    id: "goal_achieved",
    name: "Objectif atteint! 🎉",
    description: "Atteindre 100% d'un objectif",
    hint: "Remplissez complètement l'un de vos objectifs financiers." as string | null,
    icon: Trophy,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    check: (data: GamificationData) =>
      data.goals.some((g) => g.target_amount > 0 && g.current_amount >= g.target_amount),
    getProgress: (data: GamificationData): BadgeProgress | null => {
      if (data.goals.length === 0) return null;
      const maxPct = Math.max(...data.goals.map((g) =>
        g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0
      ));
      return { current: Math.round(maxPct), target: 100, label: "% de progression vers la cible" };
    },
  },
  {
    id: "chat_curious",
    name: "Curieux",
    description: "Poser 5 questions au conseiller IA",
    hint: "Posez au moins 5 questions à l'assistant financier dans la section Chat." as string | null,
    icon: MessageSquare,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    check: (data: GamificationData) =>
      data.chatMessages.filter((m) => m.role === "user").length >= 5,
    getProgress: (data: GamificationData): BadgeProgress => ({
      current: Math.min(data.chatMessages.filter((m) => m.role === "user").length, 5),
      target: 5,
      label: "messages envoyés",
    }),
  },
  {
    id: "chat_expert",
    name: "Expert en questions",
    description: "Poser 20 questions au conseiller IA",
    hint: "Continuez à consulter votre conseiller IA jusqu'à 20 questions posées." as string | null,
    icon: Sparkles,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    check: (data: GamificationData) =>
      data.chatMessages.filter((m) => m.role === "user").length >= 20,
    getProgress: (data: GamificationData): BadgeProgress => ({
      current: Math.min(data.chatMessages.filter((m) => m.role === "user").length, 20),
      target: 20,
      label: "messages envoyés",
    }),
  },
  {
    id: "diversified",
    name: "Diversifié",
    description: "Avoir un portefeuille avec 5+ ETFs",
    hint: "Votre portefeuille suggéré doit contenir au moins 5 instruments différents." as string | null,
    icon: Zap,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    check: (data: GamificationData) =>
      data.portfolios.some((p) => (p.allocations?.length ?? 0) >= 5),
    getProgress: (data: GamificationData): BadgeProgress => {
      const maxCount = Math.max(0, ...data.portfolios.map(
        (p) => p.allocations?.length ?? 0
      ));
      return { current: Math.min(maxCount, 5), target: 5, label: "ETFs dans votre portefeuille" };
    },
  },
  {
    id: "big_saver",
    name: "Gros épargnant",
    description: "Avoir 100 000$ ou plus en actifs",
    hint: "Mettez à jour vos actifs totaux dans votre profil une fois ce cap atteint." as string | null,
    icon: Crown,
    color: "text-amber-600",
    bgColor: "bg-amber-600/10",
    check: (data: GamificationData) => {
      const total = Number(data.clientInfo?.total_assets || 0);
      return total >= 100000;
    },
    getProgress: (data: GamificationData): BadgeProgress => {
      const total = Math.min(Number(data.clientInfo?.total_assets || 0), 100000);
      return {
        current: total,
        target: 100000,
        label: "$ en actifs",
        formatValue: (v) => `${Math.round(v / 1000)}k$`,
      };
    },
  },
];

export function calculateHealthScore(data: GamificationData): number {
  let score = 0;

  if (data.profile?.onboarding_completed) score += 20;
  if (data.portfolios.length > 0) score += 15;
  if (data.goals.length > 0) score += 10;
  if (data.goals.length >= 3) score += 5;

  if (data.goals.length > 0) {
    const avgProgress = data.goals.reduce((sum, g) => {
      return sum + (g.target_amount > 0 ? Math.min(g.current_amount / g.target_amount, 1) : 0);
    }, 0) / data.goals.length;
    score += Math.round(avgProgress * 20);
  }

  const selectedPortfolio = data.portfolios.find((p) => p.is_selected);
  if (selectedPortfolio) {
    const allocCount = selectedPortfolio.allocations?.length || 0;
    score += Math.min(allocCount * 3, 15);
  }

  const userMsgs = data.chatMessages.filter((m) => m.role === "user").length;
  score += Math.min(userMsgs * 3, 15);

  return Math.min(score, 100);
}

export function getHealthLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "text-green-500" };
  if (score >= 60) return { label: "Bon", color: "text-blue-500" };
  if (score >= 40) return { label: "En progrès", color: "text-yellow-500" };
  return { label: "À améliorer", color: "text-orange-500" };
}

// Re-export Award icon for convenience
export { Award };
