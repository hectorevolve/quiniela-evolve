'use client';
import { useState } from 'react';
import { theme as T } from '@/lib/theme';
import { PREMIOS, USER, type Premio } from '@/lib/data';
import { Header, Pill, Chip, Modal } from '@/components/ui';

interface Props {
  goto: (s: string) => void;
  fireToast: (msg: string, color?: string, textColor?: string) => void;
}

const TIER_COLORS: Record<string, string> = {
  HERO: T.lime, ASPIRACIONAL: '#1AAFFF', MEDIO: '#FBBF24', SIMBÓLICO: '#94A3B8',
};

function PremioArt({ img }: { img: string }) {
  const W = 120, H = 80;
  const fg = T.ink;
  const art: Record<string, React.ReactNode> = {
    ps5: <g><rect x="20" y="22" width="80" height="22" rx="3" fill={fg}/><circle cx="32" cy="33" r="4" fill="#1AAFFF"/><circle cx="88" cy="33" r="4" fill="#1AAFFF"/><rect x="55" y="28" width="10" height="2" rx="1" fill="#fff"/><rect x="53" y="52" width="14" height="4" rx="1" fill={fg}/></g>,
    tv: <g><rect x="10" y="12" width="100" height="44" rx="2" fill={fg}/><rect x="14" y="16" width="92" height="36" fill="#1AAFFF" opacity="0.8"/><rect x="50" y="56" width="20" height="4" fill={fg}/><rect x="35" y="60" width="50" height="2" fill={fg}/></g>,
    jersey: <g><path d="M35 16 L28 22 L22 32 L32 38 L32 68 L88 68 L88 38 L98 32 L92 22 L85 16 L70 22 L60 25 L50 22 Z" fill="#1AAFFF"/><text x="60" y="52" fontFamily="Inter" fontSize="12" fontWeight="700" fill="#fff" textAnchor="middle">10</text></g>,
    switch: <g><rect x="22" y="26" width="76" height="28" rx="4" fill={fg}/><rect x="42" y="30" width="36" height="20" fill="#1AAFFF"/><rect x="18" y="32" width="8" height="16" rx="2" fill="#1AAFFF"/><rect x="94" y="32" width="8" height="16" rx="2" fill="#1AAFFF"/></g>,
    jbl: <g><path d="M38 18 L40 14 L80 14 L82 18 L82 60 Q82 64 78 64 L42 64 Q38 64 38 60 Z" fill={fg}/><circle cx="60" cy="42" r="14" fill={T.bgSoft}/><circle cx="60" cy="42" r="6" fill={fg}/><path d="M48 12 Q60 4 72 12" stroke={fg} strokeWidth="2.5" fill="none" strokeLinecap="round"/></g>,
    ball: <g><circle cx="60" cy="42" r="24" fill="#fff" stroke={fg} strokeWidth="1.5"/><polygon points="60,30 68,35 65,44 55,44 52,35" fill={fg}/><line x1="60" y1="30" x2="60" y2="20" stroke={fg} strokeWidth="1.5"/><line x1="68" y1="35" x2="78" y2="32" stroke={fg} strokeWidth="1.5"/><line x1="65" y1="44" x2="72" y2="56" stroke={fg} strokeWidth="1.5"/><line x1="55" y1="44" x2="48" y2="56" stroke={fg} strokeWidth="1.5"/><line x1="52" y1="35" x2="42" y2="32" stroke={fg} strokeWidth="1.5"/></g>,
    scarf: <g><rect x="28" y="28" width="64" height="28" rx="2" fill="#1AAFFF"/><rect x="28" y="40" width="64" height="6" fill="#fff"/></g>,
    card: <g><rect x="20" y="20" width="80" height="48" rx="4" fill={T.blueDeep}/><rect x="20" y="34" width="80" height="8" fill={fg} opacity="0.3"/><rect x="28" y="50" width="18" height="10" rx="2" fill={T.amber}/><text x="92" y="64" fontFamily="Inter" fontSize="9" fontWeight="700" fill="#fff" textAnchor="end">$200</text></g>,
  };
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ background: T.bgSoft, display: 'block', borderRadius: '10px 10px 0 0' }}>
      {art[img] ?? <rect x="30" y="16" width="60" height="48" fill={fg}/>}
    </svg>
  );
}

