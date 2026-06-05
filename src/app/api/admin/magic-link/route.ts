import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { to10Digits, createSessionToken } from '@/lib/server-session';

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
  return data?.role === 'admin' || data?.role === 'superadmin';
}

/**
 * Generate a one-time login token for a user (by phone or user id).
 * Admin only. Used when SMS delivery fails.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await verifyAdmin(authHeader.slice(7)))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { phone } = (await req.json()) as { phone?: string };
  const phone10 = to10Digits(phone ?? '');
  if (!phone10) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });

  const result = await createSessionToken(phone10);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ token_hash: result.token_hash });
}
