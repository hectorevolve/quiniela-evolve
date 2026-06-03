/**
 * GET /api/rankings
 *
 * Returns full rankings computed server-side.
 * Cached at the Vercel CDN edge for 60 seconds (revalidate = 60).
 * → 3,000 concurrent users trigger 1 DB query per minute, not 3,000.
 *
 * Optimizations:
 *  1. Fetch only predictions for matches that already have results
 *     (avoids loading 300k+ rows when most matches are still pending)
 *  2. CDN edge cache — all users share the same cached response
 *  3. Module-level Supabase singleton (warm instance reuse)
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/server-session';
import { calcPoints, isExact } from '@/lib/points';

// Mapeo de ciudades a abreviaturas
// Cache this route at the Vercel CDN edge for 60 seconds.
// Rankings only change when match results arrive (every 15 min via cron),
// so 60s staleness is completely acceptable.
export const revalidate = 60;

export async function GET() {
  const admin = getAdminClient();

  // ── 1. Fetch profiles + match results + bonus in parallel ─────────────────
  const [profilesRes, resultsRes, bonusRes] = await Promise.all([
    admin
      .from('profiles')
      .select('id, name, group_name, city, used_powers')
      .neq('role', 'superadmin'),
    admin
      .from('matches')
      .select('id, result_home, result_away, group_name')
      .not('result_home', 'is', null),
    admin
      .from('bonus_awards')
      .select('user_id, points'),
  ]);

  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
  }

  // Build result + phase maps; collect only the match IDs that have results
  const resultMap: Record<string, [number, number]> = {};
  const phaseMap:  Record<string, string | null> = {};
  for (const m of resultsRes.data ?? []) {
    resultMap[m.id] = [m.result_home, m.result_away];
    phaseMap[m.id]  = m.group_name ?? null;
  }

  // ×2 Puntos Dobles: map userId → match where the power was used.
  // Separate (resilient) query so the route keeps working if the column
  // does not exist yet (run the migration to enable doubling).
  const doubleMatchMap: Record<string, string | null> = {};
  const dblRes = await admin.from('profiles').select('id, double_match_id');
  if (!dblRes.error) {
    for (const r of (dblRes.data ?? []) as { id: string; double_match_id: string | null }[]) {
      doubleMatchMap[r.id] = r.double_match_id ?? null;
    }
  }

  const matchIdsWithResults = Object.keys(resultMap);

  // ── 2. Fetch only predictions for matches that have results ───────────────
  // This is the key optimization: instead of fetching ALL predictions
  // (potentially 300k+ rows), we only fetch the subset that can earn points.
  let predsData: { user_id: string; match_id: string; home_score: number; away_score: number }[] = [];
  if (matchIdsWithResults.length > 0) {
    const { data } = await admin
      .from('predictions')
      .select('user_id, match_id, home_score, away_score')
      .in('match_id', matchIdsWithResults);
    predsData = data ?? [];
  }

  // ── 3. Compute points ─────────────────────────────────────────────────────
  const matchPtsMap: Record<string, number> = {};  // prediction-only pts
  const bonusPtsMap: Record<string, number> = {};  // bonus_awards pts
  const exactMap:    Record<string, number> = {};

  for (const p of predsData) {
    const result = resultMap[p.match_id];
    if (!result) continue;
    let pts = calcPoints([p.home_score, p.away_score], result, phaseMap[p.match_id]);
    // ×2 Puntos Dobles: duplica los puntos del partido donde se usó el poder
    if (pts > 0 && doubleMatchMap[p.user_id] === p.match_id) pts *= 2;
    matchPtsMap[p.user_id] = (matchPtsMap[p.user_id] ?? 0) + pts;
    if (isExact([p.home_score, p.away_score], result)) {
      exactMap[p.user_id] = (exactMap[p.user_id] ?? 0) + 1;
    }
  }

  for (const b of bonusRes.data ?? []) {
    bonusPtsMap[b.user_id] = (bonusPtsMap[b.user_id] ?? 0) + b.points;
  }

  // ── 4. Build + sort entries ───────────────────────────────────────────────
  const entries = (profilesRes.data ?? []).map((p: {
    id: string; name: string; group_name: string | null; city: string | null; used_powers: string[] | null
  }) => {
    const matchPoints = matchPtsMap[p.id] ?? 0;
    const bonusPoints = bonusPtsMap[p.id] ?? 0;
    return {
      userId:      p.id,
      name:        p.name,
      group_name:  p.group_name,
      city:        p.city,
      points:      matchPoints + bonusPoints,
      matchPoints,
      bonusPoints,
      exactScores: exactMap[p.id] ?? 0,
      pos:         0,
      used_powers: p.used_powers ?? [],
    };
  });

  // Primary: most points · Tiebreaker: most exact scores · Final: name A→Z
  entries.sort((a, b) =>
    b.points      - a.points      ||
    b.exactScores - a.exactScores ||
    a.name.localeCompare(b.name),
  );
  entries.forEach((e, i) => (e.pos = i + 1));

  return NextResponse.json(entries);
}
