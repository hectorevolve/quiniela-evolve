export const USER = {
  name: 'Juan Pérez',
  email: 'vendedor.decasa@cdg.mx',
  mayorista: 'DECASA',
  region: 'Centro',
  avatar: 'JP',
  points: 348,
  rank: 1,
  group: 'Evolve',
  city: 'CDMX',
};

export interface Match {
  id: string;
  group: string;
  home: { code: string; name: string; placeholder?: string };
  away: { code: string; name: string; placeholder?: string };
  date: string;
  stadium: string;
  prediction: [number, number] | null;
  lastUpdate: string | null;
  result?: [number, number];
  userPrediction?: [number, number];
  pointsEarned?: number;
  slotHome?: string;
  slotAway?: string;
}

const MONTH_MAP: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

function parseMatchStart(dateStr: string): number {
  const parts = dateStr.split(' ');
  if (parts.length < 6) return Infinity;
  const day   = parseInt(parts[1]);
  const month = MONTH_MAP[parts[2].replace('.', '')] ?? -1;
  const year  = parseInt(parts[3]);
  const [h, m] = parts[4].split(':').map(Number);
  const isPm   = parts[5] === 'pm';
  const hours  = isPm && h !== 12 ? h + 12 : (!isPm && h === 12 ? 0 : h);
  return new Date(year, month, day, hours, m).getTime();
}

// Returns true if the match has already kicked off (start time has passed).
export function isMatchStarted(dateStr: string): boolean {
  return Date.now() > parseMatchStart(dateStr);
}

// Returns true if more than 45 minutes have passed since kick-off.
export function isMatchOver45Min(dateStr: string): boolean {
  return Date.now() > parseMatchStart(dateStr) + 45 * 60 * 1000;
}

// Returns true if the match ended (start + 2h has passed).
export function isMatchPast(dateStr: string): boolean {
  return Date.now() > parseMatchStart(dateStr) + 2 * 60 * 60 * 1000;
}

// ── ISO-aware helpers (use official UTC time from API when available) ─────────
// isoDate: "2026-06-11T17:00:00Z" from football-data.org. Falls back to
// the Spanish date string parsed by parseMatchStart() if no ISO date.

function kickoffMs(isoDate: string | undefined, fallbackDateStr: string): number {
  if (isoDate) return new Date(isoDate).getTime();
  return parseMatchStart(fallbackDateStr);
}

export function isMatchStartedEx(isoDate: string | undefined, fallbackDateStr: string): boolean {
  return Date.now() > kickoffMs(isoDate, fallbackDateStr);
}
export function isMatchOver45MinEx(isoDate: string | undefined, fallbackDateStr: string): boolean {
  return Date.now() > kickoffMs(isoDate, fallbackDateStr) + 45 * 60 * 1000;
}
export function isMatchPastEx(isoDate: string | undefined, fallbackDateStr: string): boolean {
  return Date.now() > kickoffMs(isoDate, fallbackDateStr) + 2 * 60 * 60 * 1000;
}

// ── Predicciones del grupo (datos del servidor) ──────────────────────────────
export interface PredictionBucket { home: number; away: number; count: number }

// Match order for user predictions (72 group matches, 12 groups × 6 each)
export const GROUP_MATCH_IDS = [
  'a1','a2','a3','a4','a5','a6',
  'b1','b2','b3','b4','b5','b6',
  'c1','c2','c3','c4','c5','c6',
  'd1','d2','d3','d4','d5','d6',
  'e1','e2','e3','e4','e5','e6',
  'f1','f2','f3','f4','f5','f6',
  'g1','g2','g3','g4','g5','g6',
  'h1','h2','h3','h4','h5','h6',
  'i1','i2','i3','i4','i5','i6',
  'j1','j2','j3','j4','j5','j6',
  'k1','k2','k3','k4','k5','k6',
  'l1','l2','l3','l4','l5','l6',
] as const;

// 40 users × 48 group matches in GROUP_MATCH_IDS order [home, away]
// Evolve (u01-u20): Juan P., Ricardo M., Mariana S., Eduardo V., Paola H.,
//   Sebastián R., Gabriela F., Carlos B., Diana R., Miguel Á.,
//   Laura C., Roberto F., Ana M., Fernando L., Sofía G.,
//   Pablo N., Valentina R., Jorge A., Carmen T., David M.
// Sigma (s01-s20): Alejandro G., Patricia V., Luis M., Claudia S., Héctor R.,
//   Mónica F., Arturo L., Sandra P., Ramón C., Lorena B.,
//   Óscar T., Natalia V., Tomás R., Isabel M., Víctor H.,
//   Daniela N., Andrés S., Rebeca L., Ernesto C., Alicia M.
const RAW_USER_PREDS: [number,number][][] = [
// a1   a2     a3     a4     a5     a6      b1     b2     b3     b4     b5     b6      c1     c2     c3     c4     c5     c6      d1     d2     d3     d4     d5     d6      e1     e2     e3     e4     e5     e6      f1     f2     f3     f4     f5     f6      g1     g2     g3     g4     g5     g6      h1     h2     h3     h4     h5     h6      i1     i2     i3     i4     i5     i6      j1     j2     j3     j4     j5     j6      k1     k2     k3     k4     k5     k6      l1     l2     l3     l4     l5     l6
[[2,1],[1,1],[1,0],[2,1],[0,1],[0,2], [2,0],[0,1],[2,0],[2,0],[2,1],[2,0], [2,0],[0,2],[1,1],[3,0],[2,0],[0,2], [2,0],[1,1],[2,0],[1,1],[0,1],[1,1], [3,0],[2,1],[2,0],[3,0],[0,2],[0,2], [2,1],[1,0],[2,0],[2,0],[0,2],[1,1], [2,0],[1,0],[2,0],[1,1],[0,2],[0,1], [3,0],[0,1],[3,0],[2,0],[1,1],[0,2], [2,0],[0,2],[3,0],[1,0],[0,2],[2,0], [2,0],[2,0],[2,0],[1,1],[1,1],[0,2], [3,0],[0,2],[2,0],[2,0],[0,2],[1,1], [2,0],[1,1],[2,0],[0,2],[0,2],[2,1]],// u01 Juan P.
[[2,1],[1,1],[1,0],[2,1],[0,1],[0,2], [2,0],[0,2],[2,0],[2,0],[1,0],[2,0], [2,0],[0,1],[0,1],[3,0],[2,0],[0,2], [2,0],[1,1],[2,0],[1,0],[0,1],[1,0], [3,0],[2,1],[2,0],[3,0],[0,2],[0,2], [2,1],[1,0],[2,0],[2,0],[0,2],[1,0], [2,0],[1,0],[2,0],[1,1],[0,2],[0,1], [3,0],[0,1],[3,0],[2,0],[1,1],[0,2], [2,0],[0,2],[3,0],[1,0],[0,2],[2,0], [2,0],[2,0],[2,0],[1,1],[1,1],[0,2], [3,0],[0,2],[2,0],[2,0],[0,2],[1,1], [2,0],[1,1],[2,0],[0,2],[0,2],[2,1]],// u02 Ricardo M.
[[2,1],[1,1],[1,0],[2,1],[0,2],[0,1], [2,0],[0,1],[2,0],[2,0],[2,1],[1,0], [2,0],[0,2],[1,1],[3,0],[1,0],[0,3], [2,0],[1,0],[2,0],[1,0],[0,1],[1,0], [3,0],[1,1],[2,0],[2,0],[0,1],[0,3], [2,1],[1,0],[2,1],[2,0],[0,2],[1,0], [2,0],[2,0],[2,0],[0,1],[0,2],[0,1], [3,0],[0,2],[3,0],[1,0],[0,1],[0,1], [2,0],[0,2],[3,0],[2,0],[0,2],[1,0], [2,0],[2,0],[2,0],[0,1],[0,1],[0,1], [3,0],[0,1],[3,0],[2,0],[0,1],[1,0], [2,0],[1,0],[2,0],[0,2],[0,3],[1,1]],// u03 Mariana S.
[[2,1],[0,1],[2,0],[1,0],[0,2],[0,1], [2,0],[0,1],[2,0],[2,0],[2,1],[1,0], [3,0],[0,1],[0,1],[4,0],[2,0],[0,2], [1,0],[1,0],[1,0],[1,1],[0,1],[1,1], [2,0],[2,1],[3,0],[2,0],[0,2],[0,2], [1,1],[2,0],[1,0],[2,0],[0,1],[2,1], [3,0],[1,0],[3,0],[0,1],[0,2],[0,2], [2,0],[0,2],[2,0],[2,0],[0,2],[1,2], [1,0],[0,1],[4,0],[1,0],[0,1],[1,0], [2,0],[1,0],[2,0],[0,1],[0,2],[0,1], [3,0],[0,2],[2,0],[1,0],[1,2],[0,1], [1,0],[2,0],[3,0],[0,1],[0,3],[1,0]],// u04 Eduardo V.
[[1,0],[1,1],[1,0],[2,0],[0,1],[0,2], [1,0],[0,1],[1,0],[2,0],[2,1],[1,0], [2,0],[0,1],[0,1],[3,0],[1,0],[0,2], [1,0],[1,1],[1,0],[1,0],[0,2],[1,1], [3,0],[1,1],[2,0],[2,0],[0,1],[0,3], [2,1],[1,0],[2,1],[1,0],[0,1],[1,1], [2,0],[2,0],[2,0],[1,1],[0,3],[0,2], [2,0],[0,1],[2,0],[1,0],[0,1],[0,1], [2,0],[0,2],[3,0],[2,0],[0,1],[1,0], [2,0],[1,0],[1,0],[0,1],[0,1],[0,2], [2,0],[0,1],[3,0],[1,0],[0,1],[0,1], [1,0],[1,1],[2,0],[0,1],[0,2],[1,1]],// u05 Paola H.
[[2,1],[1,0],[2,0],[2,1],[0,1],[0,2], [2,0],[0,2],[2,0],[2,0],[1,0],[2,0], [2,0],[0,1],[0,2],[4,0],[2,0],[0,3], [2,0],[2,1],[2,0],[2,0],[0,1],[1,1], [3,0],[2,1],[3,0],[3,0],[0,2],[0,2], [3,1],[1,0],[2,0],[2,0],[0,2],[2,1], [2,0],[1,0],[2,0],[2,1],[0,3],[0,1], [3,0],[0,1],[3,0],[2,0],[0,2],[0,2], [2,0],[0,2],[3,0],[1,0],[0,2],[2,0], [2,0],[2,0],[2,0],[0,2],[0,2],[0,2], [3,0],[0,2],[2,0],[2,0],[1,2],[1,1], [2,0],[1,0],[2,0],[0,2],[0,2],[2,0]],// u06 Sebastián R.
[[1,0],[1,0],[1,0],[1,0],[0,1],[0,1], [1,0],[0,1],[1,0],[1,0],[1,1],[1,0], [2,0],[0,1],[0,1],[3,0],[2,0],[0,2], [1,0],[1,0],[1,0],[1,0],[0,1],[1,0], [2,0],[1,1],[2,0],[2,0],[0,1],[0,2], [2,1],[1,0],[2,0],[1,0],[0,1],[1,0], [2,0],[1,0],[2,0],[0,1],[0,2],[0,1], [2,0],[0,1],[2,0],[1,0],[1,1],[0,1], [1,0],[0,1],[2,0],[1,0],[0,1],[2,0], [1,0],[1,0],[1,0],[1,1],[1,1],[0,1], [2,0],[0,1],[2,0],[1,0],[0,1],[1,1], [1,0],[1,0],[1,0],[0,1],[0,2],[1,0]],// u07 Gabriela F.
[[1,0],[1,1],[1,0],[1,0],[1,1],[0,2], [1,0],[0,1],[2,1],[2,0],[0,1],[1,0], [2,0],[0,1],[1,1],[3,0],[2,0],[0,2], [2,0],[1,1],[2,0],[1,1],[1,2],[1,1], [3,0],[1,0],[2,1],[3,0],[0,2],[0,3], [2,0],[1,0],[2,0],[2,0],[0,2],[1,1], [2,0],[1,1],[2,1],[1,1],[0,2],[1,2], [3,0],[0,1],[3,0],[2,0],[0,1],[0,1], [2,0],[0,2],[3,0],[1,0],[0,2],[2,0], [2,0],[2,0],[2,0],[1,1],[0,1],[0,2], [3,0],[0,2],[3,0],[2,0],[0,2],[1,0], [2,0],[1,1],[2,0],[0,2],[0,2],[2,1]],// u08 Carlos B.
[[2,1],[1,1],[2,0],[2,1],[0,1],[0,2], [2,0],[0,2],[2,0],[2,0],[1,0],[2,0], [3,0],[0,2],[0,1],[3,0],[2,0],[0,2], [2,0],[1,0],[2,0],[1,1],[0,1],[1,1], [3,0],[2,1],[2,0],[3,0],[0,2],[0,2], [2,1],[1,0],[2,0],[2,0],[0,2],[1,0], [2,0],[1,0],[2,0],[1,1],[0,2],[0,1], [3,0],[0,1],[3,0],[2,0],[0,2],[0,2], [2,0],[0,2],[3,0],[2,1],[0,2],[2,0], [2,0],[2,0],[2,0],[0,1],[1,1],[0,2], [3,0],[0,2],[2,0],[2,0],[0,2],[1,1], [2,0],[2,0],[2,0],[0,2],[0,2],[2,1]],// u09 Diana R.
[[2,1],[1,1],[1,0],[2,1],[1,1],[0,2], [2,0],[0,2],[2,1],[2,0],[2,1],[1,0], [2,0],[0,1],[1,1],[3,0],[2,0],[0,2], [2,0],[2,1],[2,0],[1,0],[0,1],[2,1], [3,0],[2,0],[2,0],[2,0],[0,2],[0,2], [2,1],[2,0],[2,1],[1,0],[0,2],[2,1], [2,0],[2,1],[3,0],[1,1],[0,2],[0,2], [3,0],[0,1],[3,0],[2,0],[1,1],[0,2], [2,0],[0,2],[3,0],[1,0],[0,2],[2,0], [2,0],[2,0],[2,0],[0,2],[1,0],[0,2], [3,0],[0,2],[3,0],[2,0],[0,1],[2,1], [2,0],[1,1],[2,0],[0,2],[0,2],[1,0]],// u10 Miguel Á.
[[1,0],[0,1],[0,0],[1,0],[0,2],[1,2], [1,0],[0,1],[1,0],[1,0],[0,1],[1,0], [2,0],[0,2],[1,1],[2,0],[1,0],[0,3], [1,0],[0,1],[1,0],[0,1],[1,2],[0,1], [2,0],[1,1],[2,1],[2,0],[0,1],[0,2], [1,1],[1,0],[1,0],[1,0],[0,1],[0,1], [2,0],[1,0],[2,0],[0,1],[0,2],[0,1], [2,0],[0,2],[2,0],[1,0],[0,1],[1,2], [1,0],[0,2],[3,0],[1,0],[0,1],[1,0], [1,0],[1,0],[1,0],[0,1],[0,1],[0,1], [2,0],[0,1],[2,0],[1,0],[1,2],[1,1], [1,0],[0,1],[2,0],[0,1],[0,2],[0,1]],// u11 Laura C.
[[1,0],[1,1],[1,0],[2,0],[0,1],[0,2], [2,0],[0,1],[2,0],[2,0],[0,1],[1,0], [2,0],[0,2],[0,2],[4,0],[2,0],[0,2], [2,0],[1,0],[2,0],[1,0],[0,2],[0,1], [2,0],[2,0],[2,1],[2,0],[0,1],[0,2], [2,1],[1,0],[2,0],[2,0],[0,2],[0,1], [3,0],[1,0],[2,0],[0,2],[0,3],[0,2], [3,0],[0,1],[2,0],[2,0],[0,1],[0,1], [2,0],[0,2],[2,0],[2,0],[0,2],[2,0], [2,0],[1,0],[2,0],[1,1],[0,2],[0,2], [2,0],[0,2],[3,0],[2,0],[0,2],[0,1], [2,0],[1,0],[2,0],[0,1],[0,2],[0,1]],// u12 Roberto F.
[[2,0],[1,0],[1,0],[2,0],[0,1],[0,1], [2,0],[0,2],[1,0],[2,0],[2,1],[2,0], [2,0],[0,1],[0,1],[3,0],[1,0],[0,3], [2,1],[1,1],[2,0],[2,0],[0,1],[1,1], [2,0],[2,1],[2,0],[2,0],[0,1],[0,2], [2,0],[1,0],[2,0],[1,0],[0,2],[1,1], [2,0],[2,0],[2,0],[0,1],[0,2],[0,1], [3,0],[0,1],[3,0],[1,0],[0,1],[0,2], [2,0],[0,2],[3,0],[1,0],[0,2],[2,0], [2,0],[1,0],[2,0],[0,1],[0,2],[0,1], [3,0],[0,1],[2,1],[2,0],[0,2],[0,1], [2,0],[1,0],[2,0],[0,1],[0,2],[1,1]],// u13 Ana M.
[[1,0],[1,0],[1,0],[2,0],[1,1],[0,1], [1,0],[1,1],[2,0],[1,0],[1,1],[1,0], [2,0],[0,1],[0,1],[3,0],[2,0],[0,2], [1,0],[1,0],[1,0],[1,0],[0,2],[1,0], [2,0],[1,0],[2,0],[2,0],[0,2],[0,2], [2,0],[1,0],[1,0],[1,0],[0,1],[1,0], [2,0],[1,0],[2,0],[0,1],[0,2],[0,1], [2,0],[0,1],[2,0],[1,0],[0,1],[0,1], [1,0],[0,1],[2,0],[1,0],[0,1],[1,0], [2,0],[2,0],[2,0],[0,1],[0,1],[0,2], [2,0],[0,1],[2,1],[2,0],[0,1],[1,0], [2,0],[1,0],[1,0],[0,2],[0,2],[1,0]],// u14 Fernando L.
[[2,0],[1,0],[2,0],[2,0],[0,1],[0,1], [1,0],[0,2],[1,0],[2,0],[1,0],[1,0], [2,0],[0,1],[0,1],[3,0],[2,0],[0,2], [1,0],[1,1],[1,0],[2,0],[0,1],[1,0], [2,0],[1,0],[2,0],[2,0],[0,2],[0,2], [2,0],[1,0],[1,0],[1,0],[0,1],[1,1], [2,0],[1,0],[2,0],[0,1],[0,2],[0,1], [2,0],[0,1],[2,0],[1,0],[0,1],[0,1], [1,0],[0,1],[2,0],[1,0],[0,1],[1,0], [1,0],[1,0],[1,0],[0,1],[0,1],[0,1], [2,0],[0,1],[2,0],[2,0],[0,1],[1,0], [1,0],[1,0],[1,0],[0,1],[0,2],[1,0]],// u15 Sofía G.
[[3,1],[2,1],[1,0],[3,1],[0,2],[0,3], [2,0],[0,2],[2,0],[2,0],[1,0],[1,0], [3,0],[0,1],[0,1],[4,0],[2,0],[0,2], [2,1],[2,1],[2,1],[1,1],[0,1],[2,1], [4,0],[2,1],[3,0],[4,0],[0,2],[0,3], [3,1],[2,0],[2,1],[2,0],[0,2],[2,1], [3,0],[2,1],[2,1],[0,2],[0,2],[0,2], [4,0],[0,1],[4,0],[2,0],[0,2],[0,2], [2,0],[0,2],[4,0],[2,1],[0,2],[2,0], [2,1],[2,0],[3,1],[0,2],[0,2],[0,2], [3,0],[0,2],[2,0],[2,0],[1,2],[1,1], [2,1],[2,0],[3,0],[0,2],[0,3],[2,1]],// u16 Pablo N.
[[2,1],[1,1],[1,0],[2,0],[1,1],[0,1], [2,0],[0,1],[2,0],[1,0],[0,1],[1,0], [2,0],[0,2],[1,1],[3,0],[1,0],[0,2], [2,0],[1,1],[2,0],[1,1],[0,1],[1,1], [3,0],[1,1],[2,0],[3,0],[0,1],[0,3], [2,1],[1,0],[2,0],[2,0],[0,1],[1,0], [2,0],[1,1],[2,0],[1,1],[0,3],[0,2], [3,0],[0,1],[3,0],[2,0],[1,1],[0,1], [2,0],[0,2],[3,0],[2,1],[0,1],[2,0], [2,0],[2,0],[2,0],[0,2],[0,1],[0,1], [3,0],[0,2],[2,1],[2,0],[0,2],[1,1], [2,0],[1,1],[2,0],[0,1],[0,2],[2,1]],// u17 Valentina R.
[[2,0],[1,0],[0,1],[1,0],[0,1],[0,1], [1,0],[1,1],[2,0],[1,0],[1,1],[0,1], [2,0],[0,1],[0,1],[3,0],[1,0],[0,2], [1,0],[0,1],[1,0],[0,1],[1,2],[0,1], [2,0],[1,0],[2,0],[2,0],[0,1],[0,2], [1,1],[1,0],[1,1],[1,0],[0,1],[0,1], [2,0],[1,0],[2,0],[1,1],[0,1],[0,1], [3,0],[0,1],[2,0],[1,0],[1,1],[0,1], [1,0],[0,1],[3,0],[1,0],[0,1],[1,0], [1,0],[1,0],[1,0],[0,1],[0,1],[0,1], [2,0],[0,1],[2,0],[1,0],[0,1],[1,0], [1,0],[1,0],[1,0],[0,1],[0,2],[0,1]],// u18 Jorge A.
[[1,1],[1,1],[1,1],[1,1],[0,1],[0,1], [1,0],[0,1],[1,1],[1,0],[0,1],[1,1], [2,1],[0,1],[0,1],[2,1],[1,1],[0,2], [1,1],[1,0],[1,1],[1,1],[0,1],[1,0], [2,1],[1,1],[2,1],[2,1],[0,1],[0,2], [1,1],[1,1],[1,1],[1,1],[0,1],[1,1], [2,1],[1,1],[2,1],[0,1],[0,1],[0,1], [2,1],[0,1],[2,1],[1,1],[0,1],[1,2], [1,1],[0,1],[2,1],[1,1],[0,1],[1,1], [1,1],[1,1],[1,1],[0,1],[0,1],[0,1], [2,1],[0,1],[2,1],[1,1],[0,1],[0,1], [1,1],[0,1],[1,1],[0,1],[0,1],[0,1]],// u19 Carmen T.
[[1,1],[1,2],[0,1],[1,1],[1,0],[1,2], [0,1],[1,1],[1,1],[0,1],[0,1],[0,1], [1,1],[0,1],[1,2],[2,1],[0,1],[0,2], [0,1],[0,1],[0,1],[0,2],[1,0],[0,1], [2,1],[0,1],[2,1],[1,0],[1,2],[1,3], [1,2],[0,1],[1,1],[0,1],[1,1],[0,1], [1,0],[0,1],[2,1],[0,1],[1,3],[1,2], [2,1],[1,2],[1,0],[0,1],[2,1],[0,3], [1,1],[1,2],[2,1],[0,1],[1,2],[0,1], [1,0],[0,1],[1,1],[1,2],[1,2],[1,1], [2,1],[1,2],[2,1],[0,1],[2,1],[0,2], [1,1],[0,1],[1,1],[1,2],[1,3],[0,1]],// u20 David M.
// ── Sigma group ─────────────────────────────────────────────────────────────
[[2,1],[1,1],[1,0],[2,1],[0,1],[0,2], [2,0],[0,1],[2,0],[2,0],[1,0],[2,0], [2,0],[0,2],[1,1],[3,0],[2,0],[0,2], [2,0],[1,1],[2,0],[1,0],[0,1],[1,0], [3,0],[2,1],[2,0],[3,0],[0,2],[0,2], [2,1],[1,0],[2,0],[2,0],[0,2],[1,0], [2,0],[1,0],[2,0],[1,1],[0,2],[0,1], [3,0],[0,1],[3,0],[2,0],[1,1],[0,2], [2,0],[0,2],[3,0],[1,0],[0,2],[2,0], [2,0],[2,0],[2,0],[1,1],[1,1],[0,2], [3,0],[0,2],[2,0],[2,0],[0,2],[1,1], [2,0],[1,1],[2,0],[0,2],[0,2],[2,1]],// s01 Alejandro G.
[[2,1],[1,1],[1,0],[2,1],[0,2],[0,1], [2,0],[0,1],[2,0],[2,0],[2,1],[1,0], [2,0],[0,2],[1,1],[3,0],[1,0],[0,3], [2,0],[1,0],[2,0],[1,0],[0,1],[1,0], [3,0],[1,1],[2,0],[2,0],[0,1],[0,3], [2,1],[1,0],[2,1],[2,0],[0,2],[1,0], [2,0],[2,0],[2,0],[0,1],[0,2],[0,1], [3,0],[0,2],[3,0],[1,0],[0,1],[0,1], [2,0],[0,2],[3,0],[2,0],[0,2],[1,0], [2,0],[2,0],[2,0],[0,1],[0,1],[0,1], [3,0],[0,1],[3,0],[2,0],[0,1],[1,0], [2,0],[1,0],[2,0],[0,2],[0,3],[1,1]],// s02 Patricia V.
[[2,1],[0,1],[2,0],[1,0],[0,2],[0,1], [2,0],[0,1],[2,0],[2,0],[2,1],[1,0], [3,0],[0,1],[0,1],[4,0],[2,0],[0,2], [1,0],[1,0],[1,0],[1,1],[0,1],[1,1], [2,0],[2,1],[3,0],[2,0],[0,2],[0,2], [1,1],[2,0],[1,0],[2,0],[0,1],[2,1], [3,0],[1,0],[3,0],[0,1],[0,2],[0,2], [2,0],[0,2],[2,0],[2,0],[0,2],[1,2], [1,0],[0,1],[4,0],[1,0],[0,1],[1,0], [2,0],[1,0],[2,0],[0,1],[0,2],[0,1], [3,0],[0,2],[2,0],[1,0],[1,2],[0,1], [1,0],[2,0],[3,0],[0,1],[0,3],[1,0]],// s03 Luis M.
[[1,0],[1,1],[1,0],[2,0],[0,1],[0,2], [1,0],[0,1],[1,0],[2,0],[2,1],[1,0], [2,0],[0,1],[0,1],[3,0],[1,0],[0,2], [1,0],[1,1],[1,0],[1,0],[0,2],[1,1], [3,0],[1,1],[2,0],[2,0],[0,1],[0,3], [2,1],[1,0],[2,1],[1,0],[0,1],[1,1], [2,0],[2,0],[2,0],[1,1],[0,3],[0,2], [2,0],[0,1],[2,0],[1,0],[0,1],[0,1], [2,0],[0,2],[3,0],[2,0],[0,1],[1,0], [2,0],[1,0],[1,0],[0,1],[0,1],[0,2], [2,0],[0,1],[3,0],[1,0],[0,1],[0,1], [1,0],[1,1],[2,0],[0,1],[0,2],[1,1]],// s04 Claudia S.
[[2,1],[1,0],[2,0],[2,1],[0,1],[0,2], [2,0],[0,2],[2,0],[2,0],[1,0],[2,0], [2,0],[0,1],[0,2],[4,0],[2,0],[0,3], [2,0],[2,1],[2,0],[2,0],[0,1],[1,1], [3,0],[2,1],[3,0],[3,0],[0,2],[0,2], [3,1],[1,0],[2,0],[2,0],[0,2],[2,1], [2,0],[1,0],[2,0],[2,1],[0,3],[0,1], [3,0],[0,1],[3,0],[2,0],[0,2],[0,2], [2,0],[0,2],[3,0],[1,0],[0,2],[2,0], [2,0],[2,0],[2,0],[0,2],[0,2],[0,2], [3,0],[0,2],[2,0],[2,0],[1,2],[1,1], [2,0],[1,0],[2,0],[0,2],[0,2],[2,0]],// s05 Héctor R.
[[1,0],[1,0],[1,0],[1,0],[0,1],[0,1], [1,0],[0,1],[1,0],[1,0],[1,1],[1,0], [2,0],[0,1],[0,1],[3,0],[2,0],[0,2], [1,0],[1,0],[1,0],[1,0],[0,1],[1,0], [2,0],[1,1],[2,0],[2,0],[0,1],[0,2], [2,1],[1,0],[2,0],[1,0],[0,1],[1,0], [2,0],[1,0],[2,0],[0,1],[0,2],[0,1], [2,0],[0,1],[2,0],[1,0],[1,1],[0,1], [1,0],[0,1],[2,0],[1,0],[0,1],[2,0], [1,0],[1,0],[1,0],[1,1],[1,1],[0,1], [2,0],[0,1],[2,0],[1,0],[0,1],[1,1], [1,0],[1,0],[1,0],[0,1],[0,2],[1,0]],// s06 Mónica F.
[[1,0],[1,1],[1,0],[1,0],[1,1],[0,2], [1,0],[0,1],[2,1],[2,0],[0,1],[1,0], [2,0],[0,1],[1,1],[3,0],[2,0],[0,2], [2,0],[1,1],[2,0],[1,1],[1,2],[1,1], [3,0],[1,0],[2,1],[3,0],[0,2],[0,3], [2,0],[1,0],[2,0],[2,0],[0,2],[1,1], [2,0],[1,1],[2,1],[1,1],[0,2],[1,2], [3,0],[0,1],[3,0],[2,0],[0,1],[0,1], [2,0],[0,2],[3,0],[1,0],[0,2],[2,0], [2,0],[2,0],[2,0],[1,1],[0,1],[0,2], [3,0],[0,2],[3,0],[2,0],[0,2],[1,0], [2,0],[1,1],[2,0],[0,2],[0,2],[2,1]],// s07 Arturo L.
[[2,1],[1,1],[2,0],[2,1],[0,1],[0,2], [2,0],[0,2],[2,0],[2,0],[1,0],[2,0], [3,0],[0,2],[0,1],[3,0],[2,0],[0,2], [2,0],[1,0],[2,0],[1,1],[0,1],[1,1], [3,0],[2,1],[2,0],[3,0],[0,2],[0,2], [2,1],[1,0],[2,0],[2,0],[0,2],[1,0], [2,0],[1,0],[2,0],[1,1],[0,2],[0,1], [3,0],[0,1],[3,0],[2,0],[0,2],[0,2], [2,0],[0,2],[3,0],[2,1],[0,2],[2,0], [2,0],[2,0],[2,0],[0,1],[1,1],[0,2], [3,0],[0,2],[2,0],[2,0],[0,2],[1,1], [2,0],[2,0],[2,0],[0,2],[0,2],[2,1]],// s08 Sandra P.
[[2,1],[1,1],[1,0],[2,1],[1,1],[0,2], [2,0],[0,2],[2,1],[2,0],[2,1],[1,0], [2,0],[0,1],[1,1],[3,0],[2,0],[0,2], [2,0],[2,1],[2,0],[1,0],[0,1],[2,1], [3,0],[2,0],[2,0],[2,0],[0,2],[0,2], [2,1],[2,0],[2,1],[1,0],[0,2],[2,1], [2,0],[2,1],[3,0],[1,1],[0,2],[0,2], [3,0],[0,1],[3,0],[2,0],[1,1],[0,2], [2,0],[0,2],[3,0],[1,0],[0,2],[2,0], [2,0],[2,0],[2,0],[0,2],[1,0],[0,2], [3,0],[0,2],[3,0],[2,0],[0,1],[2,1], [2,0],[1,1],[2,0],[0,2],[0,2],[1,0]],// s09 Ramón C.
[[1,0],[0,1],[0,0],[1,0],[0,2],[1,2], [1,0],[0,1],[1,0],[1,0],[0,1],[1,0], [2,0],[0,2],[1,1],[2,0],[1,0],[0,3], [1,0],[0,1],[1,0],[0,1],[1,2],[0,1], [2,0],[1,1],[2,1],[2,0],[0,1],[0,2], [1,1],[1,0],[1,0],[1,0],[0,1],[0,1], [2,0],[1,0],[2,0],[0,1],[0,2],[0,1], [2,0],[0,2],[2,0],[1,0],[0,1],[1,2], [1,0],[0,2],[3,0],[1,0],[0,1],[1,0], [1,0],[1,0],[1,0],[0,1],[0,1],[0,1], [2,0],[0,1],[2,0],[1,0],[1,2],[1,1], [1,0],[0,1],[2,0],[0,1],[0,2],[0,1]],// s10 Lorena B.
[[1,0],[1,1],[1,0],[2,0],[0,1],[0,2], [2,0],[0,1],[2,0],[2,0],[0,1],[1,0], [2,0],[0,2],[0,2],[4,0],[2,0],[0,2], [2,0],[1,0],[2,0],[1,0],[0,2],[0,1], [2,0],[2,0],[2,1],[2,0],[0,1],[0,2], [2,1],[1,0],[2,0],[2,0],[0,2],[0,1], [3,0],[1,0],[2,0],[0,2],[0,3],[0,2], [3,0],[0,1],[2,0],[2,0],[0,1],[0,1], [2,0],[0,2],[2,0],[2,0],[0,2],[2,0], [2,0],[1,0],[2,0],[1,1],[0,2],[0,2], [2,0],[0,2],[3,0],[2,0],[0,2],[0,1], [2,0],[1,0],[2,0],[0,1],[0,2],[0,1]],// s11 Óscar T.
[[2,0],[1,0],[1,0],[2,0],[0,1],[0,1], [2,0],[0,2],[1,0],[2,0],[2,1],[2,0], [2,0],[0,1],[0,1],[3,0],[1,0],[0,3], [2,1],[1,1],[2,0],[2,0],[0,1],[1,1], [2,0],[2,1],[2,0],[2,0],[0,1],[0,2], [2,0],[1,0],[2,0],[1,0],[0,2],[1,1], [2,0],[2,0],[2,0],[0,1],[0,2],[0,1], [3,0],[0,1],[3,0],[1,0],[0,1],[0,2], [2,0],[0,2],[3,0],[1,0],[0,2],[2,0], [2,0],[1,0],[2,0],[0,1],[0,2],[0,1], [3,0],[0,1],[2,1],[2,0],[0,2],[0,1], [2,0],[1,0],[2,0],[0,1],[0,2],[1,1]],// s12 Natalia V.
[[1,0],[1,0],[1,0],[2,0],[1,1],[0,1], [1,0],[1,1],[2,0],[1,0],[1,1],[1,0], [2,0],[0,1],[0,1],[3,0],[2,0],[0,2], [1,0],[1,0],[1,0],[1,0],[0,2],[1,0], [2,0],[1,0],[2,0],[2,0],[0,2],[0,2], [2,0],[1,0],[1,0],[1,0],[0,1],[1,0], [2,0],[1,0],[2,0],[0,1],[0,2],[0,1], [2,0],[0,1],[2,0],[1,0],[0,1],[0,1], [1,0],[0,1],[2,0],[1,0],[0,1],[1,0], [2,0],[2,0],[2,0],[0,1],[0,1],[0,2], [2,0],[0,1],[2,1],[2,0],[0,1],[1,0], [2,0],[1,0],[1,0],[0,2],[0,2],[1,0]],// s13 Tomás R.
[[2,0],[1,0],[2,0],[2,0],[0,1],[0,1], [1,0],[0,2],[1,0],[2,0],[1,0],[1,0], [2,0],[0,1],[0,1],[3,0],[2,0],[0,2], [1,0],[1,1],[1,0],[2,0],[0,1],[1,0], [2,0],[1,0],[2,0],[2,0],[0,2],[0,2], [2,0],[1,0],[1,0],[1,0],[0,1],[1,1], [2,0],[1,0],[2,0],[0,1],[0,2],[0,1], [2,0],[0,1],[2,0],[1,0],[0,1],[0,1], [1,0],[0,1],[2,0],[1,0],[0,1],[1,0], [1,0],[1,0],[1,0],[0,1],[0,1],[0,1], [2,0],[0,1],[2,0],[2,0],[0,1],[1,0], [1,0],[1,0],[1,0],[0,1],[0,2],[1,0]],// s14 Isabel M.
[[3,1],[2,1],[1,0],[3,1],[0,2],[0,3], [2,0],[0,2],[2,0],[2,0],[1,0],[1,0], [3,0],[0,1],[0,1],[4,0],[2,0],[0,2], [2,1],[2,1],[2,1],[1,1],[0,1],[2,1], [4,0],[2,1],[3,0],[4,0],[0,2],[0,3], [3,1],[2,0],[2,1],[2,0],[0,2],[2,1], [3,0],[2,1],[2,1],[0,2],[0,2],[0,2], [4,0],[0,1],[4,0],[2,0],[0,2],[0,2], [2,0],[0,2],[4,0],[2,1],[0,2],[2,0], [2,1],[2,0],[3,1],[0,2],[0,2],[0,2], [3,0],[0,2],[2,0],[2,0],[1,2],[1,1], [2,1],[2,0],[3,0],[0,2],[0,3],[2,1]],// s15 Víctor H.
[[2,1],[1,1],[1,0],[2,0],[1,1],[0,1], [2,0],[0,1],[2,0],[1,0],[0,1],[1,0], [2,0],[0,2],[1,1],[3,0],[1,0],[0,2], [2,0],[1,1],[2,0],[1,1],[0,1],[1,1], [3,0],[1,1],[2,0],[3,0],[0,1],[0,3], [2,1],[1,0],[2,0],[2,0],[0,1],[1,0], [2,0],[1,1],[2,0],[1,1],[0,3],[0,2], [3,0],[0,1],[3,0],[2,0],[1,1],[0,1], [2,0],[0,2],[3,0],[2,1],[0,1],[2,0], [2,0],[2,0],[2,0],[0,2],[0,1],[0,1], [3,0],[0,2],[2,1],[2,0],[0,2],[1,1], [2,0],[1,1],[2,0],[0,1],[0,2],[2,1]],// s16 Daniela N.
[[2,0],[1,0],[0,1],[1,0],[0,1],[0,1], [1,0],[1,1],[2,0],[1,0],[1,1],[0,1], [2,0],[0,1],[0,1],[3,0],[1,0],[0,2], [1,0],[0,1],[1,0],[0,1],[1,2],[0,1], [2,0],[1,0],[2,0],[2,0],[0,1],[0,2], [1,1],[1,0],[1,1],[1,0],[0,1],[0,1], [2,0],[1,0],[2,0],[1,1],[0,1],[0,1], [3,0],[0,1],[2,0],[1,0],[1,1],[0,1], [1,0],[0,1],[3,0],[1,0],[0,1],[1,0], [1,0],[1,0],[1,0],[0,1],[0,1],[0,1], [2,0],[0,1],[2,0],[1,0],[0,1],[1,0], [1,0],[1,0],[1,0],[0,1],[0,2],[0,1]],// s17 Andrés S.
[[1,1],[1,1],[1,1],[1,1],[0,1],[0,1], [1,0],[0,1],[1,1],[1,0],[0,1],[1,1], [2,1],[0,1],[0,1],[2,1],[1,1],[0,2], [1,1],[1,0],[1,1],[1,1],[0,1],[1,0], [2,1],[1,1],[2,1],[2,1],[0,1],[0,2], [1,1],[1,1],[1,1],[1,1],[0,1],[1,1], [2,1],[1,1],[2,1],[0,1],[0,1],[0,1], [2,1],[0,1],[2,1],[1,1],[0,1],[1,2], [1,1],[0,1],[2,1],[1,1],[0,1],[1,1], [1,1],[1,1],[1,1],[0,1],[0,1],[0,1], [2,1],[0,1],[2,1],[1,1],[0,1],[0,1], [1,1],[0,1],[1,1],[0,1],[0,1],[0,1]],// s18 Rebeca L.
[[1,0],[0,1],[1,1],[1,0],[0,2],[1,1], [1,0],[0,1],[1,0],[1,0],[1,1],[1,0], [1,0],[0,1],[0,1],[2,0],[1,0],[0,2], [1,0],[1,1],[1,0],[0,1],[0,1],[1,0], [2,0],[1,0],[2,0],[1,0],[0,2],[0,2], [1,1],[1,0],[2,0],[1,0],[0,1],[1,0], [2,0],[1,0],[2,0],[0,1],[0,2],[0,1], [2,0],[0,1],[2,0],[1,0],[1,1],[0,1], [1,0],[0,2],[2,0],[1,0],[0,1],[1,0], [1,0],[1,0],[1,0],[0,1],[0,1],[0,1], [2,0],[0,1],[1,0],[1,0],[0,1],[1,0], [1,0],[1,0],[2,0],[0,1],[0,2],[1,0]],// s19 Ernesto C.
[[1,1],[1,2],[0,1],[1,1],[1,0],[1,2], [0,1],[1,1],[1,1],[0,1],[0,1],[0,1], [1,1],[0,1],[1,2],[2,1],[0,1],[0,2], [0,1],[0,1],[0,1],[0,2],[1,0],[0,2], [2,1],[0,1],[1,1],[1,0],[1,2],[1,3], [1,2],[0,1],[1,1],[0,1],[1,1],[0,1], [1,0],[0,1],[1,1],[0,1],[1,2],[1,2], [2,1],[1,2],[1,0],[0,1],[2,1],[0,3], [1,1],[1,2],[2,1],[0,1],[1,2],[0,1], [1,0],[0,1],[1,1],[1,2],[1,2],[1,1], [2,1],[1,2],[2,1],[0,1],[2,1],[0,2], [1,1],[0,1],[1,1],[1,2],[1,3],[0,1]],// s20 Alicia M.
];

