-- AI Insights table for proactive notifications
-- Stores weekly AI-generated insights personalized per user

create table if not exists public.ai_insights (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in (
    'market_update',      -- Weekly market commentary
    'portfolio_alert',    -- Portfolio drift or performance alert
    'tax_optimization',   -- Tax-saving opportunity
    'goal_progress',      -- Goal milestone or concern
    'rebalancing',        -- Rebalancing suggestion
    'general_tip'         -- General financial tip
  )),
  title text not null,
  content text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  is_read boolean not null default false,
  metadata jsonb default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.ai_insights enable row level security;

create policy "Users can view own insights"
  on public.ai_insights for select using (auth.uid() = user_id);
create policy "Users can update own insights"
  on public.ai_insights for update using (auth.uid() = user_id);
create policy "Service role can insert insights"
  on public.ai_insights for insert with check (true);

create index idx_ai_insights_user_id on public.ai_insights(user_id);
create index idx_ai_insights_created_at on public.ai_insights(created_at desc);
create index idx_ai_insights_unread on public.ai_insights(user_id, is_read) where is_read = false;
