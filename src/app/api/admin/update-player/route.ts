import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/server-session';

/**
 * Admin-only: update a player's profile + bonus points.
 * Body: {
 *   userId: string,
 *   name?: string,
 *   group_name?: string | null,
 *   used_powers?: string[],
 *   bonus_points?: number,
 *   bonus_reason?: string,
 * }
 */
export async function POST(req: NextRequest) {
  const admin = getAdminClient();
  const body = await req.json() as {
    userId: string;
    name?: string;
    group_name?: string | null;
    used_powers?: string[];
    bonus_points?: number;
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

  // ── Upsert bonus points ─────────────────────────────────────────────────────
  // Only write to bonus_awards if bonus_points is non-zero OR there's already a record
  if (body.bonus_points !== undefined) {
    const { data: existing } = await admin
      .from('bonus_awards')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Always update existing record (even to 0)
      const { error } = await admin
        .from('bonus_awards')
        .update({ points: body.bonus_points, reason: body.bonus_reason ?? null })
        .eq('user_id', userId);
      if (error) {
        console.error('[update-player] bonus_awards update:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else if (body.bonus_points !== 0) {
      // Only insert a new record when there are actual bonus points to award
      // group_name: use what admin set in modal, fallback to empty string (satisfies NOT NULL)
      const groupName = body.group_name ?? '';
      const { error } = await admin.from('bonus_awards').insert({
        user_id:    userId,
        points:     body.bonus_points,
        reason:     body.bonus_reason ?? null,
        group_name: groupName,
      });
      if (error) {
        console.error('[update-player] bonus_awards insert:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    // If bonus_points === 0 and no existing record → skip (nothing to store)
  }

  return NextResponse.json({ ok: true });
}
