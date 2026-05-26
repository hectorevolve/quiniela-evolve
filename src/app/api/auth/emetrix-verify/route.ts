import { NextRequest, NextResponse } from 'next/server';
import { to10Digits, checkPhoneAllowed, createSessionToken } from '@/lib/server-session';

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
    const data = (await res.json()) as Array<{ success: boolean; code: string }>;
    const result = data?.[0];

    if (!result) {
      return NextResponse.json({ error: 'emetrix_error' }, { status: 500 });
    }

    if (result.code === 'validation_01') {
      // Código correcto — verificar si ya tiene cuenta
      const phoneCheck = await checkPhoneAllowed(phone10);

      if (phoneCheck.hasAccount) {
        // Ya registrado → crear sesión y hacer login directo
        const session = await createSessionToken(phone10);
        if ('error' in session) {
          return NextResponse.json({ error: session.error }, { status: 500 });
        }
        return NextResponse.json({
          code: 'validation_01',
          registered: true,
          token_hash: session.token_hash,
        });
      } else {
        // Celular verificado pero sin cuenta → mostrar formulario de registro
        return NextResponse.json({
          code: 'validation_01',
          registered: false,
          name: phoneCheck.name,
          group_name: phoneCheck.group_name,
        });
      }
    }

    // validation_05 → código incorrecto
    // validation_04 → número de celular alterado
    return NextResponse.json({ code: result.code });
  } catch (err) {
    console.error('[emetrix-verify]', err);
    return NextResponse.json({ error: 'connection_error' }, { status: 500 });
  }
}
