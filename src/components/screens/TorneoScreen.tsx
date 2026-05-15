'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { theme as T } from '@/lib/theme';
import { MATCHES, RANKING, GOLEADORES, SELECCIONES, USER, type Match } from '@/lib/data';
import { loadPrediction } from '@/lib/predictions';
import {
  Header, Avatar, Pill, Chip, Card,
  PowerIcon, FAB, BottomSheet, Modal, Eyebrow,
} from '@/components/ui';
import { EvolveMark } from '@/components/brand/EvolveMark';
import { Flag } from '@/components/flags/Flag';
import { BallIcon, SoccerBall } from '@/components/ball/SoccerBall';

type Tab = 'predicciones' | 'ranking' | 'bonus' | 'detalles';

interface Props {
  goto: (s: string) => void;
  tweaks: { premium: boolean; filled: boolean };
  fireToast: (msg: string, color?: string, textColor?: string) => void;
}

export function TorneoScreen({ goto, tweaks, fireToast }: Props) {
  const [tab, setTab] = useState<Tab>('predicciones');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'predicciones', label: 'Predicciones' },
    { key: 'ranking',      label: 'Ranking' },
    { key: 'bonus',        label: 'Bonus' },
    { key: 'detalles',     label: 'Detalles' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgSubtle, overflow: 'hidden' }}>
      <Header
        title="Torneo 2026"
        right={<Avatar initials={USER.avatar} size={34} ring={T.lime} onClick={() => goto('perfil')}/>}
      />

      {/* Group strip */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${T.border}`, padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', width: 60 }}>
          <div style={{
            width: 50, height: 50, borderRadius: '50%',
            background: T.bgInk,
            border: `2px solid ${T.lime}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <EvolveMark size={28} color={T.lime}/>
          </div>
          <div style={{ fontSize: 8, fontWeight: 700, color: T.ink, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, textAlign: 'center', lineHeight: 1.2, whiteSpace: 'nowrap' }}>Grupo<br/>Evolve</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, minWidth: 80, padding: '12px 4px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11.5, fontWeight: 600, letterSpacing: 0.3,
              color: tab === t.key ? T.ink : T.muted,
              borderBottom: `2.5px solid ${tab === t.key ? T.blue : 'transparent'}`,
              transition: 'all 200ms ease',
              textTransform: 'uppercase',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'predicciones' && <TabPredicciones goto={goto} tweaks={tweaks} fireToast={fireToast}/>}
        {tab === 'ranking'      && <TabRanking/>}
        {tab === 'bonus'        && <TabBonus fireToast={fireToast}/>}
        {tab === 'detalles'     && <TabDetalles goto={goto}/>}
      </div>

      {(tab === 'predicciones' || tab === 'ranking') && <FAB onClick={() => goto('chat')}/>}
    </div>
  );
}

type SortMode = 'fecha' | 'pais';

