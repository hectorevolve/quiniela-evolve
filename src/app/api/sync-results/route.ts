/**
 * GET /api/sync-results
 *
 * Syncs the full WC 2026 schedule + results from football-data.org into Supabase.
 * Runs automatically via Vercel Cron every 15 min (vercel.json).
 *
 * What it does each run:
 *  1. Seeds any missing knockout matches (TBD teams) into the `matches` table.
 *  2. Computes which knockout slots are resolved from current DB group results,
 *     then updates the team names in DB automatically (no admin action needed).
 *  3. Fetches ALL WC match data from football-data.org:
 *     - Updates `match_date` with official UTC kickoff for every match.
 *     - For FINISHED matches → writes result_home / result_away.
 *     - Works for both group stage AND knockout (once teams are resolved in DB).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MATCHES, KNOCKOUT_MATCHES, computeSlots } from '@/lib/data';

// ─── Team name / TLA → our 3-letter code ──────────────────────────────────────
const NAME_TO_CODE: Record<string, string> = {
  'mexico': 'MEX', 'mex': 'MEX',
  'south africa': 'RSA', 'rsa': 'RSA',
  'korea republic': 'KOR', 'south korea': 'KOR', 'kor': 'KOR',
  'czech republic': 'CZE', 'czechia': 'CZE', 'cze': 'CZE',
  'canada': 'CAN', 'can': 'CAN',
  'bosnia and herzegovina': 'BIH', 'bosnia herzegovina': 'BIH', 'bih': 'BIH',
  'qatar': 'QAT', 'qat': 'QAT',
  'switzerland': 'SUI', 'sui': 'SUI',
  'brazil': 'BRA', 'bra': 'BRA',
  'haiti': 'HAI', 'hai': 'HAI',
  'scotland': 'SCO', 'sco': 'SCO',
  'morocco': 'MAR', 'mar': 'MAR',
  'united states': 'USA', 'usa': 'USA',
  'paraguay': 'PAR', 'par': 'PAR',
  'australia': 'AUS', 'aus': 'AUS',
  'turkey': 'TUR', 'türkiye': 'TUR', 'tur': 'TUR',
  'germany': 'GER', 'ger': 'GER',
  "côte d'ivoire": 'CIV', 'ivory coast': 'CIV', 'civ': 'CIV',
  'ecuador': 'ECU', 'ecu': 'ECU',
  'curacao': 'CUW', 'cuw': 'CUW',
  'netherlands': 'NED', 'ned': 'NED',
  'sweden': 'SWE', 'swe': 'SWE',
  'japan': 'JPN', 'jpn': 'JPN',
  'tunisia': 'TUN', 'tun': 'TUN',
  'belgium': 'BEL', 'bel': 'BEL',
  'egypt': 'EGY', 'egy': 'EGY',
  'iran': 'IRN', 'irn': 'IRN',
  'new zealand': 'NZL', 'nzl': 'NZL',
  'spain': 'ESP', 'esp': 'ESP',
  'cape verde': 'CPV', 'cpv': 'CPV',
  'saudi arabia': 'KSA', 'ksa': 'KSA',
  'uruguay': 'URU', 'uru': 'URU',
  'france': 'FRA', 'fra': 'FRA',
  'senegal': 'SEN', 'sen': 'SEN',
  'iraq': 'IRQ', 'irq': 'IRQ',
  'norway': 'NOR', 'nor': 'NOR',
  'argentina': 'ARG', 'arg': 'ARG',
  'algeria': 'ALG', 'alg': 'ALG',
  'austria': 'AUT', 'aut': 'AUT',
  'jordan': 'JOR', 'jor': 'JOR',
  'portugal': 'POR', 'por': 'POR',
  'dr congo': 'COD', 'democratic republic of congo': 'COD', 'cod': 'COD',
  'colombia': 'COL', 'col': 'COL',
  'uzbekistan': 'UZB', 'uzb': 'UZB',
  'england': 'ENG', 'eng': 'ENG',
  'ghana': 'GHA', 'gha': 'GHA',
  'panama': 'PAN', 'pan': 'PAN',
  'croatia': 'CRO', 'cro': 'CRO',
  'nigeria': 'NGA', 'nga': 'NGA',
  'venezuela': 'VEN', 'ven': 'VEN',
  'chile': 'CHI', 'chi': 'CHI',
  'peru': 'PER', 'per': 'PER',
  'china': 'CHN', 'chn': 'CHN',
  'indonesia': 'IDN', 'idn': 'IDN',
  'ukraine': 'UKR', 'ukr': 'UKR',
  'poland': 'POL', 'pol': 'POL',
  'serbia': 'SRB', 'srb': 'SRB',
  'denmark': 'DEN', 'den': 'DEN',
};

function toCode(raw: string): string | null {
  return NAME_TO_CODE[raw.toLowerCase().trim()] ?? null;
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET() {
  const fdKey = process.env.FOOTBALL_DATA_KEY;
  if (!fdKey) {
    return NextResponse.json({ error: 'FOOTBALL_DATA_KEY not set' }, { status: 500 });
  }

  const supabase = getAdminClient();

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Ensure all knockout matches exist in Supabase (idempotent seed)
  // ═══════════════════════════════════════════════════════════════════════════
  let knockoutSeeded = 0;
  {
    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .in('id', KNOCKOUT_MATCHES.map(m => m.id));

    const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id));
    const missing = KNOCKOUT_MATCHES.filter(m => !existingIds.has(m.id));

    if (missing.length > 0) {
      const rows = missing.map((m, i) => ({
        id:         m.id,
        group_name: m.group,
        home_code:  m.home.code,   // 'TBD' initially
        home_name:  m.home.name,
        away_code:  m.away.code,   // 'TBD' initially
        away_name:  m.away.name,
        match_date: m.date,        // Spanish placeholder, overwritten by API later
        stadium:    m.stadium ?? '',
        sort_order: 1000 + i,
      }));
      const { error } = await supabase.from('matches').insert(rows);
      if (!error) knockoutSeeded = missing.length;
      else console.error('[sync-results] knockout seed error:', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Compute which knockout slots are resolved → update teams in DB
  // ═══════════════════════════════════════════════════════════════════════════
  let slotsResolved = 0;
  let resolvedKnockouts = KNOCKOUT_MATCHES; // will be replaced below
  {
    // Fetch all results already in DB (group stage + any finished knockouts)
    const { data: resultRows } = await supabase
      .from('matches')
      .select('id, result_home, result_away, result_winner')
      .not('result_home', 'is', null);

    const dbResults: Record<string, [number, number]> = {};
    const dbWinners: Record<string, 'home' | 'away'> = {};
    for (const r of resultRows ?? []) {
      dbResults[r.id] = [r.result_home, r.result_away];
      if (r.result_winner) dbWinners[r.id] = r.result_winner as 'home' | 'away';
    }

    // Derive full bracket from results (penalty winners resolve ET/pens draws)
    const slots = computeSlots(MATCHES, KNOCKOUT_MATCHES, dbResults, dbWinners);

    // Build resolved knockout array (for use in Step 3 matching)
    resolvedKnockouts = KNOCKOUT_MATCHES.map(m => ({
      ...m,
      home: (m.slotHome && slots[m.slotHome]) ? { code: slots[m.slotHome]!.code, name: slots[m.slotHome]!.name } : m.home,
      away: (m.slotAway && slots[m.slotAway]) ? { code: slots[m.slotAway]!.code, name: slots[m.slotAway]!.name } : m.away,
    }));

    // Update DB rows where slots are now resolved
    for (const m of resolvedKnockouts) {
      if (m.home.code === 'TBD' && m.away.code === 'TBD') continue; // nothing resolved yet

      const patch: Record<string, string> = {};
      if (m.home.code !== 'TBD') { patch.home_code = m.home.code; patch.home_name = m.home.name; }
      if (m.away.code !== 'TBD') { patch.away_code = m.away.code; patch.away_name = m.away.name; }

      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from('matches').update(patch).eq('id', m.id);
        if (!error) slotsResolved++;
        else console.error('[sync-results] slot update error:', m.id, error.message);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — Fetch from football-data.org and sync dates + results
  // ═══════════════════════════════════════════════════════════════════════════
  // Use resolved knockout teams for matching (so API can find them once teams are known)
  const ALL_MATCHES_LOCAL = [...MATCHES, ...resolvedKnockouts];

  type ApiMatch = {
    utcDate?: string;
    status?: string;
    homeTeam?: { name?: string; tla?: string };
    awayTeam?: { name?: string; tla?: string };
    score?: {
      /** Actual winner, including ET/penalties: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' */
      winner?: string;
      /** How it was decided: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT' */
      duration?: string;
      fullTime?: { home?: number | null; away?: number | null };
    };
  };

  let apiMatches: ApiMatch[] = [];

  try {
    const res = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches',
      { headers: { 'X-Auth-Token': fdKey }, cache: 'no-store' },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `football-data.org ${res.status}`, knockoutSeeded, slotsResolved, scheduled: 0, results: 0 },
        { status: 200 },
      );
    }

    const data = await res.json();
    apiMatches = data.matches ?? [];
  } catch (err) {
    return NextResponse.json(
      { error: String(err), knockoutSeeded, slotsResolved, scheduled: 0, results: 0 },
      { status: 200 },
    );
  }

  let scheduledUpdated = 0;
  let resultsUpdated = 0;
  const skipped: string[] = [];

  for (const m of apiMatches) {
    const homeCode = toCode(m.homeTeam?.tla ?? '') ?? toCode(m.homeTeam?.name ?? '');
    const awayCode = toCode(m.awayTeam?.tla ?? '') ?? toCode(m.awayTeam?.name ?? '');

    if (!homeCode || !awayCode) {
      if (m.homeTeam?.name) {
        skipped.push(`${m.homeTeam.name} vs ${m.awayTeam?.name ?? '?'}`);
      }
      continue;
    }

    const local = ALL_MATCHES_LOCAL.find(
      x =>
        (x.home.code === homeCode && x.away.code === awayCode) ||
        (x.home.code === awayCode  && x.away.code === homeCode),
    );
    if (!local) continue;

    const flipped = local.home.code === awayCode;

    const patch: Record<string, unknown> = {};
    if (m.utcDate) patch.match_date = m.utcDate;

    if (m.status === 'FINISHED') {
      const h = m.score?.fullTime?.home ?? null;
      const a = m.score?.fullTime?.away ?? null;
      if (h !== null && a !== null) {
        patch.result_home = flipped ? a : h;
        patch.result_away = flipped ? h : a;
        resultsUpdated++;

        // If decided by ET or penalties, record who actually advanced.
        // This lets computeSlots resolve the bracket even when the 90-min
        // score is a draw (e.g. 1-1 aet, home team wins 5-4 on pens).
        const dur       = m.score?.duration;
        const apiWinner = m.score?.winner;
        if (dur && dur !== 'REGULAR' && apiWinner && apiWinner !== 'DRAW') {
          const isApiHome = apiWinner === 'HOME_TEAM';
          // XOR with flipped: if exactly one of them is true → our 'away' wins
          patch.result_winner = (isApiHome === flipped) ? 'away' : 'home';
        }
      }
    }

    if (Object.keys(patch).length === 0) continue;

    const { error } = await supabase
      .from('matches')
      .update(patch)
      .eq('id', local.id);

    if (!error && m.utcDate) scheduledUpdated++;
  }

  return NextResponse.json({
    knockoutSeeded,
    slotsResolved,
    scheduledUpdated,
    resultsUpdated,
    total: apiMatches.length,
    ...(skipped.length > 0 ? { skipped } : {}),
  });
}
