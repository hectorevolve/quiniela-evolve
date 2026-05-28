import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/server-session';

/**
 * Admin-only: update a player's profile + bonus points.
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

  // ── Bonus points ────────────────────────────────────────────────────────────
  // Only touch bonus_awards if bonus_points is explicitly set AND > 0
  const bonusPts = body.bonus_points;
  if (bonusPts !== undefined && bonusPts !== 0) {
    const { data: existing } = await admin
      .from('bonus_awards')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from('bonus_awards')
        .update({ points: bonusPts, reason: body.bonus_reason ?? null })
        .eq('user_id', userId);
      if (error) {
        console.error('[update-player] bonus_awards update:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Insert — only mandatory fields we control; schema must allow NULLs on others
      const { error } = await admin.from('bonus_awards').insert({
        user_id:    userId,
        points:     bonusPts,
        reason:     body.bonus_reason ?? null,
        group_name: body.group_name ?? null,
        category:   null,
      });
      if (error) {
        // If schema still rejects NULLs, surface a clear message to admin
        console.error('[update-player] bonus_awards insert:', error.message);
        return NextResponse.json({
          error: `Error al guardar puntos bonus: ${error.message}. Corre en Supabase: ALTER TABLE public.bonus_awards ALTER COLUMN group_name DROP NOT NULL; ALTER TABLE public.bonus_awards ALTER COLUMN category DROP NOT NULL;`,
        }, { status: 500 });
      }
    }
  } else if (bonusPts === 0) {
    // If admin explicitly cleared bonus to 0, delete any existing record
    await admin.from('bonus_awards').delete().eq('user_id', userId);
  }

  return NextResponse.json({ ok: true });
}
