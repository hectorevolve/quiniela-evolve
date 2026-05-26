/**
 * GET /api/sync-h2h
 *
 * For knockout matches where both teams are already known in the DB
 * (api_match_id is set), fetches head-to-head history from
 * football-data.org and stores it in match_h2h.
 *
 * Rate limit: football-data.org free tier = 10 req/min.
 * We process max 8 matches per call with a 7-second pause between each.
 *
 * Call this from admin or add to a daily cron once group stage is done.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const NAME_TO_CODE: Record<string, string> = {
  'mexico': 'MEX', 'south africa': 'RSA', 'korea republic': 'KOR',
  'south korea': 'KOR', 'czech republic': 'CZE', 'czechia': 'CZE',
  'canada': 'CAN', 'bosnia and herzegovina': 'BIH', 'qatar': 'QAT',
  'switzerland': 'SUI', 'brazil': 'BRA', 'haiti': 'HAI', 'scotland': 'SCO',
  'morocco': 'MAR', 'united states': 'USA', 'paraguay': 'PAR',
  'australia': 'AUS', 'turkey': 'TUR', 'türkiye': 'TUR', 'germany': 'GER',
  "côte d'ivoire": 'CIV', 'ivory coast': 'CIV', 'ecuador': 'ECU',
  'curacao': 'CUW', 'netherlands': 'NED', 'sweden': 'SWE', 'japan': 'JPN',
  'tunisia': 'TUN', 'belgium': 'BEL', 'egypt': 'EGY', 'iran': 'IRN',
  'new zealand': 'NZL', 'spain': 'ESP', 'cape verde': 'CPV',
  'saudi arabia': 'KSA', 'uruguay': 'URU', 'france': 'FRA', 'senegal': 'SEN',
  'iraq': 'IRQ', 'norway': 'NOR', 'argentina': 'ARG', 'algeria': 'ALG',
  'austria': 'AUT', 'jordan': 'JOR', 'portugal': 'POR',
  'dr congo': 'COD', 'democratic republic of congo': 'COD',
  'colombia': 'COL', 'uzbekistan': 'UZB', 'england': 'ENG', 'ghana': 'GHA',
  'panama': 'PAN', 'croatia': 'CRO', 'nigeria': 'NGA', 'venezuela': 'VEN',
  'chile': 'CHI', 'peru': 'PER', 'china': 'CHN', 'indonesia': 'IDN',
  'ukraine': 'UKR', 'poland': 'POL', 'serbia': 'SRB', 'denmark': 'DEN',
};

function toCode(name: string) {
  return NAME_TO_CODE[name.toLowerCase().trim()] ?? null;
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function GET() {
  const fdKey = process.env.FOOTBALL_DATA_KEY;
  if (!fdKey) return NextResponse.json({ error: 'FOOTBALL_DATA_KEY not set' }, { status: 500 });

  const supabase = getAdminClient();

  // Get knockout matches that have an api_match_id but no H2H data yet
  const { data: pending } = await supabase
    .from('matches')
    .select('id, home_code, away_code, api_match_id')
    .not('api_match_id', 'is', null)
    .not('home_code', 'eq', 'TBD')
    .not('away_code', 'eq', 'TBD');

  if (!pending || pending.length === 0) {
    return NextResponse.json({ message: 'No knockout matches with api_match_id to sync', synced: 0 });
  }

  // Filter out ones already in match_h2h
  const { data: existing } = await supabase.from('match_h2h').select('id');
  const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id));
  const toSync = pending.filter((m: { id: string }) => !existingIds.has(m.id)).slice(0, 8);

  if (toSync.length === 0) {
    return NextResponse.json({ message: 'All matches already have H2H data', synced: 0 });
  }

  let synced = 0;
  const errors: string[] = [];

  for (const match of toSync) {
    try {
      const res = await fetch(
        `https://api.football-data.org/v4/matches/${match.api_match_id}/head2head?limit=15`,
        { headers: { 'X-Auth-Token': fdKey }, cache: 'no-store' },
      );
      if (!res.ok) { errors.push(`${match.id}: API ${res.status}`); continue; }

      const json = await res.json();
      const agg = json.aggregates ?? {};
      const pastMatches = (json.matches ?? []) as Array<{
        utcDate: string;
        competition: { name: string };
        homeTeam: { name: string; tla: string };
        awayTeam: { name: string; tla: string };
        score: { fullTime: { home: number | null; away: number | null } };
      }>;

      // Determine which aggregate team is our "home"
      const apiHome = agg.homeTeam ?? {};
      const apiAway = agg.awayTeam ?? {};
      const apiHomeCode = toCode(apiHome.name ?? '');
      const homeIsApiHome = apiHomeCode === match.home_code;

      const hw = homeIsApiHome ? (apiHome.wins ?? 0) : (apiAway.wins ?? 0);
      const aw = homeIsApiHome ? (apiAway.wins ?? 0) : (apiHome.wins ?? 0);
      const d  = (agg.numberOfMatches ?? 0) - hw - aw;

      // Build past array from API matches
      let hg = 0, ag = 0;
      const past = pastMatches
        .filter(m => m.score?.fullTime?.home !== null && m.score?.fullTime?.away !== null)
        .map(m => {
          const hCode = toCode(m.homeTeam.tla ?? '') ?? toCode(m.homeTeam.name ?? '') ?? m.homeTeam.tla;
          const aCode = toCode(m.awayTeam.tla ?? '') ?? toCode(m.awayTeam.name ?? '') ?? m.awayTeam.tla;
          const hs = m.score.fullTime.home ?? 0;
          const as_ = m.score.fullTime.away ?? 0;
          // Accumulate goals from our home/away perspective
          if (hCode === match.home_code) { hg += hs; ag += as_; }
          else { hg += as_; ag += hs; }
          return { year: new Date(m.utcDate).getFullYear(), comp: m.competition.name, h: hCode, hs, as: as_, a: aCode };
        });

      const n = agg.numberOfMatches ?? 0;
      const since = past.length > 0 ? Math.min(...past.map(p => p.year)) : undefined;

      // Simple predicted result: average goals, rounded
      const pred_home = n > 0 ? Math.round(hg / n) : null;
      const pred_away = n > 0 ? Math.round(ag / n) : null;

      const summary = n === 0
        ? 'Sin enfrentamientos previos registrados.'
        : `${n} encuentro${n !== 1 ? 's' : ''} previo${n !== 1 ? 's' : ''} entre estos equipos.`;

      await supabase.from('match_h2h').upsert({
        id: match.id,
        home_code: match.home_code,
        away_code: match.away_code,
        n, hw, d, aw, hg, ag,
        since: since ?? null,
        summary,
        past,
        pred_home,
        pred_away,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      synced++;
    } catch (e) {
      errors.push(`${match.id}: ${String(e)}`);
    }

    // Respect rate limit: 7s between calls = ~8 req/min (under the 10 limit)
    if (toSync.indexOf(match) < toSync.length - 1) await sleep(7000);
  }

  return NextResponse.json({ synced, errors: errors.length > 0 ? errors : undefined });
}
