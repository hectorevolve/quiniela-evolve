import { NextRequest, NextResponse } from 'next/server';
import { to10Digits, checkPhoneAllowed, createSessionTokenForEmail, getAdminClient } from '@/lib/server-session';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    phone?: string;
    email?: string;
    password?: string;
    name?: string;
  };

  const { email, password, name } = body;
  const phone10 = to10Digits(body.phone ?? '');

  // ── Validaciones básicas ─────────────────────────────────────────────────────
  if (!phone10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  }
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 });
  }

  // ── Verificar whitelist / no duplicado ───────────────────────────────────────
  const phoneCheck = await checkPhoneAllowed(phone10);
  if (!phoneCheck.allowed) {
    return NextResponse.json({ error: 'not_in_whitelist' }, { status: 403 });
  }
  if (phoneCheck.hasAccount) {
    return NextResponse.json({ error: 'already_registered' }, { status: 409 });
  }

  const admin = getAdminClient();
  const phoneE164 = `+52${phone10}`;
  const cleanEmail = email.trim().toLowerCase();

  // ── Crear cuenta en Supabase auth ────────────────────────────────────────────
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,   // pre-confirmado, sin flujo de verificación por correo
    phone: phoneE164,
    phone_confirm: true,
  });

  if (createErr || !newUser.user) {
    // Email ya en uso
    if (createErr?.message?.toLowerCase().includes('already')) {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 });
    }
    console.error('[register]', createErr?.message);
    return NextResponse.json({ error: createErr?.message ?? 'create_failed' }, { status: 400 });
  }

  // ── Crear perfil ─────────────────────────────────────────────────────────────
  const { error: profileErr } = await admin.from('profiles').insert({
    id:         newUser.user.id,
    name:       (name?.trim() || phoneCheck.name) ?? cleanEmail.split('@')[0],
    email:      cleanEmail,
    phone:      phoneE164,
    role:       'user',
    group_name: phoneCheck.group_name ?? null,
    premium:    phoneCheck.premium ?? false,
  });

  if (profileErr) {
    // Roll back auth user
    await admin.auth.admin.deleteUser(newUser.user.id);
    console.error('[register] profile insert:', profileErr.message);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  // ── Generar token de sesión para auto-login ──────────────────────────────────
  const session = await createSessionTokenForEmail(cleanEmail);
  if ('error' in session) {
    return NextResponse.json({ error: 'session_error' }, { status: 500 });
  }

  return NextResponse.json({ token_hash: session.token_hash });
}
