import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Adaptador de sessionStorage: la sesión dura mientras el navegador está abierto
// pero se borra al cerrar la pestaña/ventana → OTP requerido en cada sesión nueva
const sessionStorageAdapter = typeof window !== 'undefined' ? {
  getItem:    (key: string) => window.sessionStorage.getItem(key),
  setItem:    (key: string, value: string) => window.sessionStorage.setItem(key, value),
  removeItem: (key: string) => window.sessionStorage.removeItem(key),
} : undefined;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:  true,
    autoRefreshToken: true,
    storage: sessionStorageAdapter,
  },
});

export interface AppUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'user' | 'admin';
  group_name: string | null;
  premium: boolean;
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
