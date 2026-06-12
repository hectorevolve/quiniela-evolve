/**
 * GET /api/live
 *
 * Returns the current live match state by reading from the `live_match`
 * table in Supabase — populated every minute by /api/sync-live.
 *
 * This endpoint never calls football-data.org directly, so it scales
 * to any number of concurrent users (each read is just a Supabase query).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { LiveMatch } from '@/lib/data';

// Cache at CDN edge for 15s — cron updates every 60s,
// so max staleness is ~30s (15s cache + 15s client poll).
export const revalidate = 15;

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('live_match')
      .select('match_id, home_score, away_score, minute, status, duration')
      .eq('id', 1)
      .single();

    if (error || !data || !data.match_id) {
      return NextResponse.json({ live: null });
    }

    const live: LiveMatch = {
      matchId:   data.match_id,
      homeScore: data.home_score ?? 0,
      awayScore: data.away_score ?? 0,
      minute:    data.minute     ?? null,
      status:    data.status     ?? 'IN_PLAY',
      duration:  data.duration   ?? 'REGULAR',
    };

    return NextResponse.json({ live });
  } catch {
    return NextResponse.json({ live: null });
  }
}
