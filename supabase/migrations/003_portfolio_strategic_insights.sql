-- Portfolio Strategic Insights Migration
-- Adds tax strategy, stress test, and total MER to portfolios table

alter table public.portfolios
  add column total_mer numeric(4,2),
  add column tax_strategy text,
  add column stress_test jsonb;
