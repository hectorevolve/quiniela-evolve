/**
 * GET  /api/admin/user-password?phone=5512345678
 *
 * Returns the deterministic password for a phone number.
 * - If the user is already registered → just returns the password and sets it.
 * - If NOT registered → creates the auth account + profile, then returns password.
 *
 * Password is derived via HMAC-SHA256(phone, SECRET) → 8 readable chars.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, requireAdmin } from '@/lib/server-session';
import crypto from 'crypto';

const SECRET = process.env.PASSWORD_SALT ?? 'quiniela-evolve-2026';
const CHARS  = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

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

  const password  = generatePassword(phone);
  const admin     = getAdminClient();
  const email     = `${phone}@auth.quinielaevolve.mx`;
  const fullPhone = `+52${phone}`;

  // Check if already registered
  const { data: profile } = await admin
    .from('profiles')
    .select('id, name')
    .eq('email', email)
    .maybeSingle();

  if (profile?.id) {
    // Already registered — just sync the password
    await admin.auth.admin.updateUserById(profile.id, { password });
    return NextResponse.json({ password, registered: true, name: profile.name });
  }

  // Not registered — get their info from allowed_phones and create account
  const { data: allowed } = await admin
    .from('allowed_phones')
    .select('name, group_name, city, premium')
    .eq('phone', fullPhone)
    .maybeSingle();

  if (!allowed) {
    // Try without +52 prefix
    const { data: allowed2 } = await admin
      .from('allowed_phones')
      .select('name, group_name, city, premium')
      .or(`phone.eq.${phone},phone.eq.+52${phone}`)
      .maybeSingle();

    if (!allowed2) {
      return NextResponse.json({ error: 'not_in_whitelist' }, { status: 404 });
    }
    Object.assign(allowed ?? {}, allowed2);
  }

  const info = allowed!;

  // Create Supabase auth user
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    phone,
    phone_confirm: true,
    password,
  });

  if (createErr || !newUser?.user) {
    console.error('[user-password] createUser error:', createErr?.message);
    return NextResponse.json({ error: createErr?.message ?? 'create_failed' }, { status: 500 });
  }

  // Create profile
  await admin.from('profiles').insert({
    id:         newUser.user.id,
    name:       info.name ?? 'Usuario',
    email,
    phone,
    group_name: info.group_name ?? null,
    city:       info.city ?? null,
    premium:    info.premium ?? false,
    role:       'user',
    survey_completed: false,
  });

  return NextResponse.json({ password, registered: false, name: info.name, created: true });
}
