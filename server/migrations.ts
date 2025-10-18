import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export async function runMigrations() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Skipping migrations: Supabase credentials not set');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  try {
    // Create themes table if it doesn't exist
    const { error: themesError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS themes (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          user_id TEXT NOT NULL,
          tokens JSONB NOT NULL,
          is_default TEXT DEFAULT 'false',
          source_url TEXT,
          confidence_score TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `
    }).then(() => ({ error: null })).catch((e) => ({ error: e }));

    // Add theme_id column to documentations if it doesn't exist
    const { error: docError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE documentations 
        ADD COLUMN IF NOT EXISTS theme_id INTEGER REFERENCES themes(id);
      `
    }).then(() => ({ error: null })).catch((e) => ({ error: e }));

    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    console.log('Note: You may need to create the themes table manually in Supabase SQL editor:');
    console.log(`
CREATE TABLE IF NOT EXISTS themes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  tokens JSONB NOT NULL,
  is_default TEXT DEFAULT 'false',
  source_url TEXT,
  confidence_score TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE documentations 
ADD COLUMN IF NOT EXISTS theme_id INTEGER REFERENCES themes(id);
    `);
  }
}
