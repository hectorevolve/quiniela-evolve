import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server-session';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/admin/revalidate-rankings
 * Bust the /api/rankings Vercel CDN cache so users see fresh rankings immediately.
 * Called by the admin panel after saving match results manually.
 */
export async function POST(req: NextRequest) {
  const _authErr = await requireAdmin(req); if (_authErr) return _authErr;
  revalidatePath('/api/rankings');
  return NextResponse.json({ ok: true });
}
