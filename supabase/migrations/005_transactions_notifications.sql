-- ============================================================
-- TRANSACTIONS TABLE (track portfolio activity)
-- ============================================================
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

create policy "Users can view own transactions"
  on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions"
  on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions"
  on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions"
  on public.transactions for delete using (auth.uid() = user_id);

create index idx_transactions_user_id on public.transactions(user_id);
create index idx_transactions_portfolio_id on public.transactions(portfolio_id);
create index idx_transactions_executed_at on public.transactions(executed_at);

-- ============================================================
-- NOTIFICATIONS TABLE (alerts and recommendations)
-- ============================================================
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

create policy "Users can view own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "Users can insert own notifications"
  on public.notifications for insert with check (auth.uid() = user_id);
create policy "Users can update own notifications"
  on public.notifications for update using (auth.uid() = user_id);
create policy "Users can delete own notifications"
  on public.notifications for delete using (auth.uid() = user_id);

create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_is_read on public.notifications(user_id, is_read);
