import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/server-session';

export async function POST(req: NextRequest) {
  const { matchId } = await req.json() as { matchId: string };
  if (!matchId) return NextResponse.json({ error: 'missing matchId' }, { status: 400 });

  const admin = getAdminClient();

  // Predictions are CASCADE-deleted by the FK constraint
  const { error } = await admin.from('matches').delete().eq('id', matchId);
  if (error) {
    console.error('[delete-match]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
