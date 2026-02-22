-- WealthPilot Database Schema
-- Complete migration with RLS policies

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  onboarding_step text not null default 'personal_info'
    check (onboarding_step in (
      'personal_info', 'financial_situation', 'goals', 'time_horizon',
      'risk_questionnaire', 'ai_follow_up', 'risk_result', 'portfolio_preview', 'completed'
    )),
  onboarding_completed boolean not null default false,
  preferred_language text not null default 'fr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- ============================================================
-- CLIENT INFO TABLE (financial data)
-- ============================================================
create table public.client_info (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  age integer,
  profession text,
  family_situation text,
  dependents integer default 0,
  annual_income numeric(12,2),
  monthly_expenses numeric(12,2),
  total_assets numeric(14,2),
  total_debts numeric(14,2),
  monthly_savings numeric(10,2),
  investment_experience text check (investment_experience in ('aucune', 'débutant', 'intermédiaire', 'avancé', 'expert')),
  has_celi boolean default false,
  has_reer boolean default false,
  has_reee boolean default false,
  celi_balance numeric(12,2),
  reer_balance numeric(12,2),
  reee_balance numeric(12,2),
  tax_bracket text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_info enable row level security;

create policy "Users can view own client info"
  on public.client_info for select using (auth.uid() = user_id);
create policy "Users can insert own client info"
  on public.client_info for insert with check (auth.uid() = user_id);
create policy "Users can update own client info"
  on public.client_info for update using (auth.uid() = user_id);

-- ============================================================
-- GOALS TABLE
-- ============================================================
create table public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('retraite', 'achat_maison', 'éducation', 'voyage', 'fonds_urgence', 'liberté_financière', 'autre')),
  label text not null,
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  target_date date,
  priority text not null default 'moyenne' check (priority in ('haute', 'moyenne', 'basse')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "Users can view own goals"
  on public.goals for select using (auth.uid() = user_id);
create policy "Users can insert own goals"
  on public.goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals"
  on public.goals for update using (auth.uid() = user_id);
create policy "Users can delete own goals"
  on public.goals for delete using (auth.uid() = user_id);

-- ============================================================
-- RISK ASSESSMENTS TABLE
-- ============================================================
create table public.risk_assessments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  answers jsonb not null default '{}',
  ai_follow_up_questions jsonb,
  ai_follow_up_answers jsonb,
  risk_score integer check (risk_score >= 1 and risk_score <= 10),
  risk_profile text check (risk_profile in ('très_conservateur', 'conservateur', 'modéré', 'croissance', 'agressif')),
  ai_analysis text,
  key_factors jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.risk_assessments enable row level security;

create policy "Users can view own risk assessments"
  on public.risk_assessments for select using (auth.uid() = user_id);
create policy "Users can insert own risk assessments"
  on public.risk_assessments for insert with check (auth.uid() = user_id);
create policy "Users can update own risk assessments"
  on public.risk_assessments for update using (auth.uid() = user_id);

-- ============================================================
-- PORTFOLIOS TABLE
-- ============================================================
create table public.portfolios (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('conservateur', 'suggéré', 'ambitieux')),
  name text not null,
  description text,
  expected_return numeric(5,2),
  volatility numeric(5,2),
  sharpe_ratio numeric(4,2),
  max_drawdown numeric(5,2),
  is_selected boolean not null default false,
  ai_rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolios enable row level security;

create policy "Users can view own portfolios"
  on public.portfolios for select using (auth.uid() = user_id);
create policy "Users can insert own portfolios"
  on public.portfolios for insert with check (auth.uid() = user_id);
create policy "Users can update own portfolios"
  on public.portfolios for update using (auth.uid() = user_id);
create policy "Users can delete own portfolios"
  on public.portfolios for delete using (auth.uid() = user_id);

-- ============================================================
-- PORTFOLIO ALLOCATIONS TABLE
-- ============================================================
create table public.portfolio_allocations (
  id uuid primary key default uuid_generate_v4(),
  portfolio_id uuid references public.portfolios(id) on delete cascade not null,
  asset_class text not null,
  sub_class text,
  instrument_name text not null,
  instrument_ticker text not null,
  weight numeric(5,2) not null,
  expected_return numeric(5,2),
  description text,
  created_at timestamptz not null default now()
);

alter table public.portfolio_allocations enable row level security;

create policy "Users can view own portfolio allocations"
  on public.portfolio_allocations for select
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_allocations.portfolio_id
      and p.user_id = auth.uid()
    )
  );
create policy "Users can insert own portfolio allocations"
  on public.portfolio_allocations for insert
  with check (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_allocations.portfolio_id
      and p.user_id = auth.uid()
    )
  );
create policy "Users can delete own portfolio allocations"
  on public.portfolio_allocations for delete
  using (
    exists (
      select 1 from public.portfolios p
      where p.id = portfolio_allocations.portfolio_id
      and p.user_id = auth.uid()
    )
  );

-- ============================================================
-- CHAT MESSAGES TABLE
-- ============================================================
create table public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "Users can view own chat messages"
  on public.chat_messages for select using (auth.uid() = user_id);
create policy "Users can insert own chat messages"
  on public.chat_messages for insert with check (auth.uid() = user_id);
create policy "Users can delete own chat messages"
  on public.chat_messages for delete using (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_client_info_user_id on public.client_info(user_id);
create index idx_goals_user_id on public.goals(user_id);
create index idx_risk_assessments_user_id on public.risk_assessments(user_id);
create index idx_portfolios_user_id on public.portfolios(user_id);
create index idx_portfolio_allocations_portfolio_id on public.portfolio_allocations(portfolio_id);
create index idx_chat_messages_user_id on public.chat_messages(user_id);
create index idx_chat_messages_created_at on public.chat_messages(created_at);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.client_info (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.client_info
  for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.goals
  for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.risk_assessments
  for each row execute procedure public.handle_updated_at();
create trigger set_updated_at before update on public.portfolios
  for each row execute procedure public.handle_updated_at();
