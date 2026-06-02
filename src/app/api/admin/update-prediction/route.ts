import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, requireAdmin } from '@/lib/server-session';

/**
 * Admin-only: upsert or delete a prediction for any user.
 * Body: { userId, matchId, homeScore, awayScore }
 * If homeScore and awayScore are null → deletes the prediction.
 */
export async function POST(req: NextRequest) {
  const _authErr = await requireAdmin(req); if (_authErr) return _authErr;
  const admin = getAdminClient();
  const body = await req.json() as {
    userId: string;
    matchId: string;
    homeScore: number | null;
    awayScore: number | null;
  };

  const { userId, matchId, homeScore, awayScore } = body;
  if (!userId || !matchId) {
    return NextResponse.json({ error: 'missing userId or matchId' }, { status: 400 });
  }

  if (homeScore === null || awayScore === null) {
    // Delete prediction
    const { error } = await admin
      .from('predictions')
      .delete()
      .eq('user_id', userId)
      .eq('match_id', matchId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: true });
  }

  // Upsert prediction (predictions table has unique(user_id, match_id))
  const { error } = await admin.from('predictions').upsert({
    user_id:    userId,
    match_id:   matchId,
    home_score: homeScore,
    away_score: awayScore,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,match_id' });

  if (error) {
    console.error('[update-prediction]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
