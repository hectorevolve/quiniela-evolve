/**
 * GET /api/demo
 *
 * Public demo link — no SMS required.
 * Finds or creates a demo Supabase account, marks survey as completed,
 * generates a fresh session token, and redirects to the app.
 *
 * Share URL: https://quiniela-evolve.vercel.app/api/demo
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/server-session';

const DEMO_EMAIL    = 'demo@auth.quinielaevolve.mx';
const DEMO_NAME     = 'Demo — Torneo 2026';
const DEMO_GROUP    = 'Evolve';
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL ?? 'https://quiniela-evolve.vercel.app';

export async function GET(_req: NextRequest) {
  const admin = getAdminClient();

  // ── 1. Find or create the demo Supabase auth user ────────────────────────
  let authUserId: string;

  const { data: existing } = await admin.auth.admin.listUsers();
  const existingUser = existing?.users?.find(u => u.email === DEMO_EMAIL);

  if (existingUser) {
    authUserId = existingUser.id;
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email:          DEMO_EMAIL,
      email_confirm:  true,
      user_metadata:  { name: DEMO_NAME },
    });
    if (createErr || !created?.user) {
      console.error('[demo] createUser error:', createErr?.message);
      return NextResponse.json({ error: 'No se pudo crear la cuenta demo' }, { status: 500 });
    }
    authUserId = created.user.id;
  }

  // ── 2. Ensure profile row exists with survey_completed = true ─────────────
  const { data: profile } = await admin
    .from('profiles')
    .select('id, survey_completed')
    .eq('id', authUserId)
    .maybeSingle();

  if (!profile) {
    await admin.from('profiles').insert({
      id:                 authUserId,
      email:              DEMO_EMAIL,
      name:               DEMO_NAME,
      role:               'user',
      group_name:         DEMO_GROUP,
      survey_completed:   true,
      survey_completed_at: new Date().toISOString(),
    });
  } else if (!profile.survey_completed) {
    await admin.from('profiles').update({
      survey_completed:    true,
      survey_completed_at: new Date().toISOString(),
    }).eq('id', authUserId);
  }

  // ── 3. Generate a fresh magic-link token ──────────────────────────────────
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type:    'magiclink',
    email:   DEMO_EMAIL,
    options: { redirectTo: APP_URL },
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error('[demo] generateLink error:', linkErr?.message);
    return NextResponse.json({ error: 'No se pudo generar la sesión demo' }, { status: 500 });
  }

  // ── 4. Redirect to app with token ─────────────────────────────────────────
  return NextResponse.redirect(`${APP_URL}/?admin_token=${linkData.properties.hashed_token}`);
}
