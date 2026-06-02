import { supabase, type AppUser } from './supabase';
import { calcPoints } from './points';

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<AppUser | null> {
  // Columnas base — siempre existen
  const BASE = 'id, name, email, phone, role, group_name, premium, used_powers';
  // Columnas opcionales que se agregan con migraciones — resiliente si no existen aún
  const EXTENDED = `${BASE}, late_match_id, double_match_id, survey_completed`;

  const { data, error } = await supabase
    .from('profiles').select(EXTENDED).eq('id', userId).single();

  if (!error) {
    return { ...data, used_powers: data.used_powers ?? [] } as AppUser;
  }

  // Alguna columna no existe todavía (migración pendiente) → reintentar con base
  if (error.message.includes('column') || error.message.includes('does not exist')) {
    console.warn('[db] getProfile: columna opcional faltante, reintentando con campos base:', error.message);
    const { data: base, error: baseErr } = await supabase
      .from('profiles').select(BASE).eq('id', userId).single();
    if (baseErr) { console.error('[db] getProfile base:', baseErr.message); return null; }
    return { ...base, used_powers: base.used_powers ?? [] } as AppUser;
  }

  console.error('[db] getProfile:', error.message);
  return null;
}

/**
 * Save a used power to the current user's profile in DB.
 * For the 'double' (×2) power, also records WHICH match it was used on
 * (`double_match_id`) so the ranking can double that match's points.
 */
export async function savePowerUsed(power: string, matchId?: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const userId = session.user.id;
  const { data } = await supabase.from('profiles').select('used_powers').eq('id', userId).single();
  const current: string[] = data?.used_powers ?? [];
  const nextPowers = current.includes(power) ? current : [...current, power];
  if ((power === 'double' || power === 'late') && matchId) {
    // Para ×2: no sobrescribir double_match_id si ya fue asignado (protege contra race condition)
    // Para late: guardar en qué partido se usó para restaurarlo al recargar la sesión
    const field = power === 'double' ? 'double_match_id' : 'late_match_id';
    const condition = power === 'double'
      ? supabase.from('profiles').update({ used_powers: nextPowers, [field]: matchId }).eq('id', userId).is('double_match_id', null)
      : supabase.from('profiles').update({ used_powers: nextPowers, [field]: matchId }).eq('id', userId);
    const { error } = await condition;
    if (error) {
      // Columna aún no existe (migración pendiente): guarda solo el poder
      await supabase.from('profiles').update({ used_powers: nextPowers }).eq('id', userId);
    }
  } else {
    await supabase.from('profiles').update({ used_powers: nextPowers }).eq('id', userId);
  }
}

// ─── Predictions ──────────────────────────────────────────────────────────────

export async function loadAllPredictions(
  userId: string,
): Promise<Record<string, { home: number; away: number }>> {
  const { data, error } = await supabase
    .from('predictions')
    .select('match_id, home_score, away_score')
    .eq('user_id', userId);
  if (error) { console.error('[db] loadAllPredictions:', error.message); return {}; }
  const out: Record<string, { home: number; away: number }> = {};
  for (const row of data ?? []) {
    out[row.match_id] = { home: row.home_score, away: row.away_score };
  }
  return out;
}

export async function upsertPrediction(
  userId: string,
  matchId: string,
  home: number,
  away: number,
): Promise<void> {
  const { error } = await supabase.from('predictions').upsert(
    { user_id: userId, match_id: matchId, home_score: home, away_score: away,
      updated_at: new Date().toISOString() },
    { onConflict: 'user_id,match_id' },
  );
  if (error) console.error('[db] upsertPrediction:', error.message);
}

// ─── Match schedule (UTC dates from API) ─────────────────────────────────────

/**
 * Returns a map of matchId → ISO UTC kickoff date (e.g. "2026-06-11T17:00:00Z").
 * Only includes rows where match_date looks like an ISO date (synced from API).
 * Falls back to hardcoded data.ts dates when a match hasn't been synced yet.
 */