// ──────── Tab: Predicciones ────────
function TabPredicciones({ goto, tweaks, fireToast }: Props) {
  const [filter, setFilter] = useState('Todos');
  const [sortMode, setSortMode] = useState<SortMode>('fecha');
  const [modal, setModal] = useState<null | { kind: 'double' | 'late' | 'spy'; match: Match }>(null);
  const [usedPowers, setUsedPowers] = useState<Set<string>>(new Set(tweaks.premium ? [] : ['spy']));

  const filters = ['Todos', 'Grupo A', 'Grupo B', 'Grupo C', 'Grupo D', 'Grupo E', 'Grupo F', 'Grupo G', 'Grupo H', 'Grupo I', 'Grupo J', 'Grupo K', 'Grupo L'];
  const allMatches = tweaks.filled
    ? MATCHES.map(m => ({ ...m, prediction: m.prediction ?? [1, 0] as [number, number] }))
    : MATCHES;

  const filtered = filter === 'Todos' ? allMatches : allMatches.filter(m =>
    m.group.toLowerCase().includes(filter.toLowerCase().replace('grupo ', ''))
  );

  type MatchGroup = { label: string | null; matches: Match[] };
  const groups: MatchGroup[] = useMemo(() => {
    if (sortMode === 'fecha') return [{ label: null, matches: filtered }];
    const map = new Map<string, Match[]>();
    for (const m of filtered) {
      const country = m.stadium.split(' · ')[1] ?? 'Sin sede';
      if (!map.has(country)) map.set(country, []);
      map.get(country)!.push(m);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'es'))
      .map(([label, matches]) => ({ label, matches }));
  }, [filtered, sortMode]);

  const confirmPower = () => {
    if (!modal) return;
    setUsedPowers(prev => new Set([...prev, modal.kind]));
    setModal(null);
    fireToast(`¡Poder "${modal.kind === 'double' ? 'Puntos Dobles' : modal.kind === 'late' ? 'Cambio Tardío' : 'Espía'}" activado!`, T.bgInk, '#fff');
  };

  return (
    <div style={{ padding: '0 0 80px' }}>
      {/* Countdown banner */}
      <div style={{
        margin: '12px 14px', borderRadius: 14,
        background: T.bgInk, padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: `1px solid ${T.borderInk}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.blue, animation: 'evo-pulse 1.4s ease-in-out infinite', boxShadow: `0 0 6px ${T.blue}` }}/>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.textOnInk, letterSpacing: 0.2 }}>Próximo cierre · 10 jun.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SoccerBall size={18} style={{ opacity: 0.7 }}/>
          <Pill color="rgba(26,175,255,0.15)" textColor={T.blue}>4 partidos</Pill>
        </div>
      </div>

      {/* Sort toggle */}
      <div style={{ display: 'flex', gap: 8, padding: '0 14px 10px' }}>
        {(['fecha', 'pais'] as SortMode[]).map(mode => (
          <button key={mode} onClick={() => setSortMode(mode)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: sortMode === mode ? T.bgInk : T.bgSoft,
            color: sortMode === mode ? '#fff' : T.muted,
            fontSize: 11.5, fontWeight: 600,
            transition: 'all 150ms',
          }}>
            {mode === 'fecha' ? '📅 Por fecha' : '🌎 Por país sede'}
          </button>
        ))}
      </div>

      {/* Group filter chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 14px 12px', scrollbarWidth: 'none' }}>
        {filters.map(f => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>)}
      </div>

      {/* Match cards */}
      {groups.map(group => (
        <div key={group.label ?? '__all'}>
          {group.label && (
            <div style={{ padding: '4px 14px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ height: 1, flex: 1, background: T.border }}/>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>
                🌎 {group.label}
              </span>
              <div style={{ height: 1, flex: 1, background: T.border }}/>
            </div>
          )}
          <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: group.label ? 16 : 0 }} className="evo-stagger">
            {group.matches.map(match => (
              <MatchCard key={match.id} match={match} usedPowers={usedPowers}
                onPower={(kind) => setModal({ kind, match })}
                onView={() => goto('detalle')}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Power modal */}
      <Modal open={!!modal} onClose={() => setModal(null)}>
        {modal && <PowerModal kind={modal.kind} matchName={`${modal.match.home.name} vs ${modal.match.away.name}`} onConfirm={confirmPower} onCancel={() => setModal(null)}/>}
      </Modal>
    </div>
  );
}

function MatchCard({ match, usedPowers, onPower, onView }: {
  match: Match;
  usedPowers: Set<string>;
  onPower: (kind: 'double' | 'late' | 'spy') => void;
  onView: () => void;
}) {
  const saved = loadPrediction(match.id);
  const hasPrediction = saved !== null;

  const ScoreBox = ({ value }: { value: number | null }) => (
    <div style={{
      width: 48, height: 48, borderRadius: 10,
      border: `2px solid ${hasPrediction ? T.lime : T.border}`,
      background: hasPrediction ? T.limeSoft : T.bgSoft,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 22, fontWeight: 800,
      color: hasPrediction ? T.limeDeep : T.muted,
      fontFamily: 'var(--font-jetbrains), monospace',
    }}>
      {value !== null ? value : '–'}
    </div>
  );

  return (
    <Card accent={T.blue} style={{ padding: '16px 16px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <Eyebrow style={{ marginBottom: 2 }}>{match.group}</Eyebrow>
          <div style={{ fontSize: 11, color: T.muted }}>{match.date}</div>
          <div style={{ fontSize: 11, color: T.muted, fontStyle: 'italic' }}>{match.stadium}</div>
        </div>
        {hasPrediction
          ? <Pill color={T.limeSoft} textColor={T.limeDeep} size="sm">✓ Guardado</Pill>
          : <Pill color={T.bgSoft} textColor={T.muted} size="sm">Sin predicción</Pill>}
      </div>

      {/* Teams + Score (read-only) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
          <Flag code={match.home.code} size={56}/>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, textAlign: 'center' }}>{match.home.name}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ScoreBox value={saved?.home ?? null}/>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <SoccerBall size={18} spinning="2s" style={{ opacity: 0.7 }}/>
              <span style={{ fontSize: 9, fontWeight: 600, color: T.muted, letterSpacing: 0.5 }}>VS</span>
            </div>
            <ScoreBox value={saved?.away ?? null}/>
          </div>
          {saved?.savedAt && (
            <div style={{ fontSize: 9.5, color: T.muted }}>Guardado: {saved.savedAt}</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
          <Flag code={match.away.code} size={56}/>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, textAlign: 'center' }}>{match.away.name}</div>
        </div>
      </div>

      {/* Powers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 10px', borderTop: `1px solid ${T.borderSoft}`, paddingTop: 10 }}>
        <span style={{ fontSize: 10.5, color: T.muted, fontWeight: 600, flexShrink: 0 }}>Poderes:</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <PowerIcon kind="double" size={34} used={usedPowers.has('double')} onClick={() => onPower('double')}/>
          <PowerIcon kind="late"   size={34} used={usedPowers.has('late')}   onClick={() => onPower('late')}/>
          <PowerIcon kind="spy"    size={34} used={usedPowers.has('spy')}    onClick={() => onPower('spy')}/>
        </div>
      </div>

      <button onClick={onView} style={{
        width: '100%', padding: '10px',
        background: hasPrediction ? T.bgInk : T.lime,
        color: hasPrediction ? '#fff' : T.ink,
        border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        {hasPrediction ? 'Editar predicción' : 'Agregar mi predicción'}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14m-7-7 7 7-7 7"/>
        </svg>
      </button>
    </Card>
  );
}

function PowerModal({ kind, matchName, onConfirm, onCancel }: {
  kind: 'double' | 'late' | 'spy'; matchName: string; onConfirm: () => void; onCancel: () => void;
}) {
  const labels = { double: 'Puntos Dobles', late: 'Cambio Tardío', spy: 'Espía' };
  const descs = {
    double: 'Duplica los puntos que ganas de esta predicción si es correcta.',
    late: 'Cambia tu predicción después de que el partido haya comenzado.',
    spy: 'Ve la predicción de un miembro del grupo para este partido.',
  };
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
        <PowerIcon kind={kind} size={72}/>
      </div>
      <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{labels[kind]}</div>
      <div style={{ fontSize: 13.5, color: T.slate, marginBottom: 16, lineHeight: 1.6 }}>{descs[kind]}</div>
      <div style={{ background: T.bgSoft, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Partido</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{matchName}</div>
      </div>
      <div style={{ fontSize: 12, color: T.rose, fontWeight: 700, marginBottom: 20 }}>⚠️ Esta decisión no se puede cambiar ni eliminar</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={onConfirm} style={{
          width: '100%', padding: '14px', background: T.ink, color: '#fff',
          border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>Confirmar</button>
        <button onClick={onCancel} style={{
          width: '100%', padding: '14px', background: 'transparent', color: T.ink,
          border: `1.5px solid ${T.border}`, borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer',
        }}>Cancelar</button>
      </div>
    </div>
  );
}

// ──────── Tab: Ranking ────────
function TabRanking() {
  const [subTab, setSubTab] = useState('General');
  const [podiumVisible, setPodiumVisible] = useState(false);
  const subTabs = ['General', 'Mayorista', 'Región'];

  useEffect(() => {
    // Show animation only if rank changed since last visit (sessionStorage tracks it)
    const prev = sessionStorage.getItem('evo-last-rank');
    const curr = String(USER.rank);
    if (prev !== curr) {
      const t = setTimeout(() => setPodiumVisible(true), 200);
      sessionStorage.setItem('evo-last-rank', curr);
      return () => clearTimeout(t);
    } else {
      setPodiumVisible(true);
    }
  }, []);

  const top3 = RANKING.slice(0, 3);
  // rows 4+ only (top3 shown in podium)
  const rest = RANKING.slice(3);

  return (
    <div style={{ padding: '12px 14px 80px' }}>
      <RankingPodium top3={top3} visible={podiumVisible}/>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {subTabs.map(s => <Chip key={s} active={subTab === s} onClick={() => setSubTab(s)}>{s}</Chip>)}
      </div>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 12, paddingLeft: 2 }}>5,487 jugadores compiten</div>

      {/* Rows #4+ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rest.map((player) => {
          const isMe = player.pos === USER.rank;
          return (
            <div key={player.pos} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: isMe ? T.limeSoft : '#fff',
              borderRadius: 12, padding: '10px 14px',
              border: `1.5px solid ${isMe ? T.lime : T.border}`,
              boxShadow: isMe ? `0 0 0 2px ${T.lime}30` : T.shadowSm,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: T.blueSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12, color: T.blueDeep, flexShrink: 0,
              }}>#{player.pos}</div>
              <Avatar initials={player.name.slice(0, 2).toUpperCase()} size={32} style={{ flexShrink: 0 }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
                <Flag code={player.country} size={14} style={{ display: 'inline-block', marginTop: 2 }}/>
              </div>
              <div className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: T.ink, flexShrink: 0 }}>{player.pts} pts</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankingPodium({ top3, visible }: { top3: typeof RANKING; visible: boolean }) {
  // Podium order: 2nd (left) · 1st (center) · 3rd (right)
  const order   = [top3[1], top3[0], top3[2]];
  const heights = [96, 132, 72];
  const colors  = ['#94A3B8', '#F59E0B', '#CD7C2F'];
  const ranks   = [2, 1, 3];
  const delays  = ['120ms', '0ms', '240ms'];
  const crowDelay = '480ms';

  return (
    <div style={{
      background: T.bgInk, borderRadius: 20, marginBottom: 16,
      border: `1px solid ${T.borderInk}`, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: T.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Tu posición</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="font-display" style={{ fontSize: 44, fontWeight: 900, color: T.lime, lineHeight: 1, fontStyle: 'italic' }}>#{USER.rank}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>{USER.points} pts</span>
          </div>
        </div>
        <Pill color={`${T.lime}22`} textColor={T.lime} style={{ fontSize: 13, fontWeight: 700, padding: '8px 14px' }}>🏆 ¡#{USER.rank}!</Pill>
      </div>

      {/* Podium stage */}
      <div style={{ display: 'flex', alignItems: 'flex-end', padding: '0 16px' }}>
        {order.map((player, i) => {
          const isCenter = i === 1;
          return (
            <div key={player.pos} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              transform: visible ? 'translateY(0)' : 'translateY(64px)',
              opacity: visible ? 1 : 0,
              transition: `transform 700ms cubic-bezier(0.34, 1.45, 0.64, 1) ${delays[i]}, opacity 350ms ease ${delays[i]}`,
            }}>
              {/* Crown (center only) */}
              <div style={{
                fontSize: 22, lineHeight: 1, marginBottom: 4,
                opacity: isCenter ? (visible ? 1 : 0) : 0,
                transform: isCenter ? (visible ? 'translateY(0) rotate(-8deg)' : 'translateY(-20px) rotate(-8deg)') : 'none',
                transition: `opacity 400ms ease ${crowDelay}, transform 500ms cubic-bezier(0.34, 1.7, 0.64, 1) ${crowDelay}`,
              }}>👑</div>

              {/* Avatar */}
              <Avatar
                initials={player.name.slice(0, 2).toUpperCase()}
                size={isCenter ? 54 : 42}
                ring={colors[i]}
                style={{ marginBottom: 6 }}
              />

              {/* Name */}
              <div style={{
                fontSize: isCenter ? 11.5 : 10, fontWeight: 700, color: '#fff',
                marginBottom: 8, textAlign: 'center',
                maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                padding: '0 4px',
              }}>
                {player.name.split(' ')[0]}
                {player.pos === USER.rank ? <span style={{ color: T.lime }}> (tú)</span> : null}
              </div>

              {/* Platform */}
              <div style={{
                width: '100%', height: heights[i], borderRadius: '8px 8px 0 0',
                background: `linear-gradient(180deg, ${colors[i]}55 0%, ${colors[i]}22 100%)`,
                border: `1px solid ${colors[i]}66`, borderBottom: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              }}>
                <div className="font-display" style={{
                  fontSize: isCenter ? 28 : 22, fontWeight: 900,
                  color: colors[i], lineHeight: 1, fontStyle: 'italic',
                }}>#{ranks[i]}</div>
                <div className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                  {player.pts} pts
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────── Tab: Bonus ────────
function TabBonus({ fireToast }: { fireToast: Props['fireToast'] }) {
  const [champSelected, setChampSelected] = useState<string>('ESP');
  const [subSelected, setSubSelected] = useState<string>('NED');
  const [goalSheet, setGoalSheet] = useState(false);
  const [thirdSheet, setThirdSheet] = useState(false);

  const bonusCards = [
    { key: 'champion', label: 'CAMPEÓN', pts: '10 pts', color: T.lime, selected: champSelected, setSheet: () => setGoalSheet(false) },
    { key: 'sub',      label: 'SUBCAMPEÓN', pts: '5 pts',  color: T.blue,  selected: subSelected,  setSheet: () => {} },
  ];

  return (
    <div style={{ padding: '14px 14px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 4 }}>¡Hasta 26 puntos extra!</div>
        <div style={{ fontSize: 13, color: T.slate, lineHeight: 1.5 }}>Predice estos 4 bonus antes de que empiece el torneo.</div>
      </div>

      {/* Bonus cards */}
      {[
        { label: 'CAMPEÓN', pts: 10, color: T.lime, textColor: T.ink, sel: champSelected, setSel: setChampSelected, kind: 'country' as const },
        { label: 'GOLEADOR', pts: 8, color: T.amber, textColor: T.ink, sel: null, setSel: null, kind: 'player' as const },
        { label: 'SUBCAMPEÓN', pts: 5, color: T.blue, textColor: '#fff', sel: subSelected, setSel: setSubSelected, kind: 'country' as const },
        { label: 'TERCER LUGAR', pts: 3, color: T.rose, textColor: '#fff', sel: null, setSel: null, kind: 'country' as const },
      ].map((card, i) => (
        <div key={card.label} style={{
          borderRadius: 18, padding: '18px 20px',
          background: T.bgInk, border: `1px solid ${T.borderInk}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: card.color, letterSpacing: 1.2, textTransform: 'uppercase' }}>{card.label}</div>
            <Pill color={`${card.color}25`} textColor={card.color}>{card.pts} pts</Pill>
          </div>
          {card.sel ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Flag code={card.sel} size={64}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                  {SELECCIONES.find(s => s[0] === card.sel)?.[1] ?? card.sel}
                </div>
                <button onClick={() => { if (card.kind === 'country' && i === 0) setChampSelected(''); else if (i === 2) setSubSelected(''); }}
                  style={{ background: 'none', border: 'none', fontSize: 12, color: card.color, cursor: 'pointer', fontWeight: 600, padding: '4px 0', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                  Cambiar
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => { if (i === 1) setGoalSheet(true); else setThirdSheet(true); }} style={{
              width: '100%', padding: '12px', background: `${card.color}18`,
              border: `1.5px solid ${card.color}40`, borderRadius: 10,
              color: card.color, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
              {i === 1 ? 'Selecciona el goleador' : 'Selecciona una selección'}
            </button>
          )}
        </div>
      ))}

      <div style={{ fontSize: 11.5, color: T.muted, textAlign: 'center', fontStyle: 'italic', lineHeight: 1.6 }}>
        ⚠️ Las predicciones cierran al iniciar el primer partido. Después no se pueden cambiar.
      </div>

      {/* Goleador sheet */}
      <BottomSheet open={goalSheet} onClose={() => setGoalSheet(false)} title="Selecciona el goleador" maxHeight="80%">
        {GOLEADORES.map(p => (
          <div key={p.name} onClick={() => { setGoalSheet(false); fireToast('¡Predicción guardada!', T.bgInk, '#fff'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer', borderBottom: `1px solid ${T.borderSoft}` }}>
            <Avatar initials={p.name.split(' ').map(w => w[0]).join('').slice(0,2)} size={36}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{p.name}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{p.role}</div>
            </div>
            <Flag code={p.country} size={24}/>
          </div>
        ))}
      </BottomSheet>

      {/* Third place sheet */}
      <BottomSheet open={thirdSheet} onClose={() => setThirdSheet(false)} title="Selecciona una selección" maxHeight="80%">
        {SELECCIONES.map(([code, name]) => (
          <div key={code} onClick={() => { setThirdSheet(false); fireToast('¡Predicción guardada!', T.bgInk, '#fff'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer', borderBottom: `1px solid ${T.borderSoft}` }}>
            <Flag code={code} size={36}/>
            <span style={{ fontSize: 14, fontWeight: 500, color: T.ink }}>{name}</span>
          </div>
        ))}
      </BottomSheet>
    </div>
  );
}

// ──────── Tab: Detalles ────────
function TabDetalles({ goto }: { goto: (s: string) => void }) {
  const [pointsSheet, setPointsSheet] = useState(false);
  const ptrDownY = useRef<number | null>(null);

  const prizes = [
    { icon: '🥇', label: '1er Lugar', sub: 'Ganador absoluto', val: '$15,000 MXN' },
    { icon: '🥈', label: '2do Lugar', sub: 'Segundo lugar',    val: '$10,000 MXN' },
    { icon: '🥉', label: '3er Lugar', sub: 'Tercer lugar',     val: '$5,000 MXN'  },
  ];

  return (
    <div style={{ padding: '14px 14px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Group hero */}
      <div style={{ borderRadius: 18, padding: '24px 20px', background: T.bgInk, border: `1px solid ${T.borderInk}`, textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: T.bgInkRaised, border: `2px solid ${T.lime}`,
          margin: '0 auto 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <EvolveMark size={44} color={T.lime}/>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Grupo Evolve</div>
        <Pill color={`${T.lime}25`} textColor={T.lime}>Miembros: 2,761</Pill>
        <button style={{
          marginTop: 14, padding: '10px 20px', background: 'transparent',
          border: `1.5px solid ${T.lime}`, borderRadius: 10, color: T.lime, fontWeight: 600, fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, margin: '14px auto 0',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Comparte tu grupo
        </button>
      </div>

      {/* Description */}
      <Card accent={T.lime}>
        <div style={{ paddingLeft: 10 }}>
          <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Descripción del grupo</div>
          <div style={{ fontSize: 13, color: T.slate, lineHeight: 1.6 }}>Quiniela oficial del programa Grupo Evolve para el Torneo 2026</div>
        </div>
      </Card>

      {/* Prizes */}
      <Card>
        <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 12 }}>Premios</div>
        {prizes.map((p, i) => (
          <div key={p.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: i < prizes.length - 1 ? `1px solid ${T.borderSoft}` : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{p.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{p.label}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{p.sub}</div>
              </div>
            </div>
            <div className="font-mono" style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>{p.val}</div>
          </div>
        ))}
      </Card>

      {/* Powers */}
      <Card>
        <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 14 }}>Poderes activos</div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {(['double', 'late', 'spy'] as const).map(kind => <PowerIcon key={kind} kind={kind} size={44} label/>)}
        </div>
      </Card>

      {/* Points system */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Sistema de Puntos</div>
            <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>Cómo se calculan los puntos por fase</div>
          </div>
          <button
            onPointerDown={e => { ptrDownY.current = e.clientY; }}
            onClick={e => {
              if (ptrDownY.current !== null && Math.abs(e.clientY - ptrDownY.current) > 8) return;
              setPointsSheet(true);
            }}
            style={{
              width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`,
              background: T.bgSoft, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </Card>

      <button style={{ padding: '12px', background: 'transparent', border: `1.5px solid ${T.rose}`, borderRadius: 12, color: T.rose, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
        Salir del grupo
      </button>

      {/* Points sheet */}
      <BottomSheet open={pointsSheet} onClose={() => setPointsSheet(false)} title="Sistema de Puntos" maxHeight="70%">
        <div style={{ padding: '0 20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: T.muted, fontWeight: 600, fontSize: 11 }}>Fase</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: T.muted, fontWeight: 600, fontSize: 11 }}>Ganador</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: T.muted, fontWeight: 600, fontSize: 11 }}>+ Exacto</th>
              </tr>
            </thead>
            <tbody>
              {[['Grupos','1 pt','3 pts'],['16avos','2 pts','4 pts'],['Octavos','3 pts','5 pts'],['Cuartos','4 pts','6 pts'],['Semis','5 pts','7 pts'],['Final','6 pts','8 pts']].map(([fase,pts,exact]) => (
                <tr key={fase} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                  <td style={{ padding: '10px 4px', fontWeight: 500, color: T.ink }}>{fase}</td>
                  <td style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 700, color: T.blue }}>{pts}</td>
                  <td style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 700, color: T.lime, filter: 'brightness(0.7)' }}>{exact}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 11.5, color: T.muted, lineHeight: 1.6, marginTop: 14, fontStyle: 'italic' }}>
            El marcador exacto otorga +2 puntos adicionales al acertar al ganador. Si no aciertas el ganador, no ganas puntos aunque hayas predicho la cantidad de goles correcta.
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
