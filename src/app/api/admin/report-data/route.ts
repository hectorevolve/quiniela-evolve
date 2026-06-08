/**
 * GET /api/admin/report-data
 *
 * Returns raw timestamps needed to compute admin snapshots client-side:
 *  - profiles: created_at, survey_completed_at
 *  - predictions: user_id, updated_at
 *
 * Admin-only endpoint (requires Bearer token with admin/superadmin role).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminClient } from '@/lib/server-session';

export async function GET(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return authErr;

  const admin = getAdminClient();
  const PAGE = 1000;

  // ── Profiles ──────────────────────────────────────────────────────────────
  const allProfiles: { created_at: string; survey_completed_at: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from('profiles')
      .select('created_at, survey_completed_at')
      .order('created_at')
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('[report-data] profiles error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    allProfiles.push(...(data as { created_at: string; survey_completed_at: string | null }[]));
    if (data.length < PAGE) break;
  }

  // ── Predictions ──────────────────────────────────────────────────────────
  const allPredictions: { user_id: string; updated_at: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from('predictions')
      .select('user_id, updated_at')
      .order('updated_at')
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('[report-data] predictions error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    allPredictions.push(...(data as { user_id: string; updated_at: string }[]));
    if (data.length < PAGE) break;
  }

  return NextResponse.json({ profiles: allProfiles, predictions: allPredictions });
}
