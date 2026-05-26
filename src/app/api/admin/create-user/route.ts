import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side admin client using the service_role (secret) key
function getAdminClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  const supabaseAdmin = getAdminClient();

  // Validate that the calling user is an admin
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user: caller }, error: userErr } = await anonClient.auth.getUser(token);
  if (userErr || !caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check role
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse body
  const body = await req.json() as {
    phone: string;
    name: string;
    group_name?: string;
    premium?: boolean;
    role?: string;
  };

  const { phone, name, group_name, premium = false, role = 'user' } = body;
  if (!phone || !name) {
    return NextResponse.json({ error: 'phone and name are required' }, { status: 400 });
  }

  // Create auth user with phone (pre-confirmed so they can log in immediately)
  const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    phone,
    phone_confirm: true,
  });
  if (createErr || !newUser.user) {
    return NextResponse.json({ error: createErr?.message ?? 'Failed to create user' }, { status: 400 });
  }

  // Insert profile row
  const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
    id:         newUser.user.id,
    name,
    email:      null,
    phone,
    role,
    group_name: group_name ?? null,
    premium,
  });
  if (profileErr) {
    // Roll back auth user if profile insert fails
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ userId: newUser.user.id });
}
