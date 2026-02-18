import { z } from 'zod';

export const personalInfoSchema = z.object({
  full_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  age: z.coerce.number().min(18, 'Vous devez avoir au moins 18 ans').max(100),
  profession: z.string().min(2, 'Veuillez indiquer votre profession'),
  family_situation: z.enum(['célibataire', 'en_couple', 'marié', 'divorcé', 'veuf'], {
    error: 'Veuillez sélectionner votre situation',
  }),
  dependents: z.coerce.number().min(0).max(20),
});

export const financialSituationSchema = z.object({
  annual_income: z.coerce.number().min(0, 'Le revenu doit être positif'),
  monthly_expenses: z.coerce.number().min(0),
  total_assets: z.coerce.number().min(0),
  total_debts: z.coerce.number().min(0),
  monthly_savings: z.coerce.number().min(0),
  investment_experience: z.enum(['aucune', 'débutant', 'intermédiaire', 'avancé', 'expert'], {
    error: 'Veuillez sélectionner votre expérience',
  }),
  has_celi: z.boolean(),
  has_reer: z.boolean(),
  has_reee: z.boolean(),
  celi_balance: z.coerce.number().min(0).optional(),
  reer_balance: z.coerce.number().min(0).optional(),
  reee_balance: z.coerce.number().min(0).optional(),
  tax_bracket: z.enum(['0-30k', '30k-50k', '50k-100k', '100k-150k', '150k+'], {
    error: 'Veuillez sélectionner votre tranche',
  }),
});

export const goalSchema = z.object({
  type: z.enum(['retraite', 'achat_maison', 'éducation', 'voyage', 'fonds_urgence', 'liberté_financière', 'autre']),
  label: z.string().min(2),
  target_amount: z.coerce.number().min(100),
  current_amount: z.coerce.number().min(0),
  target_date: z.string().optional(),
  priority: z.enum(['haute', 'moyenne', 'basse']),
  notes: z.string().optional(),
});

export const goalsSchema = z.object({
  goals: z.array(goalSchema).min(1, 'Ajoutez au moins un objectif'),
});

export const riskQuestionnaireSchema = z.object({
  q1_loss_reaction: z.string({ error: 'Veuillez répondre à cette question' }),
  q2_volatility_comfort: z.string({ error: 'Veuillez répondre' }),
  q3_investment_horizon: z.string({ error: 'Veuillez répondre' }),
  q4_loss_scenario: z.string({ error: 'Veuillez répondre' }),
  q5_gain_preference: z.string({ error: 'Veuillez répondre' }),
  q6_market_crash: z.string({ error: 'Veuillez répondre' }),
  q7_income_stability: z.string({ error: 'Veuillez répondre' }),
  q8_knowledge_level: z.string({ error: 'Veuillez répondre' }),
  q9_portfolio_check: z.string({ error: 'Veuillez répondre' }),
  q10_risk_return: z.string({ error: 'Veuillez répondre' }),
});

export const followUpSchema = z.object({
  answers: z.record(z.string(), z.string().min(1, 'Veuillez répondre à cette question')),
});

export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;
export type FinancialSituationInput = z.infer<typeof financialSituationSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type GoalsInput = z.infer<typeof goalsSchema>;
export type RiskQuestionnaireInput = z.infer<typeof riskQuestionnaireSchema>;
export type FollowUpInput = z.infer<typeof followUpSchema>;
