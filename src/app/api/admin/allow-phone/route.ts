import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function verifyAdmin(token: string): Promise<boolean> {
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return false;
  const admin = getAdminClient();
  const { data } = await admin.from('profiles').select('role').eq('id', user.id).single();
  return data?.role === 'admin';
}

const SECRET = process.env.PASSWORD_SALT ?? 'quiniela-evolve-2026';
const CHARS  = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generatePassword(phone10: string): string {
  const hash = crypto.createHmac('sha256', SECRET).update(phone10).digest('hex');
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += CHARS[parseInt(hash.slice(i * 2, i * 2 + 2), 16) % CHARS.length];
  }
  return result;
}

/** Add or update a single phone in the allowed_phones whitelist, and auto-create account */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await verifyAdmin(authHeader.slice(7)))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { phone, name, group_name, premium = false } = (await req.json()) as {
    phone: string; name?: string; group_name?: string; premium?: boolean;
  };

  const digits = phone.replace(/\D/g, '');
  const phone10 =
    digits.length === 10 ? digits :
    digits.length === 12 && digits.startsWith('52') ? digits.slice(2) :
    digits.length === 13 && digits.startsWith('152') ? digits.slice(3) :
    digits.slice(-10);

  if (phone10.length !== 10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  }

  const phoneE164 = `+52${phone10}`;
  const email     = `${phone10}@auth.quinielaevolve.mx`;
  const password  = generatePassword(phone10);
  const admin     = getAdminClient();

  // 1. Upsert into allowed_phones
  const { error: upsertErr } = await admin.from('allowed_phones').upsert(
    { phone: phoneE164, name: name ?? null, group_name: group_name ?? null, premium },
    { onConflict: 'phone' },
  );
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  // 2. Check if account already exists
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing?.id) {
    // Already registered — just sync the password silently
    await admin.auth.admin.updateUserById(existing.id, { password });
    return NextResponse.json({ phone: phoneE164, password, created: false });
  }

  // 3. Create Supabase auth user
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    phone: phone10,
    phone_confirm: true,
    password,
  });

  if (createErr || !newUser?.user) {
    console.error('[allow-phone] createUser error:', createErr?.message);
    // Non-fatal: whitelist was saved, account creation failed
    return NextResponse.json({ phone: phoneE164, password: null, accountError: createErr?.message });
  }

  // 4. Create profile
  const { error: profileErr } = await admin.from('profiles').insert({
    id:         newUser.user.id,
    name:       name ?? 'Usuario',
    email,
    phone:      phone10,
    group_name: group_name ?? null,
    premium:    premium ?? false,
    role:       'user',
    survey_completed: false,
  });

  if (profileErr) {
    console.error('[allow-phone] profile insert error:', profileErr.message);
  }

  return NextResponse.json({ phone: phoneE164, password, created: true });
}

/** Remove a phone from the whitelist */
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await verifyAdmin(authHeader.slice(7)))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { phone } = (await req.json()) as { phone: string };
  const admin = getAdminClient();
  const { error } = await admin.from('allowed_phones').delete().eq('phone', phone);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
