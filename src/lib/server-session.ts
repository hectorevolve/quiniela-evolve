/**
 * Server-only helpers — do NOT import in client components.
 * Used by API routes to verify whitelists and create Supabase sessions.
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

export interface PhoneCheck {
  /** Phone is allowed to access (in whitelist OR already registered) */
  allowed: boolean;
  /** Phone is in the allowed_phones whitelist */
  inWhitelist: boolean;
  /** Phone already has a registered Supabase account (profiles row) */
  hasAccount: boolean;
  /** Name from whitelist or profile */
  name?: string;
  group_name?: string;
  premium?: boolean;
}

/**
 * Check if a phone is authorized:
 *  - Looks in `allowed_phones` (whitelist, pre-loaded by admin)
 *  - Looks in `profiles` (already registered)
 * Returns combined info for downstream use.
 */
export async function checkPhoneAllowed(phone10: string): Promise<PhoneCheck> {
  const admin = getAdminClient();
  const phoneE164 = `+52${phone10}`;

  const [{ data: wl }, { data: profile }] = await Promise.all([
    admin
      .from('allowed_phones')
      .select('name, group_name, premium')
      .eq('phone', phoneE164)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('id, name, group_name, premium')
      .eq('phone', phoneE164)
      .maybeSingle(),
  ]);

  return {
    allowed:     !!(wl || profile),
    inWhitelist: !!wl,
    hasAccount:  !!profile,
    name:        profile?.name ?? wl?.name ?? undefined,
    group_name:  profile?.group_name ?? wl?.group_name ?? undefined,
    premium:     profile?.premium ?? wl?.premium ?? false,
  };
}

/**
 * After verifying a phone, create a Supabase session via magic-link token.
 * The user's email (real or auto-generated internal) is used to generate the token.
 * Client then calls `supabase.auth.verifyOtp({ token_hash, type: 'email' })`.
 */
export async function createSessionToken(phone10: string): Promise<
  { token_hash: string } | { error: 'not_registered' | 'session_error' }
> {
  const admin = getAdminClient();
  const phoneE164 = `+52${phone10}`;

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email')
    .eq('phone', phoneE164)
    .maybeSingle();

  if (!profile) return { error: 'not_registered' };

  const { data: { user: authUser } } = await admin.auth.admin.getUserById(profile.id);
  let email = authUser?.email ?? null;

  // Assign internal email if missing (one-time per user)
  if (!email) {
    email = `${phone10}@auth.quinielaevolve.mx`;
    await admin.auth.admin.updateUserById(profile.id, { email, email_confirm: true });
    await admin.from('profiles').update({ email }).eq('id', profile.id);
  }

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

/**
 * Create a session token directly from an email (used right after self-registration
 * so we don't need to re-lookup by phone).
 */
export async function createSessionTokenForEmail(email: string): Promise<
  { token_hash: string } | { error: 'session_error' }
> {
  const admin = getAdminClient();

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
