import { NextRequest, NextResponse } from 'next/server';
import { to10Digits, createSessionToken } from '@/lib/server-session';

const NOMBRE_CLIENTE = process.env.EMETRIX_NOMBRE_CLIENTE ?? 'Quiniela Evolve';

export async function POST(req: NextRequest) {
  const { phone } = (await req.json()) as { phone?: string };
  const phone10 = to10Digits(phone ?? '');

  if (!phone10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  }

  try {
    const url =
      `https://emetrix.com.mx/servicio_notificaciones.php` +
      `?tipo=sms_auth_registro` +
      `&destinatarios=${phone10}` +
      `&nombreCliente=${encodeURIComponent(NOMBRE_CLIENTE)}`;

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

    // verification_04 → phone already registered with emetrix → auto-login
    if (result.code === 'verification_04') {
      const session = await createSessionToken(phone10);
      if ('error' in session) {
        const status = session.error === 'not_registered' ? 403 : 500;
        return NextResponse.json({ error: session.error }, { status });
      }
      return NextResponse.json({ code: 'verification_04', token_hash: session.token_hash });
    }

    // verification_01 → code sent to phone
    return NextResponse.json({ code: result.code });
  } catch (err) {
    console.error('[emetrix-send]', err);
    return NextResponse.json({ error: 'connection_error' }, { status: 500 });
  }
}
