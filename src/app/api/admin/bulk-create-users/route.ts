import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAdminClient } from '@/lib/server-session';
import { createClient } from '@supabase/supabase-js';

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

function to10Digits(phone: string): string | null {
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return d;
  if (d.length === 12 && d.startsWith('52')) return d.slice(2);
  if (d.length === 13 && d.startsWith('152')) return d.slice(3);
  return null;
}

/**
 * Bulk-create Supabase users from imported phone list.
 * Skips phones that already have a profile.
 * Body: { rows: Array<{ phone, name, group_name, city, premium, phone_type }> }
 * Returns: { created, skipped, failed, errors }
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await verifyAdmin(authHeader.slice(7)))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { rows } = (await req.json()) as {
    rows: Array<{
      phone:      string;
      name?:      string | null;
      group_name?: string | null;
      city?:      string | null;
      premium?:   boolean;
      phone_type?: string | null;
    }>;
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'no_rows' }, { status: 400 });
  }

  const admin = getAdminClient();
  let created = 0;
  let skipped = 0;
  let failed  = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const phone10 = to10Digits(row.phone);
    if (!phone10) { failed++; continue; }

    const phoneE164    = `+52${phone10}`;
    const internalEmail = `${phone10}@auth.quinielaevolve.mx`;

    // Skip if profile already exists
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('phone', phoneE164)
      .maybeSingle();

    if (existing) { skipped++; continue; }

    // Create auth user
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email:         internalEmail,
      password:      randomUUID(),
      email_confirm: true,
      phone:         phoneE164,
      phone_confirm: true,
    });

    if (createErr || !newUser.user) {
      // Already exists in auth but not profiles — unlikely but handle it
      if (createErr?.message?.toLowerCase().includes('already')) {
        skipped++;
      } else {
        failed++;
        errors.push(`${phoneE164}: ${createErr?.message ?? 'create_failed'}`);
      }
      continue;
    }

    // Insert profile
    const { error: profileErr } = await admin.from('profiles').insert({
      id:         newUser.user.id,
      name:       row.name?.trim() || `Usuario ${phone10}`,
      email:      internalEmail,
      phone:      phoneE164,
      role:       'user',
      group_name: row.group_name ?? null,
      city:       row.city       ?? null,
      premium:    row.premium    ?? false,
    });

    if (profileErr) {
      await admin.auth.admin.deleteUser(newUser.user.id);
      failed++;
      errors.push(`${phoneE164}: ${profileErr.message}`);
      continue;
    }

    created++;
  }

  return NextResponse.json({ created, skipped, failed, errors });
}
