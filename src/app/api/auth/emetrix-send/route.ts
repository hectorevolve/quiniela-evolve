import { NextRequest, NextResponse } from 'next/server';
import { to10Digits, checkPhoneAllowed, createSessionToken } from '@/lib/server-session';

const NOMBRE_CLIENTE = process.env.EMETRIX_NOMBRE_CLIENTE ?? 'Quiniela Evolve';

export async function POST(req: NextRequest) {
  const { phone } = (await req.json()) as { phone?: string };
  const phone10 = to10Digits(phone ?? '');

  if (!phone10) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  }

  // ── 1. Whitelist check (before calling emetrix) ──────────────────────────────
  const phoneCheck = await checkPhoneAllowed(phone10);
  if (!phoneCheck.allowed) {
    return NextResponse.json({ error: 'not_in_whitelist' }, { status: 403 });
  }

  // ── 2. Call emetrix ──────────────────────────────────────────────────────────
  try {
    const url =
      `https://emetrix.com.mx/servicio_notificaciones.php` +
      `?tipo=sms_auth_registro` +
      `&destinatarios=${phone10}` +
      `&nombreCliente=${encodeURIComponent(NOMBRE_CLIENTE)}`;

    const res = await fetch(url, { cache: 'no-store' });
    const data = (await res.json()) as Array<{ success: boolean; code: string }>;
    const result = data?.[0];

    if (!result) {
      return NextResponse.json({ error: 'emetrix_error' }, { status: 500 });
    }

    // verification_04 → celular ya registrado en emetrix
    if (result.code === 'verification_04') {
      if (phoneCheck.hasAccount) {
        // Ya tiene cuenta → generar sesión y hacer login directo
        const session = await createSessionToken(phone10);
        if ('error' in session) {
          return NextResponse.json({ error: session.error }, { status: 500 });
        }
        return NextResponse.json({
          code: 'verification_04',
          registered: true,
          token_hash: session.token_hash,
        });
      } else {
        // En whitelist pero sin cuenta → mostrar formulario de registro
        return NextResponse.json({
          code: 'verification_04',
          registered: false,
          name: phoneCheck.name,
          group_name: phoneCheck.group_name,
        });
      }
    }

    // verification_01 → código enviado al celular
    return NextResponse.json({
      code: 'verification_01',
      registered: phoneCheck.hasAccount,
      name: phoneCheck.name,
      group_name: phoneCheck.group_name,
    });
  } catch (err) {
    console.error('[emetrix-send]', err);
    return NextResponse.json({ error: 'connection_error' }, { status: 500 });
  }
}
