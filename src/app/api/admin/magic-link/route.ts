import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { to10Digits } from '@/lib/server-session';
import { createHmac } from 'crypto';

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

function sign(phone10: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback-secret';
  return createHmac('sha256', secret).update(phone10).digest('hex');
}

/**
 * Generate a permanent (non-expiring) login link for a user.
 * The link is signed with HMAC so it can't be forged.
 * Each time the user opens it, a fresh Supabase session is generated server-side.
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

  const sig = sign(phone10);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://quinielaevolve.vercel.app';
  const link = `${appUrl}/api/auth/admin-access?phone=${phone10}&sig=${sig}`;

  return NextResponse.json({ link });
}
