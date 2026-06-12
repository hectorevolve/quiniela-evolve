import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, requireAdmin } from '@/lib/server-session';
import { calcPoints } from '@/lib/points';

export interface AdminRankingEntry {
  userId: string;
  name: string;
  group_name: string | null;
  city: string | null;
  points: number;
  matchPoints: number;
  bonusPoints: number;
  pos: number;
  used_powers: string[];
}

/**
 * GET /api/admin/rankings
 * Returns rankings computed server-side using the admin client (bypasses RLS).
 * This ensures bonus_awards and all tables are fully readable regardless of RLS policies.
 */
export async function GET(req: NextRequest) {
  const _authErr = await requireAdmin(req); if (_authErr) return _authErr;
  const admin = getAdminClient();

  const PAGE = 1000;

  const [resultsRes, bonusRes] = await Promise.all([
    admin.from('matches').select('id, result_home, result_away, group_name').not('result_home', 'is', null),
    admin.from('bonus_awards').select('user_id, points'),
  ]);

  // Paginate profiles to bypass Supabase project max_rows (1000)
  type ProfileRow = { id: string; name: string; group_name: string | null; city: string | null; used_powers: string[] | null };
  const profilesData: ProfileRow[] = [];
  {
    let from = 0;
    while (true) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, name, group_name, city, used_powers')
        .neq('role', 'superadmin')
        .range(from, from + PAGE - 1);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data || data.length === 0) break;
      profilesData.push(...(data as ProfileRow[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  const resultMap: Record<string, [number, number]> = {};
  const phaseMap:  Record<string, string | null> = {};
  for (const m of resultsRes.data ?? []) {
    resultMap[m.id] = [m.result_home, m.result_away];
    phaseMap[m.id]  = m.group_name ?? null;
  }

  // ×2 Puntos Dobles: userId → partido donde se usó (paginated)
  const doubleMatchMap: Record<string, string | null> = {};
  {
    let from = 0;
    while (true) {
      const { data } = await admin.from('profiles').select('id, double_match_id').range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      for (const r of data as { id: string; double_match_id: string | null }[]) {
        doubleMatchMap[r.id] = r.double_match_id ?? null;
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  // Only fetch predictions for matches that have results (avoids Supabase 1000-row default limit)
  const matchIdsWithResults = Object.keys(resultMap);
  let predsData: { user_id: string; match_id: string; home_score: number; away_score: number }[] = [];
  if (matchIdsWithResults.length > 0) {
    let from = 0;
    while (true) {
      const { data } = await admin
        .from('predictions')
        .select('user_id, match_id, home_score, away_score')
        .in('match_id', matchIdsWithResults)
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      predsData.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  const matchPtsMap: Record<string, number> = {};
  for (const p of predsData) {
    const result = resultMap[p.match_id];
    if (!result) continue;
    let pts = calcPoints([p.home_score, p.away_score], result, phaseMap[p.match_id]);
    if (pts > 0 && doubleMatchMap[p.user_id] === p.match_id) pts *= 2;
    matchPtsMap[p.user_id] = (matchPtsMap[p.user_id] ?? 0) + pts;
  }

  const bonusPtsMap: Record<string, number> = {};
  for (const b of bonusRes.data ?? []) {
    bonusPtsMap[b.user_id] = (bonusPtsMap[b.user_id] ?? 0) + b.points;
  }

  const entries: AdminRankingEntry[] = profilesData.map((p) => {
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
      pos:         0,
      used_powers: p.used_powers ?? [],
    };
  });

  entries.sort((a, b) => b.points - a.points);
  entries.forEach((e, i) => (e.pos = i + 1));

  return NextResponse.json(entries);
}
