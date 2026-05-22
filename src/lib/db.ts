import { supabase, type AppUser } from './supabase';
import { calcPoints } from './points';

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, group_name, premium')
    .eq('id', userId)
    .single();
  if (error) { console.error('[db] getProfile:', error.message); return null; }
  return data as AppUser;
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

export async function saveMatchResult(
  matchId: string,
  home: number,
  away: number,
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
}

export async function getRankings(): Promise<RankingEntry[]> {
  // Fetch all predictions and match results together
  const [predsRes, resultsRes] = await Promise.all([
    supabase.from('predictions').select('user_id, match_id, home_score, away_score'),
    supabase.from('matches').select('id, result_home, result_away').not('result_home', 'is', null),
  ]);
  if (predsRes.error || resultsRes.error) return [];

  const resultMap: Record<string, [number, number]> = {};
  for (const m of resultsRes.data ?? []) resultMap[m.id] = [m.result_home, m.result_away];

  // Sum points per user
  const pointsMap: Record<string, number> = {};
  for (const p of predsRes.data ?? []) {
    const result = resultMap[p.match_id];
    if (!result) continue;
    const pts = calcPoints([p.home_score, p.away_score], result);
    pointsMap[p.user_id] = (pointsMap[p.user_id] ?? 0) + pts;
  }

  // Fetch profiles for all users who have predictions
  const userIds = Object.keys(pointsMap);
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, group_name')
    .in('id', userIds);

  const entries: RankingEntry[] = (profiles ?? []).map(p => ({
    userId: p.id,
    name: p.name,
    group_name: p.group_name,
    points: pointsMap[p.id] ?? 0,
    pos: 0,
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
