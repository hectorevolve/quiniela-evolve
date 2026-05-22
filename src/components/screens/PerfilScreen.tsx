'use client';
import { useState, useMemo } from 'react';
import { theme as T } from '@/lib/theme';
import { USER, MATCHES, isMatchPast, DEMO_PAST_IDS, DEMO_RESULTS, type Match } from '@/lib/data';
import { Header, Avatar, Card, Chip, Pill, PowerIcon, Modal } from '@/components/ui';
import { Flag } from '@/components/flags/Flag';

interface Props {
  goto: (s: string) => void;
  tweaks: { premium: boolean; pastMatch: boolean };
  fireToast: (msg: string, color?: string, textColor?: string) => void;
}

const BADGES = [
  { icon: '🔥', label: 'Racha 3',          unlocked: true,  desc: 'Acertaste 3 partidos seguidos.' },
  { icon: '🎯', label: 'Profeta Inaugural', unlocked: true,  desc: 'Acertaste el primer partido del torneo.' },
  { icon: '🥇', label: 'Top Mayorista',     unlocked: false, req: 'Llega al #1 en tu mayorista.' },
  { icon: '💯', label: 'Exacto ×5',         unlocked: false, req: 'Acerta 5 marcadores exactos.' },
  { icon: '🚀', label: 'Racha 5',           unlocked: false, req: 'Acerta 5 partidos seguidos.' },
  { icon: '🏆', label: 'Profeta Final',     unlocked: false, req: 'Acerta el resultado de la final.' },
];

