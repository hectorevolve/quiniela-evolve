/**
 * Sistema de puntos por fase (coincide con la tabla que se muestra en la app):
 *
 *   Fase        Acertar ganador   Marcador exacto (+2)
 *   Grupos            1                  3
 *   16avos            2                  4
 *   Octavos           3                  5
 *   Cuartos           4                  6
 *   Semifinal         5                  7
 *   Final             6                  8
 *
 *  - Si NO aciertas al ganador (o empate) → 0 pts, aunque hayas acertado goles.
 *  - El marcador exacto otorga +2 pts adicionales sobre los puntos de la fase.
 *  - El poder "Puntos Dobles" (×2) duplica los puntos del partido donde se usó
 *    (se aplica en el cálculo del ranking, no aquí).
 */

export type Phase = 'grupos' | '16avos' | 'octavos' | 'cuartos' | 'semis' | 'tercer' | 'final';

/** Puntos base por acertar al ganador, según la fase del torneo. */
export const PHASE_BASE: Record<Phase, number> = {
  grupos: 1,
  '16avos': 2,
  octavos: 3,
  cuartos: 4,
  semis: 5,
  tercer: 5, // 3er lugar: no está en la tabla mostrada; se asume nivel semifinal
  final: 6,
};

/** Deriva la fase a partir del campo `group_name` del partido. */
export function phaseFromGroup(group: string | null | undefined): Phase {
  const g = (group ?? '').toUpperCase();
  // El orden importa: varias etiquetas contienen "FINAL" (CUARTOS DE FINAL, etc.)
  if (g.includes('DIECISEIS') || g.includes('16AVOS')) return '16avos';
  if (g.includes('OCTAVOS')) return 'octavos';
  if (g.includes('CUARTOS')) return 'cuartos';
  if (g.includes('SEMI')) return 'semis';
  if (g.includes('TERCER') || g.includes('3ER') || g.includes('3O')) return 'tercer';
  if (g.includes('FINAL')) return 'final';
  return 'grupos';
}

/** ¿La predicción coincide exactamente con el resultado? */
export function isExact(pred: [number, number], result: [number, number]): boolean {
  return pred[0] === result[0] && pred[1] === result[1];
}

/**
 * Puntos de un partido según predicción, resultado y fase.
 * Si se omite `group`, se asume fase de grupos (1 / 3) por retrocompatibilidad.
 */
export function calcPoints(
  pred: [number, number],
  result: [number, number],
  group?: string | null,
): number {
  const predOutcome = Math.sign(pred[0] - pred[1]);
  const realOutcome = Math.sign(result[0] - result[1]);
  if (predOutcome !== realOutcome) return 0; // no acertó al ganador/empate → 0
  const base = PHASE_BASE[phaseFromGroup(group)];
  return isExact(pred, result) ? base + 2 : base;
}
