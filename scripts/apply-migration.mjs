import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://urdsvyzkgrmilyekzyca.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Step 1: Create a helper function in DB to execute arbitrary SQL
console.log('Creating exec_sql helper function...');
const createFnRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ sql_text: '' }),
});

// If exec_sql doesn't exist, we need another way.
// Use the Supabase SQL API (requires database password via pooler)
// Alternative: use pg module directly

console.log('Using pg module to connect directly...');

const { default: pg } = await import('pg');
const client = new pg.Client({
  connectionString: `postgresql://postgres.urdsvyzkgrmilyekzyca:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ca-central-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log('Connected to database');

  await client.query(`
    ALTER TABLE public.portfolio_allocations
      ADD COLUMN IF NOT EXISTS suggested_account text CHECK (suggested_account IN ('CELI', 'REER', 'REEE', 'non_enregistré')),
      ADD COLUMN IF NOT EXISTS mer numeric(4,2),
      ADD COLUMN IF NOT EXISTS currency text CHECK (currency IN ('CAD', 'USD')),
      ADD COLUMN IF NOT EXISTS isin text;
  `);
  console.log('Migration applied successfully!');

  // Verify
  const res = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'portfolio_allocations'
    ORDER BY ordinal_position;
  `);
  console.log('Columns:', res.rows.map(r => r.column_name).join(', '));

  await client.end();
} catch (err) {
  console.error('pg connection failed:', err.message);
  console.log('\nFallback: creating API endpoint to run migration...');
  await client.end().catch(() => {});

  // Fallback: create a Next.js API route to apply migration
  console.log('Will create API migration endpoint instead.');
  process.exit(1);
}

// Clean up existing portfolios
const { data: portfolios } = await supabase.from('portfolios').select('id');
if (portfolios && portfolios.length > 0) {
  const ids = portfolios.map(p => p.id);
  await supabase.from('portfolio_allocations').delete().in('portfolio_id', ids);
  await supabase.from('portfolios').delete().in('id', ids);
  console.log(`Deleted ${portfolios.length} existing portfolios`);
} else {
  console.log('No portfolios to delete');
}

// Reset onboarding
const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
if (profiles && profiles[0]) {
  await supabase.from('profiles').update({
    onboarding_step: 'portfolio_preview',
    onboarding_completed: false
  }).eq('id', profiles[0].id);
  console.log('Onboarding reset to portfolio_preview');
}
