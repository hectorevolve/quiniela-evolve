import { createClient } from '@supabase/supabase-js';

// Fallbacks de respaldo SOLO para que `next build` no truene cuando faltan las
// env vars (p. ej. en preview deploys de Vercel sin variables configuradas).
// En producción las variables están definidas, así que se usan las reales.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface AppUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'user' | 'admin';
  group_name: string | null;
  premium: boolean;
  used_powers: string[];   // e.g. ['double', 'late']
}

/**
 * Normalize a Mexican phone number to E.164 format (+52XXXXXXXXXX).
 * Accepts: 10 digits, 12 digits starting with 52, or already formatted.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+52${digits}`;
  if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith('152')) return `+52${digits.slice(3)}`;
  if (raw.startsWith('+')) return raw.trim();
  return `+${digits}`;
}

/** Derive 2-letter avatar initials from a display name. */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}
