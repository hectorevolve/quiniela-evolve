'use client';
import { useState } from 'react';
import { theme as T } from '@/lib/theme';
import { MATCHES, H2H_DATA, H2H_PRED, DEMO_LIVE_MATCH, isMatchStarted, isMatchOver45Min, type H2HEntry } from '@/lib/data';
import { loadPrediction, savePrediction } from '@/lib/predictions';
import { SpyModal } from '@/components/screens/SpyModal';
import { Header, Card, PowerIcon, Modal, Eyebrow } from '@/components/ui';
import { Flag } from '@/components/flags/Flag';
import { SoccerBall } from '@/components/ball/SoccerBall';

interface Props {
  goto: (s: string, matchId?: string) => void;
  tweaks: { premium: boolean; filled: boolean; liveMatch: boolean; liveMinute?: number };
  fireToast: (msg: string, color?: string, textColor?: string) => void;
  matchId: string;
  usedPowers?: Set<string>;
  setUsedPowers?: React.Dispatch<React.SetStateAction<Set<string>>>;
  lateActiveMatchId?: string | null;
  setLateActiveMatchId?: (id: string | null) => void;
  spyMatchId?: string | null;
  setSpyMatchId?: (id: string | null) => void;
}

type EditMode = 'empty' | 'editing' | 'saved';

