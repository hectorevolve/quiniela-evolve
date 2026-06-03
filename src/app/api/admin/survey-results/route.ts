import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, requireAdmin } from '@/lib/server-session';

export async function GET(req: NextRequest) {
  const authErr = await requireAdmin(req); if (authErr) return authErr;
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('survey_responses')
    .select('answers, completed_at, duration_seconds')
    .order('completed_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}
