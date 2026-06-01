import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/admin/revalidate-rankings
 * Bust the /api/rankings Vercel CDN cache so users see fresh rankings immediately.
 * Called by the admin panel after saving match results manually.
 */
export async function POST() {
  revalidatePath('/api/rankings');
  return NextResponse.json({ ok: true });
}
