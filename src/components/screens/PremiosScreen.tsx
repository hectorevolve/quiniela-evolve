'use client';
import { useState, useEffect } from 'react';
import { theme as T } from '@/lib/theme';
import { Header, Pill, Card } from '@/components/ui';
import { getGroupSettings, resolvePrizeTiers, prizeTierLabel, type GroupSettings, type PrizeTier } from '@/lib/db';
import { type AppUser } from '@/lib/supabase';

interface Props {
  goto: (s: string) => void;
  fireToast: (msg: string, color?: string, textColor?: string) => void;
  rank: number;
  currentUser?: AppUser | null;
  demoTiers?: PrizeTier[];   // presentación: inyecta tramos de ejemplo sin tocar la BD
}

// Estilo visual según el lugar inicial del tramo
const tierStyle = (from: number): { icon: string; color: string; bg: string } => {
  if (from === 1) return { icon: '🥇', color: '#F59E0B', bg: '#FEF3C7' };
  if (from === 2) return { icon: '🥈', color: '#94A3B8', bg: '#F1F5F9' };
  if (from === 3) return { icon: '🥉', color: '#CD7C2F', bg: '#FEF0E6' };
  return { icon: '🏅', color: '#1AAFFF', bg: '#E0F2FE' };
};
const tierDesc = (t: PrizeTier): string =>
  t.from === t.to
    ? `El lugar #${t.from} del ranking final.`
    : `Del lugar #${t.from} al #${t.to} en el ranking final.`;

const BONUS_META = [
  { icon: '🏆', label: 'Campeón del mundo',  typeKey: 'bonus_champ_type'  as const, valKey: 'bonus_champ_value'  as const },
  { icon: '🥈', label: 'Subcampeón',          typeKey: 'bonus_runner_type' as const, valKey: 'bonus_runner_value' as const },
  { icon: '🥉', label: '3er Lugar (bonus)',   typeKey: 'bonus_third_type'  as const, valKey: 'bonus_third_value'  as const },
  { icon: '⚽', label: 'Goleador del torneo', typeKey: 'bonus_scorer_type' as const, valKey: 'bonus_scorer_value' as const },
];

export function PremiosScreen({ goto, rank, currentUser, demoTiers }: Props) {
  const [settings, setSettings] = useState<GroupSettings | null>(null);
  const userGroup = currentUser?.group_name ?? '';

  useEffect(() => {
    if (userGroup) getGroupSettings(userGroup).then(setSettings).catch(console.error);
  }, [userGroup]);

  // Tramos de premio (flexible: posiciones sueltas y/o rangos)
  const tiers = demoTiers ?? resolvePrizeTiers(settings);
  const bonuses = BONUS_META.map(b => ({
    ...b,
    type: settings?.[b.typeKey] ?? 'otro',
    value: settings?.[b.valKey]?.trim() || null,
  })).filter(b => b.value); // only show configured bonuses

  // El tramo cuyo rango incluye la posición del usuario
  const userTier = tiers.find(t => rank >= t.from && rank <= t.to) ?? null;
  // Lugares cubiertos por al menos un tramo (para el texto del hero)
  const coveredPlaces = tiers.reduce((sum, t) => sum + (t.to - t.from + 1), 0);
  const maxPlace = tiers.reduce((m, t) => Math.max(m, t.to), 0);

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
          <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
            {coveredPlaces > 0
            ? (coveredPlaces === maxPlace ? `Los mejores ${maxPlace} ganan` : `Hasta el lugar #${maxPlace} hay premios`)
            : 'Premios del torneo'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 16 }}>
            Los participantes con más puntos al finalizar el Torneo 2026 reciben un reconocimiento exclusivo del Programa de Lealtad Evolve.
          </div>
          <Pill color={`${T.lime}22`} textColor={T.lime} style={{ fontSize: 13, fontWeight: 700 }}>
            ⚡ Tu posición actual: #{rank}
          </Pill>
        </div>

        {/* Prize cards (tramos) */}
        {tiers.length === 0 ? (
          <Card style={{ marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: T.muted, padding: '8px 0' }}>Los premios de tu grupo aún están por definir.</div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {tiers.map((t, i) => {
              const st = tierStyle(t.from);
              const isMe = rank >= t.from && rank <= t.to;
              return (
                <div key={i} style={{
                  borderRadius: 16, overflow: 'hidden',
                  border: `2px solid ${isMe ? st.color : T.border}`,
                  boxShadow: isMe ? `0 0 0 3px ${st.color}30` : T.shadowSm,
                  background: '#fff',
                }}>
                  <div style={{ height: 6, background: st.color }}/>
                  <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 14,
                      background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28, flexShrink: 0,
                    }}>{st.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span className="font-display" style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>{prizeTierLabel(t)}</span>
                        {isMe && <Pill color={`${st.color}20`} textColor={st.color} size="sm">← Tú</Pill>}
                      </div>
                      <div style={{ fontSize: 11.5, color: T.slate, lineHeight: 1.5 }}>{tierDesc(t)}</div>
                    </div>
                    <div style={{
                      fontSize: t.reward.length > 12 ? 13 : 18,
                      fontWeight: 900, color: st.color,
                      textAlign: 'right', flexShrink: 0, marginLeft: 8, maxWidth: 130,
                    }}>
                      {t.reward}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
        {userTier ? (() => {
          const st = tierStyle(userTier.from);
          return (
          <Card style={{ background: `${st.color}12`, border: `1.5px solid ${st.color}50` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 32 }}>{st.icon}</div>
              <div>
                <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>¡Estás en posición ganadora!</div>
                <div style={{ fontSize: 12, color: T.slate, marginTop: 2 }}>
                  Si el torneo terminara hoy, ganarías <strong>{userTier.reward}</strong>.
                </div>
              </div>
            </div>
          </Card>
          );
        })() : (
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
