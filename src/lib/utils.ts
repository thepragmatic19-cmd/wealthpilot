import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, locale = 'fr-CA'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyDetailed(amount: number, locale = 'fr-CA'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('fr-CA', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function formatDate(date: string, locale = 'fr-CA'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export const RISK_PROFILES: Record<string, { label: string; color: string; description: string }> = {
  'très_conservateur': {
    label: 'Très Conservateur',
    color: '#3b82f6',
    description: 'Priorité absolue à la préservation du capital',
  },
  'conservateur': {
    label: 'Conservateur',
    color: '#06b6d4',
    description: 'Préservation du capital avec croissance modeste',
  },
  'modéré': {
    label: 'Modéré',
    color: '#22c55e',
    description: 'Équilibre entre croissance et protection',
  },
  'croissance': {
    label: 'Croissance',
    color: '#f59e0b',
    description: 'Croissance à long terme avec volatilité acceptée',
  },
  'agressif': {
    label: 'Agressif',
    color: '#ef4444',
    description: 'Maximisation du rendement, haute tolérance au risque',
  },
};

export const ASSET_CLASS_COLORS: Record<string, string> = {
  'Actions canadiennes': '#3b82f6',
  'Actions américaines': '#6366f1',
  'Actions internationales': '#8b5cf6',
  'Actions marchés émergents': '#a855f7',
  'Obligations canadiennes': '#06b6d4',
  'Obligations mondiales': '#14b8a6',
  'Immobilier (REITs)': '#f59e0b',
  'Or / Commodités': '#eab308',
  'Liquidités': '#6b7280',
};

export const GOAL_ICONS: Record<string, string> = {
  'retraite': '🏖️',
  'achat_maison': '🏠',
  'éducation': '🎓',
  'voyage': '✈️',
  'fonds_urgence': '🛡️',
  'liberté_financière': '💎',
  'autre': '🎯',
};
