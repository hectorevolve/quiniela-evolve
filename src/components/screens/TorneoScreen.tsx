'use client';
import { useState } from 'react';
import { theme as T } from '@/lib/theme';
import { MATCHES, RANKING, GOLEADORES, SELECCIONES, USER, type Match } from '@/lib/data';
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
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {tab === 'predicciones' && <TabPredicciones goto={goto} tweaks={tweaks} fireToast={fireToast}/>}
        {tab === 'ranking'      && <TabRanking/>}
        {tab === 'bonus'        && <TabBonus fireToast={fireToast}/>}
        {tab === 'detalles'     && <TabDetalles goto={goto}/>}
      </div>

      {(tab === 'predicciones' || tab === 'ranking') && <FAB onClick={() => goto('chat')}/>}
    </div>
  );
}

// ──────── Tab: Predicciones ────────
function TabPredicciones({ goto, tweaks, fireToast }: Props) {
  const [filter, setFilter] = useState('Todos');
  const [modal, setModal] = useState<null | { kind: 'double' | 'late' | 'spy'; match: Match }>(null);
  const [usedPowers, setUsedPowers] = useState<Set<string>>(new Set(tweaks.premium ? [] : ['spy']));

  const filters = ['Todos', 'Grupo A', 'Grupo B', 'Grupo C', 'Grupo D', 'Grupo E', 'Grupo F', 'Grupo G', 'Grupo H', 'Grupo I', 'Grupo J', 'Grupo K', 'Grupo L'];
  const matches = tweaks.filled
    ? MATCHES.map(m => ({ ...m, prediction: m.prediction ?? [1, 0] as [number, number] }))
    : MATCHES;

  const filtered = filter === 'Todos' ? matches : matches.filter(m => m.group.toLowerCase().includes(filter.toLowerCase().replace('grupo ', '')));

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

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 14px 12px', scrollbarWidth: 'none' }}>
        {filters.map(f => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>)}
      </div>

      {/* Match cards */}
      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 12 }} className="evo-stagger">
        {filtered.map(match => (
          <MatchCard key={match.id} match={match} usedPowers={usedPowers}
            onPower={(kind) => setModal({ kind, match })}
            onView={() => goto('detalle')}
          />
        ))}
      </div>

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
  const [homeScore, setHomeScore] = useState<string>(match.prediction != null ? String(match.prediction[0]) : '');
  const [awayScore, setAwayScore] = useState<string>(match.prediction != null ? String(match.prediction[1]) : '');
  const [focusedScore, setFocusedScore] = useState<'home' | 'away' | null>(null);
  const hasPrediction = homeScore !== '' && awayScore !== '';

  const scoreInputStyle = (side: 'home' | 'away'): React.CSSProperties => ({
    width: 48, height: 48, borderRadius: 10,
    border: `2px solid ${focusedScore === side ? T.blue : T.border}`,
    background: focusedScore === side ? T.blueSoft : T.bgSoft,
    textAlign: 'center', fontSize: 22, fontWeight: 700, color: T.ink,
    outline: 'none', WebkitAppearance: 'none' as React.CSSProperties['WebkitAppearance'],
    fontFamily: 'var(--font-jetbrains), monospace',
  });

  return (
    <Card accent={T.blue} style={{ padding: '16px 16px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <Eyebrow style={{ marginBottom: 2 }}>{match.group}</Eyebrow>
          <div style={{ fontSize: 11, color: T.muted }}>{match.date}</div>
          <div style={{ fontSize: 11, color: T.muted, fontStyle: 'italic' }}>{match.stadium}</div>
        </div>
        {hasPrediction && (
          <Pill color={T.blueSoft} textColor={T.blueDeep} size="sm">Predicho</Pill>
        )}
      </div>

      {/* Teams + Score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
          <Flag code={match.home.code} size={56}/>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, textAlign: 'center' }}>{match.home.name}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number" min={0} max={99} placeholder="–"
              value={homeScore}
              onChange={e => setHomeScore(e.target.value)}
              onFocus={() => setFocusedScore('home')}
              onBlur={() => setFocusedScore(null)}
              style={scoreInputStyle('home')}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <SoccerBall size={18} spinning="2s" style={{ opacity: 0.7 }}/>
              <span style={{ fontSize: 9, fontWeight: 600, color: T.muted, letterSpacing: 0.5 }}>VS</span>
            </div>
            <input
              type="number" min={0} max={99} placeholder="–"
              value={awayScore}
              onChange={e => setAwayScore(e.target.value)}
              onFocus={() => setFocusedScore('away')}
              onBlur={() => setFocusedScore(null)}
              style={scoreInputStyle('away')}
            />
          </div>
          {match.lastUpdate && (
            <div style={{ fontSize: 9.5, color: T.muted }}>Actualizado: {match.lastUpdate}</div>
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
        width: '100%', padding: '10px', background: T.bgInk, color: '#fff',
        border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        Ver partido
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
  const subTabs = ['General', 'Mayorista', 'Región'];

  const medalColors = [
    'linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #D97706 100%)',
    'linear-gradient(135deg, #94A3B8 0%, #CBD5E1 50%, #64748B 100%)',
    'linear-gradient(135deg, #CD7C2F 0%, #E8A45A 50%, #A0522D 100%)',
  ];

  return (
    <div style={{ padding: '12px 14px 80px' }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {subTabs.map(s => <Chip key={s} active={subTab === s} onClick={() => setSubTab(s)}>{s}</Chip>)}
      </div>

      {/* My rank pill */}
      <div style={{ background: T.limeSoft, borderRadius: 999, padding: '8px 20px', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>Tu ranking es <strong>#{USER.rank}</strong> con <strong>{USER.points} pts</strong></span>
      </div>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 16, paddingLeft: 2 }}>5,487 jugadores compiten</div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {RANKING.map((player) => {
          const isMe = player.pos === USER.rank;
          const isTop3 = player.pos <= 3;
          return (
            <div key={player.pos} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: isMe ? T.limeSoft : '#fff',
              borderRadius: 12, padding: '10px 14px',
              border: `1.5px solid ${isMe ? T.lime : T.border}`,
              boxShadow: isMe ? `0 0 0 2px ${T.lime}30` : T.shadowSm,
            }}>
              <div style={{
                width: isTop3 ? 40 : 32, height: isTop3 ? 40 : 32, borderRadius: '50%',
                background: isTop3 ? medalColors[player.pos - 1] : T.blueSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: isTop3 ? 15 : 12,
                color: isTop3 ? '#fff' : T.blueDeep, flexShrink: 0,
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

        {/* My row if not in list */}
        <div style={{ height: 1, background: T.border, margin: '4px 0' }}/>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: T.limeSoft, borderRadius: 12, padding: '10px 14px',
          border: `2px solid ${T.lime}`,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: T.ink, flexShrink: 0 }}>#{USER.rank}</div>
          <Avatar initials={USER.avatar} size={32} ring={T.lime} style={{ flexShrink: 0 }}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>Tú · {USER.mayorista}</div>
            <Flag code="MEX" size={14} style={{ display: 'inline-block', marginTop: 2 }}/>
          </div>
          <div className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{USER.points} pts</div>
        </div>
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

  const prizes = [
    { icon: '🥇', label: 'Hero',         n: 107,   val: '$15,000' },
    { icon: '🥈', label: 'Aspiracional', n: 193,   val: '$4,000' },
    { icon: '🥉', label: 'Medio',        n: 496,   val: '$2,000' },
    { icon: '🎖️', label: 'Simbólico',    n: 1932,  val: '$500' },
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
        {prizes.map(p => (
          <div key={p.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.borderSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>{p.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{p.label}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{p.n} ganadores</div>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{p.val} c/u</div>
          </div>
        ))}
        <button onClick={() => goto('premios')} style={{ marginTop: 12, width: '100%', padding: '10px', background: 'transparent', border: `1.5px solid ${T.border}`, borderRadius: 10, color: T.ink, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
          Ver catálogo completo →
        </button>
      </Card>

      {/* Powers */}
      <Card>
        <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 14 }}>Poderes activos</div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {(['double', 'late', 'spy'] as const).map(kind => <PowerIcon key={kind} kind={kind} size={44} label/>)}
        </div>
      </Card>

      {/* Points system */}
      <Card onClick={() => setPointsSheet(true)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Sistema de Puntos</div>
            <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>Cómo se calculan los puntos por fase</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
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
