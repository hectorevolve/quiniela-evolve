import { upsertPrediction, loadAllPredictions, upsertBonusPicks, loadBonusPicks } from './db';

// ─── Current user session (set after login) ───────────────────────────────────
let _userId: string | null = null;

export function setCurrentUserId(id: string | null): void {
  _userId = id;
}

export interface SavedPrediction {
  home: number;
  away: number;
  savedAt: string; // human-readable locale string
}

const storageKey = (matchId: string) => `evo_pred_${matchId}`;

export function loadPrediction(matchId: string): SavedPrediction | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(matchId));
    return raw ? (JSON.parse(raw) as SavedPrediction) : null;
  } catch {
    return null;
  }
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
  // 1. Write to localStorage for immediate synchronous access
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey(matchId), JSON.stringify(pred));
  }
  // 2. Also persist to Supabase if user is logged in
  if (_userId) {
    upsertPrediction(_userId, matchId, home, away).catch(console.error);
  }
  return pred;
}

/**
 * After login, load all predictions from Supabase and hydrate localStorage.
 * Call this once immediately after setting the current user.
 */
export async function syncPredictionsFromDB(userId: string): Promise<void> {
  setCurrentUserId(userId);
  if (typeof window === 'undefined') return;
  try {
    const preds = await loadAllPredictions(userId);
    for (const [matchId, { home, away }] of Object.entries(preds)) {
      const pred: SavedPrediction = {
        home,
        away,
        savedAt: new Date().toLocaleString('es-MX', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }),
      };
      localStorage.setItem(storageKey(matchId), JSON.stringify(pred));
    }
  } catch (err) {
    console.error('[predictions] syncPredictionsFromDB:', err);
  }
}

// ── Bonus predictions ──────────────────────────────────────────────────────────
export interface BonusPrediction {
  champCode?: string;
  subCode?: string;
  thirdCode?: string;
  goalPlayer?: string;
}

const BONUS_KEY = 'evo_bonus';

export function loadBonus(): BonusPrediction | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BONUS_KEY);
    return raw ? (JSON.parse(raw) as BonusPrediction) : null;
  } catch { return null; }
}

export function saveBonus(data: Partial<BonusPrediction>): void {
  const existing = loadBonus() ?? {};
  const merged = { ...existing, ...data };
  if (typeof window !== 'undefined') {
    localStorage.setItem(BONUS_KEY, JSON.stringify(merged));
  }
  // Sync to Supabase if logged in
  if (_userId) {
    upsertBonusPicks(_userId, {
      champ_code:    merged.champCode,
      runner_up_code: merged.subCode,
      third_code:    merged.thirdCode,
      top_scorer:    merged.goalPlayer,
    }).catch(console.error);
  }
}

/** Load bonus picks from Supabase and hydrate localStorage.
 *  If the user has no picks in DB yet, clears any stale localStorage data. */
export async function syncBonusFromDB(userId: string): Promise<void> {
  try {
    const picks = await loadBonusPicks(userId);
    if (!picks) {
      // No picks saved — wipe any leftover mock/dev data from localStorage
      if (typeof window !== 'undefined') localStorage.removeItem(BONUS_KEY);
      return;
    }
    const bonus: BonusPrediction = {
      champCode:  picks.champ_code    ?? undefined,
      subCode:    picks.runner_up_code ?? undefined,
      thirdCode:  picks.third_code    ?? undefined,
      goalPlayer: picks.top_scorer    ?? undefined,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(BONUS_KEY, JSON.stringify(bonus));
    }
  } catch (err) {
    console.error('[predictions] syncBonusFromDB:', err);
  }
}
