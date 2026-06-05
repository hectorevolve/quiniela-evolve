import { NextRequest, NextResponse } from 'next/server';
import { to10Digits, checkPhoneAllowed } from '@/lib/server-session';

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

    console.log(`[emetrix-send] phone=${phone10} response=`, JSON.stringify(data));

    if (!result) {
      console.error(`[emetrix-send] empty response for ${phone10}`);
      return NextResponse.json({ error: 'emetrix_error' }, { status: 500 });
    }

    // verification_04 → celular ya registrado en emetrix
    // 1) Resetear sesión anterior  2) Volver a enviar OTP
    if (result.code === 'verification_04') {
      const resetUrl =
        `https://emetrix.com.mx/servicio_notificaciones.php` +
        `?tipo=sms_auth_reinicio` +
        `&destinatarios=${phone10}`;
      await fetch(resetUrl, { cache: 'no-store' });

      // Re-enviar OTP después del reset
      const resend = await fetch(url, { cache: 'no-store' });
      const resendData = (await resend.json()) as Array<{ success: boolean; code: string }>;
      const resendResult = resendData?.[0];

      return NextResponse.json({
        code: resendResult?.code ?? 'verification_01',
        registered: phoneCheck.hasAccount,
        name: phoneCheck.name,
        group_name: phoneCheck.group_name,
      });
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
