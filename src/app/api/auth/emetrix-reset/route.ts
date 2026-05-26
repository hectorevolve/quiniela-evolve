import { NextRequest, NextResponse } from 'next/server';
import { to10Digits } from '@/lib/server-session';

export async function POST(req: NextRequest) {
  const { phone } = (await req.json()) as { phone?: string };
  const phone10 = to10Digits(phone ?? '');

  if (!phone10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  }

  try {
    const url =
      `https://emetrix.com.mx/servicio_notificaciones.php` +
      `?tipo=sms_auth_reinicio` +
      `&destinatarios=${phone10}`;

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

    return NextResponse.json({ code: result.code, success: result.success });
  } catch (err) {
    console.error('[emetrix-reset]', err);
    return NextResponse.json({ error: 'connection_error' }, { status: 500 });
  }
}