function buildPredictionDistributions(): Record<string, PredictionBucket[]> {
  const result: Record<string, PredictionBucket[]> = {};
  GROUP_MATCH_IDS.forEach((matchId, col) => {
    const counts = new Map<string, number>();
    for (const userPreds of RAW_USER_PREDS) {
      const [h, a] = userPreds[col];
      const key = `${h},${a}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    result[matchId] = Array.from(counts.entries())
      .map(([k, count]) => { const [h, a] = k.split(',').map(Number); return { home: h, away: a, count }; })
      .sort((a, b) => b.count - a.count);
  });
  return result;
}

// En producción: GET /api/match/:id/predictions → PredictionBucket[]
export const PREDICTION_DISTRIBUTIONS = buildPredictionDistributions();

// Export individual user predictions (matchId → [home,away]) for potential future use
export const MOCK_USER_PREDICTIONS: Record<string, [number,number]>[] =
  RAW_USER_PREDS.map(preds =>
    Object.fromEntries(GROUP_MATCH_IDS.map((id, i) => [id, preds[i]]))
  );

// Order of users in RAW_USER_PREDS (Evolve first, then Sigma)
export const PREDICTION_USER_NAMES = [
  'Juan Pérez','Ricardo M.','Mariana S.','Eduardo V.','Paola H.',
  'Sebastián R.','Gabriela F.','Carlos B.','Diana R.','Miguel Á.',
  'Laura C.','Roberto F.','Ana M.','Fernando L.','Sofía G.',
  'Pablo N.','Valentina R.','Jorge A.','Carmen T.','David M.',
  'Alejandro G.','Patricia V.','Luis M.','Claudia S.','Héctor R.',
  'Mónica F.','Arturo L.','Sandra P.','Ramón C.','Lorena B.',
  'Óscar T.','Natalia V.','Tomás R.','Isabel M.','Víctor H.',
  'Daniela N.','Andrés S.','Rebeca L.','Ernesto C.','Alicia M.',
] as const;

// Map user name → their prediction record (matchId → [home, away])
export const USER_PREDICTIONS: Record<string, Record<string, [number,number]>> =
  Object.fromEntries(PREDICTION_USER_NAMES.map((name, i) => [name, MOCK_USER_PREDICTIONS[i]]));

// ── Keep this type export for consumers ──────────────────────────────────────
// (PREDICTION_DISTRIBUTIONS replaces the old const block below)

// Demo constants for Dev Tweaks simulation
export const DEMO_LIVE_MATCH: LiveMatch = { matchId: 'a1', homeScore: 1, awayScore: 0, minute: 30, status: 'IN_PLAY', duration: 'REGULAR' };

export const DEMO_PAST_IDS = new Set(['a1', 'a2', 'b1']);

export const DEMO_RESULTS: Record<string, { result: [number, number]; userPrediction: [number, number]; pointsEarned: number }> = {
  'a1': { result: [3, 1], userPrediction: [2, 0], pointsEarned: 5 },
  'a2': { result: [1, 1], userPrediction: [1, 1], pointsEarned: 10 },
  'b1': { result: [2, 0], userPrediction: [1, 2], pointsEarned: 0 },
};

export interface LiveMatch {
  matchId:  string;
  homeScore: number;
  awayScore: number;
  minute:   number | null;
  status:   string; // IN_PLAY | PAUSED | EXTRA_TIME | PENALTY_SHOOTOUT | FINISHED
  duration: string; // REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
}

// Set to an object while a match is in progress; null otherwise.
export const LIVE_MATCH: LiveMatch | null = null;

export type SlotMap = Record<string, { code: string; name: string }>;

export function resolveSlots(matches: Match[], slots: SlotMap): Match[] {
  return matches.map(m => ({
    ...m,
    home: m.slotHome && slots[m.slotHome] ? { ...slots[m.slotHome], placeholder: m.home.placeholder } : m.home,
    away: m.slotAway && slots[m.slotAway] ? { ...slots[m.slotAway], placeholder: m.away.placeholder } : m.away,
  }));
}

interface TeamStanding { code: string; name: string; pts: number; gd: number; gf: number; }

function computeGroupStandings(
  matches: Match[],
  results: Record<string, [number, number]>
): Record<string, TeamStanding[]> {
  const groups: Record<string, Record<string, TeamStanding>> = {};
  for (const m of matches) {
    const r = results[m.id];
    if (!r) continue;
    const [hg, ag] = r;
    const g = m.group;
    if (!groups[g]) groups[g] = {};
    const hc = m.home.code, ac = m.away.code;
    if (!groups[g][hc]) groups[g][hc] = { code: hc, name: m.home.name, pts: 0, gd: 0, gf: 0 };
    if (!groups[g][ac]) groups[g][ac] = { code: ac, name: m.away.name, pts: 0, gd: 0, gf: 0 };
    const home = groups[g][hc], away = groups[g][ac];
    home.gf += hg; home.gd += hg - ag;
    away.gf += ag; away.gd += ag - hg;
    if (hg > ag) home.pts += 3;
    else if (hg < ag) away.pts += 3;
    else { home.pts += 1; away.pts += 1; }
  }
  const sorted: Record<string, TeamStanding[]> = {};
  for (const [g, teams] of Object.entries(groups)) {
    sorted[g] = Object.values(teams).sort((a, b) =>
      b.pts !== a.pts ? b.pts - a.pts : b.gd !== a.gd ? b.gd - a.gd : b.gf - a.gf
    );
  }
  return sorted;
}

// Derives a complete SlotMap from actual match results — group standings, best 3rds,
// and knockout progressions — so bracket fills automatically without hardcoded winners.
export function computeSlots(
  groupMatches: Match[],
  knockoutMatches: Match[],
  results: Record<string, [number, number]>,
  /** Explicit winner for matches decided by extra-time / penalties.
   *  'home' | 'away' relative to our DB home/away (not necessarily the API's). */
  penaltyWinners?: Record<string, 'home' | 'away'>,
): SlotMap {
  const slots: SlotMap = {};

  // 1. Group standings → 1A…1L, 2A…2L
  const standings = computeGroupStandings(groupMatches, results);
  for (const [group, teams] of Object.entries(standings)) {
    const letter = group.replace('GRUPO ', '');
    if (teams[0]) slots[`1${letter}`] = { code: teams[0].code, name: teams[0].name };
    if (teams[1]) slots[`2${letter}`] = { code: teams[1].code, name: teams[1].name };
  }

  // 2. Best 8 third-place teams → T3_1…T3_8
  const thirds: TeamStanding[] = [];
  for (const teams of Object.values(standings)) {
    if (teams[2]) thirds.push(teams[2]);
  }
  thirds.sort((a, b) =>
    b.pts !== a.pts ? b.pts - a.pts : b.gd !== a.gd ? b.gd - a.gd : b.gf - a.gf
  );
  thirds.slice(0, 8).forEach((t, i) => { slots[`T3_${i + 1}`] = { code: t.code, name: t.name }; });

  // 3. Knockout progression — process in document order (R32→R16→QF→SF→TP→F)
  //    so each round's winners are in slots before the next round resolves them.
  for (const match of knockoutMatches) {
    const r = results[match.id];
    if (!r) continue;
    const homeTeam = match.slotHome ? slots[match.slotHome] : null;
    const awayTeam = match.slotAway ? slots[match.slotAway] : null;
    if (!homeTeam || !awayTeam) continue;
    const [hg, ag] = r;

    let winner: { code: string; name: string };
    let loser:  { code: string; name: string };

    if (hg > ag) {
      winner = homeTeam; loser = awayTeam;
    } else if (ag > hg) {
      winner = awayTeam; loser = homeTeam;
    } else {
      // Draw after 90 min — need explicit penalty/ET winner
      const w = penaltyWinners?.[match.id];
      if (!w) continue; // still unresolved, skip
      winner = w === 'home' ? homeTeam : awayTeam;
      loser  = w === 'home' ? awayTeam : homeTeam;
    }

    slots[`W_${match.id}`] = { code: winner.code, name: winner.name };
    if (match.id.startsWith('sf_')) slots[`L_${match.id}`] = { code: loser.code, name: loser.name };
  }

  return slots;
}

// Mock group stage winners/runners-up for dev simulation
export const MOCK_BRACKET_SLOTS: SlotMap = {
  // Group winners (1st place)
  '1A': { code: 'MEX', name: 'México' }, '1B': { code: 'CAN', name: 'Canadá' },
  '1C': { code: 'BRA', name: 'Brasil' }, '1D': { code: 'USA', name: 'Estados Unidos' },
  '1E': { code: 'GER', name: 'Alemania' }, '1F': { code: 'NED', name: 'Países Bajos' },
  '1G': { code: 'BEL', name: 'Bélgica' }, '1H': { code: 'ESP', name: 'España' },
  '1I': { code: 'FRA', name: 'Francia' }, '1J': { code: 'ARG', name: 'Argentina' },
  '1K': { code: 'POR', name: 'Portugal' }, '1L': { code: 'ENG', name: 'Inglaterra' },
  // Group runners-up (2nd place)
  '2A': { code: 'KOR', name: 'Corea del Sur' }, '2B': { code: 'SUI', name: 'Suiza' },
  '2C': { code: 'MAR', name: 'Marruecos' }, '2D': { code: 'AUS', name: 'Australia' },
  '2E': { code: 'CIV', name: 'Costa de Marfil' }, '2F': { code: 'JPN', name: 'Japón' },
  '2G': { code: 'IRN', name: 'Irán' }, '2H': { code: 'URU', name: 'Uruguay' },
  '2I': { code: 'NOR', name: 'Noruega' }, '2J': { code: 'AUT', name: 'Austria' },
  '2K': { code: 'COL', name: 'Colombia' }, '2L': { code: 'CRO', name: 'Croacia' },
  // Best 3rd-place teams (8 slots)
  'T3_1': { code: 'CZE', name: 'República Checa' }, 'T3_2': { code: 'SUI', name: 'Suiza' },
  'T3_3': { code: 'TUR', name: 'Turquía' }, 'T3_4': { code: 'ECU', name: 'Ecuador' },
  'T3_5': { code: 'SWE', name: 'Suecia' }, 'T3_6': { code: 'EGY', name: 'Egipto' },
  'T3_7': { code: 'KSA', name: 'Arabia Saudita' }, 'T3_8': { code: 'SEN', name: 'Senegal' },
  // Round of 32 winners (→ R16)
  'W_r32_01': { code: 'MEX', name: 'México' }, 'W_r32_02': { code: 'BRA', name: 'Brasil' },
  'W_r32_03': { code: 'GER', name: 'Alemania' }, 'W_r32_04': { code: 'BEL', name: 'Bélgica' },
  'W_r32_05': { code: 'FRA', name: 'Francia' }, 'W_r32_06': { code: 'ARG', name: 'Argentina' },
  'W_r32_07': { code: 'POR', name: 'Portugal' }, 'W_r32_08': { code: 'ESP', name: 'España' },
  'W_r32_09': { code: 'CAN', name: 'Canadá' }, 'W_r32_10': { code: 'MAR', name: 'Marruecos' },
  'W_r32_11': { code: 'NED', name: 'Países Bajos' }, 'W_r32_12': { code: 'URU', name: 'Uruguay' },
  'W_r32_13': { code: 'ENG', name: 'Inglaterra' }, 'W_r32_14': { code: 'COL', name: 'Colombia' },
  'W_r32_15': { code: 'USA', name: 'Estados Unidos' }, 'W_r32_16': { code: 'CZE', name: 'República Checa' },
  // Round of 16 winners (→ QF)
  'W_r16_01': { code: 'MEX', name: 'México' }, 'W_r16_02': { code: 'GER', name: 'Alemania' },
  'W_r16_03': { code: 'FRA', name: 'Francia' }, 'W_r16_04': { code: 'POR', name: 'Portugal' },
  'W_r16_05': { code: 'BRA', name: 'Brasil' }, 'W_r16_06': { code: 'NED', name: 'Países Bajos' },
  'W_r16_07': { code: 'ENG', name: 'Inglaterra' }, 'W_r16_08': { code: 'ARG', name: 'Argentina' },
  // QF winners (→ SF)
  'W_qf_01': { code: 'MEX', name: 'México' }, 'W_qf_02': { code: 'FRA', name: 'Francia' },
  'W_qf_03': { code: 'BRA', name: 'Brasil' }, 'W_qf_04': { code: 'ARG', name: 'Argentina' },
  // SF winners/losers (→ Final / 3rd Place)
  'W_sf_01': { code: 'MEX', name: 'México' }, 'W_sf_02': { code: 'ARG', name: 'Argentina' },
  'L_sf_01': { code: 'FRA', name: 'Francia' }, 'L_sf_02': { code: 'BRA', name: 'Brasil' },
};

// Resultados simulados para todas las fases — usados por computeSlots cuando
// "Simular eliminatorias" está activo. Los equipos que avanzan se derivan
// automáticamente de estos marcadores, sin hardcodear ganadores.
export const MOCK_RESULTS: Record<string, [number, number]> = {
  // ── GRUPO A: MEX 1°, KOR 2°, RSA 3°, CZE 4° ──────────────────────────────
  // a1: MEX 2-1 RSA | a2: KOR 2-1 CZE | a3: CZE 0-1 RSA
  // a4: MEX 3-0 KOR | a5: RSA 1-2 KOR | a6: CZE 0-2 MEX
  a1:[2,1], a2:[2,1], a3:[0,1], a4:[3,0], a5:[1,2], a6:[0,2],

  // ── GRUPO B: CAN 1°, SUI 2°, BIH 3°, QAT 4° ──────────────────────────────
  // b1: CAN 2-0 BIH | b2: QAT 0-3 SUI | b3: SUI 2-0 BIH
  // b4: CAN 3-1 QAT | b5: SUI 1-2 CAN | b6: BIH 2-0 QAT
  b1:[2,0], b2:[0,3], b3:[2,0], b4:[3,1], b5:[1,2], b6:[2,0],

  // ── GRUPO C: BRA 1°, MAR 2°, SCO 3°, HAI 4° ──────────────────────────────
  // c1: BRA 3-0 MAR | c2: HAI 0-2 SCO | c3: SCO 0-2 MAR
  // c4: BRA 4-0 HAI | c5: MAR 2-1 HAI | c6: SCO 0-3 BRA
  c1:[3,0], c2:[0,2], c3:[0,2], c4:[4,0], c5:[2,1], c6:[0,3],

  // ── GRUPO D: USA 1°, AUS 2°, PAR 3°, TUR 4° ──────────────────────────────
  // d1: USA 2-0 PAR | d2: AUS 2-1 TUR | d3: USA 2-1 AUS
  // d4: TUR 0-2 PAR | d5: TUR 1-2 USA | d6: PAR 1-2 AUS
  d1:[2,0], d2:[2,1], d3:[2,1], d4:[0,2], d5:[1,2], d6:[1,2],

  // ── GRUPO E: GER 1°, CIV 2°, ECU 3°, CUW 4° ──────────────────────────────
  // e1: GER 4-0 CUW | e2: CIV 2-0 ECU | e3: GER 2-1 CIV
  // e4: ECU 3-0 CUW | e5: CUW 0-2 CIV | e6: ECU 1-3 GER
  e1:[4,0], e2:[2,0], e3:[2,1], e4:[3,0], e5:[0,2], e6:[1,3],

  // ── GRUPO F: NED 1°, JPN 2°, TUN 3°, SWE 4° ──────────────────────────────
  // f1: NED 2-1 JPN | f2: SWE 0-1 TUN | f3: NED 1-1 SWE
  // f4: JPN 3-0 TUN | f5: TUN 0-2 NED | f6: JPN 2-0 SWE
  f1:[2,1], f2:[0,1], f3:[1,1], f4:[3,0], f5:[0,2], f6:[2,0],

  // ── GRUPO G: BEL 1°, IRN 2°, EGY 3°, NZL 4° ──────────────────────────────
  // g1: BEL 3-0 EGY | g2: IRN 2-0 NZL | g3: BEL 2-1 IRN
  // g4: NZL 1-1 EGY | g5: NZL 0-3 BEL | g6: EGY 1-2 IRN
  g1:[3,0], g2:[2,0], g3:[2,1], g4:[1,1], g5:[0,3], g6:[1,2],

  // ── GRUPO H: ESP 1°, URU 2°, KSA 3°, CPV 4° ──────────────────────────────
  // h1: ESP 3-0 CPV | h2: KSA 0-1 URU | h3: ESP 2-1 KSA
  // h4: URU 2-0 CPV | h5: CPV 0-1 KSA | h6: URU 0-1 ESP
  h1:[3,0], h2:[0,1], h3:[2,1], h4:[2,0], h5:[0,1], h6:[0,1],

  // ── GRUPO I: FRA 1°, NOR 2°, SEN 3°, IRQ 4° ──────────────────────────────
  // i1: FRA 2-0 SEN | i2: IRQ 0-2 NOR | i3: FRA 3-0 IRQ
  // i4: NOR 2-1 SEN | i5: NOR 0-2 FRA | i6: SEN 2-1 IRQ
  i1:[2,0], i2:[0,2], i3:[3,0], i4:[2,1], i5:[0,2], i6:[2,1],

  // ── GRUPO J: ARG 1°, AUT 2°, ALG 3°, JOR 4° ──────────────────────────────
  // j1: ARG 2-0 ALG | j2: AUT 2-1 JOR | j3: ARG 3-1 AUT
  // j4: JOR 0-1 ALG | j5: ALG 1-2 AUT | j6: JOR 0-4 ARG
  j1:[2,0], j2:[2,1], j3:[3,1], j4:[0,1], j5:[1,2], j6:[0,4],

  // ── GRUPO K: POR 1°, COL 2°, COD 3°, UZB 4° ──────────────────────────────
  // k1: POR 3-0 COD | k2: UZB 0-2 COL | k3: POR 2-1 UZB
  // k4: COL 2-0 COD | k5: COL 1-2 POR | k6: COD 2-0 UZB
  k1:[3,0], k2:[0,2], k3:[2,1], k4:[2,0], k5:[1,2], k6:[2,0],

  // ── GRUPO L: ENG 1°, CRO 2°, PAN 3°, GHA 4° ──────────────────────────────
  // l1: ENG 2-0 CRO | l2: GHA 1-2 PAN | l3: ENG 3-0 GHA
  // l4: PAN 0-2 CRO | l5: PAN 1-3 ENG | l6: CRO 3-0 GHA
  l1:[2,0], l2:[1,2], l3:[3,0], l4:[0,2], l5:[1,3], l6:[3,0],

  // Mejores 3°: ECU(GD-1,GF4) > RSA(GD-1,GF3) > PAR(GD-1,GF3) > KSA(GD-1,GF2)
  //             > SEN(GD-2,GF3) > BIH(GD-2,GF2) > ALG(GD-2,GF2) > PAN(GD-3,GF3)
  // T3_1=ECU, T3_2=RSA, T3_3=PAR, T3_4=KSA, T3_5=SEN, T3_6=BIH, T3_7=ALG, T3_8=PAN

  // ── DIECISEISAVOS ──────────────────────────────────────────────────────────
  // r32_01: MEX(1A) 2-1 MAR(2C)  r32_02: BRA(1C) 3-0 KOR(2A)
  // r32_03: CAN(1B) 2-0 AUS(2D)  r32_04: USA(1D) 2-1 SUI(2B)
  // r32_05: GER(1E) 3-1 IRN(2G)  r32_06: BEL(1G) 2-0 CIV(2E)
  // r32_07: NED(1F) 1-0 URU(2H)  r32_08: ESP(1H) 2-1 JPN(2F)
  // r32_09: FRA(1I) 2-0 COL(2K)  r32_10: POR(1K) 2-1 NOR(2I)
  // r32_11: ARG(1J) 3-1 CRO(2L)  r32_12: ENG(1L) 2-0 AUT(2J)
  // r32_13: ECU(T3_1) 2-1 RSA(T3_2)  r32_14: PAR(T3_3) 2-1 KSA(T3_4)
  // r32_15: SEN(T3_5) 1-0 BIH(T3_6)  r32_16: ALG(T3_7) 1-0 PAN(T3_8)
  r32_01:[2,1], r32_02:[3,0], r32_03:[2,0], r32_04:[2,1],
  r32_05:[3,1], r32_06:[2,0], r32_07:[1,0], r32_08:[2,1],
  r32_09:[2,0], r32_10:[2,1], r32_11:[3,1], r32_12:[2,0],
  r32_13:[2,1], r32_14:[2,1], r32_15:[1,0], r32_16:[1,0],

  // ── OCTAVOS ────────────────────────────────────────────────────────────────
  // r16_01: MEX 2-1 BRA  r16_02: CAN 0-1 USA  r16_03: GER 2-0 BEL  r16_04: NED 1-2 ESP
  // r16_05: FRA 2-1 POR  r16_06: ARG 2-1 ENG  r16_07: ECU 2-0 PAR  r16_08: SEN 2-1 ALG
  r16_01:[2,1], r16_02:[0,1], r16_03:[2,0], r16_04:[1,2],
  r16_05:[2,1], r16_06:[2,1], r16_07:[2,0], r16_08:[2,1],

  // ── CUARTOS ────────────────────────────────────────────────────────────────
  // qf_01: MEX 2-1 USA  qf_02: GER 1-2 ESP  qf_03: FRA 1-2 ARG  qf_04: ECU 0-1 SEN
  qf_01:[2,1], qf_02:[1,2], qf_03:[1,2], qf_04:[0,1],

  // ── SEMIFINALES ────────────────────────────────────────────────────────────
  // sf_01: MEX 1-0 ESP  →  W=MEX L=ESP
  // sf_02: ARG 2-1 SEN  →  W=ARG L=SEN
  sf_01:[1,0], sf_02:[2,1],

  // ── TERCER LUGAR: ESP 2-1 SEN ──────────────────────────────────────────────
  tp_01:[2,1],

  // ── FINAL: MEX 2-1 ARG 🏆 ─────────────────────────────────────────────────
  f_01:[2,1],
};

export const MATCHES: Match[] = [
  // ── TEST EN VIVO (Serie A — borrar después) ──
  { id: 'test1', group: 'SERIE A', home: { code: 'FIO', name: 'Fiorentina' }, away: { code: 'ATA', name: 'Atalanta' }, date: 'jue. 22 may. 2026 12:45 pm', stadium: 'Stadio Artemio Franchi · Florencia', prediction: null, lastUpdate: null },
  // ── GRUPO A ──
  { id: 'a1', group: 'GRUPO A', home: { code: 'MEX', name: 'México' },        away: { code: 'RSA', name: 'Sudáfrica' },     date: 'jue. 11 jun. 2026 01:00 pm', stadium: 'Estadio Ciudad de México · México',               prediction: null, lastUpdate: null },
  { id: 'a2', group: 'GRUPO A', home: { code: 'KOR', name: 'Corea del Sur' }, away: { code: 'CZE', name: 'República Checa' },        date: 'jue. 11 jun. 2026 08:00 pm', stadium: 'Estadio Guadalajara · México',               prediction: null, lastUpdate: null },
  { id: 'a3', group: 'GRUPO A', home: { code: 'CZE', name: 'República Checa' },       away: { code: 'RSA', name: 'Sudáfrica' },     date: 'jue. 18 jun. 2026 10:00 am', stadium: 'Estadio de Atlanta · EUA',           prediction: null, lastUpdate: null },
  { id: 'a4', group: 'GRUPO A', home: { code: 'MEX', name: 'México' },        away: { code: 'KOR', name: 'Corea del Sur' }, date: 'jue. 18 jun. 2026 07:00 pm', stadium: 'Estadio Guadalajara · México',               prediction: null, lastUpdate: null },
  { id: 'a5', group: 'GRUPO A', home: { code: 'RSA', name: 'Sudáfrica' },     away: { code: 'KOR', name: 'Corea del Sur' }, date: 'mié. 24 jun. 2026 07:00 pm', stadium: 'Estadio de Miami · EUA',              prediction: null, lastUpdate: null },
  { id: 'a6', group: 'GRUPO A', home: { code: 'CZE', name: 'República Checa' },       away: { code: 'MEX', name: 'México' },        date: 'mié. 24 jun. 2026 07:00 pm', stadium: 'Estadio Ciudad de México · México',               prediction: null, lastUpdate: null },

  // ── GRUPO B ──
  { id: 'b1', group: 'GRUPO B', home: { code: 'CAN', name: 'Canadá' },              away: { code: 'BIH', name: 'Bosnia y Herzegovina' }, date: 'vie. 12 jun. 2026 01:00 pm', stadium: 'Estadio de Toronto · Canadá',                   prediction: null, lastUpdate: null },
  { id: 'b2', group: 'GRUPO B', home: { code: 'QAT', name: 'Qatar' },               away: { code: 'SUI', name: 'Suiza' },          date: 'sáb. 13 jun. 2026 01:00 pm', stadium: 'Estadio BC Place Vancouver · Canadá',                    prediction: null, lastUpdate: null },
  { id: 'b3', group: 'GRUPO B', home: { code: 'SUI', name: 'Suiza' },               away: { code: 'BIH', name: 'Bosnia y Herzegovina' }, date: 'jue. 18 jun. 2026 01:00 pm', stadium: 'Estadio de Seattle · EUA',                    prediction: null, lastUpdate: null },
  { id: 'b4', group: 'GRUPO B', home: { code: 'CAN', name: 'Canadá' },              away: { code: 'QAT', name: 'Qatar' },          date: 'jue. 18 jun. 2026 04:00 pm', stadium: 'Estadio BC Place Vancouver · Canadá',                    prediction: null, lastUpdate: null },
  { id: 'b5', group: 'GRUPO B', home: { code: 'SUI', name: 'Suiza' },               away: { code: 'CAN', name: 'Canadá' },         date: 'mié. 24 jun. 2026 01:00 pm', stadium: 'Estadio de Los Ángeles · EUA',                   prediction: null, lastUpdate: null },
  { id: 'b6', group: 'GRUPO B', home: { code: 'BIH', name: 'Bosnia y Herzegovina' },     away: { code: 'QAT', name: 'Qatar' },          date: 'mié. 24 jun. 2026 01:00 pm', stadium: 'Estadio de Toronto · Canadá',                   prediction: null, lastUpdate: null },

  // ── GRUPO C ──
  { id: 'c1', group: 'GRUPO C', home: { code: 'BRA', name: 'Brasil' },    away: { code: 'MAR', name: 'Marruecos' }, date: 'sáb. 13 jun. 2026 04:00 pm', stadium: 'Estadio Nueva York / Nueva Jersey · EUA',                prediction: null, lastUpdate: null },
  { id: 'c2', group: 'GRUPO C', home: { code: 'HAI', name: 'Haití' },     away: { code: 'SCO', name: 'Escocia' },   date: 'sáb. 13 jun. 2026 07:00 pm', stadium: 'Estadio de San Francisco · EUA',                  prediction: null, lastUpdate: null },
  { id: 'c3', group: 'GRUPO C', home: { code: 'SCO', name: 'Escocia' },   away: { code: 'MAR', name: 'Marruecos' }, date: 'vie. 19 jun. 2026 04:00 pm', stadium: 'Estadio de Boston · EUA',                prediction: null, lastUpdate: null },
  { id: 'c4', group: 'GRUPO C', home: { code: 'BRA', name: 'Brasil' },    away: { code: 'HAI', name: 'Haití' },     date: 'vie. 19 jun. 2026 06:30 pm', stadium: 'Estadio de Dallas · EUA',                   prediction: null, lastUpdate: null },
  { id: 'c5', group: 'GRUPO C', home: { code: 'MAR', name: 'Marruecos' }, away: { code: 'HAI', name: 'Haití' },     date: 'mié. 24 jun. 2026 04:00 pm', stadium: 'Estadio de Houston · EUA',                    prediction: null, lastUpdate: null },
  { id: 'c6', group: 'GRUPO C', home: { code: 'SCO', name: 'Escocia' },   away: { code: 'BRA', name: 'Brasil' },    date: 'mié. 24 jun. 2026 04:00 pm', stadium: 'Estadio Nueva York / Nueva Jersey · EUA',                prediction: null, lastUpdate: null },

  // ── GRUPO D ──
  { id: 'd1', group: 'GRUPO D', home: { code: 'USA', name: 'Estados Unidos' },       away: { code: 'PAR', name: 'Paraguay' },   date: 'vie. 12 jun. 2026 07:00 pm', stadium: 'Estadio de Los Ángeles · EUA',                   prediction: null, lastUpdate: null },
  { id: 'd2', group: 'GRUPO D', home: { code: 'AUS', name: 'Australia' }, away: { code: 'TUR', name: 'Turquía' },    date: 'sáb. 13 jun. 2026 10:00 pm', stadium: 'Estadio BC Place Vancouver · Canadá',                    prediction: null, lastUpdate: null },
  { id: 'd3', group: 'GRUPO D', home: { code: 'USA', name: 'Estados Unidos' },       away: { code: 'AUS', name: 'Australia' },  date: 'vie. 19 jun. 2026 01:00 pm', stadium: 'Estadio de Seattle · EUA',                    prediction: null, lastUpdate: null },
  { id: 'd4', group: 'GRUPO D', home: { code: 'TUR', name: 'Turquía' },   away: { code: 'PAR', name: 'Paraguay' },   date: 'vie. 19 jun. 2026 09:00 pm', stadium: 'Estadio de Houston · EUA',                    prediction: null, lastUpdate: null },
  { id: 'd5', group: 'GRUPO D', home: { code: 'TUR', name: 'Turquía' },   away: { code: 'USA', name: 'Estados Unidos' },        date: 'jue. 25 jun. 2026 08:00 pm', stadium: 'Estadio de Dallas · EUA',                   prediction: null, lastUpdate: null },
  { id: 'd6', group: 'GRUPO D', home: { code: 'PAR', name: 'Paraguay' },  away: { code: 'AUS', name: 'Australia' },  date: 'jue. 25 jun. 2026 08:00 pm', stadium: 'Estadio BC Place Vancouver · Canadá',                    prediction: null, lastUpdate: null },

  // ── GRUPO E ──
  { id: 'e1', group: 'GRUPO E', home: { code: 'GER', name: 'Alemania' },      away: { code: 'CUW', name: 'Curazao' },         date: 'dom. 14 jun. 2026 11:00 am', stadium: 'Estadio de Houston · EUA',                    prediction: null, lastUpdate: null },
  { id: 'e2', group: 'GRUPO E', home: { code: 'CIV', name: 'Costa de Marfil' }, away: { code: 'ECU', name: 'Ecuador' },      date: 'dom. 14 jun. 2026 05:00 pm', stadium: 'Estadio de Filadelfia · EUA',         prediction: null, lastUpdate: null },
  { id: 'e3', group: 'GRUPO E', home: { code: 'GER', name: 'Alemania' },      away: { code: 'CIV', name: 'Costa de Marfil' }, date: 'sáb. 20 jun. 2026 02:00 pm', stadium: 'Estadio de Atlanta · EUA',           prediction: null, lastUpdate: null },
  { id: 'e4', group: 'GRUPO E', home: { code: 'ECU', name: 'Ecuador' },       away: { code: 'CUW', name: 'Curazao' },         date: 'sáb. 20 jun. 2026 06:00 pm', stadium: 'Estadio de Miami · EUA',              prediction: null, lastUpdate: null },
  { id: 'e5', group: 'GRUPO E', home: { code: 'CUW', name: 'Curazao' },       away: { code: 'CIV', name: 'Costa de Marfil' }, date: 'jue. 25 jun. 2026 02:00 pm', stadium: 'Estadio de Boston · EUA',                prediction: null, lastUpdate: null },
  { id: 'e6', group: 'GRUPO E', home: { code: 'ECU', name: 'Ecuador' },       away: { code: 'GER', name: 'Alemania' },        date: 'jue. 25 jun. 2026 02:00 pm', stadium: 'Estadio de Filadelfia · EUA',         prediction: null, lastUpdate: null },

  // ── GRUPO F ──
  { id: 'f1', group: 'GRUPO F', home: { code: 'NED', name: 'Países Bajos' }, away: { code: 'JPN', name: 'Japón' },   date: 'dom. 14 jun. 2026 02:00 pm', stadium: 'Estadio de Dallas · EUA',                   prediction: null, lastUpdate: null },
  { id: 'f2', group: 'GRUPO F', home: { code: 'SWE', name: 'Suecia' },       away: { code: 'TUN', name: 'Túnez' },   date: 'dom. 14 jun. 2026 08:00 pm', stadium: 'Estadio Monterrey · México',                 prediction: null, lastUpdate: null },
  { id: 'f3', group: 'GRUPO F', home: { code: 'NED', name: 'Países Bajos' }, away: { code: 'SWE', name: 'Suecia' },  date: 'sáb. 20 jun. 2026 04:00 pm', stadium: 'Estadio de Houston · EUA',                    prediction: null, lastUpdate: null },
  { id: 'f4', group: 'GRUPO F', home: { code: 'JPN', name: 'Japón' },        away: { code: 'TUN', name: 'Túnez' },   date: 'sáb. 20 jun. 2026 08:00 pm', stadium: 'Estadio de Filadelfia · EUA',         prediction: null, lastUpdate: null },
  { id: 'f5', group: 'GRUPO F', home: { code: 'TUN', name: 'Túnez' },        away: { code: 'NED', name: 'Países Bajos' }, date: 'jue. 25 jun. 2026 05:00 pm', stadium: 'Estadio Monterrey · México',             prediction: null, lastUpdate: null },
  { id: 'f6', group: 'GRUPO F', home: { code: 'JPN', name: 'Japón' },        away: { code: 'SWE', name: 'Suecia' },  date: 'jue. 25 jun. 2026 05:00 pm', stadium: 'Estadio de Dallas · EUA',                   prediction: null, lastUpdate: null },

  // ── GRUPO G ──
  { id: 'g1', group: 'GRUPO G', home: { code: 'BEL', name: 'Bélgica' },      away: { code: 'EGY', name: 'Egipto' },       date: 'lun. 15 jun. 2026 01:00 pm', stadium: 'Estadio de Seattle · EUA',                    prediction: null, lastUpdate: null },
  { id: 'g2', group: 'GRUPO G', home: { code: 'IRN', name: 'Irán' },          away: { code: 'NZL', name: 'Nueva Zelanda' }, date: 'lun. 15 jun. 2026 07:00 pm', stadium: 'Estadio de Los Ángeles · EUA',                   prediction: null, lastUpdate: null },
  { id: 'g3', group: 'GRUPO G', home: { code: 'BEL', name: 'Bélgica' },      away: { code: 'IRN', name: 'Irán' },          date: 'dom. 21 jun. 2026 01:00 pm', stadium: 'Estadio de San Francisco · EUA',                  prediction: null, lastUpdate: null },
  { id: 'g4', group: 'GRUPO G', home: { code: 'NZL', name: 'Nueva Zelanda' }, away: { code: 'EGY', name: 'Egipto' },       date: 'dom. 21 jun. 2026 07:00 pm', stadium: 'Estadio BC Place Vancouver · Canadá',                    prediction: null, lastUpdate: null },
  { id: 'g5', group: 'GRUPO G', home: { code: 'NZL', name: 'Nueva Zelanda' }, away: { code: 'BEL', name: 'Bélgica' },     date: 'vie. 26 jun. 2026 09:00 pm', stadium: 'Estadio de Seattle · EUA',                    prediction: null, lastUpdate: null },
  { id: 'g6', group: 'GRUPO G', home: { code: 'EGY', name: 'Egipto' },       away: { code: 'IRN', name: 'Irán' },          date: 'vie. 26 jun. 2026 09:00 pm', stadium: 'Estadio de Los Ángeles · EUA',                   prediction: null, lastUpdate: null },

  // ── GRUPO H ──
  { id: 'h1', group: 'GRUPO H', home: { code: 'ESP', name: 'España' },    away: { code: 'CPV', name: 'Cabo Verde' },    date: 'lun. 15 jun. 2026 10:00 am', stadium: 'Estadio de Atlanta · EUA',           prediction: null, lastUpdate: null },
  { id: 'h2', group: 'GRUPO H', home: { code: 'KSA', name: 'Arabia Saudita' }, away: { code: 'URU', name: 'Uruguay' }, date: 'lun. 15 jun. 2026 04:00 pm', stadium: 'Estadio de Miami · EUA',              prediction: null, lastUpdate: null },
  { id: 'h3', group: 'GRUPO H', home: { code: 'ESP', name: 'España' },    away: { code: 'KSA', name: 'Arabia Saudita' }, date: 'dom. 21 jun. 2026 10:00 am', stadium: 'Estadio de Boston · EUA',              prediction: null, lastUpdate: null },
  { id: 'h4', group: 'GRUPO H', home: { code: 'URU', name: 'Uruguay' },   away: { code: 'CPV', name: 'Cabo Verde' },    date: 'dom. 21 jun. 2026 04:00 pm', stadium: 'Estadio de Atlanta · EUA',           prediction: null, lastUpdate: null },
  { id: 'h5', group: 'GRUPO H', home: { code: 'CPV', name: 'Cabo Verde' }, away: { code: 'KSA', name: 'Arabia Saudita' }, date: 'vie. 26 jun. 2026 06:00 pm', stadium: 'Estadio de Miami · EUA',            prediction: null, lastUpdate: null },
  { id: 'h6', group: 'GRUPO H', home: { code: 'URU', name: 'Uruguay' },   away: { code: 'ESP', name: 'España' },        date: 'vie. 26 jun. 2026 06:00 pm', stadium: 'Estadio Nueva York / Nueva Jersey · EUA',                prediction: null, lastUpdate: null },

  // ── GRUPO I ──
  { id: 'i1', group: 'GRUPO I', home: { code: 'FRA', name: 'Francia' },   away: { code: 'SEN', name: 'Senegal' }, date: 'mar. 16 jun. 2026 01:00 pm', stadium: 'Estadio Nueva York / Nueva Jersey · EUA',                prediction: null, lastUpdate: null },
  { id: 'i2', group: 'GRUPO I', home: { code: 'IRQ', name: 'Irak' },      away: { code: 'NOR', name: 'Noruega' }, date: 'mar. 16 jun. 2026 04:00 pm', stadium: 'Estadio de Boston · EUA',                prediction: null, lastUpdate: null },
  { id: 'i3', group: 'GRUPO I', home: { code: 'FRA', name: 'Francia' },   away: { code: 'IRQ', name: 'Irak' },    date: 'lun. 22 jun. 2026 03:00 pm', stadium: 'Estadio de Dallas · EUA',                   prediction: null, lastUpdate: null },
  { id: 'i4', group: 'GRUPO I', home: { code: 'NOR', name: 'Noruega' },   away: { code: 'SEN', name: 'Senegal' }, date: 'lun. 22 jun. 2026 06:00 pm', stadium: 'Estadio Nueva York / Nueva Jersey · EUA',                prediction: null, lastUpdate: null },
  { id: 'i5', group: 'GRUPO I', home: { code: 'NOR', name: 'Noruega' },   away: { code: 'FRA', name: 'Francia' }, date: 'vie. 26 jun. 2026 01:00 pm', stadium: 'Estadio de Los Ángeles · EUA',                   prediction: null, lastUpdate: null },
  { id: 'i6', group: 'GRUPO I', home: { code: 'SEN', name: 'Senegal' },   away: { code: 'IRQ', name: 'Irak' },    date: 'vie. 26 jun. 2026 01:00 pm', stadium: 'Estadio de Houston · EUA',                    prediction: null, lastUpdate: null },

  // ── GRUPO J ──
  { id: 'j1', group: 'GRUPO J', home: { code: 'ARG', name: 'Argentina' }, away: { code: 'ALG', name: 'Argelia' },  date: 'mar. 16 jun. 2026 07:00 pm', stadium: 'Estadio Monterrey · México',                 prediction: null, lastUpdate: null },
  { id: 'j2', group: 'GRUPO J', home: { code: 'AUT', name: 'Austria' },   away: { code: 'JOR', name: 'Jordania' }, date: 'mar. 16 jun. 2026 10:00 pm', stadium: 'Estadio Guadalajara · México',               prediction: null, lastUpdate: null },
  { id: 'j3', group: 'GRUPO J', home: { code: 'ARG', name: 'Argentina' }, away: { code: 'AUT', name: 'Austria' },  date: 'lun. 22 jun. 2026 11:00 am', stadium: 'Estadio de Miami · EUA',              prediction: null, lastUpdate: null },
  { id: 'j4', group: 'GRUPO J', home: { code: 'JOR', name: 'Jordania' },  away: { code: 'ALG', name: 'Argelia' },  date: 'lun. 22 jun. 2026 09:00 pm', stadium: 'Estadio Monterrey · México',                 prediction: null, lastUpdate: null },
  { id: 'j5', group: 'GRUPO J', home: { code: 'ALG', name: 'Argelia' },   away: { code: 'AUT', name: 'Austria' },  date: 'sáb. 27 jun. 2026 08:00 pm', stadium: 'Estadio BC Place Vancouver · Canadá',                    prediction: null, lastUpdate: null },
  { id: 'j6', group: 'GRUPO J', home: { code: 'JOR', name: 'Jordania' },  away: { code: 'ARG', name: 'Argentina' }, date: 'sáb. 27 jun. 2026 08:00 pm', stadium: 'Estadio Ciudad de México · México',             prediction: null, lastUpdate: null },

  // ── GRUPO K ──
  { id: 'k1', group: 'GRUPO K', home: { code: 'POR', name: 'Portugal' },  away: { code: 'COD', name: 'Rep. Dem. del Congo' },    date: 'mié. 17 jun. 2026 11:00 am', stadium: 'Estadio de Filadelfia · EUA',         prediction: null, lastUpdate: null },
  { id: 'k2', group: 'GRUPO K', home: { code: 'UZB', name: 'Uzbekistán' }, away: { code: 'COL', name: 'Colombia' },   date: 'mié. 17 jun. 2026 08:00 pm', stadium: 'Estadio de San Francisco · EUA',                  prediction: null, lastUpdate: null },
  { id: 'k3', group: 'GRUPO K', home: { code: 'POR', name: 'Portugal' },  away: { code: 'UZB', name: 'Uzbekistán' }, date: 'mar. 23 jun. 2026 11:00 am', stadium: 'Estadio de Boston · EUA',                prediction: null, lastUpdate: null },
  { id: 'k4', group: 'GRUPO K', home: { code: 'COL', name: 'Colombia' },  away: { code: 'COD', name: 'Rep. Dem. del Congo' },    date: 'mar. 23 jun. 2026 08:00 pm', stadium: 'Estadio de Los Ángeles · EUA',                   prediction: null, lastUpdate: null },
  { id: 'k5', group: 'GRUPO K', home: { code: 'COL', name: 'Colombia' },  away: { code: 'POR', name: 'Portugal' },   date: 'sáb. 27 jun. 2026 05:30 pm', stadium: 'Estadio de Miami · EUA',              prediction: null, lastUpdate: null },
  { id: 'k6', group: 'GRUPO K', home: { code: 'COD', name: 'Rep. Dem. del Congo' },  away: { code: 'UZB', name: 'Uzbekistán' }, date: 'sáb. 27 jun. 2026 05:30 pm', stadium: 'Estadio de Seattle · EUA',                    prediction: null, lastUpdate: null },

  // ── GRUPO L ──
  { id: 'l1', group: 'GRUPO L', home: { code: 'ENG', name: 'Inglaterra' }, away: { code: 'CRO', name: 'Croacia' },  date: 'mié. 17 jun. 2026 02:00 pm', stadium: 'Estadio Nueva York / Nueva Jersey · EUA',                prediction: null, lastUpdate: null },
  { id: 'l2', group: 'GRUPO L', home: { code: 'GHA', name: 'Ghana' },      away: { code: 'PAN', name: 'Panamá' },   date: 'mié. 17 jun. 2026 05:00 pm', stadium: 'Estadio Ciudad de México · México',               prediction: null, lastUpdate: null },
  { id: 'l3', group: 'GRUPO L', home: { code: 'ENG', name: 'Inglaterra' }, away: { code: 'GHA', name: 'Ghana' },    date: 'mar. 23 jun. 2026 02:00 pm', stadium: 'Estadio de Atlanta · EUA',           prediction: null, lastUpdate: null },
  { id: 'l4', group: 'GRUPO L', home: { code: 'PAN', name: 'Panamá' },     away: { code: 'CRO', name: 'Croacia' },  date: 'mar. 23 jun. 2026 05:00 pm', stadium: 'Estadio de Houston · EUA',                    prediction: null, lastUpdate: null },
  { id: 'l5', group: 'GRUPO L', home: { code: 'PAN', name: 'Panamá' },     away: { code: 'ENG', name: 'Inglaterra' }, date: 'sáb. 27 jun. 2026 03:00 pm', stadium: 'Estadio BC Place Vancouver · Canadá',                  prediction: null, lastUpdate: null },
  { id: 'l6', group: 'GRUPO L', home: { code: 'CRO', name: 'Croacia' },    away: { code: 'GHA', name: 'Ghana' },    date: 'sáb. 27 jun. 2026 03:00 pm', stadium: 'Estadio de Filadelfia · EUA',         prediction: null, lastUpdate: null },
];

// ── Raw unsorted player list (sorted and pos-assigned below) ─────────────────
const _RAW_PLAYERS = [
  // ── Evolve (20 users) ──────────────────────────────────────────────────────
  { name: 'Juan Pérez',     country: 'MEX' as const, pts: 348, group: 'Evolve',          city: 'CDMX' },
  { name: 'Ricardo M.',     country: 'MEX' as const, pts: 318, group: 'Evolve',          city: 'MTY'  },
  { name: 'Mariana S.',     country: 'VEN' as const, pts: 296, group: 'Evolve',          city: 'GDL'  },
  { name: 'Eduardo V.',     country: 'VEN' as const, pts: 281, group: 'Evolve',          city: 'MTY'  },
  { name: 'Paola H.',       country: 'VEN' as const, pts: 274, group: 'Evolve',          city: 'QRO'  },
  { name: 'Sebastián R.',   country: 'MEX' as const, pts: 263, group: 'Evolve',          city: 'CDMX' },
  { name: 'Gabriela F.',    country: 'MEX' as const, pts: 251, group: 'Evolve',          city: 'TIJ'  },
  { name: 'Carlos B.',      country: 'COL' as const, pts: 244, group: 'Evolve',          city: 'GDL'  },
  { name: 'Diana R.',       country: 'MEX' as const, pts: 231, group: 'Evolve',          city: 'CDMX' },
  { name: 'Miguel Á.',      country: 'MEX' as const, pts: 218, group: 'Evolve',          city: 'MTY'  },
  { name: 'Laura C.',       country: 'VEN' as const, pts: 207, group: 'Evolve',          city: 'VER'  },
  { name: 'Roberto F.',     country: 'COL' as const, pts: 195, group: 'Evolve',          city: 'CDMX' },
  { name: 'Ana M.',         country: 'MEX' as const, pts: 182, group: 'Evolve',          city: 'PUE'  },
  { name: 'Fernando L.',    country: 'ARG' as const, pts: 169, group: 'Evolve',          city: 'GDL'  },
  { name: 'Sofía G.',       country: 'MEX' as const, pts: 156, group: 'Evolve',          city: 'CDMX' },
  { name: 'Pablo N.',       country: 'MEX' as const, pts: 143, group: 'Evolve',          city: 'MTY'  },
  { name: 'Valentina R.',   country: 'COL' as const, pts: 129, group: 'Evolve',          city: 'GDL'  },
  { name: 'Jorge A.',       country: 'MEX' as const, pts: 114, group: 'Evolve',          city: 'CDMX' },
  { name: 'Carmen T.',      country: 'MEX' as const, pts:  98, group: 'Evolve',          city: 'MTY'  },
  { name: 'David M.',       country: 'MEX' as const, pts:  84, group: 'Evolve',          city: 'GDL'  },

  // ── BEPENSA Spirits (20 users, formerly Sigma) ─────────────────────────────
  { name: 'Alejandro G.',   country: 'MEX' as const, pts: 330, group: 'BEPENSA Spirits', city: 'MTY'  },
  { name: 'Patricia V.',    country: 'MEX' as const, pts: 308, group: 'BEPENSA Spirits', city: 'GDL'  },
  { name: 'Luis M.',        country: 'MEX' as const, pts: 285, group: 'BEPENSA Spirits', city: 'PUE'  },
  { name: 'Claudia S.',     country: 'MEX' as const, pts: 268, group: 'BEPENSA Spirits', city: 'MTY'  },
  { name: 'Héctor R.',      country: 'MEX' as const, pts: 257, group: 'BEPENSA Spirits', city: 'GDL'  },
  { name: 'Mónica F.',      country: 'MEX' as const, pts: 247, group: 'BEPENSA Spirits', city: 'CDMX' },
  { name: 'Arturo L.',      country: 'MEX' as const, pts: 238, group: 'BEPENSA Spirits', city: 'MTY'  },
  { name: 'Sandra P.',      country: 'MEX' as const, pts: 225, group: 'BEPENSA Spirits', city: 'GDL'  },
  { name: 'Ramón C.',       country: 'MEX' as const, pts: 213, group: 'BEPENSA Spirits', city: 'PUE'  },
  { name: 'Lorena B.',      country: 'MEX' as const, pts: 201, group: 'BEPENSA Spirits', city: 'MTY'  },
  { name: 'Óscar T.',       country: 'MEX' as const, pts: 190, group: 'BEPENSA Spirits', city: 'GDL'  },
  { name: 'Natalia V.',     country: 'MEX' as const, pts: 178, group: 'BEPENSA Spirits', city: 'CDMX' },
  { name: 'Tomás R.',       country: 'MEX' as const, pts: 163, group: 'BEPENSA Spirits', city: 'MTY'  },
  { name: 'Isabel M.',      country: 'MEX' as const, pts: 152, group: 'BEPENSA Spirits', city: 'GDL'  },
  { name: 'Víctor H.',      country: 'MEX' as const, pts: 141, group: 'BEPENSA Spirits', city: 'PUE'  },
  { name: 'Daniela N.',     country: 'MEX' as const, pts: 127, group: 'BEPENSA Spirits', city: 'MTY'  },
  { name: 'Andrés S.',      country: 'MEX' as const, pts: 118, group: 'BEPENSA Spirits', city: 'CDMX' },
  { name: 'Rebeca L.',      country: 'MEX' as const, pts: 105, group: 'BEPENSA Spirits', city: 'GDL'  },
  { name: 'Ernesto C.',     country: 'MEX' as const, pts:  92, group: 'BEPENSA Spirits', city: 'MTY'  },
  { name: 'Alicia M.',      country: 'MEX' as const, pts:  77, group: 'BEPENSA Spirits', city: 'CDMX' },

  // ── ADM (8 users) ──────────────────────────────────────────────────────────
  { name: 'Rodrigo C.',     country: 'MEX' as const, pts: 341, group: 'ADM',             city: 'CDMX' },
  { name: 'Valeria O.',     country: 'MEX' as const, pts: 311, group: 'ADM',             city: 'MTY'  },
  { name: 'Ignacio P.',     country: 'MEX' as const, pts: 277, group: 'ADM',             city: 'GDL'  },
  { name: 'Fernanda T.',    country: 'MEX' as const, pts: 249, group: 'ADM',             city: 'PUE'  },
  { name: 'Óscar M.',       country: 'MEX' as const, pts: 220, group: 'ADM',             city: 'QRO'  },
  { name: 'Lucía B.',       country: 'COL' as const, pts: 188, group: 'ADM',             city: 'CDMX' },
  { name: 'Emilio R.',      country: 'MEX' as const, pts: 144, group: 'ADM',             city: 'VER'  },
  { name: 'Daniela E.',     country: 'MEX' as const, pts:  96, group: 'ADM',             city: 'TIJ'  },

  // ── Disney (8 users) ───────────────────────────────────────────────────────
  { name: 'Andrés V.',      country: 'MEX' as const, pts: 335, group: 'Disney',          city: 'GDL'  },
  { name: 'Camila H.',      country: 'MEX' as const, pts: 302, group: 'Disney',          city: 'CDMX' },
  { name: 'Felipe S.',      country: 'ARG' as const, pts: 271, group: 'Disney',          city: 'MTY'  },
  { name: 'Itzel N.',       country: 'MEX' as const, pts: 241, group: 'Disney',          city: 'PUE'  },
  { name: 'Marco A.',       country: 'MEX' as const, pts: 210, group: 'Disney',          city: 'QRO'  },
  { name: 'Paloma F.',      country: 'MEX' as const, pts: 174, group: 'Disney',          city: 'GDL'  },
  { name: 'Sergio L.',      country: 'VEN' as const, pts: 131, group: 'Disney',          city: 'CDMX' },
  { name: 'Teresa C.',      country: 'MEX' as const, pts:  88, group: 'Disney',          city: 'TIJ'  },

  // ── Ruz (8 users) ──────────────────────────────────────────────────────────
  { name: 'Braulio M.',     country: 'MEX' as const, pts: 325, group: 'Ruz',             city: 'MTY'  },
  { name: 'Citlali R.',     country: 'MEX' as const, pts: 293, group: 'Ruz',             city: 'GDL'  },
  { name: 'Gerardo A.',     country: 'MEX' as const, pts: 261, group: 'Ruz',             city: 'CDMX' },
  { name: 'Miriam T.',      country: 'MEX' as const, pts: 234, group: 'Ruz',             city: 'VER'  },
  { name: 'Rafael E.',      country: 'COL' as const, pts: 203, group: 'Ruz',             city: 'MTY'  },
  { name: 'Susana P.',      country: 'MEX' as const, pts: 165, group: 'Ruz',             city: 'PUE'  },
  { name: 'Tomás V.',       country: 'MEX' as const, pts: 121, group: 'Ruz',             city: 'QRO'  },
  { name: 'Ximena C.',      country: 'MEX' as const, pts:  80, group: 'Ruz',             city: 'GDL'  },

  // ── Zuru (8 users) ─────────────────────────────────────────────────────────
  { name: 'Adriana L.',     country: 'MEX' as const, pts: 322, group: 'Zuru',            city: 'CDMX' },
  { name: 'Bernardo F.',    country: 'MEX' as const, pts: 289, group: 'Zuru',            city: 'TIJ'  },
  { name: 'Esmeralda G.',   country: 'MEX' as const, pts: 255, group: 'Zuru',            city: 'MTY'  },
  { name: 'Héctor O.',      country: 'MEX' as const, pts: 228, group: 'Zuru',            city: 'GDL'  },
  { name: 'Karen S.',       country: 'VEN' as const, pts: 196, group: 'Zuru',            city: 'CDMX' },
  { name: 'Lorenzo M.',     country: 'MEX' as const, pts: 159, group: 'Zuru',            city: 'PUE'  },
  { name: 'Nadia R.',       country: 'MEX' as const, pts: 116, group: 'Zuru',            city: 'QRO'  },
  { name: 'Orlando B.',     country: 'MEX' as const, pts:  73, group: 'Zuru',            city: 'VER'  },

  // ── AGEMEX (8 users) ───────────────────────────────────────────────────────
  { name: 'Arturo B.',      country: 'MEX' as const, pts: 316, group: 'AGEMEX',          city: 'MTY'  },
  { name: 'Beatriz N.',     country: 'MEX' as const, pts: 284, group: 'AGEMEX',          city: 'CDMX' },
  { name: 'Cristóbal V.',   country: 'MEX' as const, pts: 252, group: 'AGEMEX',          city: 'GDL'  },
  { name: 'Dulce M.',       country: 'ARG' as const, pts: 222, group: 'AGEMEX',          city: 'MTY'  },
  { name: 'Enrique S.',     country: 'MEX' as const, pts: 193, group: 'AGEMEX',          city: 'PUE'  },
  { name: 'Fabiola T.',     country: 'MEX' as const, pts: 155, group: 'AGEMEX',          city: 'TIJ'  },
  { name: 'Gustavo P.',     country: 'MEX' as const, pts: 109, group: 'AGEMEX',          city: 'VER'  },
  { name: 'Hortensia C.',   country: 'MEX' as const, pts:  68, group: 'AGEMEX',          city: 'QRO'  },

  // ── Delongi (8 users) ──────────────────────────────────────────────────────
  { name: 'Alejandra F.',   country: 'MEX' as const, pts: 319, group: 'Delongi',         city: 'GDL'  },
  { name: 'Bruno C.',       country: 'MEX' as const, pts: 287, group: 'Delongi',         city: 'CDMX' },
  { name: 'Claudia R.',     country: 'MEX' as const, pts: 258, group: 'Delongi',         city: 'MTY'  },
  { name: 'Damián O.',      country: 'COL' as const, pts: 227, group: 'Delongi',         city: 'GDL'  },
  { name: 'Elena V.',       country: 'MEX' as const, pts: 198, group: 'Delongi',         city: 'PUE'  },
  { name: 'Fidel G.',       country: 'MEX' as const, pts: 161, group: 'Delongi',         city: 'QRO'  },
  { name: 'Graciela S.',    country: 'MEX' as const, pts: 112, group: 'Delongi',         city: 'TIJ'  },
  { name: 'Iván M.',        country: 'MEX' as const, pts:  71, group: 'Delongi',         city: 'VER'  },
];

export const RANKING = _RAW_PLAYERS
  .slice()
  .sort((a, b) => b.pts - a.pts)
  .map((p, i) => ({ ...p, pos: i + 1 }));

export const GOLEADORES = [
  // ── Favoritos ──
  { name: 'Erling Haaland', country: 'NOR', role: 'Delantero' },
  { name: 'Kylian Mbappé', country: 'FRA', role: 'Delantero' },
  { name: 'Lionel Messi', country: 'ARG', role: 'Delantero' },
  { name: 'Harry Kane', country: 'ENG', role: 'Delantero' },
  { name: 'Cristiano Ronaldo', country: 'POR', role: 'Delantero' },
  { name: 'Vinicius Jr', country: 'BRA', role: 'Delantero' },
  { name: 'Viktor Gyökeres', country: 'SWE', role: 'Delantero' },
  { name: 'Jonathan David', country: 'CAN', role: 'Delantero' },
  { name: 'Mohamed Salah', country: 'EGY', role: 'Delantero' },
  { name: 'Romelu Lukaku', country: 'BEL', role: 'Delantero' },
  { name: 'Lautaro Martínez', country: 'ARG', role: 'Delantero' },
  { name: 'Julián Álvarez', country: 'ARG', role: 'Delantero' },
  { name: 'Lamine Yamal', country: 'ESP', role: 'Delantero' },
  { name: 'Jude Bellingham', country: 'ENG', role: 'Mediocampista' },
  { name: 'Bukayo Saka', country: 'ENG', role: 'Delantero' },
  { name: 'Cody Gakpo', country: 'NED', role: 'Delantero' },
  { name: 'Dani Olmo', country: 'ESP', role: 'Delantero' },
  { name: 'Memphis Depay', country: 'NED', role: 'Delantero' },
  { name: 'Neymar Jr', country: 'BRA', role: 'Delantero' },
  { name: 'Endrick', country: 'BRA', role: 'Delantero' },
  { name: 'Christian Pulisic', country: 'USA', role: 'Delantero' },
  { name: 'Florian Wirtz', country: 'GER', role: 'Mediocampista' },
  { name: 'Jamal Musiala', country: 'GER', role: 'Mediocampista' },
  { name: 'Luis Díaz', country: 'COL', role: 'Delantero' },

  // ── Resto (orden alfabético) ──
  { name: 'Abbosbek Fayzullaev', country: 'UZB', role: 'Mediocampista' },
  { name: 'Abdelaziz Mohamed', country: 'QAT', role: 'Mediocampista' },
  { name: 'Abdessamad Ezzalzouli', country: 'MAR', role: 'Delantero' },
  { name: 'Abdul Issahaku', country: 'GHA', role: 'Delantero' },
  { name: 'Abdullah Alhamddan', country: 'KSA', role: 'Delantero' },
  { name: 'Abdullah Alkhaibari', country: 'KSA', role: 'Mediocampista' },
  { name: 'Adalberto Alcazar', country: 'PAN', role: 'Mediocampista' },
  { name: 'Adam Hložek', country: 'CZE', role: 'Delantero' },
  { name: 'Adil Boulbina', country: 'ALG', role: 'Delantero' },
  { name: 'Adrien Rabiot', country: 'FRA', role: 'Mediocampista' },
  { name: 'Adrián Cubas', country: 'PAR', role: 'Mediocampista' },
  { name: 'Agustin Canobbio', country: 'URU', role: 'Mediocampista' },
  { name: 'Ahmed Abdelmotaal', country: 'QAT', role: 'Delantero' },
  { name: 'Ahmed Abdoulla', country: 'QAT', role: 'Mediocampista' },
  { name: 'Ahmed Ahmed', country: 'IRQ', role: 'Delantero' },
  { name: 'Ahmed Alganehi', country: 'QAT', role: 'Mediocampista' },
  { name: 'Ahmed Sayed', country: 'EGY', role: 'Delantero' },
  { name: 'Ahmed Benbouali', country: 'ALG', role: 'Delantero' },
  { name: 'Aiden O\'Neill', country: 'AUS', role: 'Mediocampista' },
  { name: 'Aiman Ahmed', country: 'KSA', role: 'Delantero' },
  { name: 'Aimar Sher', country: 'IRQ', role: 'Mediocampista' },
  { name: 'Ajdin Hrustic', country: 'AUS', role: 'Delantero' },
  { name: 'Akmal Mozgovoy', country: 'UZB', role: 'Mediocampista' },
  { name: 'Akram Afif', country: 'QAT', role: 'Delantero' },
  { name: 'Ala Alhajji', country: 'KSA', role: 'Mediocampista' },
  { name: 'Alan Garcia', country: 'ECU', role: 'Mediocampista' },
  { name: 'Alan Palma', country: 'ECU', role: 'Mediocampista' },
  { name: 'Alberto Medina', country: 'PAN', role: 'Mediocampista' },
  { name: 'Alejandro Rodríguez', country: 'ESP', role: 'Mediocampista' },
  { name: 'Alejandro Gamarra', country: 'PAR', role: 'Delantero' },
  { name: 'Alejandro Saavedra', country: 'USA', role: 'Delantero' },
  { name: 'Aleksandar Pavlović', country: 'GER', role: 'Mediocampista' },
  { name: 'Alessandro Schöpf', country: 'AUT', role: 'Mediocampista' },
  { name: 'Alex Barrios', country: 'PAR', role: 'Delantero' },
  { name: 'Alex Rufer', country: 'NZL', role: 'Mediocampista' },
  { name: 'Alexander Isak', country: 'SWE', role: 'Delantero' },
  { name: 'Alexander Prass', country: 'AUT', role: 'Mediocampista' },
  { name: 'Alexander Sørloth', country: 'NOR', role: 'Delantero' },
  { name: 'Alexandr Sojka', country: 'CZE', role: 'Mediocampista' },
  { name: 'Alexis Saelemaekers', country: 'BEL', role: 'Mediocampista' },
  { name: 'Alexis Allister', country: 'ARG', role: 'Mediocampista' },
  { name: 'Ali Azaizeh', country: 'JOR', role: 'Delantero' },
  { name: 'Ali Ahmed', country: 'CAN', role: 'Delantero' },
  { name: 'Ali Alipourghara', country: 'IRN', role: 'Delantero' },
  { name: 'Ali Alzubaidi', country: 'IRQ', role: 'Delantero' },
  { name: 'Ali Olwan', country: 'JOR', role: 'Delantero' },
  { name: 'Ali Al-tameemi', country: 'IRQ', role: 'Delantero' },
  { name: 'Ali Najatee', country: 'IRQ', role: 'Delantero' },
  { name: 'Alireza Jirandeh', country: 'IRN', role: 'Mediocampista' },
  { name: 'Almoez Abdulla', country: 'QAT', role: 'Delantero' },
  { name: 'Amad Diallo', country: 'CIV', role: 'Delantero' },
  { name: 'Amadou Onana', country: 'BEL', role: 'Mediocampista' },
  { name: 'Amar Memić', country: 'BIH', role: 'Mediocampista' },
  { name: 'Amer Jamous', country: 'JOR', role: 'Mediocampista' },
  { name: 'Amine Ghouiri', country: 'ALG', role: 'Delantero' },
  { name: 'Amir Al-ammari', country: 'IRQ', role: 'Mediocampista' },
  { name: 'Amir Hadžiahmetović', country: 'BIH', role: 'Mediocampista' },
  { name: 'Amirhossein Hosseinzadehtazehgheshlagh', country: 'IRN', role: 'Delantero' },
  { name: 'Amirmohammad Razaghinia', country: 'IRN', role: 'Mediocampista' },
  { name: 'Andreas Schjelderup', country: 'NOR', role: 'Mediocampista' },
  { name: 'Andrej Kramarić', country: 'CRO', role: 'Delantero' },
  { name: 'Ange-yoan Bonny', country: 'CIV', role: 'Delantero' },
  { name: 'Angelo Stiller', country: 'GER', role: 'Mediocampista' },
  { name: 'Anis Slimane', country: 'TUN', role: 'Mediocampista' },
  { name: 'Anis Moussa', country: 'ALG', role: 'Delantero' },
  { name: 'Ante Budimir', country: 'CRO', role: 'Delantero' },
  { name: 'Anthony Elanga', country: 'SWE', role: 'Delantero' },
  { name: 'Anthony Bajaña', country: 'ECU', role: 'Mediocampista' },
  { name: 'Anthony Gordon', country: 'ENG', role: 'Delantero' },
  { name: 'Antoine Semenyo', country: 'GHA', role: 'Mediocampista' },
  { name: 'Antonio Nusa', country: 'NOR', role: 'Delantero' },
  { name: 'Aníbal Lemus', country: 'PAN', role: 'Mediocampista' },
  { name: 'Ao Tanaka', country: 'JPN', role: 'Mediocampista' },
  { name: 'Ar\'Jany Martha', country: 'CUW', role: 'Mediocampista' },
  { name: 'Arda Güler', country: 'TUR', role: 'Delantero' },
  { name: 'Ardon Jashari', country: 'SUI', role: 'Mediocampista' },
  { name: 'Armando Alba', country: 'MEX', role: 'Delantero' },
  { name: 'Armin Gigovic', country: 'BIH', role: 'Mediocampista' },
  { name: 'Arnaldo Ayala', country: 'PAR', role: 'Delantero' },
  { name: 'Assane Diao', country: 'SEN', role: 'Delantero' },
  { name: 'Assim Madibo', country: 'QAT', role: 'Mediocampista' },
  { name: 'Augustine Boakye', country: 'GHA', role: 'Mediocampista' },
  { name: 'Aurélien Tchouameni', country: 'FRA', role: 'Mediocampista' },
  { name: 'Awer Mabil', country: 'AUS', role: 'Delantero' },
  { name: 'Axel Witsel', country: 'BEL', role: 'Mediocampista' },
  { name: 'Ayase Ueda', country: 'JPN', role: 'Delantero' },
  { name: 'Aymen Ghadhban', country: 'IRQ', role: 'Delantero' },
  { name: 'Ayoub Amaimouni', country: 'MAR', role: 'Delantero' },
  { name: 'Ayoub Kaabi', country: 'MAR', role: 'Delantero' },
  { name: 'Ayyoub Bouaddi', country: 'MAR', role: 'Mediocampista' },
  { name: 'Azarias Gonzalez', country: 'PAN', role: 'Delantero' },
  { name: 'Azizbek Amonov', country: 'UZB', role: 'Delantero' },
  { name: 'Azizjon Ganiev', country: 'UZB', role: 'Mediocampista' },
  { name: 'Azz-eddine Ounahi', country: 'MAR', role: 'Mediocampista' },
  { name: 'Bara Ndiaye', country: 'SEN', role: 'Mediocampista' },
  { name: 'Barış Yilmaz', country: 'TUR', role: 'Delantero' },
  { name: 'Bazoumana Toure', country: 'CIV', role: 'Delantero' },
  { name: 'Ben Doak', country: 'SCO', role: 'Delantero' },
  { name: 'Benjamin Old', country: 'NZL', role: 'Mediocampista' },
  { name: 'Benjamin Waine', country: 'NZL', role: 'Delantero' },
  { name: 'Benjamin Tahirovic', country: 'BIH', role: 'Mediocampista' },
  { name: 'Bernardo Silva', country: 'POR', role: 'Mediocampista' },
  { name: 'Besfort Zeneli', country: 'SWE', role: 'Mediocampista' },
  { name: 'Bilal Khannouss', country: 'MAR', role: 'Mediocampista' },
  { name: 'Borja Quintás', country: 'ESP', role: 'Delantero' },
  { name: 'Bradley Barcola', country: 'FRA', role: 'Delantero' },
  { name: 'Brahim Díaz', country: 'MAR', role: 'Delantero' },
  { name: 'Braian Rodriguez', country: 'PAR', role: 'Mediocampista' },
  { name: 'Brandley Kuwas', country: 'CUW', role: 'Delantero' },
  { name: 'Breel Embolo', country: 'SUI', role: 'Delantero' },
  { name: 'Brenden Aaronson', country: 'USA', role: 'Delantero' },
  { name: 'Brian Brobbey', country: 'NED', role: 'Delantero' },
  { name: 'Brian Gutiérrez', country: 'MEX', role: 'Mediocampista' },
  { name: 'Bruno Moura', country: 'BRA', role: 'Mediocampista' },
  { name: 'Bruno Fernandes', country: 'POR', role: 'Mediocampista' },
  { name: 'Caleb Yirenkyi', country: 'GHA', role: 'Mediocampista' },
  { name: 'Callum Mccowatt', country: 'NZL', role: 'Mediocampista' },
  { name: 'Cameron Devlin', country: 'AUS', role: 'Mediocampista' },
  { name: 'Can Uzun', country: 'TUR', role: 'Delantero' },
  { name: 'Carl Sainte', country: 'HAI', role: 'Mediocampista' },
  { name: 'Carlos Hinestroza', country: 'COL', role: 'Delantero' },
  { name: 'Carlos Casimiro', country: 'BRA', role: 'Mediocampista' },
  { name: 'Carney Chukwuemeka', country: 'AUT', role: 'Mediocampista' },
  { name: 'Cecilio Ruiz', country: 'PAN', role: 'Delantero' },
  { name: 'Cedric Bakambu', country: 'COD', role: 'Delantero' },
  { name: 'Cedric Itten', country: 'SUI', role: 'Delantero' },
  { name: 'Charles Ketelaere', country: 'BEL', role: 'Delantero' },
  { name: 'Charles Pickel', country: 'COD', role: 'Mediocampista' },
  { name: 'Che Adams', country: 'SCO', role: 'Delantero' },
  { name: 'Cheikh Dieng', country: 'SEN', role: 'Delantero' },
  { name: 'Chemsdine Talbi', country: 'MAR', role: 'Mediocampista' },
  { name: 'Christ Oulai', country: 'CIV', role: 'Mediocampista' },
  { name: 'Christian Fassnacht', country: 'SUI', role: 'Delantero' },
  { name: 'Christoph Baumgartner', country: 'AUT', role: 'Mediocampista' },
  { name: 'Christopher Baah', country: 'GHA', role: 'Delantero' },
  { name: 'Christopher Wood', country: 'NZL', role: 'Delantero' },
  { name: 'Chukwunonso Madueke', country: 'ENG', role: 'Delantero' },
  { name: 'Connor Metcalfe', country: 'AUS', role: 'Mediocampista' },
  { name: 'Cristian Martínez', country: 'PAN', role: 'Mediocampista' },
  { name: 'Cristian Roldan', country: 'USA', role: 'Mediocampista' },
  { name: 'Cristian Volpato', country: 'AUS', role: 'Delantero' },
  { name: 'Crysencio Summerville', country: 'NED', role: 'Delantero' },
  { name: 'Cyle Larin', country: 'CAN', role: 'Delantero' },
  { name: 'César Velasco', country: 'PAN', role: 'Mediocampista' },
  { name: 'César Valera', country: 'MEX', role: 'Delantero' },
  { name: 'Daichi Kamada', country: 'JPN', role: 'Mediocampista' },
  { name: 'Dailon Livramento', country: 'CPV', role: 'Delantero' },
  { name: 'Daizen Maeda', country: 'JPN', role: 'Mediocampista' },
  { name: 'Damián Benitez', country: 'PAR', role: 'Mediocampista' },
  { name: 'Dan Ndoye', country: 'SUI', role: 'Delantero' },
  { name: 'Danilo Oliveira', country: 'BRA', role: 'Mediocampista' },
  { name: 'Danley Jacques', country: 'HAI', role: 'Mediocampista' },
  { name: 'Darwin Ribeiro', country: 'URU', role: 'Delantero' },
  { name: 'Declan Rice', country: 'ENG', role: 'Mediocampista' },
  { name: 'Denil Preciado', country: 'ECU', role: 'Mediocampista' },
  { name: 'Denis Lado', country: 'SUI', role: 'Mediocampista' },
  { name: 'Denis Višinský', country: 'CZE', role: 'Delantero' },
  { name: 'Deniz Gül', country: 'TUR', role: 'Delantero' },
  { name: 'Deniz Undav', country: 'GER', role: 'Delantero' },
  { name: 'Dennis Dargahi', country: 'IRN', role: 'Delantero' },
  { name: 'Deroy Duarte', country: 'CPV', role: 'Mediocampista' },
  { name: 'Derrick Etienne', country: 'HAI', role: 'Delantero' },
  { name: 'Diego Amarilla', country: 'PAR', role: 'Mediocampista' },
  { name: 'Diego Moreira', country: 'BEL', role: 'Mediocampista' },
  { name: 'Diego Arcosa', country: 'URU', role: 'Mediocampista' },
  { name: 'Dodi Ngandoli', country: 'BEL', role: 'Delantero' },
  { name: 'Dominique Simon', country: 'HAI', role: 'Mediocampista' },
  { name: 'Don Deedson', country: 'HAI', role: 'Delantero' },
  { name: 'Donggyeong Lee', country: 'KOR', role: 'Mediocampista' },
  { name: 'Donyell Malen', country: 'NED', role: 'Delantero' },
  { name: 'Dostonbek Khamdamov', country: 'UZB', role: 'Mediocampista' },
  { name: 'Duckens Nazon', country: 'HAI', role: 'Delantero' },
  { name: 'Désiré Doue', country: 'FRA', role: 'Delantero' },
  { name: 'Dženis Burnić', country: 'BIH', role: 'Mediocampista' },
  { name: 'Eberechi Eze', country: 'ENG', role: 'Mediocampista' },
  { name: 'Edin Džeko', country: 'BIH', role: 'Delantero' },
  { name: 'Edmilson Dasilva', country: 'QAT', role: 'Delantero' },
  { name: 'Edo Kayembe', country: 'COD', role: 'Mediocampista' },
  { name: 'Eldor Shomurodov', country: 'UZB', role: 'Delantero' },
  { name: 'Elias Saad', country: 'TUN', role: 'Delantero' },
  { name: 'Elijah Just', country: 'NZL', role: 'Mediocampista' },
  { name: 'Elisha Owusu', country: 'GHA', role: 'Mediocampista' },
  { name: 'Elliot Anderson', country: 'ENG', role: 'Mediocampista' },
  { name: 'Ellyes Skhiri', country: 'TUN', role: 'Mediocampista' },
  { name: 'Emam Abdelghany', country: 'EGY', role: 'Mediocampista' },
  { name: 'Emiliano Toranza', country: 'URU', role: 'Mediocampista' },
  { name: 'Enner Lastra', country: 'ECU', role: 'Delantero' },
  { name: 'Enzo Fernández', country: 'ARG', role: 'Mediocampista' },
  { name: 'Erik Méndez', country: 'MEX', role: 'Mediocampista' },
  { name: 'Erik Nygren', country: 'SWE', role: 'Mediocampista' },
  { name: 'Ermedin Demirović', country: 'BIH', role: 'Delantero' },
  { name: 'Ermin Mahmić', country: 'BIH', role: 'Mediocampista' },
  { name: 'Ernest Appiah', country: 'GHA', role: 'Delantero' },
  { name: 'Ernesto Rojas', country: 'MEX', role: 'Delantero' },
  { name: 'Esmir Bajraktarevic', country: 'BIH', role: 'Delantero' },
  { name: 'Evann Guessand', country: 'CIV', role: 'Delantero' },
  { name: 'Exequiel Palacios', country: 'ARG', role: 'Mediocampista' },
  { name: 'Fabian Rieder', country: 'SUI', role: 'Mediocampista' },
  { name: 'Fabian Peña', country: 'ESP', role: 'Mediocampista' },
  { name: 'Fabio Tavares', country: 'BRA', role: 'Mediocampista' },
  { name: 'Facundo Rebollo', country: 'URU', role: 'Delantero' },
  { name: 'Fares Chaibi', country: 'ALG', role: 'Mediocampista' },
  { name: 'Fares Ghedjemis', country: 'ALG', role: 'Delantero' },
  { name: 'Federico Dipetta', country: 'URU', role: 'Mediocampista' },
  { name: 'Federico Barboza', country: 'URU', role: 'Delantero' },
  { name: 'Felix Nmecha', country: 'GER', role: 'Mediocampista' },
  { name: 'Feras Albrikan', country: 'KSA', role: 'Delantero' },
  { name: 'Ferran García', country: 'ESP', role: 'Delantero' },
  { name: 'Findlay Curtis', country: 'SCO', role: 'Delantero' },
  { name: 'Firas Chaouat', country: 'TUN', role: 'Delantero' },
  { name: 'Florian Grillitsch', country: 'AUT', role: 'Mediocampista' },
  { name: 'Folarin Balogun', country: 'USA', role: 'Delantero' },
  { name: 'Francisco Trincão', country: 'POR', role: 'Delantero' },
  { name: 'Francisco Conceição', country: 'POR', role: 'Delantero' },
  { name: 'Franck Kessie', country: 'CIV', role: 'Mediocampista' },
  { name: 'Frantzdy Pierrot', country: 'HAI', role: 'Delantero' },
  { name: 'Fredrik Aursnes', country: 'NOR', role: 'Mediocampista' },
  { name: 'Frenkie Jong', country: 'NED', role: 'Mediocampista' },
  { name: 'Gabriel Stumpfs', country: 'PAR', role: 'Delantero' },
  { name: 'Gabriel Silva', country: 'BRA', role: 'Delantero' },
  { name: 'Garry Rodrigues', country: 'CPV', role: 'Mediocampista' },
  { name: 'George Hirst', country: 'SCO', role: 'Delantero' },
  { name: 'Gervane Kastaneer', country: 'CUW', role: 'Delantero' },
  { name: 'Gessime Yassine', country: 'MAR', role: 'Mediocampista' },
  { name: 'Gihyuk Lee', country: 'KOR', role: 'Mediocampista' },
  { name: 'Gilberto Zambrano', country: 'MEX', role: 'Mediocampista' },
  { name: 'Gilson Tavares', country: 'CPV', role: 'Delantero' },
  { name: 'Giorgian Benedetti', country: 'URU', role: 'Mediocampista' },
  { name: 'Giovani Celso', country: 'ARG', role: 'Mediocampista' },
  { name: 'Giovanni Reyna', country: 'USA', role: 'Mediocampista' },
  { name: 'Giuliano Simeone', country: 'ARG', role: 'Delantero' },
  { name: 'Godfried Roemeratoe', country: 'CUW', role: 'Mediocampista' },
  { name: 'Gonzalo Jimenez', country: 'ECU', role: 'Delantero' },
  { name: 'Gonçalo Guedes', country: 'POR', role: 'Delantero' },
  { name: 'Gonçalo Ramos', country: 'POR', role: 'Delantero' },
  { name: 'Granit Xhaka', country: 'SUI', role: 'Mediocampista' },
  { name: 'Guesung Cho', country: 'KOR', role: 'Delantero' },
  { name: 'Guillermo Ayala', country: 'MEX', role: 'Delantero' },
  { name: 'Gustavo Gonzalez', country: 'PAR', role: 'Mediocampista' },
  { name: 'Guus Til', country: 'NED', role: 'Mediocampista' },
  { name: 'Haissem Hassan', country: 'EGY', role: 'Delantero' },
  { name: 'Haji Wright', country: 'USA', role: 'Delantero' },
  { name: 'Hakan Çalhanoğlu', country: 'TUR', role: 'Mediocampista' },
  { name: 'Hamdy Abdelfattah', country: 'EGY', role: 'Mediocampista' },
  { name: 'Hamza Selim', country: 'EGY', role: 'Delantero' },
  { name: 'Hannibal Mejbri', country: 'TUN', role: 'Mediocampista' },
  { name: 'Hans Vanaken', country: 'BEL', role: 'Mediocampista' },
  { name: 'Haris Tabakovic', country: 'BIH', role: 'Delantero' },
  { name: 'Hasan Alhaydos', country: 'QAT', role: 'Delantero' },
  { name: 'Hazem Mastouri', country: 'TUN', role: 'Delantero' },
  { name: 'Hee Hwang', country: 'KOR', role: 'Mediocampista' },
  { name: 'Heung Son', country: 'KOR', role: 'Delantero' },
  { name: 'Hicham Boudaoui', country: 'ALG', role: 'Mediocampista' },
  { name: 'Houssem-eddine Aouar', country: 'ALG', role: 'Mediocampista' },
  { name: 'Hugo Sochůrek', country: 'CZE', role: 'Mediocampista' },
  { name: 'Hyeongyu Oh', country: 'KOR', role: 'Delantero' },
  { name: 'Hyunjun Yang', country: 'KOR', role: 'Mediocampista' },
  { name: 'Håkan Nilsson', country: 'SWE', role: 'Delantero' },
  { name: 'Hélio Varela', country: 'CPV', role: 'Mediocampista' },
  { name: 'Ibrahim Hassan', country: 'EGY', role: 'Delantero' },
  { name: 'Ibrahim Al-kaabawi', country: 'IRQ', role: 'Mediocampista' },
  { name: 'Ibrahim Maza', country: 'ALG', role: 'Mediocampista' },
  { name: 'Ibrahim Mbaye', country: 'SEN', role: 'Delantero' },
  { name: 'Ibrahim Sabra', country: 'JOR', role: 'Delantero' },
  { name: 'Ibrahim Sa\'Deh', country: 'JOR', role: 'Mediocampista' },
  { name: 'Ibrahim Sangare', country: 'CIV', role: 'Mediocampista' },
  { name: 'Idrissa Gueye', country: 'SEN', role: 'Mediocampista' },
  { name: 'Igor Matanović', country: 'CRO', role: 'Delantero' },
  { name: 'Igor Sergeev', country: 'UZB', role: 'Delantero' },
  { name: 'Igor Rodrigues', country: 'BRA', role: 'Delantero' },
  { name: 'Iliman Ndiaye', country: 'SEN', role: 'Delantero' },
  { name: 'Inaki Arthuer', country: 'GHA', role: 'Delantero' },
  { name: 'Inbeom Hwang', country: 'KOR', role: 'Mediocampista' },
  { name: 'Iqraam Rayners', country: 'RSA', role: 'Delantero' },
  { name: 'Isidro Saldivar', country: 'PAR', role: 'Delantero' },
  { name: 'Ismael Leon', country: 'PAN', role: 'Mediocampista' },
  { name: 'Ismael Koné', country: 'CAN', role: 'Mediocampista' },
  { name: 'Ismael Saibari', country: 'MAR', role: 'Mediocampista' },
  { name: 'Ismael Gharbi', country: 'TUN', role: 'Mediocampista' },
  { name: 'Ismaila Ciss', country: 'SEN', role: 'Mediocampista' },
  { name: 'Ismaila Sarr', country: 'SEN', role: 'Delantero' },
  { name: 'Ivan Basic', country: 'BIH', role: 'Mediocampista' },
  { name: 'Ivan Toney', country: 'ENG', role: 'Delantero' },
  { name: 'Ivan Perišić', country: 'CRO', role: 'Delantero' },
  { name: 'Ivan Šunjić', country: 'BIH', role: 'Mediocampista' },
  { name: 'Jackson Irvine', country: 'AUS', role: 'Mediocampista' },
  { name: 'Jacob Shaffelburg', country: 'CAN', role: 'Mediocampista' },
  { name: 'Jae Lee', country: 'KOR', role: 'Mediocampista' },
  { name: 'Jair Monteiro', country: 'CPV', role: 'Mediocampista' },
  { name: 'Jaloliddin Masharipov', country: 'UZB', role: 'Mediocampista' },
  { name: 'James Rodríguez', country: 'COL', role: 'Mediocampista' },
  { name: 'Jamie Leweling', country: 'GER', role: 'Mediocampista' },
  { name: 'Jaminton Campaz', country: 'COL', role: 'Delantero' },
  { name: 'Jamiro Alvarenga', country: 'CPV', role: 'Mediocampista' },
  { name: 'Jamshid Iskanderov', country: 'UZB', role: 'Mediocampista' },
  { name: 'Jan Kuchta', country: 'CZE', role: 'Delantero' },
  { name: 'Jayden Adams', country: 'RSA', role: 'Mediocampista' },
  { name: 'Jean Seri', country: 'CIV', role: 'Mediocampista' },
  { name: 'Jean Bellegarde', country: 'HAI', role: 'Mediocampista' },
  { name: 'Jean-philippe Mateta', country: 'FRA', role: 'Delantero' },
  { name: 'Jearl Margaritha', country: 'CUW', role: 'Delantero' },
  { name: 'Jefferson Solis', country: 'COL', role: 'Mediocampista' },
  { name: 'Jens Hauge', country: 'NOR', role: 'Mediocampista' },
  { name: 'Jeremy Mera', country: 'ECU', role: 'Delantero' },
  { name: 'Jeremy Doku', country: 'BEL', role: 'Delantero' },
  { name: 'Jeremy Antonisse', country: 'CUW', role: 'Delantero' },
  { name: 'Jesper Karlström', country: 'SWE', role: 'Mediocampista' },
  { name: 'Jesse Randall', country: 'NZL', role: 'Delantero' },
  { name: 'Jhon Andrade', country: 'COL', role: 'Mediocampista' },
  { name: 'Jhon Copete', country: 'COL', role: 'Delantero' },
  { name: 'Jingyu Kim', country: 'KOR', role: 'Mediocampista' },
  { name: 'Jisung Eom', country: 'KOR', role: 'Mediocampista' },
  { name: 'Joaquin Moreira', country: 'URU', role: 'Mediocampista' },
  { name: 'Joe Bell', country: 'NZL', role: 'Mediocampista' },
  { name: 'Johan Manzambi', country: 'SUI', role: 'Mediocampista' },
  { name: 'John Mcginn', country: 'SCO', role: 'Mediocampista' },
  { name: 'John Zamora', country: 'ECU', role: 'Delantero' },
  { name: 'Jonathan Osorio', country: 'CAN', role: 'Mediocampista' },
  { name: 'Jordan Henderson', country: 'ENG', role: 'Mediocampista' },
  { name: 'Jordan Ayew', country: 'GHA', role: 'Delantero' },
  { name: 'Jordy Macías', country: 'ECU', role: 'Mediocampista' },
  { name: 'Jordy Medina', country: 'ECU', role: 'Delantero' },
  { name: 'Jorge Guardo', country: 'COL', role: 'Mediocampista' },
  { name: 'Jose Lopez', country: 'ARG', role: 'Delantero' },
  { name: 'Josue Casimir', country: 'HAI', role: 'Delantero' },
  { name: 'José Nelson', country: 'PAN', role: 'Delantero' },
  { name: 'José Francis', country: 'PAN', role: 'Mediocampista' },
  { name: 'Jovane Cabral', country: 'CPV', role: 'Mediocampista' },
  { name: 'Jovo Lukic', country: 'BIH', role: 'Delantero' },
  { name: 'João Sequeira', country: 'POR', role: 'Delantero' },
  { name: 'João Fernandes', country: 'CPV', role: 'Mediocampista' },
  { name: 'João Neves', country: 'POR', role: 'Mediocampista' },
  { name: 'Juan Suarez', country: 'COL', role: 'Delantero' },
  { name: 'Juan Orozco', country: 'COL', role: 'Mediocampista' },
  { name: 'Juan Paniagua', country: 'COL', role: 'Mediocampista' },
  { name: 'Juan Magolé', country: 'URU', role: 'Mediocampista' },
  { name: 'Julian Ryerson', country: 'NOR', role: 'Delantero' },
  { name: 'Julio Espinola', country: 'PAR', role: 'Delantero' },
  { name: 'Julián Quiñones', country: 'MEX', role: 'Delantero' },
  { name: 'Junho Bae', country: 'KOR', role: 'Mediocampista' },
  { name: 'Juninho Bacuna', country: 'CUW', role: 'Mediocampista' },
  { name: 'Junya Ito', country: 'JPN', role: 'Mediocampista' },
  { name: 'Justin Kluivert', country: 'NED', role: 'Mediocampista' },
  { name: 'Jørgen Larsen', country: 'NOR', role: 'Delantero' },
  { name: 'Jürgen Locadia', country: 'CUW', role: 'Delantero' },
  { name: 'Kaan Ayhan', country: 'TUR', role: 'Mediocampista' },
  { name: 'Kai Havertz', country: 'GER', role: 'Delantero' },
  { name: 'Kaishu Sano', country: 'JPN', role: 'Mediocampista' },
  { name: 'Kamal Sulemana', country: 'GHA', role: 'Delantero' },
  { name: 'Kamogelo Sebelebele', country: 'RSA', role: 'Delantero' },
  { name: 'Kangin Lee', country: 'KOR', role: 'Mediocampista' },
  { name: 'Karim Boudiaf', country: 'QAT', role: 'Mediocampista' },
  { name: 'Keisuke Goto', country: 'JPN', role: 'Delantero' },
  { name: 'Keito Nakamura', country: 'JPN', role: 'Mediocampista' },
  { name: 'Ken Sema', country: 'SWE', role: 'Mediocampista' },
  { name: 'Kenan Yildiz', country: 'TUR', role: 'Delantero' },
  { name: 'Kenji Gorre', country: 'CUW', role: 'Delantero' },
  { name: 'Kenneth Mclean', country: 'SCO', role: 'Mediocampista' },
  { name: 'Kento Shiogai', country: 'JPN', role: 'Delantero' },
  { name: 'Kerim Alajbegovic', country: 'BIH', role: 'Delantero' },
  { name: 'Kevin Felida', country: 'CUW', role: 'Mediocampista' },
  { name: 'Kevin Gil', country: 'COL', role: 'Mediocampista' },
  { name: 'Kevin William', country: 'IRQ', role: 'Mediocampista' },
  { name: 'Kevin Cortez', country: 'ECU', role: 'Delantero' },
  { name: 'Kevin Pina', country: 'CPV', role: 'Mediocampista' },
  { name: 'Kevin Bruyne', country: 'BEL', role: 'Mediocampista' },
  { name: 'Khalid Alghannam', country: 'KSA', role: 'Delantero' },
  { name: 'Khalil Ayari', country: 'TUN', role: 'Mediocampista' },
  { name: 'Kibambe Cipenga', country: 'COD', role: 'Delantero' },
  { name: 'Kobbie Mainoo', country: 'ENG', role: 'Mediocampista' },
  { name: 'Koki Ogawa', country: 'JPN', role: 'Delantero' },
  { name: 'Konrad Laimer', country: 'AUT', role: 'Mediocampista' },
  { name: 'Kosta Barbarouses', country: 'NZL', role: 'Delantero' },
  { name: 'Kouadio Kone', country: 'FRA', role: 'Mediocampista' },
  { name: 'Kristian Thorstvedt', country: 'NOR', role: 'Mediocampista' },
  { name: 'Kwasi Sibo', country: 'GHA', role: 'Mediocampista' },
  { name: 'Lachlan Bayliss', country: 'NZL', role: 'Mediocampista' },
  { name: 'Lamine Camara', country: 'SEN', role: 'Mediocampista' },
  { name: 'Laros Duarte', country: 'CPV', role: 'Mediocampista' },
  { name: 'Lawrence Shankland', country: 'SCO', role: 'Delantero' },
  { name: 'Leandro Paredes', country: 'ARG', role: 'Mediocampista' },
  { name: 'Leandro Bacuna', country: 'CUW', role: 'Mediocampista' },
  { name: 'Leandro Trossard', country: 'BEL', role: 'Delantero' },
  { name: 'Lennart Karl', country: 'GER', role: 'Mediocampista' },
  { name: 'Lenny Joseph', country: 'HAI', role: 'Delantero' },
  { name: 'Leon Goretzka', country: 'GER', role: 'Mediocampista' },
  { name: 'Leroy Sané', country: 'GER', role: 'Mediocampista' },
  { name: 'Leverton Pierre', country: 'HAI', role: 'Mediocampista' },
  { name: 'Lewis Ferguson', country: 'SCO', role: 'Mediocampista' },
  { name: 'Liam Millar', country: 'CAN', role: 'Mediocampista' },
  { name: 'Livano Comenencia', country: 'CUW', role: 'Mediocampista' },
  { name: 'Lucas Bergvall', country: 'SWE', role: 'Mediocampista' },
  { name: 'Lucas Lima', country: 'BRA', role: 'Mediocampista' },
  { name: 'Luis Barrón', country: 'MEX', role: 'Mediocampista' },
  { name: 'Luis Magallón', country: 'MEX', role: 'Mediocampista' },
  { name: 'Luis Charris', country: 'COL', role: 'Delantero' },
  { name: 'Luiz Silva', country: 'BRA', role: 'Delantero' },
  { name: 'Luka Modrić', country: 'CRO', role: 'Mediocampista' },
  { name: 'Luka Sučić', country: 'CRO', role: 'Mediocampista' },
  { name: 'Lukáš Provod', country: 'CZE', role: 'Mediocampista' },
  { name: 'Lukáš Červ', country: 'CZE', role: 'Mediocampista' },
  { name: 'Lyle Foster', country: 'RSA', role: 'Delantero' },
  { name: 'Lyndon Dykes', country: 'SCO', role: 'Delantero' },
  { name: 'Maghnes Akliouche', country: 'FRA', role: 'Mediocampista' },
  { name: 'Mahdi Torabi', country: 'IRN', role: 'Mediocampista' },
  { name: 'Mahmoud Hassan', country: 'EGY', role: 'Delantero' },
  { name: 'Mahmoud Almardi', country: 'JOR', role: 'Delantero' },
  { name: 'Mahmoud Abdelmohsen', country: 'EGY', role: 'Mediocampista' },
  { name: 'Malik Tillman', country: 'USA', role: 'Mediocampista' },
  { name: 'Mambenga Kakuta', country: 'COD', role: 'Delantero' },
  { name: 'Manuel Ribeiro', country: 'URU', role: 'Mediocampista' },
  { name: 'Marawan Ghallab', country: 'EGY', role: 'Mediocampista' },
  { name: 'Marcel Sabitzer', country: 'AUT', role: 'Mediocampista' },
  { name: 'Marcelo Flores', country: 'CAN', role: 'Mediocampista' },
  { name: 'Marco Pašalić', country: 'CRO', role: 'Delantero' },
  { name: 'Marcus Thuram-ulien', country: 'FRA', role: 'Delantero' },
  { name: 'Marcus Rashford', country: 'ENG', role: 'Delantero' },
  { name: 'Mario Pašalić', country: 'CRO', role: 'Mediocampista' },
  { name: 'Marko Arnautovic', country: 'AUT', role: 'Delantero' },
  { name: 'Marko Hussein', country: 'IRQ', role: 'Delantero' },
  { name: 'Marko Stamenic', country: 'NZL', role: 'Mediocampista' },
  { name: 'Marten Roon', country: 'NED', role: 'Mediocampista' },
  { name: 'Martin Baturina', country: 'CRO', role: 'Mediocampista' },
  { name: 'Martin Ibañez', country: 'ESP', role: 'Mediocampista' },
  { name: 'Martín Ødegaard', country: 'NOR', role: 'Mediocampista' },
  { name: 'Masour Dembele', country: 'FRA', role: 'Delantero' },
  { name: 'Mateo Kovačić', country: 'CRO', role: 'Mediocampista' },
  { name: 'Matheus Nunes', country: 'POR', role: 'Mediocampista' },
  { name: 'Matheus Cunha', country: 'BRA', role: 'Delantero' },
  { name: 'Mathew Leckie', country: 'AUS', role: 'Delantero' },
  { name: 'Mathieu Choinière', country: 'CAN', role: 'Mediocampista' },
  { name: 'Mathis Cherki', country: 'FRA', role: 'Mediocampista' },
  { name: 'Matias Fernandez-pardo', country: 'BEL', role: 'Delantero' },
  { name: 'Matias Fonda', country: 'PAR', role: 'Mediocampista' },
  { name: 'Matthew Garbett', country: 'NZL', role: 'Mediocampista' },
  { name: 'Mattias Svanberg', country: 'SWE', role: 'Mediocampista' },
  { name: 'Mauricio Prado', country: 'PAR', role: 'Mediocampista' },
  { name: 'Maximilian Beier', country: 'GER', role: 'Delantero' },
  { name: 'Maximiliano Vilches', country: 'URU', role: 'Mediocampista' },
  { name: 'Mayele Kalala', country: 'COD', role: 'Delantero' },
  { name: 'Mehdi Ghayedi', country: 'IRN', role: 'Delantero' },
  { name: 'Mehdi Taremi', country: 'IRN', role: 'Delantero' },
  { name: 'Meschack Elia', country: 'COD', role: 'Delantero' },
  { name: 'Michael Olise', country: 'FRA', role: 'Delantero' },
  { name: 'Michael Gregoritsch', country: 'AUT', role: 'Delantero' },
  { name: 'Michal Sadílek', country: 'CZE', role: 'Mediocampista' },
  { name: 'Michel Aebischer', country: 'SUI', role: 'Mediocampista' },
  { name: 'Miguel Rejala', country: 'PAR', role: 'Mediocampista' },
  { name: 'Mikel Zazón', country: 'ESP', role: 'Mediocampista' },
  { name: 'Mikel Ugarte', country: 'ESP', role: 'Delantero' },
  { name: 'Misjonne Hansen', country: 'CUW', role: 'Delantero' },
  { name: 'Mohamed Toure', country: 'AUS', role: 'Delantero' },
  { name: 'Mohamed Mahmoud', country: 'TUN', role: 'Mediocampista' },
  { name: 'Mohamed Achouri', country: 'TUN', role: 'Delantero' },
  { name: 'Mohamed Kanno', country: 'KSA', role: 'Mediocampista' },
  { name: 'Mohamed Manai', country: 'QAT', role: 'Delantero' },
  { name: 'Mohamed Amdouni', country: 'SUI', role: 'Delantero' },
  { name: 'Mohameth Sow', country: 'SUI', role: 'Mediocampista' },
  { name: 'Mohammad Zraiq', country: 'JOR', role: 'Delantero' },
  { name: 'Mohammad Ghorbani', country: 'IRN', role: 'Mediocampista' },
  { name: 'Mohammad Mohebbi', country: 'IRN', role: 'Mediocampista' },
  { name: 'Mohammad Aldaoud', country: 'JOR', role: 'Mediocampista' },
  { name: 'Mohammed Amoura', country: 'ALG', role: 'Delantero' },
  { name: 'Mohammed Muntari', country: 'QAT', role: 'Delantero' },
  { name: 'Mohanad Al-shammari', country: 'IRQ', role: 'Delantero' },
  { name: 'Mohanad Lashin', country: 'EGY', role: 'Mediocampista' },
  { name: 'Mohannad Taha', country: 'JOR', role: 'Mediocampista' },
  { name: 'Moisés Corozo', country: 'ECU', role: 'Mediocampista' },
  { name: 'Mojmír Chytil', country: 'CZE', role: 'Delantero' },
  { name: 'Morgan Rogers', country: 'ENG', role: 'Mediocampista' },
  { name: 'Morten Thorsby', country: 'NOR', role: 'Mediocampista' },
  { name: 'Mostafa Abdelraouf', country: 'EGY', role: 'Mediocampista' },
  { name: 'Mouhamadou Diarra', country: 'SEN', role: 'Mediocampista' },
  { name: 'Mousa Suleiman', country: 'JOR', role: 'Delantero' },
  { name: 'Muhammed Aktürkoğlu', country: 'TUR', role: 'Delantero' },
  { name: 'Musab Aljuwayr', country: 'KSA', role: 'Mediocampista' },
  { name: 'N\'Golo Kante', country: 'FRA', role: 'Mediocampista' },
  { name: 'Nabil Bentaleb', country: 'ALG', role: 'Mediocampista' },
  { name: 'Nabil Aly', country: 'EGY', role: 'Mediocampista' },
  { name: 'Nadiem Amiri', country: 'GER', role: 'Mediocampista' },
  { name: 'Nasser Aldawsari', country: 'KSA', role: 'Mediocampista' },
  { name: 'Nathan-dylan Saliba', country: 'CAN', role: 'Mediocampista' },
  { name: 'Nathanaël Mbuku', country: 'COD', role: 'Mediocampista' },
  { name: 'Neil Aynaoui', country: 'MAR', role: 'Mediocampista' },
  { name: 'Nestory Irankunda', country: 'AUS', role: 'Delantero' },
  { name: 'Ngal’ayel Mukau', country: 'COD', role: 'Mediocampista' },
  { name: 'Nicholas Arthuer', country: 'ESP', role: 'Delantero' },
  { name: 'Nick Woltemade', country: 'GER', role: 'Delantero' },
  { name: 'Nicolas Gonzalez', country: 'ARG', role: 'Mediocampista' },
  { name: 'Nicolas Jackson', country: 'SEN', role: 'Delantero' },
  { name: 'Nicolas Martínez', country: 'ARG', role: 'Delantero' },
  { name: 'Nicolas Pepe', country: 'CIV', role: 'Delantero' },
  { name: 'Nicolas Seiwald', country: 'AUT', role: 'Mediocampista' },
  { name: 'Nicolas Raskin', country: 'BEL', role: 'Mediocampista' },
  { name: 'Nikola Moro', country: 'CRO', role: 'Mediocampista' },
  { name: 'Nikola Vlašić', country: 'CRO', role: 'Mediocampista' },
  { name: 'Nilson Ramirez', country: 'ECU', role: 'Delantero' },
  { name: 'Nishan Velupillay', country: 'AUS', role: 'Delantero' },
  { name: 'Nizar Al-rashdan', country: 'JOR', role: 'Mediocampista' },
  { name: 'Noa Lang', country: 'NED', role: 'Delantero' },
  { name: 'Noah Okafor', country: 'SUI', role: 'Delantero' },
  { name: 'Noah Sadiki', country: 'COD', role: 'Mediocampista' },
  { name: 'Noor Rawabdeh', country: 'JOR', role: 'Mediocampista' },
  { name: 'Nuno Joia', country: 'CPV', role: 'Mediocampista' },
  { name: 'Obed Vargas', country: 'MEX', role: 'Mediocampista' },
  { name: 'Odeh Fakhoury', country: 'JOR', role: 'Delantero' },
  { name: 'Odiljon Xamrobekov', country: 'UZB', role: 'Mediocampista' },
  { name: 'Oliver Watkins', country: 'ENG', role: 'Delantero' },
  { name: 'Olivier Pierre', country: 'HAI', role: 'Mediocampista' },
  { name: 'Omar Marmoush', country: 'EGY', role: 'Delantero' },
  { name: 'Orbelín Alvarado', country: 'MEX', role: 'Mediocampista' },
  { name: 'Orkun Kökçü', country: 'TUR', role: 'Mediocampista' },
  { name: 'Oscar Bobb', country: 'NOR', role: 'Mediocampista' },
  { name: 'Oston Urunov', country: 'UZB', role: 'Mediocampista' },
  { name: 'Oswin Appollis', country: 'RSA', role: 'Delantero' },
  { name: 'Otabek Shukurov', country: 'UZB', role: 'Mediocampista' },
  { name: 'Oumar Diakite', country: 'CIV', role: 'Delantero' },
  { name: 'Oğuz Aydin', country: 'TUR', role: 'Delantero' },
  { name: 'Pablo Gavira', country: 'ESP', role: 'Mediocampista' },
  { name: 'Pape Gueye', country: 'SEN', role: 'Mediocampista' },
  { name: 'Pape Ndiaye', country: 'SEN', role: 'Delantero' },
  { name: 'Pape Sarr', country: 'SEN', role: 'Mediocampista' },
  { name: 'Parfait Guiagon', country: 'CIV', role: 'Mediocampista' },
  { name: 'Pascal Groß', country: 'GER', role: 'Mediocampista' },
  { name: 'Patrick Berg', country: 'NOR', role: 'Mediocampista' },
  { name: 'Patrick Wimmer', country: 'AUT', role: 'Delantero' },
  { name: 'Patrik Schick', country: 'CZE', role: 'Delantero' },
  { name: 'Paul Bravo', country: 'URU', role: 'Delantero' },
  { name: 'Paul Okon-engstler', country: 'AUS', role: 'Mediocampista' },
  { name: 'Paul Wanner', country: 'AUT', role: 'Mediocampista' },
  { name: 'Pavel Šulc', country: 'CZE', role: 'Delantero' },
  { name: 'Pedro López', country: 'ESP', role: 'Mediocampista' },
  { name: 'Pedro Uca', country: 'ECU', role: 'Mediocampista' },
  { name: 'Pedro Neto', country: 'POR', role: 'Delantero' },
  { name: 'Petar Musa', country: 'CRO', role: 'Delantero' },
  { name: 'Petar Sučić', country: 'CRO', role: 'Mediocampista' },
  { name: 'Prince Adu', country: 'GHA', role: 'Delantero' },
  { name: 'Promise David', country: 'CAN', role: 'Delantero' },
  { name: 'Quinten Timber', country: 'NED', role: 'Mediocampista' },
  { name: 'Radrigo Martinez', country: 'URU', role: 'Mediocampista' },
  { name: 'Rafael Leão', country: 'POR', role: 'Delantero' },
  { name: 'Raja\'Ei Hasan', country: 'JOR', role: 'Mediocampista' },
  { name: 'Ramiz Zerrouki', country: 'ALG', role: 'Mediocampista' },
  { name: 'Ramón Acosta', country: 'PAR', role: 'Mediocampista' },
  { name: 'Rani Khedira', country: 'TUN', role: 'Mediocampista' },
  { name: 'Raphael Belloli', country: 'BRA', role: 'Delantero' },
  { name: 'Ray Andrade', country: 'ECU', role: 'Mediocampista' },
  { name: 'Rayan Elloumi', country: 'TUN', role: 'Delantero' },
  { name: 'Rayan Rocha', country: 'BRA', role: 'Delantero' },
  { name: 'Raúl Rodríguez', country: 'MEX', role: 'Delantero' },
  { name: 'Relebohile Mofokeng', country: 'RSA', role: 'Delantero' },
  { name: 'Remo Freuler', country: 'SUI', role: 'Mediocampista' },
  { name: 'Ricardo Pepi', country: 'USA', role: 'Delantero' },
  { name: 'Richard Montoya', country: 'COL', role: 'Mediocampista' },
  { name: 'Ritsu Doan', country: 'JPN', role: 'Mediocampista' },
  { name: 'Riyad Mahrez', country: 'ALG', role: 'Delantero' },
  { name: 'Roberto Hernández', country: 'MEX', role: 'Delantero' },
  { name: 'Rodrigo Colmán', country: 'URU', role: 'Mediocampista' },
  { name: 'Rodrigo Cascante', country: 'ESP', role: 'Mediocampista' },
  { name: 'Rodrigo Paul', country: 'ARG', role: 'Mediocampista' },
  { name: 'Rodrigo Soto', country: 'URU', role: 'Delantero' },
  { name: 'Romano Schmid', country: 'AUT', role: 'Mediocampista' },
  { name: 'Roozbeh Cheshmi', country: 'IRN', role: 'Mediocampista' },
  { name: 'Ross Stewart', country: 'SCO', role: 'Delantero' },
  { name: 'Ruben Maritnez', country: 'SUI', role: 'Delantero' },
  { name: 'Ruben Providence', country: 'HAI', role: 'Delantero' },
  { name: 'Ryan Christie', country: 'SCO', role: 'Mediocampista' },
  { name: 'Ryan Mendes', country: 'CPV', role: 'Delantero' },
  { name: 'Ryan Thomas', country: 'NZL', role: 'Mediocampista' },
  { name: 'Ryan Gravenberch', country: 'NED', role: 'Mediocampista' },
  { name: 'Rúben Neves', country: 'POR', role: 'Mediocampista' },
  { name: 'Sadio Mané', country: 'SEN', role: 'Delantero' },
  { name: 'Saeid Afagh', country: 'IRN', role: 'Mediocampista' },
  { name: 'Saleh Alshehri', country: 'KSA', role: 'Delantero' },
  { name: 'Salem Aldawsari', country: 'KSA', role: 'Delantero' },
  { name: 'Salih Özcan', country: 'TUR', role: 'Mediocampista' },
  { name: 'Samed Baždar', country: 'BIH', role: 'Delantero' },
  { name: 'Samir Mourabet', country: 'MAR', role: 'Mediocampista' },
  { name: 'Samuel Moutoussamy', country: 'COD', role: 'Mediocampista' },
  { name: 'Sander Berge', country: 'NOR', role: 'Mediocampista' },
  { name: 'Santiago Gimenez', country: 'MEX', role: 'Delantero' },
  { name: 'Sarpreet Singh', country: 'NZL', role: 'Mediocampista' },
  { name: 'Saša Kalajdžić', country: 'AUT', role: 'Delantero' },
  { name: 'Scott Mctominay', country: 'SCO', role: 'Mediocampista' },
  { name: 'Sebastian Berhalter', country: 'USA', role: 'Mediocampista' },
  { name: 'Sebastian Tounekti', country: 'TUN', role: 'Mediocampista' },
  { name: 'Seko Fofana', country: 'CIV', role: 'Mediocampista' },
  { name: 'Sekotori Makgopa', country: 'RSA', role: 'Delantero' },
  { name: 'Sepe Wahi', country: 'CIV', role: 'Delantero' },
  { name: 'Seungho Paik', country: 'KOR', role: 'Mediocampista' },
  { name: 'Seyed Ghoddoos', country: 'IRN', role: 'Mediocampista' },
  { name: 'Shahriyar Moghanloo', country: 'IRN', role: 'Delantero' },
  { name: 'Sherzod Esanov', country: 'UZB', role: 'Mediocampista' },
  { name: 'Simon Adingra', country: 'CIV', role: 'Delantero' },
  { name: 'Simon Banza', country: 'COD', role: 'Delantero' },
  { name: 'Sofyan Amrabat', country: 'MAR', role: 'Mediocampista' },
  { name: 'Solomon Thomas-asante', country: 'GHA', role: 'Delantero' },
  { name: 'Sou Rahimi', country: 'MAR', role: 'Delantero' },
  { name: 'Sphephelo Sithole', country: 'RSA', role: 'Mediocampista' },
  { name: 'Stephen Eustáquio', country: 'CAN', role: 'Mediocampista' },
  { name: 'Sultan Mandash', country: 'KSA', role: 'Delantero' },
  { name: 'Taha Ali', country: 'SWE', role: 'Delantero' },
  { name: 'Tahith Chong', country: 'CUW', role: 'Mediocampista' },
  { name: 'Tahsin Jamshid', country: 'QAT', role: 'Delantero' },
  { name: 'Tajon Buchanan', country: 'CAN', role: 'Delantero' },
  { name: 'Takefusa Kubo', country: 'JPN', role: 'Mediocampista' },
  { name: 'Tanitoluwa Oluwaseyi', country: 'CAN', role: 'Delantero' },
  { name: 'Teboho Mokoena', country: 'RSA', role: 'Mediocampista' },
  { name: 'Telmo Arcanjo', country: 'CPV', role: 'Mediocampista' },
  { name: 'Tete Yengi', country: 'AUS', role: 'Delantero' },
  { name: 'Teun Koopmeiners', country: 'NED', role: 'Mediocampista' },
  { name: 'Thalente Mbatha', country: 'RSA', role: 'Mediocampista' },
  { name: 'Thapelo Maseko', country: 'RSA', role: 'Delantero' },
  { name: 'Thelonious Aasgaard', country: 'NOR', role: 'Mediocampista' },
  { name: 'Themba Zwane', country: 'RSA', role: 'Mediocampista' },
  { name: 'Theo Bongonda', country: 'COD', role: 'Mediocampista' },
  { name: 'Thiago Almada', country: 'ARG', role: 'Delantero' },
  { name: 'Thomas Partey', country: 'GHA', role: 'Mediocampista' },
  { name: 'Tijjani Reijnders', country: 'NED', role: 'Mediocampista' },
  { name: 'Timothy Weah', country: 'USA', role: 'Delantero' },
  { name: 'Tomas Mena', country: 'PAN', role: 'Delantero' },
  { name: 'Tomáš Chorý', country: 'CZE', role: 'Delantero' },
  { name: 'Tomáš Souček', country: 'CZE', role: 'Mediocampista' },
  { name: 'Toni Fruk', country: 'CRO', role: 'Mediocampista' },
  { name: 'Tshepang Moremi', country: 'RSA', role: 'Delantero' },
  { name: 'Tshibola Aaron', country: 'COD', role: 'Mediocampista' },
  { name: 'Tyler Fletcher', country: 'SCO', role: 'Mediocampista' },
  { name: 'Tyler Adams', country: 'USA', role: 'Mediocampista' },
  { name: 'Tyrese Noslin', country: 'CUW', role: 'Delantero' },
  { name: 'Valentin Barco', country: 'ARG', role: 'Mediocampista' },
  { name: 'Victor Villanueva', country: 'ESP', role: 'Delantero' },
  { name: 'Vitor Ferreira', country: 'POR', role: 'Mediocampista' },
  { name: 'Vladimír Darida', country: 'CZE', role: 'Mediocampista' },
  { name: 'Warren Zaïre-emery', country: 'FRA', role: 'Mediocampista' },
  { name: 'Wataru Endo', country: 'JPN', role: 'Mediocampista' },
  { name: 'Weston Kennie', country: 'USA', role: 'Mediocampista' },
  { name: 'Willy Afonso', country: 'CPV', role: 'Mediocampista' },
  { name: 'Wilson Isidor', country: 'HAI', role: 'Delantero' },
  { name: 'Wout Weghorst', country: 'NED', role: 'Delantero' },
  { name: 'Xaver Schlager', country: 'AUT', role: 'Mediocampista' },
  { name: 'Yan Diomande', country: 'CIV', role: 'Delantero' },
  { name: 'Yasin Ayari', country: 'SWE', role: 'Mediocampista' },
  { name: 'Yassin Fortune', country: 'HAI', role: 'Delantero' },
  { name: 'Yassine Titraoui', country: 'ALG', role: 'Mediocampista' },
  { name: 'Yeremy Santos', country: 'ESP', role: 'Delantero' },
  { name: 'Yoane Wissa', country: 'COD', role: 'Delantero' },
  { name: 'Youri Tielemans', country: 'BEL', role: 'Mediocampista' },
  { name: 'Youssef Amyn', country: 'IRQ', role: 'Mediocampista' },
  { name: 'Yuito Suzuki', country: 'JPN', role: 'Mediocampista' },
  { name: 'Yunus Akgün', country: 'TUR', role: 'Delantero' },
  { name: 'Yusuf Yusuf', country: 'QAT', role: 'Delantero' },
  { name: 'Zaid Al-dulaimi', country: 'IRQ', role: 'Mediocampista' },
  { name: 'Zidane Iqbal', country: 'IRQ', role: 'Mediocampista' },
  { name: 'Ziyad Aljohani', country: 'KSA', role: 'Mediocampista' },
  { name: 'Álvaro Fernández', country: 'MEX', role: 'Mediocampista' },
  { name: 'Édgar Herrera', country: 'PAN', role: 'Mediocampista' },
  { name: 'İrfan Kahveci̇', country: 'TUR', role: 'Delantero' },
  { name: 'İsmai̇l Yüksek', country: 'TUR', role: 'Mediocampista' },
];
export const SELECCIONES: [string, string][] = [
  ['ARG','Argentina'], ['ALG','Argelia'], ['AUS','Australia'], ['AUT','Austria'],
  ['BEL','Bélgica'], ['BRA','Brasil'], ['BIH','Bosnia y Herzegovina'], ['CAN','Canadá'],
  ['COL','Colombia'], ['CRC','Costa Rica'], ['CIV','Costa de Marfil'], ['CRO','Croacia'],
  ['CPV','Cabo Verde'], ['CUW','Curazao'], ['CZE','República Checa'], ['DEN','Dinamarca'],
  ['ECU','Ecuador'], ['EGY','Egipto'], ['ESP','España'], ['ENG','Inglaterra'],
  ['FRA','Francia'], ['GHA','Ghana'], ['GER','Alemania'], ['HAI','Haití'],
  ['ITA','Italia'], ['IRN','Irán'], ['IRQ','Irak'], ['JPN','Japón'],
  ['JOR','Jordania'], ['KOR','Corea del Sur'], ['KSA','Arabia Saudita'], ['MAR','Marruecos'],
  ['MEX','México'], ['NED','Países Bajos'], ['NGA','Nigeria'], ['NOR','Noruega'],
  ['NZL','Nueva Zelanda'], ['PAN','Panamá'], ['PAR','Paraguay'], ['POR','Portugal'],
  ['POL','Polonia'], ['QAT','Qatar'], ['RSA','Sudáfrica'], ['SCO','Escocia'],
  ['SEN','Senegal'], ['SRB','Serbia'], ['SUI','Suiza'], ['SWE','Suecia'],
  ['TUR','Turquía'], ['TUN','Túnez'], ['UKR','Ucrania'], ['URU','Uruguay'],
  ['USA','Estados Unidos'], ['UZB','Uzbekistán'], ['VEN','Venezuela'], ['COD','Rep. Dem. del Congo'],
];

export interface Premio {
  id: string; name: string; cost: number; tier: string; img: string;
}
export const PREMIOS: Premio[] = [
  { id: 'p1', name: 'PlayStation 5 + EA FC 25', cost: 15000, tier: 'HERO',         img: 'ps5' },
  { id: 'p2', name: 'Smart TV 55" 4K',           cost: 15000, tier: 'HERO',         img: 'tv' },
  { id: 'p3', name: 'Jersey Selección Authentic', cost: 4000,  tier: 'ASPIRACIONAL', img: 'jersey' },
  { id: 'p4', name: 'Nintendo Switch',            cost: 4000,  tier: 'ASPIRACIONAL', img: 'switch' },
  { id: 'p5', name: 'Audífonos JBL',              cost: 2000,  tier: 'MEDIO',        img: 'jbl' },
  { id: 'p6', name: 'Balón oficial',              cost: 2000,  tier: 'MEDIO',        img: 'ball' },
  { id: 'p7', name: 'Bufanda Selección',          cost: 500,   tier: 'SIMBÓLICO',    img: 'scarf' },
  { id: 'p8', name: 'Gift card $200',             cost: 500,   tier: 'SIMBÓLICO',    img: 'card' },
];

export const TEAM_ALIASES: Record<string, string[]> = {
  MEX: ['Mexico', 'Tri', 'El Tri'],
  USA: ['EUA', 'Estados Unidos', 'EEUU', 'United States'],
  CZE: ['Chequia', 'Republica Checa', 'Czech'],
  QAT: ['Catar', 'Katar'],
  BIH: ['Bosnia', 'Bosnia y Herz', 'Bosnia Herzegovina'],
  COD: ['RD Congo', 'Congo', 'Republica Democratica del Congo'],
  HAI: ['HTI', 'Haiti'],
  CIV: ['Costa Marfil', 'Marfil', 'Ivory Coast'],
  NED: ['Holanda', 'Holland', 'Paises Bajos'],
  KOR: ['Corea', 'Korea', 'Corea Sur'],
  GER: ['Alemania', 'Germany', 'Deutschland'],
  ENG: ['Inglaterra', 'England'],
  FRA: ['Francia', 'France'],
  ESP: ['Espana', 'Spain'],
  BEL: ['Belgica', 'Belgium'],
  BRA: ['Brasil', 'Brazil'],
  ARG: ['Argentina'],
  POR: ['Portugal'],
  URU: ['Uruguay'],
  COL: ['Colombia'],
  ECU: ['Ecuador'],
  PAR: ['Paraguay'],
  CAN: ['Canada'],
  MAR: ['Marruecos', 'Morocco'],
  SEN: ['Senegal'],
  GHA: ['Ghana'],
  NOR: ['Noruega', 'Norway'],
  SWE: ['Suecia', 'Sweden'],
  SUI: ['Suiza', 'Switzerland'],
  TUN: ['Tunez', 'Tunisia'],
  TUR: ['Turquia', 'Turkey'],
  IRN: ['Iran'],
  IRQ: ['Irak', 'Iraq'],
  JPN: ['Japon', 'Japan'],
  KSA: ['Arabia Saudita', 'Arabia Saudí', 'Saudi Arabia', 'Arabia'],
  AUS: ['Australia'],
  RSA: ['Sudafrica', 'South Africa'],
  SCO: ['Escocia', 'Scotland'],
  NZL: ['Nueva Zelanda', 'New Zealand'],
  UZB: ['Uzbekistan'],
  CPV: ['Cabo Verde', 'Cape Verde'],
  CUW: ['Curazao', 'Curacao'],
  AUT: ['Austria'],
  JOR: ['Jordania', 'Jordan'],
  ALG: ['Argelia', 'Algeria'],
  CRO: ['Croacia', 'Croatia'],
  PAN: ['Panama'],
  EGY: ['Egipto', 'Egypt'],
};

export const STADIUM_ALIASES: Record<string, string[]> = {
  'Estadio Ciudad de México': ['Estadio Azteca', 'Azteca', 'Estadio Banorte', 'Banorte', 'CDMX', 'Ciudad de México', 'Ciudad de Mexico', 'DF', 'CMEX'],
  'Estadio Guadalajara':      ['Estadio Akron', 'Akron', 'GDL', 'Guadalajara', 'Tapatío', 'Tapatio'],
  'Estadio Monterrey':        ['Estadio BBVA', 'BBVA', 'MTY', 'Monterrey'],
  'Estadio Nueva York / Nueva Jersey': ['MetLife Stadium', 'MetLife', 'NYC', 'Nueva York', 'New York', 'NY', 'NJ', 'Nueva Jersey', 'New Jersey'],
  'Estadio de Los Ángeles':   ['SoFi Stadium', 'SoFi', 'LA', 'LAX', 'Los Ángeles', 'Los Angeles', 'LOSA'],
  'Estadio de Dallas':        ['AT&T Stadium', 'AT&T', 'DAL', 'Dallas'],
  'Estadio de Atlanta':       ['Mercedes-Benz Stadium', 'Mercedes-Benz', 'Mercedes Benz', 'ATL', 'Atlanta'],
  'Estadio de Miami':         ['Hard Rock Stadium', 'Hard Rock', 'MIA', 'Miami'],
  'Estadio de Houston':       ['NRG Stadium', 'NRG', 'HOU', 'Houston'],
  'Estadio de Kansas City':   ['GEHA Field', 'Arrowhead Stadium', 'Arrowhead', 'KC', 'Kansas City', 'Kansas'],
  'Estadio de Filadelfia':    ['Lincoln Financial Field', 'Lincoln Financial', 'PHL', 'Filadelfia', 'Philadelphia'],
  'Estadio de San Francisco': ["Levi's Stadium", "Levis Stadium", "Levi's", 'SFO', 'SF', 'San Francisco'],
  'Estadio de Seattle':       ['Lumen Field', 'Lumen', 'SEA', 'Seattle'],
  'Estadio de Boston':        ['Gillette Stadium', 'Gillette', 'BOS', 'Boston'],
  'Estadio de Toronto':       ['BMO Field', 'BMO', 'TOR', 'Toronto'],
  'Estadio BC Place Vancouver': ['BC Place', 'VAN', 'YVR', 'Vancouver'],
};

export const KNOCKOUT_MATCHES: Match[] = [
  // ── DIECISEISAVOS DE FINAL (R32) ──
  { id:'r32_01', group:'DIECISEISAVOS', slotHome:'1A', home:{code:'TBD',name:'Por definir',placeholder:'1° Grupo A'}, slotAway:'2C', away:{code:'TBD',name:'Por definir',placeholder:'2° Grupo C'}, date:'sáb. 27 jun. 2026 12:00 pm', stadium:'MetLife Stadium · Nueva Jersey, EUA', prediction:null, lastUpdate:null },
  { id:'r32_02', group:'DIECISEISAVOS', slotHome:'1C', home:{code:'TBD',name:'Por definir',placeholder:'1° Grupo C'}, slotAway:'2A', away:{code:'TBD',name:'Por definir',placeholder:'2° Grupo A'}, date:'sáb. 27 jun. 2026 04:00 pm', stadium:'AT&T Stadium · Dallas, EUA', prediction:null, lastUpdate:null },
  { id:'r32_03', group:'DIECISEISAVOS', slotHome:'1B', home:{code:'TBD',name:'Por definir',placeholder:'1° Grupo B'}, slotAway:'2D', away:{code:'TBD',name:'Por definir',placeholder:'2° Grupo D'}, date:'dom. 28 jun. 2026 12:00 pm', stadium:'Estadio Ciudad de México · México', prediction:null, lastUpdate:null },
  { id:'r32_04', group:'DIECISEISAVOS', slotHome:'1D', home:{code:'TBD',name:'Por definir',placeholder:'1° Grupo D'}, slotAway:'2B', away:{code:'TBD',name:'Por definir',placeholder:'2° Grupo B'}, date:'dom. 28 jun. 2026 04:00 pm', stadium:'SoFi Stadium · Los Ángeles, EUA', prediction:null, lastUpdate:null },
  { id:'r32_05', group:'DIECISEISAVOS', slotHome:'1E', home:{code:'TBD',name:'Por definir',placeholder:'1° Grupo E'}, slotAway:'2G', away:{code:'TBD',name:'Por definir',placeholder:'2° Grupo G'}, date:'lun. 29 jun. 2026 12:00 pm', stadium:'Levi\'s Stadium · San Francisco, EUA', prediction:null, lastUpdate:null },
  { id:'r32_06', group:'DIECISEISAVOS', slotHome:'1G', home:{code:'TBD',name:'Por definir',placeholder:'1° Grupo G'}, slotAway:'2E', away:{code:'TBD',name:'Por definir',placeholder:'2° Grupo E'}, date:'lun. 29 jun. 2026 04:00 pm', stadium:'Estadio Guadalajara · México', prediction:null, lastUpdate:null },
  { id:'r32_07', group:'DIECISEISAVOS', slotHome:'1F', home:{code:'TBD',name:'Por definir',placeholder:'1° Grupo F'}, slotAway:'2H', away:{code:'TBD',name:'Por definir',placeholder:'2° Grupo H'}, date:'mar. 30 jun. 2026 12:00 pm', stadium:'Allegiant Stadium · Las Vegas, EUA', prediction:null, lastUpdate:null },
  { id:'r32_08', group:'DIECISEISAVOS', slotHome:'1H', home:{code:'TBD',name:'Por definir',placeholder:'1° Grupo H'}, slotAway:'2F', away:{code:'TBD',name:'Por definir',placeholder:'2° Grupo F'}, date:'mar. 30 jun. 2026 04:00 pm', stadium:'Arrowhead Stadium · Kansas City, EUA', prediction:null, lastUpdate:null },
  { id:'r32_09', group:'DIECISEISAVOS', slotHome:'1I', home:{code:'TBD',name:'Por definir',placeholder:'1° Grupo I'}, slotAway:'2K', away:{code:'TBD',name:'Por definir',placeholder:'2° Grupo K'}, date:'mié. 1 jul. 2026 12:00 pm', stadium:'Hard Rock Stadium · Miami, EUA', prediction:null, lastUpdate:null },
  { id:'r32_10', group:'DIECISEISAVOS', slotHome:'1K', home:{code:'TBD',name:'Por definir',placeholder:'1° Grupo K'}, slotAway:'2I', away:{code:'TBD',name:'Por definir',placeholder:'2° Grupo I'}, date:'mié. 1 jul. 2026 04:00 pm', stadium:'Lincoln Financial Field · Filadelfia, EUA', prediction:null, lastUpdate:null },
  { id:'r32_11', group:'DIECISEISAVOS', slotHome:'1J', home:{code:'TBD',name:'Por definir',placeholder:'1° Grupo J'}, slotAway:'2L', away:{code:'TBD',name:'Por definir',placeholder:'2° Grupo L'}, date:'jue. 2 jul. 2026 12:00 pm', stadium:'Rose Bowl · Los Ángeles, EUA', prediction:null, lastUpdate:null },
  { id:'r32_12', group:'DIECISEISAVOS', slotHome:'1L', home:{code:'TBD',name:'Por definir',placeholder:'1° Grupo L'}, slotAway:'2J', away:{code:'TBD',name:'Por definir',placeholder:'2° Grupo J'}, date:'jue. 2 jul. 2026 04:00 pm', stadium:'Estadio Monterrey · México', prediction:null, lastUpdate:null },
  { id:'r32_13', group:'DIECISEISAVOS', slotHome:'T3_1', home:{code:'TBD',name:'Por definir',placeholder:'Mejor 3° (A/B/C)'}, slotAway:'T3_2', away:{code:'TBD',name:'Por definir',placeholder:'Mejor 3° (D/E/F)'}, date:'vie. 3 jul. 2026 12:00 pm', stadium:'NRG Stadium · Houston, EUA', prediction:null, lastUpdate:null },
  { id:'r32_14', group:'DIECISEISAVOS', slotHome:'T3_3', home:{code:'TBD',name:'Por definir',placeholder:'Mejor 3° (G/H/I)'}, slotAway:'T3_4', away:{code:'TBD',name:'Por definir',placeholder:'Mejor 3° (J/K/L)'}, date:'vie. 3 jul. 2026 04:00 pm', stadium:'Gillette Stadium · Boston, EUA', prediction:null, lastUpdate:null },
  { id:'r32_15', group:'DIECISEISAVOS', slotHome:'T3_5', home:{code:'TBD',name:'Por definir',placeholder:'Mejor 3° (A/D/G)'}, slotAway:'T3_6', away:{code:'TBD',name:'Por definir',placeholder:'Mejor 3° (B/E/H)'}, date:'sáb. 4 jul. 2026 12:00 pm', stadium:'Soldier Field · Chicago, EUA', prediction:null, lastUpdate:null },
  { id:'r32_16', group:'DIECISEISAVOS', slotHome:'T3_7', home:{code:'TBD',name:'Por definir',placeholder:'Mejor 3° (C/F/I)'}, slotAway:'T3_8', away:{code:'TBD',name:'Por definir',placeholder:'Mejor 3° (J/K/L)'}, date:'sáb. 4 jul. 2026 04:00 pm', stadium:'Caesars Superdome · Nueva Orleans, EUA', prediction:null, lastUpdate:null },

  // ── OCTAVOS DE FINAL (R16) ──
  { id:'r16_01', group:'OCTAVOS DE FINAL', slotHome:'W_r32_01', home:{code:'TBD',name:'Por definir',placeholder:'Ganador P1'}, slotAway:'W_r32_02', away:{code:'TBD',name:'Por definir',placeholder:'Ganador P2'}, date:'dom. 5 jul. 2026 12:00 pm', stadium:'MetLife Stadium · Nueva Jersey, EUA', prediction:null, lastUpdate:null },
  { id:'r16_02', group:'OCTAVOS DE FINAL', slotHome:'W_r32_03', home:{code:'TBD',name:'Por definir',placeholder:'Ganador P3'}, slotAway:'W_r32_04', away:{code:'TBD',name:'Por definir',placeholder:'Ganador P4'}, date:'dom. 5 jul. 2026 04:00 pm', stadium:'AT&T Stadium · Dallas, EUA', prediction:null, lastUpdate:null },
  { id:'r16_03', group:'OCTAVOS DE FINAL', slotHome:'W_r32_05', home:{code:'TBD',name:'Por definir',placeholder:'Ganador P5'}, slotAway:'W_r32_06', away:{code:'TBD',name:'Por definir',placeholder:'Ganador P6'}, date:'lun. 6 jul. 2026 12:00 pm', stadium:'SoFi Stadium · Los Ángeles, EUA', prediction:null, lastUpdate:null },
  { id:'r16_04', group:'OCTAVOS DE FINAL', slotHome:'W_r32_07', home:{code:'TBD',name:'Por definir',placeholder:'Ganador P7'}, slotAway:'W_r32_08', away:{code:'TBD',name:'Por definir',placeholder:'Ganador P8'}, date:'lun. 6 jul. 2026 04:00 pm', stadium:'Estadio Ciudad de México · México', prediction:null, lastUpdate:null },
  { id:'r16_05', group:'OCTAVOS DE FINAL', slotHome:'W_r32_09', home:{code:'TBD',name:'Por definir',placeholder:'Ganador P9'}, slotAway:'W_r32_10', away:{code:'TBD',name:'Por definir',placeholder:'Ganador P10'}, date:'mar. 7 jul. 2026 12:00 pm', stadium:'Arrowhead Stadium · Kansas City, EUA', prediction:null, lastUpdate:null },
  { id:'r16_06', group:'OCTAVOS DE FINAL', slotHome:'W_r32_11', home:{code:'TBD',name:'Por definir',placeholder:'Ganador P11'}, slotAway:'W_r32_12', away:{code:'TBD',name:'Por definir',placeholder:'Ganador P12'}, date:'mar. 7 jul. 2026 04:00 pm', stadium:'Hard Rock Stadium · Miami, EUA', prediction:null, lastUpdate:null },
  { id:'r16_07', group:'OCTAVOS DE FINAL', slotHome:'W_r32_13', home:{code:'TBD',name:'Por definir',placeholder:'Ganador P13'}, slotAway:'W_r32_14', away:{code:'TBD',name:'Por definir',placeholder:'Ganador P14'}, date:'mié. 8 jul. 2026 12:00 pm', stadium:'Rose Bowl · Los Ángeles, EUA', prediction:null, lastUpdate:null },
  { id:'r16_08', group:'OCTAVOS DE FINAL', slotHome:'W_r32_15', home:{code:'TBD',name:'Por definir',placeholder:'Ganador P15'}, slotAway:'W_r32_16', away:{code:'TBD',name:'Por definir',placeholder:'Ganador P16'}, date:'mié. 8 jul. 2026 04:00 pm', stadium:'Levi\'s Stadium · San Francisco, EUA', prediction:null, lastUpdate:null },

  // ── CUARTOS DE FINAL ──
  { id:'qf_01', group:'CUARTOS DE FINAL', slotHome:'W_r16_01', home:{code:'TBD',name:'Por definir',placeholder:'Ganador O1'}, slotAway:'W_r16_02', away:{code:'TBD',name:'Por definir',placeholder:'Ganador O2'}, date:'sáb. 11 jul. 2026 12:00 pm', stadium:'MetLife Stadium · Nueva Jersey, EUA', prediction:null, lastUpdate:null },
  { id:'qf_02', group:'CUARTOS DE FINAL', slotHome:'W_r16_03', home:{code:'TBD',name:'Por definir',placeholder:'Ganador O3'}, slotAway:'W_r16_04', away:{code:'TBD',name:'Por definir',placeholder:'Ganador O4'}, date:'sáb. 11 jul. 2026 04:00 pm', stadium:'AT&T Stadium · Dallas, EUA', prediction:null, lastUpdate:null },
  { id:'qf_03', group:'CUARTOS DE FINAL', slotHome:'W_r16_05', home:{code:'TBD',name:'Por definir',placeholder:'Ganador O5'}, slotAway:'W_r16_06', away:{code:'TBD',name:'Por definir',placeholder:'Ganador O6'}, date:'dom. 12 jul. 2026 12:00 pm', stadium:'SoFi Stadium · Los Ángeles, EUA', prediction:null, lastUpdate:null },
  { id:'qf_04', group:'CUARTOS DE FINAL', slotHome:'W_r16_07', home:{code:'TBD',name:'Por definir',placeholder:'Ganador O7'}, slotAway:'W_r16_08', away:{code:'TBD',name:'Por definir',placeholder:'Ganador O8'}, date:'dom. 12 jul. 2026 04:00 pm', stadium:'Rose Bowl · Los Ángeles, EUA', prediction:null, lastUpdate:null },

  // ── SEMIFINALES ──
  { id:'sf_01', group:'SEMIFINALES', slotHome:'W_qf_01', home:{code:'TBD',name:'Por definir',placeholder:'Ganador C1'}, slotAway:'W_qf_02', away:{code:'TBD',name:'Por definir',placeholder:'Ganador C2'}, date:'mar. 14 jul. 2026 06:00 pm', stadium:'MetLife Stadium · Nueva Jersey, EUA', prediction:null, lastUpdate:null },
  { id:'sf_02', group:'SEMIFINALES', slotHome:'W_qf_03', home:{code:'TBD',name:'Por definir',placeholder:'Ganador C3'}, slotAway:'W_qf_04', away:{code:'TBD',name:'Por definir',placeholder:'Ganador C4'}, date:'mié. 15 jul. 2026 06:00 pm', stadium:'AT&T Stadium · Dallas, EUA', prediction:null, lastUpdate:null },

  // ── TERCER LUGAR ──
  { id:'tp_01', group:'TERCER LUGAR', slotHome:'L_sf_01', home:{code:'TBD',name:'Por definir',placeholder:'Perdedor SF1'}, slotAway:'L_sf_02', away:{code:'TBD',name:'Por definir',placeholder:'Perdedor SF2'}, date:'sáb. 18 jul. 2026 02:00 pm', stadium:'Rose Bowl · Los Ángeles, EUA', prediction:null, lastUpdate:null },

  // ── FINAL ──
  { id:'f_01', group:'FINAL', slotHome:'W_sf_01', home:{code:'TBD',name:'Por definir',placeholder:'Campeón SF1'}, slotAway:'W_sf_02', away:{code:'TBD',name:'Por definir',placeholder:'Campeón SF2'}, date:'dom. 19 jul. 2026 11:00 am', stadium:'MetLife Stadium · Nueva Jersey, EUA', prediction:null, lastUpdate:null },
];

// ── Head-to-Head data ──────────────────────────────────────────────────────────
export interface H2HPastMatch {
  year: number; comp: string;
  h: string; hs: number; as: number; a: string;
}
export interface H2HEntry {
  n: number; since?: number;
  hw: number; d: number; aw: number; // wins for alphabetically-first / draws / second
  hg: number; ag: number;            // goals for first / second
  desc: string;
  past: H2HPastMatch[];
}

type PM = H2HPastMatch;
const h2h = (n: number, since: number | undefined, hw: number, d: number, aw: number, hg: number, ag: number, desc: string, past: PM[]): H2HEntry =>
  ({ n, since, hw, d, aw, hg, ag, desc, past });
const lim = (desc: string): H2HEntry => h2h(0, undefined, 0, 0, 0, 0, 0, desc, []);

// Key = sorted([home.code, away.code]).join('-')
// hw/hg refer to the alphabetically-FIRST code; aw/ag to the second.
// pred = [firstAlphaScore, secondAlphaScore] — undefined if no prediction available
export const H2H_DATA: Record<string, H2HEntry> = {
  // ── Grupo A ──
  'MEX-RSA': h2h(2, 2005, 0, 1, 1, 2, 3, 'Dos encuentros desde 2005, ambos favorables a Sudáfrica.',
    [{year:2010, comp:'Copa Mundial, Grupo A J1',              h:'RSA', hs:1, as:1, a:'MEX'},
     {year:2005, comp:'Copa de Oro CONCACAF, Grupo C',         h:'RSA', hs:2, as:1, a:'MEX'}]),
  'CZE-KOR': h2h(3, 2001, 1, 1, 1, 3, 3, 'Tres encuentros desde 2001 con balance equilibrado: un triunfo por lado y un empate. Chequia ganó el último en 2016.',
    [{year:2016, comp:'Amistoso Internacional',                h:'CZE', hs:2, as:1, a:'KOR'},
     {year:2004, comp:'Amistoso Internacional',                h:'KOR', hs:0, as:0, a:'CZE'},
     {year:2001, comp:'Amistoso Internacional',                h:'KOR', hs:2, as:1, a:'CZE'}]),
  'CZE-RSA': h2h(1, 2000, 1, 0, 0, 2, 1, 'Un único encuentro en el año 2000: Chequia venció 2-1 a Sudáfrica en amistoso.',
    [{year:2000, comp:'Amistoso Internacional',                h:'RSA', hs:1, as:2, a:'CZE'}]),
  'KOR-MEX': h2h(14, 1948, 4, 2, 8, 16, 25, '14 encuentros desde 1948 con dominio mexicano (8 victorias frente a 4 de Corea). México ganó el último en el Mundial de Rusia 2018.',
    [{year:2018, comp:'Copa Mundial Rusia, Grupo F J2',         h:'KOR', hs:1, as:2, a:'MEX'},
     {year:2014, comp:'Amistoso Internacional',                h:'MEX', hs:4, as:0, a:'KOR'},
     {year:1998, comp:'Amistoso Internacional',                h:'KOR', hs:1, as:2, a:'MEX'}]),
  'KOR-RSA': h2h(4, 1998, 2, 1, 1, 7, 5, 'Cuatro encuentros desde 1998 con leve ventaja de Corea del Sur (2 victorias frente a 1 de Sudáfrica).',
    [{year:2015, comp:'Amistoso Internacional',                h:'KOR', hs:1, as:0, a:'RSA'},
     {year:2013, comp:'Amistoso Internacional',                h:'RSA', hs:0, as:0, a:'KOR'},
     {year:2009, comp:'Amistoso Internacional',                h:'RSA', hs:1, as:0, a:'KOR'}]),
  'CZE-MEX': h2h(3, 1997, 2, 0, 1, 5, 4, 'Tres duelos desde 1997 con ventaja checa (2-1 en victorias). México ganó en 1997 pero Chequia se impuso en 2000 y 2021.',
    [{year:2021, comp:'Amistoso Internacional',                h:'MEX', hs:0, as:1, a:'CZE'},
     {year:2000, comp:'Amistoso Internacional',                h:'CZE', hs:2, as:1, a:'MEX'},
     {year:1997, comp:'Amistoso Internacional',                h:'MEX', hs:3, as:2, a:'CZE'}]),
  // ── Grupo B ──
  'BIH-CAN': h2h(1, 2021, 0, 1, 0, 0, 0, 'Un único amistoso en enero 2021 que terminó en empate sin goles.',
    [{year:2021, comp:'Amistoso Internacional',                h:'CAN', hs:0, as:0, a:'BIH'}]),
  'QAT-SUI': h2h(2, 2008, 0, 0, 2, 1, 5, 'Dos encuentros, ambas victorias suizas. Catar nunca ha podido ganarle a Suiza.',
    [{year:2018, comp:'Amistoso Internacional',                h:'SUI', hs:1, as:0, a:'QAT'},
     {year:2008, comp:'Amistoso Internacional',                h:'QAT', hs:1, as:4, a:'SUI'}]),
  'BIH-SUI': h2h(2, 2013, 0, 1, 1, 1, 3, 'Dos duelos con ventaja suiza: Suiza ganó 2-0 en 2016 y empataron 1-1 en 2013.',
    [{year:2016, comp:'Amistoso Internacional',                h:'SUI', hs:2, as:0, a:'BIH'},
     {year:2013, comp:'Amistoso Internacional',                h:'BIH', hs:1, as:1, a:'SUI'}]),
  'CAN-QAT': h2h(1, 2022, 1, 0, 0, 2, 0, 'Canadá derrotó a Catar 2-0 en un amistoso de septiembre 2022.',
    [{year:2022, comp:'Amistoso Internacional',                h:'CAN', hs:2, as:0, a:'QAT'}]),
  'CAN-SUI': h2h(2, 1988, 0, 1, 1, 1, 3, 'Dos encuentros: Suiza ganó 3-1 en 1994 y empataron 0-0 en 1988.',
    [{year:1994, comp:'Amistoso Internacional',                h:'SUI', hs:3, as:1, a:'CAN'},
     {year:1988, comp:'Amistoso Internacional',                h:'CAN', hs:0, as:0, a:'SUI'}]),
  'BIH-QAT': lim('Historial limitado entre Bosnia y Catar. No hay una rivalidad directa importante.'),
  // ── Grupo C ──
  'BRA-MAR': h2h(3, 1997, 2, 0, 1, 6, 2, 'Tres encuentros desde 1997: dos victorias brasileñas y la sorpresa marroquí en 2023 (2-1). Brasil ganó 3-0 en el Mundial 1998.',
    [{year:2023, comp:'Amistoso Internacional',                h:'MAR', hs:2, as:1, a:'BRA'},
     {year:1998, comp:'Copa Mundial Francia, Grupo A J3',      h:'BRA', hs:3, as:0, a:'MAR'},
     {year:1997, comp:'Torneo Hassan II',                      h:'MAR', hs:0, as:2, a:'BRA'}]),
  'HAI-SCO': lim('No hay antecedentes directos importantes entre Haití y Escocia.'),
  'MAR-SCO': h2h(1, 1998, 1, 0, 0, 3, 0, 'Marruecos venció 3-0 a Escocia en el Mundial de Francia 1998, el único encuentro entre ambos.',
    [{year:1998, comp:'Copa Mundial Francia, Grupo A J2',       h:'SCO', hs:0, as:3, a:'MAR'}]),
  'BRA-HAI': h2h(1, 2004, 1, 0, 0, 6, 0, 'Brasil aplastó 6-0 a Haití en un amistoso de agosto 2004. Único antecedente directo.',
    [{year:2004, comp:'Amistoso Internacional',                h:'HAI', hs:0, as:6, a:'BRA'}]),
  'HAI-MAR': lim('Historial muy limitado entre Marruecos y Haití.'),
  'BRA-SCO': h2h(2, 1982, 2, 0, 0, 6, 2, 'Dos victorias brasileñas en Mundiales: 4-1 en España 1982 y 2-1 en el partido inaugural de Francia 1998.',
    [{year:1998, comp:'Copa Mundial Francia, Grupo A J1',       h:'BRA', hs:2, as:1, a:'SCO'},
     {year:1982, comp:'Copa Mundial España, Grupo 6 J1',        h:'BRA', hs:4, as:1, a:'SCO'}]),
  // ── Grupo D ──
  'PAR-USA': h2h(3, 1995, 1, 1, 1, 3, 3, 'Tres encuentros desde 1995 con marcadores muy igualados: un triunfo por bando y un empate 2-2.',
    [{year:2016, comp:'Copa América Centenario, Grupo B',       h:'USA', hs:1, as:0, a:'PAR'},
     {year:2011, comp:'Amistoso Internacional',                h:'USA', hs:0, as:1, a:'PAR'},
     {year:1995, comp:'Amistoso Internacional',                h:'PAR', hs:2, as:2, a:'USA'}]),
  'AUS-TUR': h2h(2, 2004, 0, 0, 2, 1, 4, 'Dos amistosos en mayo 2004, ambas victorias turcas. Australia no ha podido ganarle a Turquía.',
    [{year:2004, comp:'Amistoso Internacional',                h:'AUS', hs:0, as:1, a:'TUR'},
     {year:2004, comp:'Amistoso Internacional',                h:'AUS', hs:1, as:3, a:'TUR'}]),
  'AUS-USA': h2h(2, 1992, 1, 0, 1, 2, 3, 'Dos encuentros: Australia ganó 1-0 en casa en 1992 y EUA se impuso 3-1 en 2010.',
    [{year:2010, comp:'Amistoso Internacional',                h:'USA', hs:3, as:1, a:'AUS'},
     {year:1992, comp:'Amistoso Internacional',                h:'AUS', hs:1, as:0, a:'USA'}]),
  'PAR-TUR': lim('Paraguay y Turquía no tienen una rivalidad histórica marcada. Historial directo limitado.'),
  'TUR-USA': h2h(2, 2003, 2, 0, 0, 4, 2, 'Turquía ganó los dos duelos: 2-1 en la Copa Confederaciones 2003 y 2-1 en amistoso de 2014.',
    [{year:2014, comp:'Amistoso Internacional',                h:'USA', hs:1, as:2, a:'TUR'},
     {year:2003, comp:'Copa Confederaciones, Grupo B',         h:'USA', hs:1, as:2, a:'TUR'}]),
  'AUS-PAR': h2h(1, 2000, 0, 1, 0, 1, 1, 'Un amistoso en junio 2000 que terminó en empate 1-1. Únicos antecedentes directos.',
    [{year:2000, comp:'Amistoso Internacional',                h:'AUS', hs:1, as:1, a:'PAR'}]),
  // ── Grupo E (MATCHES) ──
  'CUW-GER': lim('No existen enfrentamientos previos relevantes entre Alemania y Curazao.'),
  'CIV-ECU': lim('Costa de Marfil y Ecuador tienen pocos antecedentes directos en competencias internacionales.'),
  'CIV-GER': lim('Alemania y Costa de Marfil se han enfrentado en amistosos. Historial con ventaja para el equipo europeo.'),
  'CUW-ECU': lim('Ecuador y Curazao tienen pocos enfrentamientos previos. Historial directo reducido.'),
  'CIV-CUW': lim('Curazao y Costa de Marfil no tienen antecedentes directos relevantes.'),
  'ECU-GER': h2h(1, 2006, 0, 0, 1, 0, 3, 'Alemania y Ecuador ya se enfrentaron en el Mundial 2006, con contundente victoria alemana 3-0.',
    [{year:2006, comp:'Copa Mundial Alemania, Grupo A J1',      h:'GER', hs:3, as:0, a:'ECU'}]),
  // ── Grupo F (MATCHES) ──
  'JPN-NED': h2h(1, 2010, 0, 0, 1, 0, 1, 'Países Bajos venció a Japón 1-0 en la fase de grupos del Mundial 2010, con gol de Wesley Sneijder.',
    [{year:2010, comp:'Copa Mundial Sudáfrica, Grupo E J2',     h:'JPN', hs:0, as:1, a:'NED'}]),
  'SWE-TUN': lim('Suecia y Túnez tienen historial limitado entre selecciones mayores.'),
  'NED-SWE': h2h(4, 2004, 2, 2, 0, 8, 4, 'Cuatro encuentros desde 2004 con ventaja neerlandesa: dos victorias, dos empates y ninguna victoria sueca.',
    [{year:2017, comp:'Clasificación Mundial',                 h:'NED', hs:2, as:0, a:'SWE'},
     {year:2016, comp:'Clasificación Mundial',                 h:'SWE', hs:1, as:1, a:'NED'},
     {year:2010, comp:'Amistoso Internacional',               h:'NED', hs:4, as:1, a:'SWE'}]),
  'JPN-TUN': h2h(1, 2002, 1, 0, 0, 2, 0, 'Japón goleó a Túnez 2-0 en la fase de grupos del Mundial 2002 con goles de Morishima y Nakata, asegurando el pase a octavos.',
    [{year:2002, comp:'Copa Mundial Corea/Japón, Grupo H J3',  h:'JPN', hs:2, as:0, a:'TUN'}]),
  'NED-TUN': lim('Países Bajos y Túnez tienen historial limitado entre sí.'),
  'JPN-SWE': lim('Japón y Suecia han tenido pocos enfrentamientos directos relevantes.'),
  // ── Grupo G (MATCHES) ──
  'BEL-EGY': lim('Bélgica y Egipto tienen pocos antecedentes directos en competencias mayores.'),
  'IRN-NZL': lim('Irán y Nueva Zelanda tienen historial muy limitado en selección mayor.'),
  'BEL-IRN': lim('Bélgica e Irán tienen pocos enfrentamientos directos relevantes.'),
  'EGY-NZL': lim('Egipto y Nueva Zelanda tienen historial reducido entre selecciones mayores.'),
  'BEL-NZL': lim('Bélgica y Nueva Zelanda tienen antecedentes muy limitados entre sí.'),
  'EGY-IRN': lim('Egipto e Irán han jugado partidos amistosos con cierta rivalidad africano-asiática.'),
  // ── Grupo H (MATCHES) ──
  'CPV-ESP': lim('No existen antecedentes relevantes entre España y Cabo Verde.'),
  'KSA-URU': h2h(3, 2002, 1, 1, 1, 4, 4, 'Tres encuentros desde 2002: Arabia ganó 3-2 en 2002, empate 1-1 en 2014 y Uruguay ganó 1-0 en el Mundial 2018.',
    [{year:2018, comp:'Copa Mundial Rusia, Grupo A J3',         h:'URU', hs:1, as:0, a:'KSA'},
     {year:2014, comp:'Amistoso Internacional',                h:'KSA', hs:1, as:1, a:'URU'},
     {year:2002, comp:'Amistoso Internacional',                h:'KSA', hs:3, as:2, a:'URU'}]),
  'ESP-KSA': h2h(1, 2006, 1, 0, 0, 1, 0, 'España y Arabia Saudita se han enfrentado en Copas del Mundo. España ganó 1-0 en Alemania 2006.',
    [{year:2006, comp:'Copa Mundial Alemania, Grupo H J1',      h:'KSA', hs:0, as:1, a:'ESP'}]),
  'CPV-URU': lim('No hay antecedentes importantes entre Uruguay y Cabo Verde.'),
  'CPV-KSA': lim('Historial limitado entre Cabo Verde y Arabia Saudita.'),
  'ESP-URU': h2h(3, 1990, 2, 1, 0, 5, 2, 'Tres duelos desde 1990 con ventaja española: victorias en la Copa Confederaciones 2013 (2-1 y 3-1) y empate en el Mundial de Italia 1990.',
    [{year:2013, comp:'Copa Confederaciones, Grupo A',          h:'ESP', hs:2, as:1, a:'URU'},
     {year:2013, comp:'Amistoso Internacional',                h:'ESP', hs:3, as:1, a:'URU'},
     {year:1990, comp:'Copa Mundial Italia, Grupo E J2',        h:'ESP', hs:0, as:0, a:'URU'}]),
  // ── Grupo I (MATCHES) ──
  'FRA-SEN': h2h(1, 2002, 0, 0, 1, 0, 1, 'Francia y Senegal protagonizaron una sorpresa histórica en el Mundial 2002, cuando Senegal venció 1-0 al campeón del mundo.',
    [{year:2002, comp:'Copa Mundial Corea/Japón, Grupo A J1',  h:'FRA', hs:0, as:1, a:'SEN'}]),
  'IRQ-NOR': lim('Irak y Noruega tienen historial muy limitado entre selecciones mayores.'),
  'FRA-IRQ': lim('Francia e Irak tienen pocos enfrentamientos directos en competencias internacionales.'),
  'NOR-SEN': lim('Senegal y Noruega tienen historial limitado entre selecciones mayores.'),
  'FRA-NOR': h2h(2, 2010, 1, 0, 1, 5, 2, 'Dos encuentros: Francia aplastó 4-0 a Noruega en amistoso de 2014, y Noruega se impuso 2-1 en Oslo en 2010.',
    [{year:2014, comp:'Amistoso Internacional',                h:'FRA', hs:4, as:0, a:'NOR'},
     {year:2010, comp:'Amistoso Internacional',                h:'NOR', hs:2, as:1, a:'FRA'}]),
  'IRQ-SEN': lim('Irak y Senegal tienen antecedentes muy limitados entre selecciones mayores.'),
  // ── Grupo J (MATCHES) ──
  'ALG-ARG': lim('Argentina y Argelia han tenido pocos enfrentamientos directos. Historial limitado.'),
  'AUT-JOR': lim('Austria y Jordania tienen historial muy reducido entre selecciones mayores.'),
  'ARG-AUT': h2h(2, 1978, 2, 0, 0, 7, 1, 'Dos victorias argentinas: 5-1 en el Mundial de Argentina 1978 y 2-0 en amistoso de 2002.',
    [{year:2002, comp:'Amistoso Internacional',                h:'ARG', hs:2, as:0, a:'AUT'},
     {year:1978, comp:'Copa Mundial Argentina, Grupo 1',       h:'ARG', hs:5, as:1, a:'AUT'}]),
  'ALG-JOR': lim('Argelia y Jordania han tenido pocos enfrentamientos directos en competencias internacionales.'),
  'ALG-AUT': lim('Argelia y Austria tienen historial muy limitado entre selecciones mayores.'),
  'ARG-JOR': lim('Argentina y Jordania tienen antecedentes muy limitados entre selecciones mayores.'),
  // ── Grupo K (MATCHES) ──
  'COD-POR': lim('Portugal y Rep. Dem. del Congo tienen historial muy limitado entre selecciones mayores.'),
  'COL-UZB': lim('Colombia y Uzbekistán tienen historial muy reducido entre selecciones mayores.'),
  'POR-UZB': lim('Portugal y Uzbekistán tienen antecedentes muy limitados entre selecciones mayores.'),
  'COD-COL': lim('Colombia y Rep. Dem. del Congo han tenido pocos enfrentamientos directos.'),
  'COL-POR': h2h(1, 2011, 1, 0, 0, 1, 0, 'Colombia venció a Portugal en un amistoso de 2011. Historial directo limitado.',
    [{year:2011, comp:'Amistoso Internacional',                h:'POR', hs:0, as:1, a:'COL'}]),
  'COD-UZB': lim('Rep. Dem. del Congo y Uzbekistán tienen historial muy reducido entre selecciones mayores.'),
  // ── Grupo L (MATCHES) ──
  'CRO-ENG': h2h(5, 2004, 2, 1, 2, 8, 9, 'Cinco encuentros con balance 2-2-1. Croacia eliminó a Inglaterra en el Mundial 2018 y en clasificatorio 2007. Inglaterra se vengó en la Eurocopa 2020.',
    [{year:2021, comp:'Eurocopa 2020, Grupo D J1',             h:'ENG', hs:1, as:0, a:'CRO'},
     {year:2018, comp:'Copa Mundial Rusia, Semifinal',         h:'CRO', hs:2, as:1, a:'ENG'},
     {year:2007, comp:'Clasificación Eurocopa',                h:'ENG', hs:2, as:3, a:'CRO'}]),
  'GHA-PAN': lim('Ghana y Panamá tienen antecedentes muy limitados entre selecciones mayores.'),
  'ENG-GHA': h2h(1, 2011, 0, 1, 0, 1, 1, 'Un único amistoso en marzo 2011 que terminó en empate 1-1.',
    [{year:2011, comp:'Amistoso Internacional',                h:'ENG', hs:1, as:1, a:'GHA'}]),
  'CRO-PAN': lim('Croacia y Panamá tienen historial muy reducido entre selecciones mayores.'),
  'ENG-PAN': h2h(1, 2018, 1, 0, 0, 6, 1, 'Inglaterra aplastó a Panamá 6-1 en el Mundial 2018. Kane marcó hat-trick y Lingard un golazo. La mayor goleada inglesa en la historia del torneo.',
    [{year:2018, comp:'Copa Mundial Rusia, Grupo G J2',        h:'ENG', hs:6, as:1, a:'PAN'}]),
  'CRO-GHA': lim('Croacia y Ghana se han enfrentado en torneos. Pocos antecedentes en selección mayor.'),
};

// Predicciones sugeridas por partido.
// Key = sorted([home.code, away.code]).join('-')
// Value = [firstAlphaTeamScore, secondAlphaTeamScore]
export const H2H_PRED: Record<string, [number, number]> = {
  // ── Grupo A ──
  'MEX-RSA': [2,0], 'CZE-KOR': [1,1], 'KOR-MEX': [1,1],
  'CZE-RSA': [2,0], 'CZE-MEX': [1,2], 'KOR-RSA': [1,1],
  // ── Grupo B ──
  'BIH-CAN': [1,2], 'QAT-SUI': [1,2], 'CAN-SUI': [1,1],
  'BIH-QAT': [2,0], 'CAN-QAT': [3,1], 'BIH-SUI': [1,2],
  // ── Grupo C ──
  'BRA-MAR': [3,0], 'HAI-SCO': [0,2], 'BRA-SCO': [2,0],
  'HAI-MAR': [1,1], 'BRA-HAI': [4,1], 'MAR-SCO': [1,2],
  // ── Grupo D ──
  'PAR-USA': [1,2], 'AUS-TUR': [1,1], 'AUS-USA': [0,2],
  'PAR-TUR': [1,2], 'TUR-USA': [1,1], 'AUS-PAR': [1,2],
  // ── Grupo E (MATCHES) ──
  'CUW-GER': [0,4], 'ECU-GER': [0,2], 'CUW-ECU': [0,2],
  'CIV-ECU': [2,1], 'CIV-GER': [0,3], 'CIV-CUW': [3,0],
  // ── Grupo F (MATCHES) ──
  'NED-SWE': [3,1], 'JPN-NED': [0,2], 'SWE-TUN': [2,0],
  'JPN-TUN': [2,0], 'NED-TUN': [3,1], 'JPN-SWE': [1,2],
  // ── Grupo G (MATCHES) ──
  'BEL-EGY': [3,0], 'IRN-NZL': [1,0], 'BEL-IRN': [3,1],
  'EGY-NZL': [2,0], 'BEL-NZL': [4,0], 'EGY-IRN': [1,1],
  // ── Grupo H (MATCHES) ──
  'CPV-ESP': [0,3], 'KSA-URU': [1,2], 'ESP-URU': [2,1],
  'CPV-KSA': [1,1], 'ESP-KSA': [4,0], 'CPV-URU': [0,2],
  // ── Grupo I (MATCHES) ──
  'FRA-SEN': [3,1], 'FRA-NOR': [2,1], 'NOR-SEN': [2,1],
  'IRQ-NOR': [0,3], 'FRA-IRQ': [4,0], 'IRQ-SEN': [0,2],
  // ── Grupo J (MATCHES) ──
  'ARG-AUT': [2,0], 'ALG-ARG': [0,3], 'AUT-JOR': [2,0],
  'ALG-JOR': [2,1], 'ALG-AUT': [1,2], 'ARG-JOR': [5,0],
  // ── Grupo K (MATCHES) ──
  'COL-POR': [0,2], 'COD-POR': [0,4], 'COL-UZB': [3,0],
  'POR-UZB': [4,0], 'COD-COL': [0,3], 'COD-UZB': [1,1],
  // ── Grupo L (MATCHES) ──
  'CRO-ENG': [0,2], 'ENG-GHA': [3,1], 'CRO-GHA': [2,1],
  'GHA-PAN': [2,0], 'CRO-PAN': [3,0], 'ENG-PAN': [4,0],
};

export const CHAT_MESSAGES = [
  { from: 'Carlos M.',  side: 'other' as const, text: '¿Cómo le ven al Vasco?',                          time: '12:30', avatar: 'CM' },
  { from: 'Tú',         side: 'me'    as const, text: 'Yo creo que el Tri saca el triunfo 2-1',           time: '12:32' },
  { from: 'Mariana R.', side: 'other' as const, text: 'Yo le voy a meter 3-0, hoy tenemos toda la magia', time: '12:33', avatar: 'MR' },
  { from: '',           side: 'system' as const,text: '⚽ INICIA EL PARTIDO',                             time: '13:00' },
  { from: 'Roberto S.', side: 'other' as const, text: 'Vamos México!! 🇲🇽🇲🇽🇲🇽',                          time: '13:01', avatar: 'RS' },
  { from: '',           side: 'system' as const,text: '⚽ GOL DE MÉXICO · 23\'',                           time: '13:23' },
  { from: 'Tú',         side: 'me'    as const, text: '¡¡Vaaaamoooos!!',                                  time: '13:23' },
  { from: 'Carlos M.',  side: 'other' as const, text: 'Te lo dije compa, va el 2-1',                      time: '13:24', avatar: 'CM' },
];
