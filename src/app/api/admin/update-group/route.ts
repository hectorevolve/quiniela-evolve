import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server-session';
/**
 * POST /api/admin/update-group
 * Updates a group's name, color and logo_url using the service-role client (bypasses RLS).
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/server-session';

export async function POST(req: NextRequest) {
  const _authErr = await requireAdmin(req); if (_authErr) return _authErr;
  const admin = getAdminClient();
  const body = await req.json() as {
    id: number;
    name: string;
    color: string;
    logo_url?: string | null;
    old_name: string;
  };

  const { id, name, color, logo_url, old_name } = body;
  if (!id || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  // Update group name in profiles and allowed_phones if name changed
  if (old_name && old_name !== name) {
    await admin.from('profiles').update({ group_name: name }).eq('group_name', old_name);
    await admin.from('allowed_phones').update({ group_name: name }).eq('group_name', old_name);
  }

  const patch: Record<string, unknown> = { name, color };
  if (logo_url !== undefined) patch.logo_url = logo_url;

  const { error } = await admin.from('groups').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
