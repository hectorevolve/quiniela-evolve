/**
 * Scoring rules:
 *  - Exact scoreline  → 3 pts
 *  - Correct result   → 1 pt  (W/D/L matches but not the exact score)
 *  - Wrong            → 0 pts
 */
export function calcPoints(pred: [number, number], result: [number, number]): number {
  if (pred[0] === result[0] && pred[1] === result[1]) return 3;
  const predOutcome = Math.sign(pred[0] - pred[1]);
  const realOutcome = Math.sign(result[0] - result[1]);
  if (predOutcome === realOutcome) return 1;
  return 0;
}