export function PerfilScreen({ goto, tweaks, fireToast }: Props) {
  const [logoutModal, setLogoutModal] = useState(false);
  const [badgeModal, setBadgeModal] = useState<null | typeof BADGES[number]>(null);
  const [view, setView] = useState<'main' | 'past'>('main');
  const [pastFilter, setPastFilter] = useState('Todos');

  const months = [
    { label: 'May', pct: 100, color: T.emerald },
    { label: 'Jun', pct: 75,  color: T.amber },
    { label: 'Jul', pct: 0,   color: T.muted },
  ];

  const powers = [
    { kind: 'double' as const, status: 'Disponible', used: false },
    { kind: 'late'   as const, status: 'Disponible', used: false },
    { kind: 'spy'    as const, status: 'Usado en MEX vs RSA', used: !tweaks.premium },
  ];

  const pastMatches = MATCHES.filter(m =>
    isMatchPast(m.date) || (tweaks.pastMatch && DEMO_PAST_IDS.has(m.id))
  ).map(m => {
    const demo = DEMO_RESULTS[m.id];
    return demo ? { ...m, result: demo.result as [number, number], userPrediction: demo.userPrediction as [number, number], pointsEarned: demo.pointsEarned } : m;
  });

  const pastGroups = useMemo(() => {
    const seen = new Set<string>();
    const groups: string[] = [];
    for (const m of pastMatches) {
      if (!seen.has(m.group)) { seen.add(m.group); groups.push(m.group); }
    }
    return groups;
  }, [pastMatches]);

  const filteredPast = useMemo(() =>
    pastFilter === 'Todos' ? pastMatches : pastMatches.filter(m => m.group === pastFilter),
  [pastMatches, pastFilter]);

  const groupLabel = (g: string) => g.startsWith('GRUPO ') ? `Grupo ${g.slice(6)}` : g.charAt(0) + g.slice(1).toLowerCase();

  if (view === 'past') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgSubtle, overflow: 'hidden' }}>
        <Header title="Mis predicciones" onBack={() => { setView('main'); setPastFilter('Todos'); }}/>

        {pastMatches.length > 0 && (
          <div style={{ padding: '10px 14px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10 }}>
              {['Todos', ...pastGroups].map(g => (
                <Chip key={g} active={pastFilter === g} onClick={() => setPastFilter(g)}>
                  {g === 'Todos' ? 'Todos' : groupLabel(g)}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pastMatches.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
              <div className="font-display" style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 8 }}>El torneo aún no ha comenzado</div>
              <div style={{ fontSize: 13, color: T.slate, lineHeight: 1.6 }}>Aquí aparecerán tus predicciones una vez que los partidos terminen.</div>
            </div>
          ) : filteredPast.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 14, color: T.muted }}>No hay partidos en este grupo.</div>
            </div>
          ) : (
            filteredPast.map(m => <PastPredictionCard key={m.id} m={m}/>)
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgSubtle, overflow: 'hidden' }}>
      <Header title="Mi Perfil" onBack={() => goto('torneo')}/>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 32px' }}>

        {/* User hero */}
        <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
          <Avatar initials={USER.avatar} size={80} ring={T.lime} style={{ margin: '0 auto 12px' }}/>
          <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>{USER.name}</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{USER.mayorista} · {USER.region}</div>
        </div>

        {/* Estatus */}
        <Card style={{ marginBottom: 12 }}>
          <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 14 }}>Estatus del mes</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {months.map(m => (
              <div key={m.label} style={{ flex: 1, background: T.bgSoft, borderRadius: 12, padding: '12px 8px', textAlign: 'center', border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>{m.label}</div>
                <div style={{ height: 48, background: T.border, borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', marginBottom: 6 }}>
                  <div style={{ width: '100%', height: `${m.pct}%`, background: m.color, transition: 'height 600ms' }}/>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.pct}%</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.emerald }}/>
            <span style={{ fontSize: 12, color: T.emerald, fontWeight: 600 }}>Mayo 2026 cumplido ✓</span>
          </div>
        </Card>

        {/* Powers */}
        <Card style={{ marginBottom: 12 }}>
          <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 14 }}>Mis Poderes</div>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {powers.map(p => (
              <div key={p.kind} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <PowerIcon kind={p.kind} size={48} used={p.used}/>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {{ double: 'Puntos Dobles', late: 'Cambio Tardío', spy: 'Espía' }[p.kind]}
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: p.used ? T.muted : T.emerald, marginTop: 2 }}>{p.status}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Stats */}
        <Card style={{ marginBottom: 12 }}>
          <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 12 }}>Estadísticas</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Predicciones', value: '24' },
              { label: 'Aciertos', value: '16 (67%)' },
              { label: 'Marcadores exactos', value: '3' },
              { label: 'Puntos totales', value: String(USER.points) },
            ].map(s => (
              <div key={s.label} style={{ background: T.bgSoft, borderRadius: 12, padding: '12px 14px', border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 10.5, color: T.muted, marginBottom: 4 }}>{s.label}</div>
                <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>{s.value}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Past predictions */}
        <button onClick={() => setView('past')} style={{
          width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: 12,
        }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Ver mis predicciones pasadas</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div style={{ fontSize: 12, color: T.slate, marginTop: 6 }}>{pastMatches.length} partido{pastMatches.length !== 1 ? 's' : ''} jugado{pastMatches.length !== 1 ? 's' : ''}</div>
          </Card>
        </button>

        {/* Badges */}
        <Card style={{ marginBottom: 20 }}>
          <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 12 }}>Mis Badges</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {BADGES.map(b => (
              <div key={b.label} onClick={() => setBadgeModal(b)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '12px 8px', borderRadius: 12,
                background: b.unlocked ? T.bgSoft : 'transparent',
                border: `1.5px solid ${b.unlocked ? T.lime : T.border}`,
                cursor: 'pointer', opacity: b.unlocked ? 1 : 0.5,
                position: 'relative',
              }}>
                <span style={{ fontSize: 24 }}>{b.icon}</span>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: T.ink, textAlign: 'center', lineHeight: 1.3 }}>{b.label}</div>
                {!b.unlocked && (
                  <div style={{ position: 'absolute', top: -4, right: -4, background: T.muted, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#fff" strokeWidth="2" fill="none"/>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <button onClick={() => setLogoutModal(true)} style={{
          width: '100%', padding: '14px', background: 'transparent',
          border: `1.5px solid ${T.rose}`, borderRadius: 12,
          color: T.rose, fontWeight: 600, fontSize: 14, cursor: 'pointer',
        }}>
          Cerrar sesión
        </button>
      </div>

      {/* Badge modal */}
      <Modal open={!!badgeModal} onClose={() => setBadgeModal(null)}>
        {badgeModal && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>{badgeModal.icon}</div>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 8 }}>{badgeModal.label}</div>
            <div style={{ fontSize: 13.5, color: T.slate, lineHeight: 1.6 }}>
              {badgeModal.unlocked ? badgeModal.desc : `Aún no desbloqueado: ${badgeModal.req}`}
            </div>
            {badgeModal.unlocked && <Pill color={T.limeSoft} textColor={T.limeDeep} style={{ marginTop: 14 }}>¡Desbloqueado!</Pill>}
            <button onClick={() => setBadgeModal(null)} style={{
              marginTop: 20, width: '100%', padding: '12px', background: T.bgSoft,
              border: `1.5px solid ${T.border}`, borderRadius: 12,
              fontWeight: 600, fontSize: 14, cursor: 'pointer', color: T.ink,
            }}>Cerrar</button>
          </div>
        )}
      </Modal>

      {/* Logout modal */}
      <Modal open={logoutModal} onClose={() => setLogoutModal(false)}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
          <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 8 }}>¿Cerrar sesión?</div>
          <div style={{ fontSize: 13.5, color: T.slate, marginBottom: 20, lineHeight: 1.6 }}>Tendrás que volver a iniciar sesión para acceder a la quiniela.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => { setLogoutModal(false); goto('login'); }} style={{ width: '100%', padding: '14px', background: T.rose, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Sí, cerrar sesión</button>
            <button onClick={() => setLogoutModal(false)} style={{ width: '100%', padding: '14px', background: 'transparent', color: T.ink, border: `1.5px solid ${T.border}`, borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PastPredictionCard({ m }: { m: Match }) {
  const result = m.result;
  const pred   = m.userPrediction;
  const pts    = m.pointsEarned ?? 0;

  const won  = result ? result[0] > result[1] : false;
  const draw = result ? result[0] === result[1] : false;
  const predWon  = pred ? pred[0] > pred[1] : false;
  const predDraw = pred ? pred[0] === pred[1] : false;
  const exact = result && pred && result[0] === pred[0] && result[1] === pred[1];
  const correctOutcome = result && pred &&
    ((won && predWon) || (draw && predDraw) || (!won && !draw && !predWon && !predDraw));

  const dateLabel = m.date.split(' ').slice(0, 4).join(' ');

  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '14px 16px',
      border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>{m.group}</div>
        <div style={{ fontSize: 10, color: T.muted }}>{dateLabel}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
          <Flag code={m.home.code} size={36}/>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.ink }}>{m.home.code}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' }}>
          {result ? (
            <>
              <div style={{ fontSize: 26, fontWeight: 800, color: T.ink, fontFamily: 'var(--font-mono)' }}>{result[0]}</div>
              <div style={{ fontSize: 13, color: T.muted }}>–</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: T.ink, fontFamily: 'var(--font-mono)' }}>{result[1]}</div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: T.muted }}>Resultado pendiente</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
          <Flag code={m.away.code} size={36}/>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.ink }}>{m.away.code}</div>
        </div>
      </div>

      <div style={{ height: 1, background: T.borderSoft, marginBottom: 10 }}/>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 11, color: T.muted }}>Tu predicción:</div>
          {pred ? (
            <div style={{
              fontSize: 12, fontWeight: 700,
              color: correctOutcome ? T.limeDeep : T.slate,
              background: correctOutcome ? T.limeSoft : T.bgSoft,
              borderRadius: 8, padding: '3px 10px',
              fontFamily: 'var(--font-mono)',
            }}>
              {pred[0]} – {pred[1]}{exact ? ' ✓' : ''}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: T.muted }}>–</div>
          )}
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: pts > 0 ? T.limeDeep : T.muted }}>
          {pts > 0 ? `+${pts} pts` : '+0 puntos'}
        </div>
      </div>
    </div>
  );
}
