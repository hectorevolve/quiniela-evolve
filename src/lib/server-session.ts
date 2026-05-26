/**
 * Server-only helpers — do NOT import in client components.
 * Used by API routes to create Supabase sessions after emetrix verification.
 */
import { createClient } from '@supabase/supabase-js';

export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Normalize any phone string to exactly 10 MX digits. Returns null if unrecognizable. */
export function to10Digits(phone: string): string | null {
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return d;
  if (d.length === 12 && d.startsWith('52')) return d.slice(2);
  if (d.length === 13 && d.startsWith('152')) return d.slice(3);
  return null;
}

/**
 * After emetrix confirms a phone number is verified, create a Supabase session
 * by generating an email magic-link token for the user.
 *
 * Flow:
 *  1. Look up user by phone in profiles table.
 *  2. If no email on the auth record yet, assign `{phone10}@auth.quinielaevolve.mx`
 *     and update both auth.users and profiles (one-time migration).
 *  3. Generate a magic-link → extract hashed_token.
 *  4. Client calls `supabase.auth.verifyOtp({ token_hash, type: 'email' })` to get session.
 */
export async function createSessionToken(phone10: string): Promise<
  { token_hash: string } | { error: 'not_registered' | 'session_error' }
> {
  const admin = getAdminClient();
  const phoneE164 = `+52${phone10}`;

  // Find profile by E.164 phone (normalised on creation)
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email')
    .eq('phone', phoneE164)
    .maybeSingle();

  if (!profile) return { error: 'not_registered' };

  // Fetch current email from auth record
  const { data: { user: authUser } } = await admin.auth.admin.getUserById(profile.id);
  let email = authUser?.email ?? null;

  // Assign auto-email if missing (one-time setup per user)
  if (!email) {
    email = `${phone10}@auth.quinielaevolve.mx`;
    await admin.auth.admin.updateUserById(profile.id, {
      email,
      email_confirm: true,
    });
    await admin.from('profiles').update({ email }).eq('id', profile.id);
  }

  // Generate magic link — server uses the hashed_token; no email is actually sent
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://quinielaevolve.vercel.app' },
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error('[server-session] generateLink error:', linkErr?.message);
    return { error: 'session_error' };
  }

  return { token_hash: linkData.properties.hashed_token };
}
