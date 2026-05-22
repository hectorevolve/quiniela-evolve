import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMINS = [
  { email: 'hectorjulianprz@outlook.com', name: 'Héctor Pérez', group_name: 'Evolve' },
  { email: 'hector@evolve.com.mx',        name: 'Héctor Evolve', group_name: 'Evolve' },
];

const PASSWORD = 'evo2026';

async function createAdmin({ email, name, group_name }: typeof ADMINS[number]) {
  // Create auth user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) {
    console.error(`✗ ${email}: ${error.message}`);
    return;
  }
  const uid = data.user.id;

  // Upsert profile with role=admin
  const { error: pErr } = await supabase.from('profiles').upsert({
    id: uid, name, email, role: 'admin', group_name, premium: true,
  }, { onConflict: 'id' });

  if (pErr) {
    console.error(`✗ profile for ${email}: ${pErr.message}`);
  } else {
    console.log(`✓ Admin created: ${email}  (id: ${uid})`);
  }
}

(async () => {
  for (const admin of ADMINS) await createAdmin(admin);
})();
