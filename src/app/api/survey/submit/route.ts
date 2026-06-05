import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/server-session';

export async function POST(req: NextRequest) {
  // ── Autenticación ─────────────────────────────────────────────────────────
  // El cliente envía el token como Bearer header
  const authHeader = req.headers.get('authorization');
  let userId: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    );
    const { data: { user } } = await anon.auth.getUser(token);
    userId = user?.id ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();

  // ── ¿Ya completó la encuesta? ────────────────────────────────────────────
  const { data: profile } = await admin
    .from('profiles').select('survey_completed').eq('id', userId).maybeSingle();
  if (profile?.survey_completed) {
    return NextResponse.json({ error: 'Encuesta ya completada' }, { status: 409 });
  }

  // ── Parsear body ──────────────────────────────────────────────────────────
  const body = await req.json() as {
    surveyId?: string; version?: string;
    startedAt?: string; completedAt?: string;
    durationSeconds?: number; answers?: Record<string, unknown>;
  };

  if (!body.surveyId || !body.answers || typeof body.durationSeconds !== 'number') {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;

  // ── 1. Insertar respuesta con user_id ────────────────────────────────────
  const { error: surveyErr } = await admin.from('survey_responses').insert({
    user_id:           userId,
    survey_id:         body.surveyId,
    survey_version:    body.version ?? '1.0.0',
    started_at:        body.startedAt ?? new Date().toISOString(),
    completed_at:      body.completedAt ?? new Date().toISOString(),
    duration_seconds:  body.durationSeconds,
    answers:           body.answers,
    client_user_agent: userAgent,
  });

  if (surveyErr && !surveyErr.message.includes('does not exist')) {
    console.error('[survey/submit] insert error:', surveyErr.message);
    return NextResponse.json({ error: surveyErr.message }, { status: 500 });
  }

  // ── 2. Marcar survey_completed en el perfil ───────────────────────────────
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ survey_completed: true, survey_completed_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileErr && !profileErr.message.includes('does not exist')) {
    console.error('[survey/submit] profile update error:', profileErr.message);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
