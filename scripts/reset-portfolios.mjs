import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://urdsvyzkgrmilyekzyca.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: portfolios } = await supabase.from('portfolios').select('id, user_id');
console.log('Existing portfolios:', portfolios?.length || 0);

if (portfolios && portfolios.length > 0) {
  const ids = portfolios.map(p => p.id);
  await supabase.from('portfolio_allocations').delete().in('portfolio_id', ids);
  await supabase.from('portfolios').delete().in('id', ids);
  console.log('Deleted all portfolios and allocations');

  const userId = portfolios[0].user_id;
  await supabase.from('profiles').update({
    onboarding_step: 'portfolio_preview',
    onboarding_completed: false,
  }).eq('id', userId);
  console.log('Reset onboarding to portfolio_preview');
} else {
  console.log('Nothing to delete');
}
