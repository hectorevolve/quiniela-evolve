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

function toE164(phone: string): string | null {
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return `+52${d}`;
  if (d.length === 12 && d.startsWith('52')) return `+${d}`;
  if (d.length === 13 && d.startsWith('152')) return `+52${d.slice(3)}`;
  return null;
}

/** Bulk upsert phones into the allowed_phones whitelist */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await verifyAdmin(authHeader.slice(7)))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { rows } = (await req.json()) as {
    rows: Array<{ phone: string; name?: string; group_name?: string; city?: string; premium?: boolean }>;
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'no_rows' }, { status: 400 });
  }

  const admin = getAdminClient();
  let ok = 0;
  let failed = 0;

  // Process in batches of 50
  const batch: Array<{ phone: string; name: string | null; group_name: string | null; city: string | null; premium: boolean }> = [];

  for (const row of rows) {
    const e164 = toE164(row.phone);
    if (!e164) { failed++; continue; }
    batch.push({
      phone:      e164,
      name:       row.name ?? null,
      group_name: row.group_name ?? null,
      city:       row.city ?? null,
      premium:    row.premium ?? false,
    });
    ok++;
  }

  if (batch.length > 0) {
    const { error } = await admin
      .from('allowed_phones')
      .upsert(batch, { onConflict: 'phone' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok, failed });
}
