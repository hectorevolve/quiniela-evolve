import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/server-session';
import { calcPoints } from '@/lib/points';

export interface RankingEntry {
  userId: string;
  name: string;
  group_name: string | null;
  points: number;
  pos: number;
  used_powers: string[];
}

/**
 * GET /api/admin/rankings
 * Returns rankings computed server-side using the admin client (bypasses RLS).
 * This ensures bonus_awards and all tables are fully readable regardless of RLS policies.
 */
export async function GET() {
  const admin = getAdminClient();

  const [profilesRes, predsRes, resultsRes, bonusRes] = await Promise.all([
    admin.from('profiles').select('id, name, group_name, used_powers').neq('role', 'superadmin'),
    admin.from('predictions').select('user_id, match_id, home_score, away_score'),
    admin.from('matches').select('id, result_home, result_away').not('result_home', 'is', null),
    admin.from('bonus_awards').select('user_id, points'),
  ]);

  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
  }

  const resultMap: Record<string, [number, number]> = {};
  for (const m of resultsRes.data ?? []) resultMap[m.id] = [m.result_home, m.result_away];

  const pointsMap: Record<string, number> = {};
  for (const p of predsRes.data ?? []) {
    const result = resultMap[p.match_id];
    if (!result) continue;
    const pts = calcPoints([p.home_score, p.away_score], result);
    pointsMap[p.user_id] = (pointsMap[p.user_id] ?? 0) + pts;
  }

  for (const b of bonusRes.data ?? []) {
    pointsMap[b.user_id] = (pointsMap[b.user_id] ?? 0) + b.points;
  }

  const entries: RankingEntry[] = (profilesRes.data ?? []).map((p: { id: string; name: string; group_name: string | null; used_powers: string[] | null }) => ({
    userId: p.id,
    name: p.name,
    group_name: p.group_name,
    points: pointsMap[p.id] ?? 0,
    pos: 0,
    used_powers: p.used_powers ?? [],
  }));

  entries.sort((a, b) => b.points - a.points);
  entries.forEach((e, i) => (e.pos = i + 1));

  return NextResponse.json(entries);
}
