import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, requireAdmin } from '@/lib/server-session';

export async function POST(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return authErr;

  const { userId, password } = await req.json() as { userId?: string; password?: string };
  if (!userId || !password) {
    return NextResponse.json({ error: 'missing userId or password' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
  }

  const admin = getAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
