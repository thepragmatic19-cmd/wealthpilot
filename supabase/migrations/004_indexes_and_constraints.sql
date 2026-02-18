-- Migration 004: Add missing indexes and constraints

-- Ensure only one portfolio can be selected per user
create unique index if not exists idx_portfolios_user_selected
  on public.portfolios(user_id)
  where is_selected = true;

-- Performance indexes for common queries
create index if not exists idx_risk_assessments_user_created
  on public.risk_assessments(user_id, created_at desc);

create index if not exists idx_chat_messages_user_created
  on public.chat_messages(user_id, created_at desc);

create index if not exists idx_goals_user_id
  on public.goals(user_id);

-- Add UPDATE policy for portfolio_allocations
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'portfolio_allocations'
    and policyname = 'Users can update own portfolio allocations'
  ) then
    create policy "Users can update own portfolio allocations"
      on public.portfolio_allocations for update
      using (
        portfolio_id in (
          select id from public.portfolios where user_id = auth.uid()
        )
      );
  end if;
end $$;
