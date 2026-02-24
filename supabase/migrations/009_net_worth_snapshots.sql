create table net_worth_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  snapshot_date date not null default current_date,
  total_assets numeric,
  total_debts numeric,
  net_worth numeric generated always as (coalesce(total_assets,0) - coalesce(total_debts,0)) stored,
  created_at timestamptz default now(),
  unique(user_id, snapshot_date)
);
alter table net_worth_snapshots enable row level security;
create policy "users manage own snapshots" on net_worth_snapshots
  for all using (auth.uid() = user_id);