export async function getMatchDates(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('matches')
    .select('id, match_date');
  if (error) { console.error('[db] getMatchDates:', error.message); return {}; }
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    // Only use the date if it looks like an ISO date (from API), not the Spanish format
    if (row.match_date && /^\d{4}-\d{2}-\d{2}T/.test(row.match_date)) {
      out[row.id] = row.match_date;
    }
  }
  return out;
}

// ─── Match results ────────────────────────────────────────────────────────────

export async function getMatchResults(): Promise<Record<string, [number, number]>> {
  const { data, error } = await supabase
    .from('matches')
    .select('id, result_home, result_away')
    .not('result_home', 'is', null);
  if (error) { console.error('[db] getMatchResults:', error.message); return {}; }
  const out: Record<string, [number, number]> = {};
  for (const m of data ?? []) out[m.id] = [m.result_home, m.result_away];
  return out;
}

// ─── Match CRUD ───────────────────────────────────────────────────────────────

export interface DBMatch {
  id: string;
  group_name: string;
  home_code: string; home_name: string;
  away_code: string; away_name: string;
  match_date: string;
  stadium: string | null;
  result_home: number | null;
  result_away: number | null;
  sort_order: number;
}

export async function getMatches(): Promise<DBMatch[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('id,group_name,home_code,home_name,away_code,away_name,match_date,stadium,result_home,result_away,sort_order')
    .order('sort_order', { ascending: true });
  if (error) { console.error('[db] getMatches:', error.message); return []; }
  return (data ?? []) as DBMatch[];
}

export async function updateMatch(
  id: string,
  fields: Partial<Omit<DBMatch, 'id' | 'result_home' | 'result_away'>>,
): Promise<void> {
  const { error } = await supabase.from('matches').update(fields).eq('id', id);
  if (error) console.error('[db] updateMatch:', error.message);
}

export async function createMatch(fields: Omit<DBMatch, 'result_home' | 'result_away'>): Promise<void> {
  const { error } = await supabase.from('matches').insert({ ...fields, result_home: null, result_away: null });
  if (error) console.error('[db] createMatch:', error.message);
}

export async function deleteMatch(id: string): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) console.error('[db] deleteMatch:', error.message);
}

export async function saveMatchResult(
  matchId: string,
  home: number | null,
  away: number | null,
): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ result_home: home, result_away: away })
    .eq('id', matchId);
  if (error) console.error('[db] saveMatchResult:', error.message);
}

// ─── Rankings ─────────────────────────────────────────────────────────────────

export interface RankingEntry {
  userId: string;
  name: string;
  group_name: string | null;
  city: string | null;   // ciudad del participante (CDMX, MTY, GDL, etc.)
  points: number;
  matchPoints: number;   // prediction-only pts (no bonus_awards)
  bonusPoints: number;   // bonus_awards pts only
  exactScores?: number;
  pos: number;
  used_powers: string[];
}

