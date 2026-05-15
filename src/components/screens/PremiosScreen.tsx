'use client';
import { theme as T } from '@/lib/theme';
import { USER } from '@/lib/data';
import { Header, Pill, Card } from '@/components/ui';

interface Props {
  goto: (s: string) => void;
  fireToast: (msg: string, color?: string, textColor?: string) => void;
}

const PRIZES = [
  {
    rank: 1, icon: '🥇', label: '1er Lugar',
    amount: '$15,000 MXN',
    color: '#F59E0B', bg: '#FEF3C7',
    desc: 'El participante con más puntos al finalizar el torneo.',
  },
  {
    rank: 2, icon: '🥈', label: '2do Lugar',
    amount: '$10,000 MXN',
    color: '#94A3B8', bg: '#F1F5F9',
    desc: 'El segundo lugar en el ranking final del torneo.',
  },
  {
    rank: 3, icon: '🥉', label: '3er Lugar',
    amount: '$5,000 MXN',
    color: '#CD7C2F', bg: '#FEF0E6',
    desc: 'El tercer lugar en el ranking final del torneo.',
  },
];

export function PremiosScreen({ goto }: Props) {
  const userPrize = PRIZES.find(p => p.rank === USER.rank);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgSubtle, overflow: 'hidden' }}>
      <Header title="Premios" onBack={() => goto('torneo')} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 32px' }}>

        {/* Hero */}
        <div style={{
          borderRadius: 20, padding: '28px 20px', marginBottom: 16,
          background: T.bgInk, border: `1px solid ${T.borderInk}`, textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
          <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Top 3 gana</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 16 }}>
            Los tres participantes con más puntos al finalizar el Torneo 2026 se llevan un premio en efectivo.
          </div>
          <Pill color={`${T.lime}22`} textColor={T.lime} style={{ fontSize: 13, fontWeight: 700 }}>
            ⚡ Tu posición actual: #{USER.rank}
          </Pill>
        </div>

        {/* Prize cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {PRIZES.map(p => {
            const isMe = p.rank === USER.rank;
            return (
              <div key={p.rank} style={{
                borderRadius: 16, overflow: 'hidden',
                border: `2px solid ${isMe ? p.color : T.border}`,
                boxShadow: isMe ? `0 0 0 3px ${p.color}30` : T.shadowSm,
                background: '#fff',
              }}>
                {/* Color stripe */}
                <div style={{ height: 6, background: p.color }}/>
                <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 14,
                      background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28, flexShrink: 0,
                    }}>{p.icon}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span className="font-display" style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>{p.label}</span>
                        {isMe && <Pill color={`${p.color}20`} textColor={p.color} size="sm">← Tú</Pill>}
                      </div>
                      <div style={{ fontSize: 11.5, color: T.slate, lineHeight: 1.5 }}>{p.desc}</div>
                    </div>
                  </div>
                  <div className="font-mono" style={{
                    fontSize: 18, fontWeight: 900, color: p.color,
                    textAlign: 'right', flexShrink: 0, marginLeft: 8,
                    lineHeight: 1.2,
                  }}>
                    {p.amount.split(' ')[0]}<br/>
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>MXN</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current position card */}
        {userPrize ? (
          <Card style={{ background: `${userPrize.color}12`, border: `1.5px solid ${userPrize.color}50` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 32 }}>{userPrize.icon}</div>
              <div>
                <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>¡Estás en posición ganadora!</div>
                <div style={{ fontSize: 12, color: T.slate, marginTop: 2 }}>
                  Si el torneo terminara hoy, ganarías <strong>{userPrize.amount}</strong>.
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 32 }}>💪</div>
              <div>
                <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Sigue compitiendo</div>
                <div style={{ fontSize: 12, color: T.slate, marginTop: 2 }}>
                  Estás en el lugar #{USER.rank}. Necesitas entrar al top 3 para ganar.
                </div>
              </div>
            </div>
          </Card>
        )}

        <div style={{ fontSize: 11.5, color: T.muted, textAlign: 'center', marginTop: 16, lineHeight: 1.6, fontStyle: 'italic' }}>
          Los premios se entregan al finalizar el Torneo 2026 · Sujeto a términos y condiciones Evolve.
        </div>
      </div>
    </div>
  );
}
