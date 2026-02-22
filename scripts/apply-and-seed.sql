-- ============================================================
-- WealthPilot — Migrations manquantes + Seed de démo
-- Coller dans : Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Migration 002 : colonnes portfolio_allocations ──────────
alter table public.portfolio_allocations
  add column if not exists suggested_account text check (suggested_account in ('CELI', 'REER', 'REEE', 'non_enregistré')),
  add column if not exists mer numeric(4,2),
  add column if not exists currency text check (currency in ('CAD', 'USD')),
  add column if not exists isin text;

-- ── Migration 003 : colonnes portfolios ─────────────────────
alter table public.portfolios
  add column if not exists total_mer numeric(4,2),
  add column if not exists tax_strategy text,
  add column if not exists stress_test jsonb;

-- ── Migration 004 : index unique is_selected ────────────────
create unique index if not exists idx_portfolios_user_selected
  on public.portfolios(user_id)
  where is_selected = true;

create index if not exists idx_risk_assessments_user_created
  on public.risk_assessments(user_id, created_at desc);
create index if not exists idx_chat_messages_user_created
  on public.chat_messages(user_id, created_at desc);
create index if not exists idx_goals_user_id
  on public.goals(user_id);

-- ── Migration 005 : tables transactions + notifications ─────
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  portfolio_id uuid references public.portfolios(id) on delete cascade not null,
  type text not null check (type in ('achat', 'vente', 'dividende', 'rééquilibrage', 'cotisation')),
  instrument_ticker text not null,
  instrument_name text not null,
  quantity numeric(12,4),
  price numeric(12,4),
  amount numeric(14,2) not null,
  account text check (account in ('CELI', 'REER', 'REEE', 'non_enregistré')),
  notes text,
  executed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='transactions' and policyname='Users can view own transactions') then
    create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
    create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
    create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id);
    create policy "Users can delete own transactions" on public.transactions for delete using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_executed_at on public.transactions(executed_at);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('rééquilibrage', 'objectif', 'marché', 'fiscal', 'système')),
  title text not null,
  message text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'success', 'danger')),
  is_read boolean not null default false,
  action_url text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='notifications' and policyname='Users can view own notifications') then
    create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id);
    create policy "Users can insert own notifications" on public.notifications for insert with check (auth.uid() = user_id);
    create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);
    create policy "Users can delete own notifications" on public.notifications for delete using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists idx_notifications_user_id on public.notifications(user_id);

-- ── Migration 007 : table subscriptions ─────────────────────
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free', 'pro', 'elite')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'incomplete', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='subscriptions' and policyname='Users can view own subscription') then
    create policy "Users can view own subscription" on public.subscriptions for select using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);

-- Backfill abonnements gratuits pour les users existants
insert into public.subscriptions (user_id, plan, status)
select p.id, 'free', 'active'
from public.profiles p
where not exists (select 1 from public.subscriptions s where s.user_id = p.id);

-- ── Mettre à jour le trigger handle_new_user ────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active');
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- SEED — Compte de démo : Sophie Tremblay
-- Email : demo@wealthpilot.ca  /  Mot de passe : DemoWP2026!
-- ============================================================

do $$
declare
  v_uid         uuid;
  v_portfolio_id uuid;