export async function getRankings(): Promise<RankingEntry[]> {
  // Use server-side route with service-role client so RLS on bonus_awards
  // (and all tables) is bypassed — ensures correct points for all users.
  const res = await fetch('/api/rankings', { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json() as Promise<RankingEntry[]>;
}

// ─── Bonus picks ─────────────────────────────────────────────────────────────

export async function loadBonusPicks(userId: string) {
  const { data, error } = await supabase
    .from('bonus_picks')
    .select('champ_code, runner_up_code, third_code, top_scorer')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') console.error('[db] loadBonusPicks:', error.message);
  return data ?? null;
}

// ─── Group settings (prizes) ──────────────────────────────────────────────────

/** Un tramo de premio: del lugar `from` al lugar `to` (inclusive) se gana `reward`.
 *  Para un solo lugar, from === to (ej. 1er lugar). */
export interface PrizeTier {
  from: number;
  to: number;
  reward: string;
}

export interface GroupSettings {
  prize_1st: string;
  prize_2nd: string;
  prize_3rd: string;
  prize_tiers: PrizeTier[] | null;   // configuración flexible (rangos); si null/[] se usan los 3 campos legacy
  bonus_champ_type: string;  bonus_champ_value: string;
  bonus_runner_type: string; bonus_runner_value: string;
  bonus_third_type: string;  bonus_third_value: string;
  bonus_scorer_type: string; bonus_scorer_value: string;
}

export async function getGroupSettings(groupName: string): Promise<GroupSettings | null> {
  if (!groupName) return null;
  const BASE = 'prize_1st,prize_2nd,prize_3rd,bonus_champ_type,bonus_champ_value,bonus_runner_type,bonus_runner_value,bonus_third_type,bonus_third_value,bonus_scorer_type,bonus_scorer_value';
  // maybeSingle: 0 filas → null sin error (evita 406 en grupos sin settings).
  // Intenta incluir prize_tiers; si la columna aún no existe, reintenta sin ella.
  const withTiers = await supabase
    .from('group_settings').select(`${BASE},prize_tiers`).eq('group_name', groupName).maybeSingle();
  if (!withTiers.error) return (withTiers.data as GroupSettings | null) ?? null;

  const base = await supabase
    .from('group_settings').select(BASE).eq('group_name', groupName).maybeSingle();
  if (base.error || !base.data) return null;
  return { ...base.data, prize_tiers: null } as GroupSettings;
}

/** Normaliza la config de premios a una lista de tramos ordenada.
 *  Usa prize_tiers si existe; si no, construye tramos desde los 3 campos legacy. */
export function resolvePrizeTiers(settings: GroupSettings | null): PrizeTier[] {
  if (!settings) return [];
  const tiers = settings.prize_tiers;
  if (Array.isArray(tiers) && tiers.length > 0) {
    return tiers
      .filter(t => t && typeof t.from === 'number' && typeof t.to === 'number' && (t.reward ?? '').trim())
      .map(t => ({ from: Math.min(t.from, t.to), to: Math.max(t.from, t.to), reward: t.reward.trim() }))
      .sort((a, b) => a.from - b.from);
  }
  // Fallback legacy: 1er/2do/3er lugar
  const legacy: PrizeTier[] = [];
  if ((settings.prize_1st ?? '').trim()) legacy.push({ from: 1, to: 1, reward: settings.prize_1st.trim() });
  if ((settings.prize_2nd ?? '').trim()) legacy.push({ from: 2, to: 2, reward: settings.prize_2nd.trim() });
  if ((settings.prize_3rd ?? '').trim()) legacy.push({ from: 3, to: 3, reward: settings.prize_3rd.trim() });
  return legacy;
}

/** Etiqueta amigable para un tramo: "1er Lugar" o "Del 4° al 10° lugar". */
export function prizeTierLabel(t: PrizeTier): string {
  const ord = (n: number) => (n === 1 ? '1er' : n === 2 ? '2do' : n === 3 ? '3er' : `${n}°`);
  return t.from === t.to ? `${ord(t.from)} Lugar` : `Del ${t.from}° al ${t.to}° lugar`;
}

// ─── H2H ──────────────────────────────────────────────────────────────────────

export interface H2HRow {
  id: string;
  home_code: string; away_code: string;
  n: number;
  hw: number; d: number; aw: number;
  hg: number; ag: number;
  since: number | null;
  summary: string;
  past: Array<{ year: number; comp: string; h: string; hs: number; as: number; a: string }>;
  pred_home: number | null;
  pred_away: number | null;
}

export async function getMatchH2H(matchId: string): Promise<H2HRow | null> {
  const { data, error } = await supabase
    .from('match_h2h')
    .select('id,home_code,away_code,n,hw,d,aw,hg,ag,since,summary,past,pred_home,pred_away')
    .eq('id', matchId)
    .single();
  if (error || !data) return null;
  return data as H2HRow;
}

export async function upsertBonusPicks(
  userId: string,
  picks: { champ_code?: string; runner_up_code?: string; third_code?: string; top_scorer?: string },
): Promise<void> {
  const { error } = await supabase
    .from('bonus_picks')
    .upsert({ user_id: userId, ...picks, updated_at: new Date().toISOString() },
             { onConflict: 'user_id' });
  if (error) console.error('[db] upsertBonusPicks:', error.message);
}
