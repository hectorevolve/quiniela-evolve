'use client';
import { useState } from 'react';
import { theme as T } from '@/lib/theme';
import { MATCHES } from '@/lib/data';
import { loadPrediction, savePrediction } from '@/lib/predictions';
import { Header, Card, PowerIcon, FAB, Modal, Eyebrow } from '@/components/ui';
import { Flag } from '@/components/flags/Flag';
import { SoccerBall } from '@/components/ball/SoccerBall';

interface Props {
  goto: (s: string) => void;
  tweaks: { premium: boolean; filled: boolean };
  fireToast: (msg: string, color?: string, textColor?: string) => void;
}

export function DetalleScreen({ goto, tweaks, fireToast }: Props) {
  const match = MATCHES[0];
  const saved = loadPrediction(match.id);

  const [innerTab, setInnerTab] = useState<'partido' | 'prody'>('partido');
  const [homeScore, setHomeScore] = useState<string>(() => {
    if (tweaks.filled) return '2';
    const s = loadPrediction(match.id);
    return s ? String(s.home) : '';
  });
  const [awayScore, setAwayScore] = useState<string>(() => {
    if (tweaks.filled) return '1';
    const s = loadPrediction(match.id);
    return s ? String(s.away) : '';
  });
  const [savedAt, setSavedAt] = useState<string | null>(saved?.savedAt ?? null);
  const [focusedScore, setFocusedScore] = useState<'home' | 'away' | null>(null);
  const [modal, setModal] = useState<null | 'double' | 'late' | 'spy'>(null);
  const [usedPowers, setUsedPowers] = useState<Set<string>>(new Set(tweaks.premium ? [] : ['spy']));

  const hasPrediction = homeScore !== '' && awayScore !== '';
  const currentSaved = loadPrediction(match.id);
  const isDirty = hasPrediction && (
    !currentSaved ||
    String(currentSaved.home) !== homeScore ||
    String(currentSaved.away) !== awayScore
  );

  const handleSave = () => {
    if (!hasPrediction) return;
    const pred = savePrediction(match.id, Number(homeScore), Number(awayScore));
    setSavedAt(pred.savedAt);
    fireToast('¡Predicción guardada! ✓', T.emerald, '#fff');
  };

  const confirmPower = () => {
    if (!modal) return;
    setUsedPowers(prev => new Set([...prev, modal]));
    setModal(null);
    fireToast('¡Poder activado!', T.bgInk, '#fff');
  };

  const scoreStyle = (side: 'home' | 'away'): React.CSSProperties => ({
    width: 64, height: 64, borderRadius: 14,
    border: `2.5px solid ${focusedScore === side ? T.blue : isDirty ? T.amber : hasPrediction ? T.lime : T.border}`,
    background: focusedScore === side ? T.blueSoft : T.bgSoft,
    textAlign: 'center', fontSize: 28, fontWeight: 800, color: T.ink,
    outline: 'none', WebkitAppearance: 'none' as React.CSSProperties['WebkitAppearance'],
    fontFamily: 'var(--font-jetbrains), monospace',
    transition: 'border-color 200ms, background 200ms',
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgSubtle, overflow: 'hidden' }}>
      <Header title={`${match.home.name} vs ${match.away.name}`} onBack={() => goto('torneo')}/>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 80px' }}>
        {/* Match hero */}
        <Card style={{ padding: '20px 16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', marginBottom: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Flag code={match.home.code} size={80}/>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{match.home.name}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: T.bgInk }}>
                <SoccerBall size={20} spinning="1.8s"/>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: 1, textTransform: 'uppercase' }}>VS</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Flag code={match.away.code} size={80}/>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{match.away.name}</div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: T.muted }}>{match.date}</div>
            <div style={{ fontSize: 11.5, color: T.muted, fontStyle: 'italic', marginTop: 2 }}>{match.stadium}</div>
          </div>
        </Card>

        {/* Inner tab bar */}
        <div style={{
          display: 'flex', background: '#fff', borderRadius: 12,
          border: `1px solid ${T.border}`, marginBottom: 12, overflow: 'hidden',
        }}>
          {[{ key: 'partido' as const, icon: '⚽', label: 'Partido' }, { key: 'prody' as const, icon: '✨', label: 'Prody' }].map(tab => (
            <button key={tab.key} onClick={() => setInnerTab(tab.key)} style={{
              flex: 1, padding: '12px 8px', background: innerTab === tab.key ? T.blueSoft : 'transparent',
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              color: innerTab === tab.key ? T.blueDeep : T.muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 150ms',
            }}>
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {innerTab === 'partido' && (
          <div>
            {/* Prediction card */}
            <Card accent={T.blue} style={{ marginBottom: 12 }}>
              <div style={{ paddingLeft: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <Eyebrow>Tu predicción</Eyebrow>
                  {hasPrediction && !isDirty && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: T.emerald }}>✓ Guardado</span>
                  )}
                  {isDirty && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: T.amber }}>Sin guardar</span>
                  )}
                </div>

                {/* Score inputs */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <Flag code={match.home.code} size={28}/>
                    <input
                      type="number" min={0} max={99} placeholder="–"
                      value={homeScore}
                      onChange={e => setHomeScore(e.target.value)}
                      onFocus={() => setFocusedScore('home')}
                      onBlur={() => setFocusedScore(null)}
                      style={scoreStyle('home')}
                    />
                  </div>

                  <div style={{ fontSize: 22, fontWeight: 700, color: T.muted, marginTop: 24 }}>–</div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <Flag code={match.away.code} size={28}/>
                    <input
                      type="number" min={0} max={99} placeholder="–"
                      value={awayScore}
                      onChange={e => setAwayScore(e.target.value)}
                      onFocus={() => setFocusedScore('away')}
                      onBlur={() => setFocusedScore(null)}
                      style={scoreStyle('away')}
                    />
                  </div>
                </div>

                {savedAt && !isDirty && (
                  <div style={{ fontSize: 10.5, color: T.muted, textAlign: 'center', marginBottom: 12 }}>
                    Guardado el {savedAt}
                  </div>
                )}

                {/* Powers */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {(['double', 'late', 'spy'] as const).map(kind => (
                    <PowerIcon key={kind} kind={kind} size={36} used={usedPowers.has(kind)} onClick={() => setModal(kind)}/>
                  ))}
                </div>

                {isDirty ? (
                  <button onClick={handleSave} style={{
                    width: '100%', padding: '12px', background: T.lime,
                    border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
                    cursor: 'pointer', color: T.ink,
                  }}>
                    Guardar predicción ✓
                  </button>
                ) : (
                  <button
                    onClick={() => { setFocusedScore('home'); }}
                    style={{
                      width: '100%', padding: '12px', background: 'transparent',
                      border: `1.5px solid ${T.ink}`, borderRadius: 10,
                      fontWeight: 600, fontSize: 13, cursor: 'pointer', color: T.ink,
                    }}>
                    {hasPrediction ? 'Editar predicción' : 'Añadir predicción'}
                  </button>
                )}
              </div>
            </Card>

            <div style={{ textAlign: 'center', padding: '12px 0', color: T.muted, fontSize: 12.5, fontStyle: 'italic' }}>
              No hay datos de enfrentamientos directos para este partido
            </div>
          </div>
        )}

        {innerTab === 'prody' && (
          <Card>
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
              <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Prody AI</div>
              <div style={{ fontSize: 13, color: T.muted }}>Estadísticas y análisis próximamente</div>
            </div>
          </Card>
        )}
      </div>

      <FAB onClick={() => goto('chat')}/>

      <Modal open={!!modal} onClose={() => setModal(null)}>
        {modal && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <PowerIcon kind={modal} size={72}/>
            </div>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
              {{ double: 'Puntos Dobles', late: 'Cambio Tardío', spy: 'Espía' }[modal]}
            </div>
            <div style={{ fontSize: 13, color: T.slate, marginBottom: 14, lineHeight: 1.6 }}>
              {{ double: 'Duplica los puntos que ganas si aciertas esta predicción.', late: 'Cambia tu predicción hasta 45 min después de iniciado el partido.', spy: 'Ve la predicción de un miembro del grupo para este partido.' }[modal]}
            </div>
            <div style={{ background: T.bgSoft, borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Partido</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{match.home.name} vs {match.away.name}</div>
            </div>
            <div style={{ fontSize: 12, color: T.rose, fontWeight: 700, marginBottom: 18 }}>⚠️ Esta decisión no se puede cambiar ni eliminar</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={confirmPower} style={{ width: '100%', padding: '14px', background: T.ink, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Confirmar</button>
              <button onClick={() => setModal(null)} style={{ width: '100%', padding: '14px', background: 'transparent', color: T.ink, border: `1.5px solid ${T.border}`, borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
