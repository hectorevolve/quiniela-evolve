import { NextRequest, NextResponse } from 'next/server';
import { to10Digits, checkPhoneAllowed } from '@/lib/server-session';

/** Fast whitelist check — does NOT send an OTP. Used by LoginScreen to decide the flow. */
export async function POST(req: NextRequest) {
  const { phone } = (await req.json()) as { phone?: string };
  const phone10 = to10Digits(phone ?? '');

  if (!phone10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  }

  const check = await checkPhoneAllowed(phone10);

  if (!check.allowed) {
    return NextResponse.json({ error: 'not_in_whitelist' }, { status: 403 });
  }

  return NextResponse.json({
    hasAccount:  check.hasAccount,
    name:        check.name ?? null,
    group_name:  check.group_name ?? null,
  });
}
