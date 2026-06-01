import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAdminClient } from '@/lib/server-session';
import { calcPoints } from '@/lib/points';

/**
 * Admin-only: update a player's profile + bonus points.
 *
 * Accepts either:
 *   target_points: number  — admin sets the desired total; server computes the required bonus
 *   bonus_points:  number  — legacy: direct bonus override (used when target_points not provided)
 */
export async function POST(req: NextRequest) {
  const admin = getAdminClient();
  const body = await req.json() as {
    userId: string;
    name?: string;
    group_name?: string | null;
    used_powers?: string[];
    target_points?: number;   // preferred: server computes bonus = target - match_pts
    bonus_points?: number;    // fallback legacy field
    bonus_reason?: string;
  };

  const { userId } = body;
  if (!userId) return NextResponse.json({ error: 'missing userId' }, { status: 400 });

  // ── Update profile fields ───────────────────────────────────────────────────
  const profilePatch: Record<string, unknown> = {};
  if (body.name        !== undefined) profilePatch.name        = body.name.trim();
  if (body.group_name  !== undefined) profilePatch.group_name  = body.group_name;
  if (body.used_powers !== undefined) profilePatch.used_powers = body.used_powers;

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await admin.from('profiles').update(profilePatch).eq('id', userId);
    if (error) {
      console.error('[update-player] profile update:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // ── Bonus points ────────────────────────────────────────────────────────────
  let bonusPts: number | undefined;

  if (body.target_points !== undefined) {
    // Server-side computation: bonus = target - match_prediction_pts
    // This is the reliable path — no client-side math needed.
    const [resultsRes, predsRes] = await Promise.all([
      admin.from('matches').select('id, result_home, result_away').not('result_home', 'is', null),
      admin.from('predictions').select('match_id, home_score, away_score').eq('user_id', userId),
    ]);

    const resultMap: Record<string, [number, number]> = {};
    for (const m of resultsRes.data ?? []) resultMap[m.id] = [m.result_home, m.result_away];

    let matchPts = 0;
    for (const p of predsRes.data ?? []) {
      const result = resultMap[p.match_id];
      if (result) matchPts += calcPoints([p.home_score, p.away_score], result);
    }

    bonusPts = body.target_points - matchPts;
  } else if (body.bonus_points !== undefined) {
    // Legacy path
    bonusPts = body.bonus_points;
  }

  if (bonusPts !== undefined) {
    // Always delete ALL existing bonus_awards rows for this user first.
    // The table has its own `id` PK (not user_id), so upsert won't work.
    // Deleting then inserting gives us a clean single row every time.
    const { error: delErr } = await admin.from('bonus_awards').delete().eq('user_id', userId);
    if (delErr) {
      console.error('[update-player] bonus_awards delete:', delErr.message);
      return NextResponse.json({ error: `DB error: ${delErr.message}` }, { status: 500 });
    }

    if (bonusPts !== 0) {
      const { error: insErr } = await admin.from('bonus_awards').insert({
        user_id:    userId,
        points:     bonusPts,
        reason:     body.bonus_reason ?? null,
        group_name: body.group_name ?? 'General',
        category:   'admin',
      });
      if (insErr) {
        console.error('[update-player] bonus_awards insert:', insErr.message);
        return NextResponse.json({ error: `DB error: ${insErr.message}` }, { status: 500 });
      }
    }
  }

  // Bust the user-facing rankings CDN cache immediately
  revalidatePath('/api/rankings');

  return NextResponse.json({ ok: true });
}
