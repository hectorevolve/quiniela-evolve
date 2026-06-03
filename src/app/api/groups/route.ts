import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/server-session';

export type GroupConfig = { name: string; color: string; logo_url?: string | null; powers_enabled?: boolean };

// powers_enabled puede cambiar en cualquier momento desde el admin, no cachear.
export const revalidate = 0;

/** Public endpoint — returns the list of groups from the `groups` table.
 *  Falls back to an empty array (caller should use a hardcoded default). */
export async function GET() {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('groups')
      .select('name, color, logo_url, powers_enabled')
      .order('name');

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    // Return empty so the client uses its hardcoded fallback
    return NextResponse.json([]);
  }
}
