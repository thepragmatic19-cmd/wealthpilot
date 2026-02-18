import { readFileSync } from 'fs';
import pg from 'pg';

// Use the Supabase service role JWT to authenticate via the pooler
// The transaction pooler connection string for Supabase
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function run() {
  await client.connect();
  console.log('Connected to database');

  const sql = readFileSync('./supabase/migrations/001_initial_schema.sql', 'utf8');

  try {
    await client.query(sql);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error.message);
    // Try to see what tables exist
    const res = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('Existing tables:', res.rows.map(r => r.table_name));
  } finally {
    await client.end();
  }
}

run();
