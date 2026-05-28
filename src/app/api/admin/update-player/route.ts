import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/server-session';

/**
 * Admin-only: update a player's profile + bonus points.
 * Body: {
 *   userId: string,
 *   name?: string,
 *   group_name?: string | null,
 *   used_powers?: string[],   // full array of used powers (replaces current)
 *   bonus_points?: number,    // total bonus pts for this user (upsert)
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

  // ── Upsert bonus points (manual: check exists → update or insert) ──────────
  if (body.bonus_points !== undefined) {
    const { data: existing } = await admin
      .from('bonus_awards')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error } = await admin
        .from('bonus_awards')
        .update({ points: body.bonus_points, reason: body.bonus_reason ?? null })
        .eq('user_id', userId);
      if (error) {
        console.error('[update-player] bonus_awards update:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Insert new record — fetch group_name from profile to satisfy NOT NULL
      const { data: profile } = await admin
        .from('profiles')
        .select('group_name')
        .eq('id', userId)
        .maybeSingle();

      const { error } = await admin.from('bonus_awards').insert({
        user_id:    userId,
        points:     body.bonus_points,
        reason:     body.bonus_reason ?? null,
        group_name: profile?.group_name ?? body.group_name ?? null,
      });
      if (error) {
        console.error('[update-player] bonus_awards insert:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
