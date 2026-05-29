'use client';
import { useState, useEffect } from 'react';
import { theme as T } from '@/lib/theme';
import { Header, Pill, Card } from '@/components/ui';
import { getGroupSettings, type GroupSettings } from '@/lib/db';
import { type AppUser } from '@/lib/supabase';

interface Props {
  goto: (s: string) => void;
  fireToast: (msg: string, color?: string, textColor?: string) => void;
  rank: number;
  currentUser?: AppUser | null;
}

const PRIZE_META = [
  { rank: 1, icon: '🥇', label: '1er Lugar', key: 'prize_1st' as const, color: '#F59E0B', bg: '#FEF3C7', desc: 'El participante con más puntos al finalizar el torneo.' },
  { rank: 2, icon: '🥈', label: '2do Lugar', key: 'prize_2nd' as const, color: '#94A3B8', bg: '#F1F5F9', desc: 'El segundo lugar en el ranking final.' },
  { rank: 3, icon: '🥉', label: '3er Lugar', key: 'prize_3rd' as const, color: '#CD7C2F', bg: '#FEF0E6', desc: 'El tercer lugar en el ranking final.' },
];

const BONUS_META = [
  { icon: '🏆', label: 'Campeón del mundo',  typeKey: 'bonus_champ_type'  as const, valKey: 'bonus_champ_value'  as const },
  { icon: '🥈', label: 'Subcampeón',          typeKey: 'bonus_runner_type' as const, valKey: 'bonus_runner_value' as const },
  { icon: '🥉', label: '3er Lugar (bonus)',   typeKey: 'bonus_third_type'  as const, valKey: 'bonus_third_value'  as const },
  { icon: '⚽', label: 'Goleador del torneo', typeKey: 'bonus_scorer_type' as const, valKey: 'bonus_scorer_value' as const },
];

export function PremiosScreen({ goto, rank, currentUser }: Props) {
  const [settings, setSettings] = useState<GroupSettings | null>(null);
  const userGroup = currentUser?.group_name ?? '';

  useEffect(() => {
    if (userGroup) getGroupSettings(userGroup).then(setSettings).catch(console.error);
  }, [userGroup]);

  // Build prize list from DB or show placeholder
  const prizes = PRIZE_META.map(p => ({
    ...p,
    amount: settings?.[p.key]?.trim() || null,
  }));
  const bonuses = BONUS_META.map(b => ({
    ...b,
    type: settings?.[b.typeKey] ?? 'otro',
    value: settings?.[b.valKey]?.trim() || null,
  })).filter(b => b.value); // only show configured bonuses

  const userPrize = prizes.find(p => p.rank === rank && p.amount);

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
            Los tres participantes con más puntos al finalizar el Torneo 2026 reciben un reconocimiento exclusivo del Programa de Lealtad Evolve.
          </div>
          <Pill color={`${T.lime}22`} textColor={T.lime} style={{ fontSize: 13, fontWeight: 700 }}>
            ⚡ Tu posición actual: #{rank}
          </Pill>
        </div>

        {/* Prize cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {prizes.map(p => {
            const isMe = p.rank === rank;
            return (
              <div key={p.rank} style={{
                borderRadius: 16, overflow: 'hidden',
                border: `2px solid ${isMe ? p.color : T.border}`,
                boxShadow: isMe ? `0 0 0 3px ${p.color}30` : T.shadowSm,
                background: '#fff',
              }}>
                <div style={{ height: 6, background: p.color }}/>
                <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, flexShrink: 0,
                  }}>{p.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className="font-display" style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>{p.label}</span>
                      {isMe && <Pill color={`${p.color}20`} textColor={p.color} size="sm">← Tú</Pill>}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.slate, lineHeight: 1.5 }}>{p.desc}</div>
                  </div>
                  <div style={{
                    fontSize: p.amount && p.amount.length > 12 ? 13 : 18,
                    fontWeight: 900, color: p.amount ? p.color : T.muted,
                    textAlign: 'right', flexShrink: 0, marginLeft: 8, maxWidth: 120,
                  }}>
                    {p.amount ?? 'Por definir'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bonus prizes (only if configured) */}
        {bonuses.length > 0 && (
          <>
            <div className="font-display" style={{ fontSize: 15, fontWeight: 800, color: T.ink, marginBottom: 10 }}>
              🎁 Premios bonus
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {bonuses.map(b => (
                <Card key={b.label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{b.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{b.label}</div>
                      <div style={{ fontSize: 11.5, color: T.slate, marginTop: 2 }}>Acierta esta predicción y acumula más puntos</div>
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 800,
                      color: b.type === 'puntos' ? T.limeDeep : T.blueDeep,
                      background: b.type === 'puntos' ? T.limeSoft : T.blueSoft,
                      padding: '4px 10px', borderRadius: 20, flexShrink: 0,
                    }}>
                      {b.type === 'puntos' ? `+${b.value} pts` : b.value}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

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
                  Estás en el lugar #{rank}. ¡Sigue prediciendo para escalar!
                </div>
              </div>
            </div>
          </Card>
        )}

        <div style={{ fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 16, lineHeight: 1.7, fontStyle: 'italic' }}>
          Los reconocimientos se entregan al finalizar el Torneo 2026 · Sujeto a términos y condiciones.<br/>
          Esta es una actividad promocional del Programa de Lealtad Evolve. No constituye un juego de azar ni apuesta de ningún tipo. La participación es gratuita y exclusiva para miembros del programa.
        </div>
      </div>
    </div>
  );
}
