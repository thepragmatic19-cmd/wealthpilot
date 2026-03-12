export type OnboardingStep =
  | 'personal_info'
  | 'financial_situation'
  | 'goals'
  | 'time_horizon'
  | 'risk_questionnaire'
  | 'ai_follow_up'
  | 'risk_result'
  | 'portfolio_preview'
  | 'completed';

export type RiskProfile =
  | 'très_conservateur'
  | 'conservateur'
  | 'modéré'
  | 'croissance'
  | 'agressif';

export type PortfolioType = 'conservateur' | 'suggéré' | 'ambitieux';

export type GoalType =
  | 'retraite'
  | 'achat_maison'
  | 'éducation'
  | 'voyage'
  | 'fonds_urgence'
  | 'liberté_financière'
  | 'autre';

export type GoalPriority = 'haute' | 'moyenne' | 'basse';

export type ChatRole = 'user' | 'assistant';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  onboarding_step: OnboardingStep;
  onboarding_completed: boolean;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface ClientInfo {
  id: string;
  user_id: string;
  age: number | null;
  profession: string | null;
  family_situation: string | null;
  dependents: number | null;
  annual_income: number | null;
  monthly_expenses: number | null;
  total_assets: number | null;
  total_debts: number | null;
  monthly_savings: number | null;
  investment_experience: string | null;
  has_celi: boolean;
  has_reer: boolean;
  has_reee: boolean;
  celi_balance: number | null;
  reer_balance: number | null;
  reee_balance: number | null;
  has_celiapp: boolean;
  celiapp_balance: number | null;
  has_cri: boolean;
  cri_balance: number | null;
  has_frv: boolean;
  frv_balance: number | null;
  tax_bracket: string | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  type: GoalType;
  label: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  priority: GoalPriority;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiskAssessment {
  id: string;
  user_id: string;
  answers: Record<string, unknown>;
  ai_follow_up_questions: string[] | null;
  ai_follow_up_answers: Record<string, string> | null;
  risk_score: number | null;
  risk_profile: RiskProfile | null;
  ai_analysis: string | null;
  key_factors: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  type: PortfolioType;
  name: string;
  description: string | null;
  expected_return: number | null;
  volatility: number | null;
  sharpe_ratio: number | null;
  max_drawdown: number | null;
  total_mer: number | null;
  is_selected: boolean;
  ai_generated: boolean;
  risk_profile_at_generation: string | null;
  ai_rationale: string | null;
  tax_strategy: string | null;
  stress_test: {
    inflation_shock: string;
    market_crash: string;
    interest_rate_hike: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export type SuggestedAccount = 'CELI' | 'REER' | 'REEE' | 'non_enregistré';

export interface PortfolioAllocation {
  id: string;
  portfolio_id: string;
  asset_class: string;
  sub_class: string | null;
  instrument_name: string;
  instrument_ticker: string;
  weight: number;
  expected_return: number | null;
  description: string | null;
  suggested_account: SuggestedAccount | null;
  mer: number | null;
  currency: string | null;
  isin: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type SubscriptionPlan = 'free' | 'pro' | 'elite';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'achat' | 'vente' | 'dividende' | 'rééquilibrage' | 'cotisation';

export interface Transaction {
  id: string;
  user_id: string;
  portfolio_id: string;
  type: TransactionType;
  instrument_ticker: string;
  instrument_name: string;
  quantity: number | null;
  price: number | null;
  amount: number;
  account: SuggestedAccount | null;
  notes: string | null;
  executed_at: string;
  created_at: string;
}

export type NotificationType = 'rééquilibrage' | 'objectif' | 'marché' | 'fiscal' | 'système';
export type NotificationSeverity = 'info' | 'warning' | 'success' | 'danger';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  is_read: boolean;
  action_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

