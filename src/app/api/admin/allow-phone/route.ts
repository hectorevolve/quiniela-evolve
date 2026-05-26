import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

/** Add or update a single phone in the allowed_phones whitelist */
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
  const admin = getAdminClient();

  const { error } = await admin.from('allowed_phones').upsert(
    { phone: phoneE164, name: name ?? null, group_name: group_name ?? null, premium },
    { onConflict: 'phone' },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ phone: phoneE164 });
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
