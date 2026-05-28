/**
 * GET /api/rankings
 *
 * Public endpoint — returns full rankings computed server-side using the
 * service-role client so RLS on bonus_awards (and other tables) is bypassed.
 * Both the admin panel and the user-facing TorneoScreen call this route.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calcPoints } from '@/lib/points';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

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
  const exactMap: Record<string, number> = {};   // tiebreaker: exact score count
  for (const p of predsRes.data ?? []) {
    const result = resultMap[p.match_id];
    if (!result) continue;
    const pts = calcPoints([p.home_score, p.away_score], result);
    pointsMap[p.user_id] = (pointsMap[p.user_id] ?? 0) + pts;
    if (pts === 3) exactMap[p.user_id] = (exactMap[p.user_id] ?? 0) + 1;
  }

  for (const b of bonusRes.data ?? []) {
    pointsMap[b.user_id] = (pointsMap[b.user_id] ?? 0) + b.points;
  }

  const entries = (profilesRes.data ?? []).map((p: { id: string; name: string; group_name: string | null; used_powers: string[] | null }) => ({
    userId: p.id,
    name: p.name,
    group_name: p.group_name,
    points: pointsMap[p.id] ?? 0,
    exactScores: exactMap[p.id] ?? 0,
    pos: 0,
    used_powers: p.used_powers ?? [],
  }));

  // Primary: most points. Tiebreaker: most exact scores (3-pt predictions). Final: name A→Z.
  entries.sort((a, b) =>
    b.points - a.points ||
    b.exactScores - a.exactScores ||
    a.name.localeCompare(b.name),
  );
  entries.forEach((e, i) => (e.pos = i + 1));

  return NextResponse.json(entries);
}
