/**
 * POST /api/auth/set-own-password
 *
 * Public endpoint — no auth required.
 * Allows a user to set their own password IF their phone is already in the DB.
 *
 * Body: { phone: "5512345678", password: "..." }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/server-session';

export async function POST(req: NextRequest) {
  const { phone, password, checkOnly } = await req.json() as {
    phone?: string;
    password?: string;
    checkOnly?: boolean;
  };

  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) {
    return NextResponse.json({ error: 'phone_invalid' }, { status: 400 });
  }

  const admin = getAdminClient();
  const email = `${digits}@auth.quinielaevolve.mx`;

  // 1. Check phone exists in profiles
  const { data: profile } = await admin
    .from('profiles')
    .select('id, name')
    .eq('email', email)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // If only checking existence, return early
  if (checkOnly) {
    return NextResponse.json({ ok: true, name: profile.name });
  }

  // 2. Validate password
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 });
  }

  // 3. Set password via admin API
  const { error } = await admin.auth.admin.updateUserById(profile.id, { password });
  if (error) {
    console.error('[set-own-password]', error.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, name: profile.name });
}
