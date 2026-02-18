import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function reset() {
  console.log('Resetting portfolios...');
  const { error } = await supabase.from('portfolios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) console.error('Error:', error);
  else console.log('Successfully cleared all portfolios. Refresh the page to regenerate.');
}

reset();
