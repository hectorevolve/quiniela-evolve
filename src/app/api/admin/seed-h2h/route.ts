/**
 * POST /api/admin/seed-h2h
 *
 * Migrates all hardcoded H2H_DATA + H2H_PRED from data.ts into the
 * match_h2h Supabase table.  Data is stored in home/away orientation
 * (home = home team of THIS match, not alphabetical).
 *
 * Safe to call multiple times — uses upsert.
 * Admin-only (validates bearer token).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MATCHES, H2H_DATA, H2H_PRED } from '@/lib/data';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user } } = await anonClient.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getAdminClient();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // ── Seed ────────────────────────────────────────────────────────────────────
  const rows: Record<string, unknown>[] = [];
  let skipped = 0;

  for (const match of MATCHES) {
    if (match.home.code === 'TBD' || match.away.code === 'TBD') continue;

    const sortedCodes = [match.home.code, match.away.code].sort();
    const key = sortedCodes.join('-');
    const h2h = H2H_DATA[key];
    const predRaw = H2H_PRED[key]; // [alpha-first score, alpha-second score]

    if (!h2h) { skipped++; continue; }

    // Determine orientation: is home team alphabetically first?
    const homeIsFirst = match.home.code === sortedCodes[0];

    // Reorient stats to home/away perspective of THIS match
    const hw = homeIsFirst ? h2h.hw : h2h.aw;
    const aw = homeIsFirst ? h2h.aw : h2h.hw;
    const hg = homeIsFirst ? h2h.hg : h2h.ag;
    const ag = homeIsFirst ? h2h.ag : h2h.hg;

    // Pred: [firstAlpha, secondAlpha] → [home, away]
    let pred_home: number | null = null;
    let pred_away: number | null = null;
    if (predRaw) {
      pred_home = homeIsFirst ? predRaw[0] : predRaw[1];
      pred_away = homeIsFirst ? predRaw[1] : predRaw[0];
    }

    rows.push({
      id:        match.id,
      home_code: match.home.code,
      away_code: match.away.code,
      n:         h2h.n,
      hw,
      d:         h2h.d,
      aw,
      hg,
      ag,
      since:     h2h.since ?? null,
      summary:   h2h.desc ?? '',
      past:      h2h.past,
      pred_home,
      pred_away,
      updated_at: new Date().toISOString(),
    });
  }

  // Upsert all rows in one batch
  const { error } = await supabase
    .from('match_h2h')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    seeded:  rows.length,
    skipped,
    total:   MATCHES.length,
  });
}
