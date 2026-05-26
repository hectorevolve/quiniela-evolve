import { NextRequest, NextResponse } from 'next/server';
import { to10Digits, createSessionToken } from '@/lib/server-session';

export async function POST(req: NextRequest) {
  const { phone, code } = (await req.json()) as { phone?: string; code?: string };
  const phone10 = to10Digits(phone ?? '');

  if (!phone10 || !code?.trim()) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  try {
    const url =
      `https://emetrix.com.mx/servicio_notificaciones.php` +
      `?tipo=sms_auth_validar` +
      `&destinatarios=${phone10}` +
      `&code_auth=${encodeURIComponent(code.trim())}`;

    const res = await fetch(url, { cache: 'no-store' });
    const data = (await res.json()) as Array<{
      success: boolean;
      code: string;
      message: string;
    }>;
    const result = data?.[0];

    if (!result) {
      return NextResponse.json({ error: 'emetrix_error' }, { status: 500 });
    }

    if (result.code === 'validation_01') {
      // Correct code → create Supabase session
      const session = await createSessionToken(phone10);
      if ('error' in session) {
        return NextResponse.json({ error: session.error }, { status: 500 });
      }
      return NextResponse.json({ code: 'validation_01', token_hash: session.token_hash });
    }

    // validation_05 → wrong code  |  validation_04 → phone mismatch
    return NextResponse.json({ code: result.code });
  } catch (err) {
    console.error('[emetrix-verify]', err);
    return NextResponse.json({ error: 'connection_error' }, { status: 500 });
  }
}