export function PremiosScreen({ goto, fireToast }: Props) {
  const [filter, setFilter] = useState('Todos');
  const [detail, setDetail] = useState<Premio | null>(null);
  const [confirm, setConfirm] = useState<Premio | null>(null);

  const filters = ['Todos', 'HERO', 'ASPIRACIONAL', 'MEDIO', 'SIMBÓLICO'];
  const filtered = filter === 'Todos' ? PREMIOS : PREMIOS.filter(p => p.tier === filter);

  const canAfford = (p: Premio) => USER.points >= p.cost;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgSubtle, overflow: 'hidden' }}>
      <Header
        title="Catálogo de Premios"
        onBack={() => goto('torneo')}
        right={<Pill color={T.limeSoft} textColor={T.limeDeep}>⚡ {USER.points} pts</Pill>}
      />

      {/* Filter chips */}
      <div style={{ background: '#fff', padding: '10px 14px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {filters.map(f => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>)}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="evo-stagger">
          {filtered.map(p => (
            <div key={p.id} onClick={() => setDetail(p)} style={{
              background: '#fff', borderRadius: 14, overflow: 'hidden',
              border: `1px solid ${T.border}`, boxShadow: T.shadowSm,
              cursor: 'pointer', transition: 'transform 150ms, box-shadow 150ms',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; (e.currentTarget as HTMLElement).style.boxShadow = T.shadowMd; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = T.shadowSm; }}
            >
              <PremioArt img={p.img}/>
              <div style={{ padding: '10px 10px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 6, lineHeight: 1.3 }}>{p.name}</div>
                <Pill color={T.amberSoft} textColor={T.amberDeep} size="sm" style={{ marginBottom: 6 }}>
                  {p.cost.toLocaleString()} pts
                </Pill>
                <div style={{ marginBottom: 8 }}>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5,
                    color: TIER_COLORS[p.tier] ?? T.muted,
                    textTransform: 'uppercase',
                  }}>{p.tier}</span>
                </div>
                {canAfford(p) ? (
                  <button onClick={e => { e.stopPropagation(); setConfirm(p); }} style={{
                    width: '100%', padding: '8px', background: T.lime, border: 'none',
                    borderRadius: 8, fontWeight: 700, fontSize: 11.5, cursor: 'pointer', color: T.ink,
                  }}>Canjear</button>
                ) : (
                  <button disabled style={{
                    width: '100%', padding: '8px', background: T.bgSoft, border: `1px solid ${T.border}`,
                    borderRadius: 8, fontWeight: 600, fontSize: 10.5, cursor: 'not-allowed', color: T.muted,
                  }}>Faltan {(p.cost - USER.points).toLocaleString()} pts</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)}>
        {detail && (
          <div>
            <div style={{ margin: '-28px -24px 20px', borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
              <PremioArt img={detail.img}/>
            </div>
            <div className="font-display" style={{ fontSize: 18, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{detail.name}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <Pill color={T.amberSoft} textColor={T.amberDeep}>{detail.cost.toLocaleString()} pts</Pill>
              <Pill color={`${TIER_COLORS[detail.tier]}20`} textColor={TIER_COLORS[detail.tier]}>{detail.tier}</Pill>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {canAfford(detail) ? (
                <button onClick={() => { const p = detail; setDetail(null); setConfirm(p); }} style={{ width: '100%', padding: '14px', background: T.lime, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', color: T.ink }}>Canjear ahora</button>
              ) : (
                <button disabled style={{ width: '100%', padding: '14px', background: T.bgSoft, border: `1px solid ${T.border}`, borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'not-allowed', color: T.muted }}>Faltan {(detail.cost - USER.points).toLocaleString()} pts</button>
              )}
              <button onClick={() => setDetail(null)} style={{ width: '100%', padding: '14px', background: 'transparent', color: T.ink, border: `1.5px solid ${T.border}`, borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm modal */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)}>
        {confirm && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>
            <div className="font-display" style={{ fontSize: 18, fontWeight: 700, color: T.ink, marginBottom: 8 }}>¿Canjear este premio?</div>
            <div style={{ fontSize: 13.5, color: T.slate, marginBottom: 14, lineHeight: 1.6 }}>{confirm.name} · {confirm.cost.toLocaleString()} pts</div>
            <div style={{ background: '#FEF2F2', color: T.roseDeep, padding: '8px 12px', borderRadius: 10, fontSize: 11.5, fontWeight: 500, marginBottom: 18, border: '1px solid #FECACA' }}>
              Esta decisión no se puede revertir
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => { setConfirm(null); fireToast('¡Canjeado! Llega en 30 días 📦', T.emerald, '#fff'); }} style={{ width: '100%', padding: '14px', background: T.lime, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', color: T.ink }}>Sí, canjear</button>
              <button onClick={() => setConfirm(null)} style={{ width: '100%', padding: '14px', background: 'transparent', color: T.ink, border: `1.5px solid ${T.border}`, borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
