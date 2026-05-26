import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { to10Digits, checkPhoneAllowed, createSessionTokenForEmail, getAdminClient } from '@/lib/server-session';

/**
 * Self-registration after survey.
 * Accepts: { phone, name, group_name }
 * Creates an internal-email Supabase account (phone10@auth.quinielaevolve.mx)
 * and returns a token_hash for auto-login.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    phone?:      string;
    name?:       string;
    group_name?: string;
  };

  const { name, group_name } = body;
  const phone10 = to10Digits(body.phone ?? '');

  // ── Validaciones básicas ─────────────────────────────────────────────────────
  if (!phone10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  }
  if (!name?.trim()) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  }

  // ── Verificar whitelist / no duplicado ───────────────────────────────────────
  const phoneCheck = await checkPhoneAllowed(phone10);
  if (!phoneCheck.allowed) {
    return NextResponse.json({ error: 'not_in_whitelist' }, { status: 403 });
  }
  if (phoneCheck.hasAccount) {
    return NextResponse.json({ error: 'already_registered' }, { status: 409 });
  }

  const admin      = getAdminClient();
  const phoneE164  = `+52${phone10}`;
  const internalEmail = `${phone10}@auth.quinielaevolve.mx`;
  const randomPass = randomUUID(); // Users never type this — login is always via SMS OTP

  // ── Crear cuenta en Supabase auth ────────────────────────────────────────────
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email:         internalEmail,
    password:      randomPass,
    email_confirm: true,
    phone:         phoneE164,
    phone_confirm: true,
  });

  if (createErr || !newUser.user) {
    if (createErr?.message?.toLowerCase().includes('already')) {
      return NextResponse.json({ error: 'already_registered' }, { status: 409 });
    }
    console.error('[register]', createErr?.message);
    return NextResponse.json({ error: createErr?.message ?? 'create_failed' }, { status: 400 });
  }

  // ── Crear perfil ─────────────────────────────────────────────────────────────
  const { error: profileErr } = await admin.from('profiles').insert({
    id:         newUser.user.id,
    name:       name.trim(),
    email:      internalEmail,
    phone:      phoneE164,
    role:       'user',
    group_name: group_name ?? phoneCheck.group_name ?? null,
    city:       phoneCheck.city ?? null,
    premium:    phoneCheck.premium ?? false,
  });

  if (profileErr) {
    await admin.auth.admin.deleteUser(newUser.user.id);
    console.error('[register] profile insert:', profileErr.message);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  // ── Generar token de sesión para auto-login ──────────────────────────────────
  const session = await createSessionTokenForEmail(internalEmail);
  if ('error' in session) {
    return NextResponse.json({ error: 'session_error' }, { status: 500 });
  }

  return NextResponse.json({ token_hash: session.token_hash });
}
