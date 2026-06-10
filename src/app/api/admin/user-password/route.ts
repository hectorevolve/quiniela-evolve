/**
 * GET  /api/admin/user-password?phone=5512345678
 *
 * Returns (and lazily sets) the deterministic password for a phone.
 * Password is derived via HMAC-SHA256(phone, SECRET) → 8 readable chars.
 * Calling this endpoint also ensures the password is set in Supabase auth
 * for users who have registered (so they can actually log in with it).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, requireAdmin } from '@/lib/server-session';
import crypto from 'crypto';

const SECRET = process.env.PASSWORD_SALT ?? 'quiniela-evolve-2026';

// Readable charset: no 0/O/1/I/l to avoid confusion
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function generatePassword(phone: string): string {
  const hash = crypto.createHmac('sha256', SECRET).update(phone).digest('hex');
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += CHARS[parseInt(hash.slice(i * 2, i * 2 + 2), 16) % CHARS.length];
  }
  return result;
}

export async function GET(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return authErr;

  const phone = req.nextUrl.searchParams.get('phone')?.replace(/\D/g, '') ?? '';
  if (phone.length < 10) {
    return NextResponse.json({ error: 'invalid phone' }, { status: 400 });
  }

  const password = generatePassword(phone);
  const admin    = getAdminClient();
  const email    = `${phone}@auth.quinielaevolve.mx`;

  // Look up the registered user (may not exist if they haven't signed up yet)
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  // If user exists, lazily sync the password so they can log in
  if (profile?.id) {
    await admin.auth.admin.updateUserById(profile.id, { password });
  }

  return NextResponse.json({ password, registered: !!profile });
}
