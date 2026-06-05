/**
 * Permanent admin-generated login link.
 *
 * URL: /api/auth/admin-access?phone=PHONE10&sig=HMAC_HEX
 *
 * The phone is signed with SUPABASE_SERVICE_ROLE_KEY so the URL can't be forged.
 * Each time it's opened, a fresh Supabase OTP token is generated — no expiry on
 * the link itself.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createSessionToken } from '@/lib/server-session';

function sign(phone10: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback-secret';
  return createHmac('sha256', secret).update(phone10).digest('hex');
}

/** Generate a signed permanent link for a phone number */
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone');
  const sig   = req.nextUrl.searchParams.get('sig');

  if (!phone || !sig) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 });
  }

  // Verify signature
  const expected = sign(phone);
  if (sig !== expected) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 403 });
  }

  // Generate fresh Supabase session token
  const result = await createSessionToken(phone);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Redirect to app with the fresh token
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://quinielaevolve.vercel.app';
  const dest = `${appUrl}/?admin_token=${result.token_hash}`;
  return NextResponse.redirect(dest);
}
