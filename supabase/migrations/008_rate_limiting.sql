-- Migration 008: Persistent Rate Limiting
-- Using a sliding window stored in a PostgreSQL table

create table if not exists public.api_rate_limits (
  key text primary key,
  timestamps timestamptz[] not null default '{}'
);

-- Protect the table: only accessible via the function
alter table public.api_rate_limits enable row level security;

-- Function to check rate limit in a single atomic operation
create or replace function public.check_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_seconds integer
)
returns json
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();
  v_window_interval interval := (p_window_seconds || ' seconds')::interval;
  v_timestamps timestamptz[];
  v_count integer;
  v_reset_in_seconds integer;
begin
  -- 1. Ensure the key exists
  insert into public.api_rate_limits (key)
  values (p_key)
  on conflict (key) do nothing;

  -- 2. Lock the row and get timestamps
  select timestamps into v_timestamps
  from public.api_rate_limits
  where key = p_key
  for update;

  -- 3. Filter timestamps outside the window
  v_timestamps := array(
    select t from unnest(v_timestamps) as t
    where t > v_now - v_window_interval
  );

  v_count := array_length(v_timestamps, 1);
  if v_count is null then v_count := 0; end if;

  -- 4. Check if over limit
  if v_count >= p_max_requests then
    v_reset_in_seconds := extract(epoch from (v_timestamps[1] + v_window_interval - v_now));
    return json_build_object(
      'success', false,
      'remaining', 0,
      'reset_in_seconds', greatest(ceil(v_reset_in_seconds), 1)::integer
    );
  end if;

  -- 5. Add new timestamp and update
  v_timestamps := array_append(v_timestamps, v_now);
  update public.api_rate_limits
  set timestamps = v_timestamps
  where key = p_key;

  return json_build_object(
    'success', true,
    'remaining', p_max_requests - (v_count + 1),
    'reset_in_seconds', p_window_seconds
  );
end;
$$;
