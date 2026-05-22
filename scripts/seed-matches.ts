/**
 * Seed all WC 2026 matches from data.ts into the Supabase `matches` table.
 * Run once:  npx tsx scripts/seed-matches.ts
 */
import { createClient } from '@supabase/supabase-js';
import { MATCHES } from '../src/lib/data';

// Load env from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  const rows = MATCHES.map((m, i) => ({
    id:           m.id,
    group_name:   m.group,
    home_code:    m.home.code,
    home_name:    m.home.name,
    away_code:    m.away.code,
    away_name:    m.away.name,
    match_date:   m.date,
    stadium:      m.stadium ?? null,
    result_home:  m.result ? m.result[0] : null,
    result_away:  m.result ? m.result[1] : null,
    sort_order:   i,
  }));

  const { error } = await supabase
    .from('matches')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
  console.log(`Seeded ${rows.length} matches successfully.`);
}

seed();
