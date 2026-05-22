import { theme as T } from '@/lib/theme';
import { PREDICTION_DISTRIBUTIONS, type Match, type PredictionBucket } from '@/lib/data';
import { PowerIcon } from '@/components/ui';

export function SpyModal({ match, phase, onConfirm, onClose }: {
  match: Match; phase: 'confirm' | 'results';
  onConfirm: () => void; onClose: () => void;
}) {
  const buckets: PredictionBucket[] = PREDICTION_DISTRIBUTIONS[match.id] ?? [];
  const total = buckets.reduce((s, b) => s + b.count, 0);
  const sorted = [...buckets].sort((a, b) => b.count - a.count);
  const topCount = sorted[0]?.count ?? 1;

  if (phase === 'confirm') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          <PowerIcon kind="spy" size={72}/>
        </div>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Espía</div>
        <div style={{ fontSize: 13.5, color: T.slate, marginBottom: 16, lineHeight: 1.6 }}>
          Revela cómo se distribuyen las predicciones del grupo para este partido.
        </div>
        <div style={{ background: T.bgSoft, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Partido</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{match.home.name} vs {match.away.name}</div>
        </div>
        <div style={{ fontSize: 12, color: T.rose, fontWeight: 700, marginBottom: 20 }}>⚠️ Esta decisión no se puede cambiar ni eliminar</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onConfirm} style={{
            width: '100%', padding: '14px', background: T.ink, color: '#fff',
            border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>Revelar predicciones</button>
          <button onClick={onClose} style={{
            width: '100%', padding: '14px', background: 'transparent', color: T.ink,
            border: `1.5px solid ${T.border}`, borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <PowerIcon kind="spy" size={36} used/>
        <div>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>Predicciones del grupo</div>
          <div style={{ fontSize: 12, color: T.muted }}>{match.home.code} vs {match.away.code} · {total.toLocaleString()} predicciones</div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: T.muted, fontSize: 13 }}>
          Aún no hay predicciones registradas para este partido.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((b, i) => {
            const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
            const barPct = topCount > 0 ? (b.count / topCount) * 100 : 0;
            const isTop = i === 0;
            return (
              <div key={`${b.home}-${b.away}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="font-mono" style={{
                  fontSize: 14, fontWeight: 800, color: isTop ? T.limeDeep : T.ink,
                  width: 36, textAlign: 'center', flexShrink: 0,
                }}>
                  {b.home}–{b.away}
                </div>
                <div style={{ flex: 1, height: 28, background: T.bgSoft, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%', borderRadius: 6,
                    background: isTop ? T.lime : T.blue + '40',
                    width: `${barPct}%`, transition: 'width 600ms ease',
                  }}/>
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                    paddingLeft: 8, fontSize: 11, fontWeight: 600,
                    color: isTop ? T.limeDeep : T.slate,
                  }}>
                    {b.count.toLocaleString()} personas · {pct}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={onClose} style={{
        marginTop: 20, width: '100%', padding: '12px', background: T.bgSoft,
        border: `1.5px solid ${T.border}`, borderRadius: 12,
        fontWeight: 600, fontSize: 14, cursor: 'pointer', color: T.ink,
      }}>Cerrar</button>
    </div>
  );
}
