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
  // TODO: replace with Supabase upsert when auth is wired up:
  // await supabase.from('bonus_predictions').upsert({ user_id, ...data })
  const existing = loadBonus() ?? {};
  localStorage.setItem(BONUS_KEY, JSON.stringify({ ...existing, ...data }));
}

// ── Match predictions ──────────────────────────────────────────────────────────
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
  // TODO: replace with Supabase upsert when auth is wired up:
  // await supabase.from('predictions').upsert({ user_id, match_id: matchId, home, away })
  localStorage.setItem(storageKey(matchId), JSON.stringify(pred));
  return pred;
}
