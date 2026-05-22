import { NextResponse } from 'next/server';
import { MATCHES } from '@/lib/data';

// Maps team names / TLAs (lowercase) → our 3-letter codes
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
  // test
  'ca peñarol': 'PEN', 'peñarol': 'PEN', 'pen': 'PEN',
  'sc corinthians paulista': 'COR', 'corinthians': 'COR', 'cor': 'COR',
  'acf fiorentina': 'FIO', 'fiorentina': 'FIO', 'fio': 'FIO',
  'atalanta bc': 'ATA', 'atalanta': 'ATA', 'ata': 'ATA',
};

function toCode(name: string): string | null {
  return NAME_TO_CODE[name.toLowerCase().trim()] ?? null;
}

// ─── football-data.org ────────────────────────────────────────────────────────
async function fetchFootballData(key: string) {
  // v4: GET /v4/matches?status=LIVE — returns matches across all competitions
  // World Cup 2026 competition code is "WC"
  const res = await fetch('https://api.football-data.org/v4/matches?status=IN_PLAY,PAUSED', {
    headers: { 'X-Auth-Token': key },
    cache: 'no-store',
  });

  if (!res.ok) return { live: null, error: `football-data.org ${res.status}` };

  const data = await res.json() as {
    matches?: Array<{
      competition?: { code?: string; name?: string };
      homeTeam?: { name?: string; tla?: string };
      awayTeam?: { name?: string; tla?: string };
      status?: string;
      score?: {
        fullTime?: { home?: number | null; away?: number | null };
        duration?: string;
      };
      minute?: number | null;
    }>;
  };

  const matches = data?.matches ?? [];

  // In production filter WC only; while testing accept all competitions
  const TEST_MODE = process.env.LIVE_TEST_MODE === '1';
  const wcMatches = TEST_MODE ? matches : matches.filter(m => {
    const code = m.competition?.code ?? '';
    const name = (m.competition?.name ?? '').toLowerCase();
    return code === 'WC' || name.includes('world cup');
  });

  for (const m of wcMatches) {
    const homeName = m.homeTeam?.name ?? '';
    const awayName = m.awayTeam?.name ?? '';
    // Try TLA first (3-letter code), then full name
    const homeCode = toCode(m.homeTeam?.tla ?? '') ?? toCode(homeName);
    const awayCode = toCode(m.awayTeam?.tla ?? '') ?? toCode(awayName);

    if (!homeCode || !awayCode) continue;

    const match = MATCHES.find(
      x => (x.home.code === homeCode && x.away.code === awayCode) ||
           (x.home.code === awayCode && x.away.code === homeCode),
    );
    if (!match) continue;

    const flipped  = match.home.code === awayCode;
    const homeScore = m.score?.fullTime?.home ?? 0;
    const awayScore = m.score?.fullTime?.away ?? 0;
    const minute    = m.minute ?? null;
    const status    = m.status ?? 'IN_PLAY';          // IN_PLAY | PAUSED | ...
    const duration  = m.score?.duration ?? 'REGULAR'; // REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT

    return {
      live: {
        matchId:   match.id,
        homeScore: flipped ? awayScore : homeScore,
        awayScore: flipped ? homeScore : awayScore,
        minute,
        status,
        duration,
      },
    };
  }

  return { live: null };
}

// ─── RapidAPI fallback ────────────────────────────────────────────────────────
async function fetchRapidAPI(key: string, host: string) {
  const res = await fetch(`https://${host}/football-current-live`, {
    headers: {
      'x-rapidapi-key': key,
      'x-rapidapi-host': host,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) return { live: null, error: `RapidAPI ${res.status}` };

  const data = await res.json();

  const g = (o: unknown, ...keys: string[]): unknown =>
    keys.reduce((v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined), o);

  const fixtures: Record<string, unknown>[] =
    data?.response?.live ?? data?.response ?? data?.live ?? data?.data ??
    (Array.isArray(data) ? data : []);

  const wcLive = fixtures.filter(f => {
    const league = String(g(f,'league','name') ?? g(f,'competition','name') ?? f.leagueName ?? '').toLowerCase();
    return league.includes('world cup') || league === '';
  });

  for (const f of wcLive) {
    const homeName = String(g(f,'home','name') ?? g(f,'teams','home','name') ?? g(f,'homeTeam','name') ?? '');
    const awayName = String(g(f,'away','name') ?? g(f,'teams','away','name') ?? g(f,'awayTeam','name') ?? '');
    const homeCode = toCode(homeName);
    const awayCode = toCode(awayName);
    if (!homeCode || !awayCode) continue;

    const match = MATCHES.find(
      m => (m.home.code === homeCode && m.away.code === awayCode) ||
           (m.home.code === awayCode && m.away.code === homeCode),
    );
    if (!match) continue;

    const homeScore = Number(g(f,'home','score') ?? g(f,'goals','home') ?? 0);
    const awayScore = Number(g(f,'away','score') ?? g(f,'goals','away') ?? 0);
    const flipped = match.home.code === awayCode;
    const minuteRaw = g(f,'status','liveTime','short') ?? g(f,'status','elapsed');
    const minute = minuteRaw != null ? (parseInt(String(minuteRaw)) || null) : null;

    return {
      live: {
        matchId:   match.id,
        homeScore: flipped ? awayScore : homeScore,
        awayScore: flipped ? homeScore : awayScore,
        minute,
      },
    };
  }

  return { live: null };
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET() {
  const fdKey     = process.env.FOOTBALL_DATA_KEY;
  const rapidKey  = process.env.RAPIDAPI_KEY;
  const rapidHost = process.env.RAPIDAPI_HOST;

  try {
    // Prefer football-data.org if key is set
    if (fdKey) {
      const result = await fetchFootballData(fdKey);
      return NextResponse.json(result);
    }

    // Fallback to RapidAPI
    if (rapidKey && rapidHost && rapidKey !== 'PEGA_TU_KEY_AQUI') {
      const result = await fetchRapidAPI(rapidKey, rapidHost);
      return NextResponse.json(result);
    }

    return NextResponse.json({ live: null, error: 'No API key configured' });
  } catch (err) {
    console.error('[/api/live]', err);
    return NextResponse.json({ live: null, error: 'fetch failed' });
  }
}
