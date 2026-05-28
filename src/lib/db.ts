import { supabase, type AppUser } from './supabase';
import { calcPoints } from './points';

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, phone, role, group_name, premium, used_powers')
    .eq('id', userId)
    .single();
  if (error) { console.error('[db] getProfile:', error.message); return null; }
  return { ...data, used_powers: data.used_powers ?? [] } as AppUser;
}

/** Save a used power to the current user's profile in DB. */
export async function savePowerUsed(power: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const userId = session.user.id;
  const { data } = await supabase.from('profiles').select('used_powers').eq('id', userId).single();
  const current: string[] = data?.used_powers ?? [];
  if (!current.includes(power)) {
    await supabase.from('profiles').update({ used_powers: [...current, power] }).eq('id', userId);
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
  points: number;
  pos: number;
  used_powers: string[];
}

export async function getRankings(): Promise<RankingEntry[]> {
  // Fetch all data in parallel (including bonus awards)
  const [profilesRes, predsRes, resultsRes, bonusRes] = await Promise.all([
    supabase.from('profiles').select('id, name, group_name, used_powers').eq('role', 'user'),
    supabase.from('predictions').select('user_id, match_id, home_score, away_score'),
    supabase.from('matches').select('id, result_home, result_away').not('result_home', 'is', null),
    supabase.from('bonus_awards').select('user_id, points'),
  ]);

  const resultMap: Record<string, [number, number]> = {};
  for (const m of resultsRes.data ?? []) resultMap[m.id] = [m.result_home, m.result_away];

  // Sum match points per user
  const pointsMap: Record<string, number> = {};
  for (const p of predsRes.data ?? []) {
    const result = resultMap[p.match_id];
    if (!result) continue;
    const pts = calcPoints([p.home_score, p.away_score], result);
    pointsMap[p.user_id] = (pointsMap[p.user_id] ?? 0) + pts;
  }

  // Add bonus award points
  for (const b of bonusRes.data ?? []) {
    pointsMap[b.user_id] = (pointsMap[b.user_id] ?? 0) + b.points;
  }

  // All users get a ranking entry (0 pts if no results yet)
  const entries: RankingEntry[] = (profilesRes.data ?? []).map(p => ({
    userId: p.id,
    name: p.name,
    group_name: p.group_name,
    points: pointsMap[p.id] ?? 0,
    pos: 0,
    used_powers: p.used_powers ?? [],
  }));

  entries.sort((a, b) => b.points - a.points);
  entries.forEach((e, i) => (e.pos = i + 1));
  return entries;
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

export interface GroupSettings {
  prize_1st: string;
  prize_2nd: string;
  prize_3rd: string;
  bonus_champ_type: string;  bonus_champ_value: string;
  bonus_runner_type: string; bonus_runner_value: string;
  bonus_third_type: string;  bonus_third_value: string;
  bonus_scorer_type: string; bonus_scorer_value: string;
}

export async function getGroupSettings(groupName: string): Promise<GroupSettings | null> {
  if (!groupName) return null;
  const { data, error } = await supabase
    .from('group_settings')
    .select('prize_1st,prize_2nd,prize_3rd,bonus_champ_type,bonus_champ_value,bonus_runner_type,bonus_runner_value,bonus_third_type,bonus_third_value,bonus_scorer_type,bonus_scorer_value')
    .eq('group_name', groupName)
    .single();
  if (error) return null;
  return data as GroupSettings;
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
