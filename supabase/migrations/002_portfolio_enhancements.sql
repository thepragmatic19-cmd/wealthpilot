-- Portfolio Enhancements Migration
-- Adds fiscal account suggestion, MER, currency, and ISIN to portfolio allocations

alter table public.portfolio_allocations
  add column suggested_account text check (suggested_account in ('CELI', 'REER', 'REEE', 'non_enregistré')),
  add column mer numeric(4,2),
  add column currency text check (currency in ('CAD', 'USD')),
  add column isin text;
