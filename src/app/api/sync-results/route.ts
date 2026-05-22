/**
 * GET /api/sync-results
 *
 * Fetches FINISHED World Cup matches from football-data.org and writes
 * the full-time scores to the Supabase `matches` table.
 *
 * Called automatically by Vercel Cron every 30 min (vercel.json).
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

// ─── Supabase admin client (bypasses RLS) ─────────────────────────────────────
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ─── All known matches (group + knockout) ─────────────────────────────────────
const ALL_MATCHES = [...MATCHES, ...(KNOCKOUT_MATCHES ?? [])];

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET() {
  const fdKey = process.env.FOOTBALL_DATA_KEY;
  if (!fdKey) {
    return NextResponse.json({ error: 'FOOTBALL_DATA_KEY not set' }, { status: 500 });
  }

  // Fetch all FINISHED WC matches from football-data.org v4
  let apiMatches: Array<{
    homeTeam?: { name?: string; tla?: string };
    awayTeam?: { name?: string; tla?: string };
    score?: { fullTime?: { home?: number | null; away?: number | null } };
    status?: string;
  }> = [];

  try {
    const res = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED',
      { headers: { 'X-Auth-Token': fdKey }, cache: 'no-store' },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `football-data.org returned ${res.status}`, synced: 0 },
        { status: 200 }, // return 200 so cron doesn't alarm
      );
    }

    const data = await res.json();
    apiMatches = data.matches ?? [];
  } catch (err) {
    return NextResponse.json(
      { error: String(err), synced: 0 },
      { status: 200 },
    );
  }

  const supabase = getAdminClient();
  let synced = 0;
  const skipped: string[] = [];

  for (const m of apiMatches) {
    // Resolve team codes (try TLA first, then full name)
    const homeCode =
      toCode(m.homeTeam?.tla ?? '') ?? toCode(m.homeTeam?.name ?? '');
    const awayCode =
      toCode(m.awayTeam?.tla ?? '') ?? toCode(m.awayTeam?.name ?? '');

    if (!homeCode || !awayCode) {
      skipped.push(`${m.homeTeam?.name ?? '?'} vs ${m.awayTeam?.name ?? '?'} (unknown code)`);
      continue;
    }

    // Find the match in our local list by team codes (order-agnostic)
    const local = ALL_MATCHES.find(
      x =>
        (x.home.code === homeCode && x.away.code === awayCode) ||
        (x.home.code === awayCode  && x.away.code === homeCode),
    );
    if (!local) continue; // Not a WC 2026 match we track

    const flipped    = local.home.code === awayCode;
    const homeScore  = m.score?.fullTime?.home ?? null;
    const awayScore  = m.score?.fullTime?.away ?? null;
    if (homeScore === null || awayScore === null) continue; // No full-time yet

    const { error } = await supabase
      .from('matches')
      .update({
        result_home: flipped ? awayScore : homeScore,
        result_away: flipped ? homeScore : awayScore,
      })
      .eq('id', local.id);

    if (!error) synced++;
  }

  return NextResponse.json({
    synced,
    total: apiMatches.length,
    ...(skipped.length > 0 ? { skipped } : {}),
  });
}
