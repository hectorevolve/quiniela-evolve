import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/server-session';

export type GroupConfig = { name: string; color: string };

/** Public endpoint — returns the list of groups from the `groups` table.
 *  Falls back to an empty array (caller should use a hardcoded default). */
export async function GET() {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('groups')
      .select('name, color')
      .order('name');

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    // Return empty so the client uses its hardcoded fallback
    return NextResponse.json([]);
  }
}
