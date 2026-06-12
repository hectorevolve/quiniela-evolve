/**
 * GET /api/sync-live
 *
 * Cron job (every 1 min) — fetches the current live WC match from
 * football-data.org and writes it to the `live_match` table in Supabase.
 * The /api/live endpoint then reads from Supabase, so no user ever
 * calls football-data.org directly (scales to any number of users).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MATCHES } from '@/lib/data';

const NAME_TO_CODE: Record<string, string> = {
  'mexico': 'MEX', 'mex': 'MEX',
  'south africa': 'RSA', 'rsa': 'RSA',
  'korea republic': 'KOR', 'south korea': 'KOR', 'kor': 'KOR',
  'czech republic': 'CZE', 'czechia': 'CZE', 'cze': 'CZE',
  'canada': 'CAN', 'can': 'CAN',
  'bosnia and herzegovina': 'BIH', 'bih': 'BIH',
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

export async function GET() {
  const fdKey = process.env.FOOTBALL_DATA_KEY;
  if (!fdKey) return NextResponse.json({ error: 'FOOTBALL_DATA_KEY not set' }, { status: 500 });

  const supabase = getAdminClient();

  // ── Fetch live match from football-data.org ──────────────────────────────
  let liveData: {
    matchId: string; homeScore: number; awayScore: number;
    minute: number | null; status: string; duration: string;
  } | null = null;

  try {
    const res = await fetch('https://api.football-data.org/v4/matches?status=IN_PLAY,PAUSED', {
      headers: { 'X-Auth-Token': fdKey },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json() as {
        matches?: Array<{
          competition?: { code?: string; name?: string };
          homeTeam?: { name?: string; tla?: string };
          awayTeam?: { name?: string; tla?: string };
          status?: string;
          score?: { fullTime?: { home?: number | null; away?: number | null }; duration?: string };
          minute?: number | null;
        }>;
      };

      const TEST_MODE = process.env.LIVE_TEST_MODE === '1';
      const matches = (data.matches ?? []).filter(m => {
        if (TEST_MODE) return true;
        const code = m.competition?.code ?? '';
        const name = (m.competition?.name ?? '').toLowerCase();
        return code === 'WC' || name.includes('world cup');
      });

      for (const m of matches) {
        const homeCode = toCode(m.homeTeam?.tla ?? '') ?? toCode(m.homeTeam?.name ?? '');
        const awayCode = toCode(m.awayTeam?.tla ?? '') ?? toCode(m.awayTeam?.name ?? '');
        if (!homeCode || !awayCode) continue;

        const match = MATCHES.find(
          x => (x.home.code === homeCode && x.away.code === awayCode) ||
               (x.home.code === awayCode  && x.away.code === homeCode),
        );
        if (!match) continue;

        const flipped = match.home.code === awayCode;
        const h = m.score?.fullTime?.home ?? 0;
        const a = m.score?.fullTime?.away ?? 0;

        liveData = {
          matchId:   match.id,
          homeScore: flipped ? a : h,
          awayScore: flipped ? h : a,
          minute:    m.minute ?? null,
          status:    m.status ?? 'IN_PLAY',
          duration:  m.score?.duration ?? 'REGULAR',
        };
        break; // one live match at a time
      }
    }
  } catch (err) {
    console.error('[sync-live] fetch error:', err);
  }

  // ── Kickoff calibration + minute computation ────────────────────────────
  if (liveData && (liveData.status === 'IN_PLAY' || liveData.status === 'PAUSED')) {
    const { data: matchRow } = await supabase
      .from('matches').select('match_date').eq('id', liveData.matchId).maybeSingle();

    let kickoffMs = matchRow?.match_date ? new Date(matchRow.match_date).getTime() : null;

    // Recalibrate stored kickoff when API provides a minute and the stored time is off by > 5 min.
    // This is self-healing: wrong kickoff (e.g., set to "now" after a blip) gets corrected automatically.
    if (liveData.status === 'IN_PLAY' && liveData.minute !== null) {
      const expectedKickoff = Date.now() - liveData.minute * 60_000;
      if (kickoffMs === null || Math.abs(expectedKickoff - kickoffMs) > 5 * 60_000) {
        await supabase.from('matches')
          .update({ match_date: new Date(expectedKickoff).toISOString() })
          .eq('id', liveData.matchId);
        kickoffMs = expectedKickoff;
      }
    }

    // Always compute minute from the calibrated kickoff — ignore raw API minute to avoid drift.
    if (kickoffMs !== null) {
      const elapsed = Math.floor((Date.now() - kickoffMs) / 60_000);
      if (elapsed <= 48) {
        liveData.minute = Math.min(elapsed, 45);
      } else if (elapsed <= 63) {
        liveData.minute = null; // halftime
      } else {
        liveData.minute = Math.min(45 + (elapsed - 63), 90);
      }
    }
  }

  // ── Write to Supabase ────────────────────────────────────────────────────
  if (liveData !== null) {
    // Live data found — always write it
    const { error } = await supabase.from('live_match').upsert({
      id:         1,
      match_id:   liveData.matchId,
      home_score: liveData.homeScore,
      away_score: liveData.awayScore,
      minute:     liveData.minute ?? null,
      status:     liveData.status,
      duration:   liveData.duration,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error('[sync-live] upsert error:', error.message);
  } else {
    // No live match from API — only clear if data is stale (> 15 min).
    // This prevents the banner from disappearing during brief API blips mid-match.
    const { data: cur } = await supabase
      .from('live_match').select('updated_at, match_id').eq('id', 1).maybeSingle();
    const ageMs = cur?.updated_at ? Date.now() - new Date(cur.updated_at).getTime() : Infinity;
    if (!cur?.match_id || ageMs > 15 * 60_000) {
      await supabase.from('live_match').upsert({
        id: 1, match_id: null, home_score: null, away_score: null,
        minute: null, status: null, duration: null,
        updated_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ live: liveData, ok: true });
}