export function DetalleScreen({ goto, tweaks, fireToast, matchId, usedPowers: usedPowersFromParent, setUsedPowers: setUsedPowersFromParent, lateActiveMatchId: lateActiveMatchIdFromParent, setLateActiveMatchId: setLateActiveMatchIdFromParent, spyMatchId: spyMatchIdFromParent, setSpyMatchId: setSpyMatchIdFromParent }: Props) {
  const match = MATCHES.find(m => m.id === matchId) ?? MATCHES[0];

  // Always open in editing mode so the user can input immediately
  const [mode, setMode] = useState<EditMode>(() => {
    if (tweaks.filled) return 'saved';
    return 'editing';
  });
  const [homeScore, setHomeScore] = useState<string>(() => {
    if (tweaks.filled) return '2';
    return String(loadPrediction(match.id)?.home ?? '');
  });
  const [awayScore, setAwayScore] = useState<string>(() => {
    if (tweaks.filled) return '1';
    return String(loadPrediction(match.id)?.away ?? '');
  });
  const [savedAt, setSavedAt] = useState<string | null>(() => loadPrediction(match.id)?.savedAt ?? null);
  const [focusedScore, setFocusedScore] = useState<'home' | 'away' | null>(null);
  const [modal, setModal] = useState<null | 'double' | 'late'>(null);
  const [spyModal, setSpyModal] = useState<null | { phase: 'confirm' | 'results' }>(null);
  const [localUsedPowers, setLocalUsedPowers] = useState<Set<string>>(new Set(tweaks.premium ? [] : ['spy']));

  const usedPowers = usedPowersFromParent ?? localUsedPowers;
  const setUsedPowers = setUsedPowersFromParent ?? setLocalUsedPowers;
  const lateActiveMatchId = lateActiveMatchIdFromParent !== undefined ? lateActiveMatchIdFromParent : null;
  const setLateActiveMatchId = setLateActiveMatchIdFromParent ?? (() => {});
  const spyMatchId = spyMatchIdFromParent !== undefined ? spyMatchIdFromParent : null;
  const setSpyMatchId = setSpyMatchIdFromParent ?? (() => {});
  const lateActive = lateActiveMatchId === match.id;

  const liveMinute = tweaks.liveMinute ?? DEMO_LIVE_MATCH.minute;
  const matchStarted = isMatchStarted(match.date) || (tweaks.liveMatch && match.id === DEMO_LIVE_MATCH.matchId);
  const matchOver45  = isMatchOver45Min(match.date) || (tweaks.liveMatch && match.id === DEMO_LIVE_MATCH.matchId && (liveMinute ?? 0) >= 45);
  const spyUsed = spyMatchId === match.id;
  const spyUsedElsewhere = usedPowers.has('spy') && !spyUsed;
  const doubleLocked = matchStarted && !usedPowers.has('double') && !lateActive;
  const lateLocked   = matchOver45  && !usedPowers.has('late');
  const spyLocked    = spyUsedElsewhere || (matchStarted && !spyUsed && !lateActive);
  const editBlocked  = matchStarted && !lateActive;

  const isLocked = mode !== 'editing';
  const hasValues = homeScore !== '' && awayScore !== '';

  const handleSave = () => {
    if (!hasValues) return;
    const pred = savePrediction(match.id, Number(homeScore), Number(awayScore));
    setSavedAt(pred.savedAt);
    setMode('saved');
    fireToast('¡Predicción guardada! ✓', T.emerald, '#fff');
  };

  const confirmPower = () => {
    if (!modal) return;
    setUsedPowers(prev => new Set([...prev, modal]));
    if (modal === 'late') setLateActiveMatchId(match.id);
    setModal(null);
    fireToast('¡Poder activado!', T.bgInk, '#fff');
  };

  const scoreBoxStyle = (side: 'home' | 'away'): React.CSSProperties => ({
    width: 64, height: 64, borderRadius: 14,
    border: `2.5px solid ${
      isLocked
        ? (hasValues ? T.lime : T.border)
        : focusedScore === side ? T.blue : T.amber
    }`,
    background: isLocked ? (hasValues ? T.limeSoft : T.bgSoft) : T.bgSoft,
    textAlign: 'center', fontSize: 28, fontWeight: 800, color: isLocked ? T.limeDeep : T.ink,
    outline: 'none',
    WebkitAppearance: 'none' as React.CSSProperties['WebkitAppearance'],
    fontFamily: 'var(--font-jetbrains), monospace',
    cursor: isLocked ? 'default' : 'text',
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

        <div>
            <Card accent={T.blue} style={{ marginBottom: 12 }}>
              <div style={{ paddingLeft: 12 }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Eyebrow>Tu predicción</Eyebrow>
                  {mode === 'saved' && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.emerald }}>✓ Guardado</span>
                  )}
                  {mode === 'editing' && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.amber }}>Editando…</span>
                  )}
                </div>

                {/* Score section — visible in all modes */}
                {mode === 'empty' ? (
                  // Placeholder when no prediction yet
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 16, marginBottom: 16, opacity: 0.4,
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <Flag code={match.home.code} size={28}/>
                      <div style={{
                        width: 64, height: 64, borderRadius: 14, border: `2px dashed ${T.border}`,
                        background: T.bgSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, color: T.muted, fontWeight: 700,
                      }}>–</div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: T.muted, marginTop: 24 }}>–</div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <Flag code={match.away.code} size={28}/>
                      <div style={{
                        width: 64, height: 64, borderRadius: 14, border: `2px dashed ${T.border}`,
                        background: T.bgSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, color: T.muted, fontWeight: 700,
                      }}>–</div>
                    </div>
                  </div>
                ) : (
                  // Score inputs (enabled when editing, disabled when saved)
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: mode === 'saved' && savedAt ? 4 : 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <Flag code={match.home.code} size={28}/>
                      <input
                        type="number" min={0} max={99} placeholder="0"
                        value={homeScore}
                        readOnly={isLocked}
                        onChange={e => !isLocked && setHomeScore(e.target.value)}
                        onFocus={() => !isLocked && setFocusedScore('home')}
                        onBlur={() => setFocusedScore(null)}
                        style={scoreBoxStyle('home')}
                      />
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: T.muted, marginTop: 24 }}>–</div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <Flag code={match.away.code} size={28}/>
                      <input
                        type="number" min={0} max={99} placeholder="0"
                        value={awayScore}
                        readOnly={isLocked}
                        onChange={e => !isLocked && setAwayScore(e.target.value)}
                        onFocus={() => !isLocked && setFocusedScore('away')}
                        onBlur={() => setFocusedScore(null)}
                        style={scoreBoxStyle('away')}
                      />
                    </div>
                  </div>
                )}

                {/* Saved timestamp */}
                {mode === 'saved' && savedAt && (
                  <div style={{ fontSize: 10.5, color: T.muted, textAlign: 'center', marginBottom: 16 }}>
                    Guardado el {savedAt}
                  </div>
                )}

                {/* Powers */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <PowerIcon kind="double" size={36} used={usedPowers.has('double')} locked={doubleLocked} onClick={() => setModal('double')}/>
                  <PowerIcon kind="late"   size={36} used={usedPowers.has('late')}   locked={lateLocked}   onClick={() => setModal('late')}/>
                  <PowerIcon kind="spy"    size={36} used={spyUsed}    locked={spyLocked}    allowClickWhenUsed={spyUsed}
                    onClick={() => setSpyModal({ phase: spyUsed ? 'results' : 'confirm' })}/>
                </div>

                {/* CTA button — changes per mode */}
                {editBlocked ? (
                  <div style={{
                    width: '100%', padding: '13px',
                    background: 'rgba(0,0,0,0.04)', border: `1px solid ${T.border}`,
                    borderRadius: 10, fontSize: 13, fontWeight: 600,
                    color: T.muted, textAlign: 'center',
                  }}>
                    🔒 Partido en curso — predicción cerrada
                  </div>
                ) : (
                  <>
                    {mode === 'empty' && (
                      <button onClick={() => setMode('editing')} style={{
                        width: '100%', padding: '13px', background: T.lime,
                        border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
                        cursor: 'pointer', color: T.ink,
                      }}>
                        Agregar mi predicción
                      </button>
                    )}
                    {mode === 'editing' && (
                      <button
                        onClick={handleSave}
                        disabled={!hasValues}
                        style={{
                          width: '100%', padding: '13px',
                          background: hasValues ? T.lime : T.bgSoft,
                          border: hasValues ? 'none' : `1px solid ${T.border}`,
                          borderRadius: 10, fontWeight: 700, fontSize: 14,
                          cursor: hasValues ? 'pointer' : 'not-allowed',
                          color: hasValues ? T.ink : T.muted,
                        }}
                      >
                        Guardar predicción ✓
                      </button>
                    )}
                    {mode === 'saved' && (
                      <button onClick={() => setMode('editing')} style={{
                        width: '100%', padding: '13px', background: 'transparent',
                        border: `1.5px solid ${T.ink}`, borderRadius: 10,
                        fontWeight: 600, fontSize: 14, cursor: 'pointer', color: T.ink,
                      }}>
                        Editar predicción
                      </button>
                    )}
                  </>
                )}
              </div>
            </Card>

            <H2HSection match={match}/>
          </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)}>
        {modal && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <PowerIcon kind={modal} size={72}/>
            </div>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
              {{ double: 'Puntos Dobles', late: 'Cambio Tardío' }[modal]}
            </div>
            <div style={{ fontSize: 13, color: T.slate, marginBottom: 14, lineHeight: 1.6 }}>
              {{ double: 'Duplica los puntos que ganas si aciertas esta predicción.', late: 'Cambia tu predicción hasta 45 min después de iniciado el partido.' }[modal]}
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

      <Modal open={!!spyModal} onClose={() => setSpyModal(null)}>
        {spyModal && (
          <SpyModal
            match={match}
            phase={spyModal.phase}
            onConfirm={() => {
              setUsedPowers(prev => new Set([...prev, 'spy']));
              setSpyMatchId(match.id);
              setSpyModal({ phase: 'results' });
            }}
            onClose={() => setSpyModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}

// ──────── H2H Section ────────
import type { Match } from '@/lib/data';

function H2HSection({ match }: { match: Match }) {
  const codes = [match.home.code, match.away.code];
  const key = [...codes].sort().join('-');
  const h2h: H2HEntry | undefined = H2H_DATA[key];
  const predRaw = H2H_PRED[key];
  const homeFirst = match.home.code < match.away.code;
  const predHome = predRaw ? (homeFirst ? predRaw[0] : predRaw[1]) : null;
  const predAway = predRaw ? (homeFirst ? predRaw[1] : predRaw[0]) : null;

  if (!h2h || h2h.n === 0) {
    return (
      <Card style={{ marginTop: 12, padding: '16px 14px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 1, textTransform: 'uppercase' }}>Historial directo</div>
          <div style={{ fontSize: 11, color: T.muted }}>Primer encuentro oficial</div>
        </div>

        {/* Two-column layout — same structure, bars vacías */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, background: T.bgSoft, borderRadius: 12, padding: '12px 10px' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
              {[{ label: match.home.code, color: T.blue }, { label: 'Emp.', color: '#94A3B8' }, { label: match.away.code, color: T.rose }].map(({ label, color }) => (
                <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ width: '100%', height: 72, background: `${color}22`, borderRadius: 6, border: `1.5px dashed ${color}44` }}/>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.muted }}>–</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingBottom: 4, borderBottom: `1px solid ${T.border}` }}>
              <div style={{ width: 32, fontSize: 10, fontWeight: 800, color: T.blue, textAlign: 'right' }}>{match.home.code}</div>
              <div style={{ flex: 1 }}/>
              <div style={{ width: 32, fontSize: 10, fontWeight: 800, color: T.rose, textAlign: 'left' }}>{match.away.code}</div>
            </div>
            <StatRow label="Total goles" left="–" right="–"/>
            <StatRow label="Mayor victoria" left="–" right="–"/>
            <StatRow label="Promedio goles" left="–" right="–"/>
          </div>
        </div>

        {/* Descripción */}
        <div style={{ fontSize: 12, color: T.slate, lineHeight: 1.6, padding: '8px 10px', background: T.bgSoft, borderRadius: 8, marginBottom: 2 }}>
          {h2h?.desc ?? 'No hay enfrentamientos directos registrados entre estas selecciones.'}
        </div>

        {predHome !== null && <ResultadoProbable match={match} predHome={predHome} predAway={predAway!}/>}
      </Card>
    );
  }

  const homeWins  = homeFirst ? h2h.hw : h2h.aw;
  const awayWins  = homeFirst ? h2h.aw : h2h.hw;
  const homeGoals = homeFirst ? h2h.hg : h2h.ag;
  const awayGoals = homeFirst ? h2h.ag : h2h.hg;
  const draws     = h2h.d;
  const total     = h2h.n;

  const maxBar = Math.max(homeWins, draws, awayWins, 1);
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  // Best win for each team independently
  let homeBestMargin = -1, awayBestMargin = -1;
  let homeBestPm: (typeof h2h.past)[0] | null = null;
  let awayBestPm: (typeof h2h.past)[0] | null = null;
  h2h.past.forEach(pm => {
    if (pm.hs === pm.as) return;
    const margin = Math.abs(pm.hs - pm.as);
    const winner = pm.hs > pm.as ? pm.h : pm.a;
    if (winner === match.home.code && margin > homeBestMargin) { homeBestMargin = margin; homeBestPm = pm; }
    if (winner === match.away.code && margin > awayBestMargin) { awayBestMargin = margin; awayBestPm = pm; }
  });
  const fmtWin = (pm: (typeof h2h.past)[0], code: string) => {
    const ws = pm.h === code ? pm.hs : pm.as;
    const ls = pm.h === code ? pm.as : pm.hs;
    return `(${pm.year}) ${ws}:${ls}`;
  };

  const Bar = ({ wins, color }: { wins: number; color: string }) => (
    <div style={{ width: '100%', height: 72, background: T.bgSoft, borderRadius: 6, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
      <div style={{ width: '100%', background: color, height: `${(wins / maxBar) * 100}%`, minHeight: wins > 0 ? 6 : 0, transition: 'height 600ms ease', borderRadius: 6 }}/>
    </div>
  );

  // Group past matches by year
  const years = [...new Set(h2h.past.map(p => p.year))].sort((a, b) => b - a);

  return (
    <Card style={{ marginTop: 12, padding: '16px 14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 1, textTransform: 'uppercase' }}>Historial directo</div>
        <div style={{ fontSize: 11, color: T.muted }}>{total} partidos · Desde {h2h.since}</div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {/* Bar chart */}
        <div style={{ flex: 1, background: T.bgSoft, borderRadius: 12, padding: '12px 10px' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
            {/* Home */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase' }}>{match.home.code}</div>
              <Bar wins={homeWins} color={T.blue}/>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{homeWins}</div>
              <div style={{ fontSize: 9, color: T.muted }}>{pct(homeWins)}</div>
            </div>
            {/* Draws */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase' }}>Emp.</div>
              <Bar wins={draws} color="#94A3B8"/>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{draws}</div>
              <div style={{ fontSize: 9, color: T.muted }}>{pct(draws)}</div>
            </div>
            {/* Away */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase' }}>{match.away.code}</div>
              <Bar wins={awayWins} color={T.rose}/>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{awayWins}</div>
              <div style={{ fontSize: 9, color: T.muted }}>{pct(awayWins)}</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 6 }}>
          {/* Team code headers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingBottom: 4, borderBottom: `1px solid ${T.border}` }}>
            <div style={{ width: 32, fontSize: 10, fontWeight: 800, color: T.blue, textAlign: 'right' }}>{match.home.code}</div>
            <div style={{ flex: 1 }}/>
            <div style={{ width: 32, fontSize: 10, fontWeight: 800, color: T.rose, textAlign: 'left' }}>{match.away.code}</div>
          </div>
          {(homeBestPm || awayBestPm) && (
            <StatRow label="Mayor victoria"
              left={homeBestPm  ? fmtWin(homeBestPm,  match.home.code) : '-'}
              right={awayBestPm ? fmtWin(awayBestPm, match.away.code) : '-'}
              highlightLeft={!!homeBestPm} highlightRight={!!awayBestPm}/>
          )}
          <StatRow label="Total goles" left={String(homeGoals)} right={String(awayGoals)}/>
          <StatRow label="Promedio goles"
            left={(homeGoals / total).toFixed(1)}
            right={(awayGoals / total).toFixed(1)}/>
        </div>
      </div>

      {/* Past matches */}
      {h2h.past.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.ink, marginBottom: 10 }}>Últimos encuentros</div>
          {years.map(year => (
            <div key={year}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.rose, flexShrink: 0 }}/>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.ink }}>{year}</div>
              </div>
              {h2h.past.filter(p => p.year === year).map((pm, i) => (
                <div key={i} style={{ marginLeft: 16, marginBottom: 8, borderLeft: `1px solid ${T.border}`, paddingLeft: 12 }}>
                  <div style={{ fontSize: 10, color: T.muted, marginBottom: 6 }}>{pm.comp}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Flag code={pm.h} size={20}/>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{pm.h}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: T.bgSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, fontFamily: 'var(--font-jetbrains), monospace', color: T.ink }}>{pm.hs}</div>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: T.bgSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, fontFamily: 'var(--font-jetbrains), monospace', color: T.ink }}>{pm.as}</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{pm.a}</span>
                      <Flag code={pm.a} size={20}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {predHome !== null && <ResultadoProbable match={match} predHome={predHome} predAway={predAway!}/>}
    </Card>
  );
}

function ResultadoProbable({ match, predHome, predAway }: { match: Match; predHome: number; predAway: number }) {
  return (
    <div style={{ marginTop: 14, padding: '12px 14px', background: 'linear-gradient(135deg,#EFF6FF 0%,#FFF1F2 100%)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Resultado probable</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <Flag code={match.home.code} size={28}/>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: T.muted }}>{match.home.code}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-jetbrains),monospace', color: T.blue }}>{predHome}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.muted }}>–</div>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-jetbrains),monospace', color: T.rose }}>{predAway}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <Flag code={match.away.code} size={28}/>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: T.muted }}>{match.away.code}</div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, left, right, highlight, highlightLeft, highlightRight }: {
  label: string; left: string; right: string;
  highlight?: 'left' | 'right'; highlightLeft?: boolean; highlightRight?: boolean;
}) {
  const hl = highlightLeft  ?? highlight === 'left';
  const hr = highlightRight ?? highlight === 'right';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: `1px solid ${T.borderSoft}`, paddingBottom: 6 }}>
      <div style={{ width: 32, fontSize: 11, fontWeight: 700, color: hl ? T.ink : T.muted, textAlign: 'right' }}>{left}</div>
      <div style={{ flex: 1, fontSize: 10, color: T.muted, textAlign: 'center', lineHeight: 1.3 }}>{label}</div>
      <div style={{ width: 32, fontSize: 11, fontWeight: 700, color: hr ? T.ink : T.muted, textAlign: 'left' }}>{right}</div>
    </div>
  );
}
