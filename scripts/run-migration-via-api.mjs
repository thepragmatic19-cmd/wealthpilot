import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://urdsvyzkgrmilyekzyca.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZHN2eXprZ3JtaWx5ZWt6eWNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU4OTI5MSwiZXhwIjoyMDg2MTY1MjkxfQ.vNl-7Y2Zmu8TQ6rXeIdPywcpfO6jx4AR3LA_FmraztY'
);

// Read the migration file and split into individual statements
const sql = readFileSync('./supabase/migrations/001_initial_schema.sql', 'utf8');

// Split by semicolons but keep $$ blocks intact
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  const lines = sql.split('\n');

  for (const line of lines) {
    // Skip comments
    if (line.trim().startsWith('--') && !inDollarQuote) {
      continue;
    }

    if (line.includes('$$')) {
      const count = (line.match(/\$\$/g) || []).length;
      if (count === 1) {
        inDollarQuote = !inDollarQuote;
      }
      // count === 2 means open and close on same line, no toggle needed
    }

    current += line + '\n';

    if (!inDollarQuote && line.trim().endsWith(';')) {
      const stmt = current.trim();
      if (stmt && stmt !== ';') {
        statements.push(stmt);
      }
      current = '';
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

const statements = splitStatements(sql);
console.log(`Found ${statements.length} SQL statements`);

// Execute each statement via the Supabase SQL endpoint
for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.substring(0, 80).replace(/\n/g, ' ');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_text: stmt });
    if (error) {
      // Try using the raw SQL approach via the admin API
      console.log(`[${i+1}/${statements.length}] Skipped (no exec_sql): ${preview}...`);
    } else {
      console.log(`[${i+1}/${statements.length}] OK: ${preview}...`);
    }
  } catch (e) {
    console.log(`[${i+1}/${statements.length}] Error: ${e.message}`);
  }
}
