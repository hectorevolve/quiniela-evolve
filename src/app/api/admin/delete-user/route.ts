import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/server-session';

export async function POST(req: NextRequest) {
  const { userId } = await req.json() as { userId: string };
  if (!userId) return NextResponse.json({ error: 'missing userId' }, { status: 400 });

  const admin = getAdminClient();

  // Delete from auth.users → cascades to profiles, predictions, bonus_awards
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('[delete-user]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