begin

  select id into v_uid from auth.users where email = 'demo@wealthpilot.ca';
  if v_uid is null then
    raise exception 'Utilisateur demo@wealthpilot.ca introuvable. Créez le compte sur /register d''abord.';
  end if;

  raise notice 'Seed pour uid = %', v_uid;

  -- 1. Profil
  update profiles set
    full_name            = 'Sophie Tremblay',
    onboarding_step      = 'completed',
    onboarding_completed = true,
    preferred_language   = 'fr',
    updated_at           = now() - interval '2 days'
  where id = v_uid;

  -- 2. Informations financières
  insert into client_info (
    user_id, age, profession, family_situation, dependents,
    annual_income, monthly_expenses, total_assets, total_debts,
    monthly_savings, investment_experience,
    has_celi, has_reer, has_reee,
    celi_balance, reer_balance, reee_balance, tax_bracket
  ) values (
    v_uid, 34, 'Ingénieure logicielle', 'célibataire', 0,
    95000, 3200, 70000, 8500, 1500, 'intermédiaire',
    true, true, false, 42000, 28000, 0, '53.31'
  )
  on conflict (user_id) do update set
    age = excluded.age, profession = excluded.profession,
    annual_income = excluded.annual_income, monthly_expenses = excluded.monthly_expenses,
    total_assets = excluded.total_assets, total_debts = excluded.total_debts,
    monthly_savings = excluded.monthly_savings, investment_experience = excluded.investment_experience,
    has_celi = excluded.has_celi, has_reer = excluded.has_reer,
    celi_balance = excluded.celi_balance, reer_balance = excluded.reer_balance,
    tax_bracket = excluded.tax_bracket, updated_at = now();

  -- 3. Évaluation du risque
  insert into risk_assessments (
    user_id, answers, ai_follow_up_questions, ai_follow_up_answers,
    risk_score, risk_profile, ai_analysis, key_factors
  ) values (
    v_uid,
    '{"horizon":"long_terme","reaction_baisse":"maintiens","objectif_principal":"croissance","connaissance":"intermediaire","revenu_stable":true}'::jsonb,
    '[{"question":"Prévoyez-vous des dépenses importantes dans les 5 prochaines années ?"},{"question":"Comment réagiriez-vous si votre portefeuille perdait 20% en 3 mois ?"}]'::jsonb,
    '[{"answer":"Oui, achat immobilier vers 2027, mais fonds d''urgence séparé."},{"answer":"Je serais inquiète mais je maintiendrais mes cotisations — opportunité d''acheter à rabais."}]'::jsonb,
    7, 'croissance',
    'Sophie présente un profil Croissance solide. Horizon long terme, stabilité professionnelle et tolérance confirmée aux baisses de marché justifient 80% en actions. L''objectif immobilier 2027 est bien isolé dans CASH.TO/CELI.',
    '["Horizon long terme (>10 ans)","Tolérance aux baisses confirmée","Revenu stable et croissant","Objectif immobilier isolé","Expérience intermédiaire"]'::jsonb
  );

  -- 4. Objectifs de vie
  insert into goals (user_id, type, label, target_amount, current_amount, target_date, priority, notes) values
    (v_uid, 'retraite',           'Retraite anticipée à 55 ans',    800000, 70000, '2045-01-01', 'haute',   'FIRE partiel — temps partiel après 55 ans'),
    (v_uid, 'achat_maison',       'Mise de fonds — condo Montréal',  80000, 42000, '2027-06-01', 'haute',   'Rosemont ou Plateau-Mont-Royal, budget ~450k$'),
    (v_uid, 'fonds_urgence',      'Fonds d''urgence (6 mois)',       19200, 17500, null,         'moyenne', '6× dépenses mensuelles de 3 200$'),
    (v_uid, 'liberté_financière', 'Indépendance financière',        600000, 70000, '2040-01-01', 'basse',   'Portfolio générant 2k$/mois de revenus passifs');

  -- 5. Portefeuille
  insert into portfolios (
    user_id, type, name, description,
    expected_return, volatility, sharpe_ratio, max_drawdown,
    is_selected, ai_rationale, total_mer, tax_strategy, stress_test
  ) values (
    v_uid, 'suggéré', 'Portefeuille Croissance',
    'Portefeuille diversifié axé sur la croissance à long terme, optimisé fiscalement pour profil croissance (score 7/10).',
    7.50, 11.20, 0.49, 28.00, true,
    'Calibré pour votre profil Croissance (7/10). Exposition 80% actions pour un rendement attendu de 7,5% net sur horizon 20+ ans.',
    0.10,
    'Maximiser le CELI avec XUU.TO et XIC.TO. ZAG.TO en REER pour déductions fiscales. CASH.TO en CELI pour retrait libre d''impôt lors de l''achat immobilier.',
    '{"inflation_shock":"Impact limité — actions et immobilier couvrent partiellement. Rendement estimé : +2% vs baseline.","market_crash":"Perte estimée -22% à -26% sur krach -30% (ZAG.TO protège). Récupération en 18-24 mois.","interest_rate_hike":"Hausse +2% : impact -3% à -5% sur ZAG.TO, compensé par résilience actions. Net : -1,5%."}'::jsonb
  ) returning id into v_portfolio_id;

  -- 6. Allocations
  insert into portfolio_allocations (
    portfolio_id, asset_class, sub_class, instrument_name, instrument_ticker,
    weight, expected_return, description, suggested_account, mer, currency, isin
  ) values
    (v_portfolio_id, 'Actions américaines',     'Marché total US',           'iShares Core S&P U.S. Total Market ETF',    'XUU.TO', 40, 9.50, 'Marché américain total ~4000 titres, retenue à la source récupérée en REER.',           'REER', 0.07, 'CAD', 'CA46433M1077'),
    (v_portfolio_id, 'Actions canadiennes',     'Marché total CA',           'iShares Core S&P/TSX Capped Composite ETF', 'XIC.TO', 25, 7.50, 'Cœur du marché canadien, 240+ titres, faibles frais.',                                  'CELI', 0.06, 'CAD', 'CA46433G1019'),
    (v_portfolio_id, 'Actions internationales', 'Marchés développés ex-NA',  'iShares Core MSCI EAFE IMI Index ETF',      'XEF.TO', 15, 8.00, 'Marchés développés Europe/Asie/Australie.',                                             'REER', 0.22, 'CAD', 'CA46436R2063'),
    (v_portfolio_id, 'Obligations canadiennes', 'Marché total CA',           'BMO Aggregate Bond Index ETF',              'ZAG.TO', 15, 3.20, 'Obligations gouvernementales et corporatives CA, amortisseur de volatilité.',            'REER', 0.09, 'CAD', 'CA05590A1049'),
    (v_portfolio_id, 'Liquidités',              null,                        'Evolve High Interest Savings Account ETF',  'CASH.TO', 5, 4.80, 'Épargne à taux élevé, capital préservé pour mise de fonds 2027.',                       'CELI', 0.14, 'CAD', 'CA30074Q1054');

  -- 7. Transactions (6 mois)
  insert into transactions (user_id, portfolio_id, type, instrument_ticker, instrument_name, quantity, price, amount, account, notes, executed_at) values
    (v_uid, v_portfolio_id, 'achat',         'XUU.TO', 'iShares Core S&P U.S. Total Market ETF',    45,   44.50, 2002.50, 'REER', 'Constitution initiale',                     '2025-09-15 10:30:00+00'),
    (v_uid, v_portfolio_id, 'achat',         'XIC.TO', 'iShares Core S&P/TSX Capped Composite ETF', 40,   36.80, 1472.00, 'CELI', 'Constitution initiale',                     '2025-09-15 10:35:00+00'),
    (v_uid, v_portfolio_id, 'achat',         'ZAG.TO', 'BMO Aggregate Bond Index ETF',               80,   14.20, 1136.00, 'REER', 'Constitution initiale',                     '2025-09-15 10:40:00+00'),
    (v_uid, v_portfolio_id, 'achat',         'CASH.TO','Evolve High Interest Savings Account ETF',    4,   50.10,  200.40, 'CELI', 'Liquidités mise de fonds',                  '2025-09-15 10:45:00+00'),
    (v_uid, v_portfolio_id, 'cotisation',    'XUU.TO', 'iShares Core S&P U.S. Total Market ETF',    13,   46.20,  600.60, 'REER', 'Cotisation mensuelle — octobre',             '2025-10-15 09:00:00+00'),
    (v_uid, v_portfolio_id, 'cotisation',    'XIC.TO', 'iShares Core S&P/TSX Capped Composite ETF', 10,   37.50,  375.00, 'CELI', 'Cotisation mensuelle — octobre',             '2025-10-15 09:05:00+00'),
    (v_uid, v_portfolio_id, 'dividende',     'XIC.TO', 'iShares Core S&P/TSX Capped Composite ETF', null, null,    38.40, 'CELI', 'Distribution trimestrielle XIC.TO',          '2025-10-20 16:00:00+00'),
    (v_uid, v_portfolio_id, 'cotisation',    'XUU.TO', 'iShares Core S&P U.S. Total Market ETF',    12,   47.80,  573.60, 'REER', 'Cotisation mensuelle — novembre',            '2025-11-15 09:00:00+00'),
    (v_uid, v_portfolio_id, 'cotisation',    'XEF.TO', 'iShares Core MSCI EAFE IMI Index ETF',        8,   35.10,  280.80, 'REER', 'Cotisation mensuelle — novembre',            '2025-11-15 09:10:00+00'),
    (v_uid, v_portfolio_id, 'dividende',     'ZAG.TO', 'BMO Aggregate Bond Index ETF',               null, null,   22.50, 'REER', 'Distribution mensuelle obligations',         '2025-11-30 16:00:00+00'),
    (v_uid, v_portfolio_id, 'cotisation',    'XUU.TO', 'iShares Core S&P U.S. Total Market ETF',    10,   49.20,  492.00, 'REER', 'Cotisation mensuelle — décembre',            '2025-12-15 09:00:00+00'),
    (v_uid, v_portfolio_id, 'rééquilibrage', 'XIC.TO', 'iShares Core S&P/TSX Capped Composite ETF', null, null,     0.00, 'CELI', 'Rééquilibrage annuel',                       '2025-12-28 14:00:00+00'),
    (v_uid, v_portfolio_id, 'cotisation',    'CASH.TO','Evolve High Interest Savings Account ETF',   10,   50.15,  501.50, 'CELI', 'Cotisation CELI 2026 — mise de fonds',       '2026-01-02 09:30:00+00'),
    (v_uid, v_portfolio_id, 'cotisation',    'XUU.TO', 'iShares Core S&P U.S. Total Market ETF',    14,   50.10,  701.40, 'REER', 'Cotisation mensuelle — janvier 2026',        '2026-01-15 09:00:00+00'),
    (v_uid, v_portfolio_id, 'dividende',     'XIC.TO', 'iShares Core S&P/TSX Capped Composite ETF', null, null,   41.20, 'CELI', 'Distribution trimestrielle XIC.TO',          '2026-01-20 16:00:00+00'),
    (v_uid, v_portfolio_id, 'cotisation',    'XUU.TO', 'iShares Core S&P U.S. Total Market ETF',    12,   51.30,  615.60, 'REER', 'Cotisation mensuelle — février 2026',        '2026-02-15 09:00:00+00'),
    (v_uid, v_portfolio_id, 'cotisation',    'ZAG.TO', 'BMO Aggregate Bond Index ETF',               20,   14.10,  282.00, 'REER', 'Renflouement obligations après hausse taux',  '2026-02-15 09:15:00+00'),
    (v_uid, v_portfolio_id, 'dividende',     'ZAG.TO', 'BMO Aggregate Bond Index ETF',               null, null,   25.80, 'REER', 'Distribution mensuelle obligations',         '2026-02-28 16:00:00+00');

  -- 8. Notifications
  insert into notifications (user_id, type, title, message, severity, is_read, action_url) values
    (v_uid, 'rééquilibrage', 'Rééquilibrage recommandé',           'Vos actions américaines représentent 43% (cible : 40%). Rééquilibrage mineur suggéré.',                                          'warning', false, '/portfolio'),
    (v_uid, 'objectif',      'Mise de fonds : 53% atteint!',       'Vous avez 42 000$ sur 80 000$. À ce rythme, cible atteinte en juillet 2027.',                                                     'success', false, '/portfolio'),
    (v_uid, 'fiscal',        'REER — délai approche',              'Date limite cotisation REER 2025 : 3 mars 2026. Droits non utilisés disponibles sur Mon ARC.',                                     'warning', true,  '/fiscal'),
    (v_uid, 'marché',        'Taux directeur — impact ZAG.TO',     'Banque du Canada maintient 3,25%. Impact neutre sur vos obligations. Portefeuille dans les cibles.',                              'info',    true,  '/portfolio'),
    (v_uid, 'système',       'Bienvenue sur WealthPilot!',         'Explorez le Chat IA pour des conseils personnalisés et la Planification fiscale pour optimiser vos comptes enregistrés.',          'info',    true,  '/dashboard');

  -- 9. Insights IA
  insert into ai_insights (user_id, type, title, content, priority, is_read, metadata, expires_at) values
    (v_uid, 'portfolio_alert',  'Dérive d''allocation détectée',  'XUU.TO représente 43% vs cible 40%. Rééquilibrage optionnel, à surveiller si > 45%.',                                               'normal', false, '{"ticker":"XUU.TO","current_weight":43,"target_weight":40}'::jsonb, now() + interval '30 days'),
    (v_uid, 'tax_optimization', 'Optimisation fiscale REER 2025', 'Cotisation REER de 5 000$ = économie de 2 665$ en impôts (tranche 53,31%). Délai : 3 mars 2026.',                                   'high',   false, '{"potential_savings":2665,"marginal_rate":53.31,"deadline":"2026-03-03"}'::jsonb, '2026-03-03 23:59:00+00'),
    (v_uid, 'goal_progress',    'Mise de fonds : en avance!',     'Progression 53%, en avance de 4 mois sur calendrier. Cible 80 000$ atteinte en juin 2027 au rythme actuel.',                       'normal', false, '{"goal":"achat_maison","on_track_months":4}'::jsonb, now() + interval '60 days'),
    (v_uid, 'rebalancing',      'Stratégie de rééquilibrage',     'Rééquilibrage sans frais : orienter prochaines cotisations vers ZAG.TO et XEF.TO jusqu''aux pondérations cibles.',                  'low',    true,  '{"strategy":"cash_flow_rebalancing"}'::jsonb, now() + interval '90 days'),
    (v_uid, 'market_update',    'Marché CA : contexte favorable', 'Énergie et financières performent bien ce trimestre. Votre 25% XIC.TO bénéficie de ce contexte.',                                   'low',    true,  '{}'::jsonb, now() + interval '14 days');

  -- 10. Messages de chat
  insert into chat_messages (user_id, role, content, created_at) values
    (v_uid, 'user',      'Bonjour! Mon profil est "Croissance" (score 7/10). Est-ce que le portefeuille suggéré est vraiment adapté pour moi?',                                                         now() - interval '5 days'),
    (v_uid, 'assistant', 'Bonjour Sophie! Absolument. Votre horizon 20+ ans, tolérance aux baisses confirmée et revenu stable justifient 80% en actions. Le 40% XUU.TO capte la croissance mondiale, 15% ZAG.TO sert d''amortisseur lors des crises. Volatilité de 11,2% normale pour votre profil.',    now() - interval '5 days' + interval '2 minutes'),
    (v_uid, 'user',      'Pourquoi mettre XUU.TO dans le REER plutôt que dans le CELI?',                                                                                                                now() - interval '4 days'),
    (v_uid, 'assistant', 'XUU.TO en REER : les dividendes américains ont une retenue à la source de 15%, récupérable en REER grâce à la convention fiscale Canada-USA. Dans un CELI, cette retenue est perdue définitivement. XIC.TO en CELI : dividendes canadiens = avantage fiscal limité, mieux en CELI pour croissance libre d''impôt. CASH.TO en CELI : retrait 100% libre d''impôt pour la mise de fonds 2027. Économie estimée : 500-800$/an.',    now() - interval '4 days' + interval '3 minutes'),
    (v_uid, 'user',      'Si les marchés chutent de 30%, combien je perdrais?',                                                                                                                         now() - interval '2 days'),
    (v_uid, 'assistant', 'Sur 70 000$ : XUU.TO -28% = -7 840$, XIC.TO -25% = -4 375$, XEF.TO -26% = -2 730$, ZAG.TO +4% = +420$, CASH.TO 0$. Impact net estimé : -14 525$ (-20,8% vs -30%). ZAG.TO et CASH.TO vous protègent à ~31%. Après 2020 : récupération en 6 mois. Maintenez vos cotisations en baisse — vous achetez à rabais.',    now() - interval '2 days' + interval '4 minutes');

  -- 11. Abonnement Pro
  insert into subscriptions (user_id, plan, status, current_period_start, current_period_end)
  values (v_uid, 'pro', 'active', now(), now() + interval '1 year')
  on conflict (user_id) do update set
    plan = 'pro', status = 'active',
    current_period_start = now(),
    current_period_end = now() + interval '1 year',
    updated_at = now();

  raise notice '✅ Seed terminé! Portfolio ID = %', v_portfolio_id;

end $$;
