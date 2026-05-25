/**
 * GET /api/sync-results
 *
 * Syncs the full WC 2026 schedule + results from football-data.org into Supabase:
 *  - ALL matches  → updates `match_date` with the official UTC kickoff time
 *  - FINISHED     → also writes `result_home` / `result_away`
 *
 * Called automatically by Vercel Cron every 15 min (vercel.json).
 * Can also be triggered manually from the admin panel.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MATCHES, KNOCKOUT_MATCHES } from '@/lib/data';

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

const ALL_MATCHES = [...MATCHES, ...(KNOCKOUT_MATCHES ?? [])];

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET() {
  const fdKey = process.env.FOOTBALL_DATA_KEY;
  if (!fdKey) {
    return NextResponse.json({ error: 'FOOTBALL_DATA_KEY not set' }, { status: 500 });
  }

  type ApiMatch = {
    utcDate?: string;
    status?: string;
    homeTeam?: { name?: string; tla?: string };
    awayTeam?: { name?: string; tla?: string };
    score?: { fullTime?: { home?: number | null; away?: number | null } };
  };

  let apiMatches: ApiMatch[] = [];

  try {
    // Fetch ALL WC matches (scheduled + live + finished)
    const res = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches',
      { headers: { 'X-Auth-Token': fdKey }, cache: 'no-store' },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `football-data.org ${res.status}`, scheduled: 0, results: 0 },
        { status: 200 }, // 200 so Vercel cron doesn't alarm
      );
    }

    const data = await res.json();
    apiMatches = data.matches ?? [];
  } catch (err) {
    return NextResponse.json(
      { error: String(err), scheduled: 0, results: 0 },
      { status: 200 },
    );
  }

  const supabase = getAdminClient();
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

    const local = ALL_MATCHES.find(
      x =>
        (x.home.code === homeCode && x.away.code === awayCode) ||
        (x.home.code === awayCode  && x.away.code === homeCode),
    );
    if (!local) continue;

    const flipped = local.home.code === awayCode;

    // Always update the official UTC kickoff time
    const patch: Record<string, unknown> = {};
    if (m.utcDate) patch.match_date = m.utcDate; // ISO 8601 e.g. "2026-06-11T17:00:00Z"

    // Update full-time result only when match is officially FINISHED
    if (m.status === 'FINISHED') {
      const h = m.score?.fullTime?.home ?? null;
      const a = m.score?.fullTime?.away ?? null;
      if (h !== null && a !== null) {
        patch.result_home = flipped ? a : h;
        patch.result_away = flipped ? h : a;
        resultsUpdated++;
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
    scheduledUpdated,
    resultsUpdated,
    total: apiMatches.length,
    ...(skipped.length > 0 ? { skipped } : {}),
  });
}
