import { upsertPrediction, loadAllPredictions, upsertBonusPicks, loadBonusPicks } from './db';

// ─── Current user session (set after login) ───────────────────────────────────
let _userId: string | null = null;

export function setCurrentUserId(id: string | null): void {
  _userId = id;
}

// ─── In-memory prediction cache (populated from Supabase on login) ────────────
// This replaces localStorage entirely. The cache is loaded via syncPredictionsFromDB
// before TorneoScreen renders, so MatchCards always initialise with real data.

export interface SavedPrediction {
  home: number;
  away: number;
  savedAt: string; // human-readable locale string
}

const _predCache: Record<string, SavedPrediction> = {};

export function loadPrediction(matchId: string): SavedPrediction | null {
  return _predCache[matchId] ?? null;
}

export function savePrediction(
  matchId: string,
  home: number,
  away: number,
): SavedPrediction {
  const pred: SavedPrediction = {
    home,
    away,
    savedAt: new Date().toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),
  };
  // 1. Update in-memory cache for instant UI feedback
  _predCache[matchId] = pred;
  // 2. Persist to Supabase
  if (_userId) {
    upsertPrediction(_userId, matchId, home, away).catch(console.error);
  }
  return pred;
}

/**
 * After login, load all predictions from Supabase and populate the in-memory cache.
 * Call this once immediately after auth, before rendering TorneoScreen.
 */
export async function syncPredictionsFromDB(userId: string): Promise<void> {
  setCurrentUserId(userId);
  try {
    const preds = await loadAllPredictions(userId);
    // Clear previous cache (handles user switch)
    for (const key of Object.keys(_predCache)) delete _predCache[key];
    for (const [matchId, { home, away }] of Object.entries(preds)) {
      _predCache[matchId] = {
        home,
        away,
        savedAt: new Date().toLocaleString('es-MX', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }),
      };
    }
  } catch (err) {
    console.error('[predictions] syncPredictionsFromDB:', err);
  }
}

/** Returns a snapshot of all cached predictions (used for "sin predicción" filter). */
export function getAllCachedPredictions(): Record<string, SavedPrediction> {
  return { ..._predCache };
}

// ── Bonus predictions ──────────────────────────────────────────────────────────
export interface BonusPrediction {
  champCode?: string;
  subCode?: string;
  thirdCode?: string;
  goalPlayer?: string;
}

let _bonusCache: BonusPrediction | null = null;

export function loadBonus(): BonusPrediction | null {
  return _bonusCache;
}

export function saveBonus(data: Partial<BonusPrediction>): void {
  _bonusCache = { ...(_bonusCache ?? {}), ...data };
  // Sync to Supabase if logged in
  if (_userId) {
    upsertBonusPicks(_userId, {
      champ_code:     _bonusCache.champCode,
      runner_up_code: _bonusCache.subCode,
      third_code:     _bonusCache.thirdCode,
      top_scorer:     _bonusCache.goalPlayer,
    }).catch(console.error);
  }
}

/** Load bonus picks from Supabase and populate the in-memory cache. */
export async function syncBonusFromDB(userId: string): Promise<void> {
  try {
    const picks = await loadBonusPicks(userId);
    if (!picks) {
      _bonusCache = null;
      return;
    }
    _bonusCache = {
      champCode:  picks.champ_code    ?? undefined,
      subCode:    picks.runner_up_code ?? undefined,
      thirdCode:  picks.third_code    ?? undefined,
      goalPlayer: picks.top_scorer    ?? undefined,
    };
  } catch (err) {
    console.error('[predictions] syncBonusFromDB:', err);
  }
}
