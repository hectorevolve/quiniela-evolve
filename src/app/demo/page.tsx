'use client';
/**
 * /demo — Exact copy of the main app with:
 *  • No login required — starts directly on TorneoScreen with a demo user
 *  • Floating TweaksPanel overlay (panel de control para presentaciones)
 *
 * URL: /demo
 */
import { useState, useCallback, useRef } from 'react';
import { Toast, MiniLoader } from '@/components/ui';
import { TorneoScreen } from '@/components/screens/TorneoScreen';
import { DetalleScreen } from '@/components/screens/DetalleScreen';
import { PerfilScreen } from '@/components/screens/PerfilScreen';
import { PremiosScreen } from '@/components/screens/PremiosScreen';
import { LoginScreen } from '@/components/screens/LoginScreen';
import { OnboardingScreen } from '@/components/screens/OnboardingScreen';
import { DEMO_RANKINGS, DEMO_STATS } from './demoData';
import type { AppUser } from '@/lib/supabase';

type Screen = 'login' | 'onboarding' | 'torneo' | 'detalle' | 'perfil' | 'premios';
interface ToastState { id: number; message: string; color?: string; textColor?: string }
interface Tweaks {
  premium: boolean; filled: boolean; cumplido: boolean;
  liveMatch: boolean; liveMinute: number; liveHomeScore: number; liveAwayScore: number;
  pastMatch: boolean; rank: number; knockoutSlots: boolean;
}

// Demo user — no real auth, just a mock profile that looks realistic
const DEMO_USER: AppUser = {
  id: 'demo-00000000-0000-0000-0000-000000000001',
  name: 'Demo Evolve',
  email: 'demo@evolve.mx',
  phone: null,
  role: 'user',
  group_name: 'Evolve',
  premium: true,
  used_powers: [],
};

export default function DemoPage() {
  const [screen, setScreen]           = useState<Screen>('torneo');
  const [transitioning, setTransitioning] = useState(false);
  const [toast, setToast]             = useState<ToastState | null>(null);
  const [tweaks, setTweaks]           = useState<Tweaks>({
    premium: true, filled: false, cumplido: true,
    liveMatch: false, liveMinute: 30, liveHomeScore: 0, liveAwayScore: 0,
    pastMatch: false, rank: 1, knockoutSlots: false,
  });
  const [selectedMatchId, setSelectedMatchId] = useState<string>('a1');
  const [usedPowers, setUsedPowers]   = useState<Set<string>>(new Set());
  const [lateActiveMatchId, setLateActiveMatchId] = useState<string | null>(null);
  const [spyMatchId, setSpyMatchId]   = useState<string | null>(null);
  const [panelOpen, setPanelOpen]     = useState(false);  // ← Panel cerrado por defecto

  const goto = useCallback((next: string, matchId?: string) => {
    if (matchId) setSelectedMatchId(matchId);
    setTransitioning(true);
    setTimeout(() => { setScreen(next as Screen); setTransitioning(false); }, 280);
  }, []);

  const fireToast = useCallback((message: string, color?: string, textColor?: string) => {
    const id = Date.now();
    setToast({ id, message, color, textColor });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const renderScreen = () => {
    switch (screen) {
      case 'login':
        return <LoginScreen onLogin={(user: AppUser) => goto('onboarding')} />;
      case 'onboarding':
        return <OnboardingScreen onDone={() => goto('torneo')} />;
      case 'torneo':
        return <TorneoScreen goto={goto} tweaks={tweaks} fireToast={fireToast}
          usedPowers={usedPowers} setUsedPowers={setUsedPowers}
          lateActiveMatchId={lateActiveMatchId} setLateActiveMatchId={setLateActiveMatchId}
          spyMatchId={spyMatchId} setSpyMatchId={setSpyMatchId}
          currentUser={DEMO_USER} matchDates={{}} demoRankings={DEMO_RANKINGS}/>;
      case 'detalle':
        return <DetalleScreen goto={goto} tweaks={tweaks} fireToast={fireToast}
          matchId={selectedMatchId}
          usedPowers={usedPowers} setUsedPowers={setUsedPowers}
          lateActiveMatchId={lateActiveMatchId} setLateActiveMatchId={setLateActiveMatchId}
          spyMatchId={spyMatchId} setSpyMatchId={setSpyMatchId}/>;
      case 'perfil':
        return <PerfilScreen goto={goto} tweaks={tweaks} fireToast={fireToast}
          currentUser={DEMO_USER} onLogout={() => goto('torneo')} demoStats={DEMO_STATS}/>;
      case 'premios':
        return <PremiosScreen goto={goto} fireToast={fireToast}
          rank={tweaks.rank} currentUser={DEMO_USER}
          demoTiers={[
            { from: 1, to: 1, reward: '$1,000' },
            { from: 2, to: 2, reward: '$800' },
            { from: 3, to: 3, reward: '$500' },
            { from: 4, to: 10, reward: '$100' },
          ]}/>;
    }
  };

  return (
    <div style={{
      width: '100%', height: '100dvh',
      background: '#111', display: 'flex', justifyContent: 'center', alignItems: 'stretch',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
    }}>
      {/* App column — identical to production */}
      <div style={{
        width: '100%', maxWidth: 430, height: '100dvh',
        background: '#fff', overflow: 'hidden', position: 'relative', flexShrink: 0,
      }}>
        <div style={{
          width: '100%', height: '100%',
          overflowY: 'auto', overflowX: 'hidden',
          opacity: transitioning ? 0 : 1, transition: 'opacity 200ms ease',
        }}>
          {renderScreen()}
        </div>
        {toast && <Toast key={toast.id} message={toast.message} color={toast.color} textColor={toast.textColor} visible/>}
        {transitioning && <MiniLoader/>}
      </div>

      {/* Floating panel toggle button */}
      <button
        id="demo-nav-toggle"
        onClick={() => setPanelOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 10000,
          width: 62, height: 62, borderRadius: '50%',
          background: panelOpen ? '#EF4444' : '#1AAFFF',
          border: 'none',
          color: '#fff', fontSize: 28, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(26,175,255,0.4)',
          transition: 'all 300ms ease',
          fontWeight: 'bold',
        }}
        title={panelOpen ? 'Cerrar panel' : 'Abrir panel de navegación'}
      >
        {panelOpen ? '✕' : '☰'}
      </button>

      {/* Control panel overlay */}
      {panelOpen && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 9999,
        }}>
          <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} screen={screen} goto={goto}/>
        </div>
      )}
    </div>
  );
}

// ─── Panel de control ──────────────────────────────────────────────────────────
function TweaksPanel({ tweaks, setTweaks, screen, goto }: {
  tweaks: Tweaks; setTweaks: React.Dispatch<React.SetStateAction<Tweaks>>;
  screen: string; goto: (s: string) => void;
}) {
  const screens: Screen[] = ['login', 'onboarding', 'torneo', 'detalle', 'perfil', 'premios'];
  const simTimers = useRef<number[]>([]);

  const screenLabels: Record<Screen, string> = {
    login: '🔓 Login',
    onboarding: '👋 Bienvenida/Onboarding',
    torneo: '⚽ Torneo',
    detalle: '🔍 Detalle partido',
    perfil: '👤 Mi perfil',
    premios: '🎖 Premios',
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(26,42,80,0.95) 100%)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(26,175,255,0.2)',
      borderRadius: 24,
      padding: '24px 16px',
      width: 280,
      color: '#fff',
      maxHeight: '85vh',
      overflowY: 'auto',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
      boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(26,175,255,0.15)',
    }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, color: '#1AAFFF', marginBottom: 20, textTransform: 'uppercase', textAlign: 'center' }}>
        🎮 Navegación
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {screens.map(s => (
          <button key={s} onClick={() => goto(s)} style={{
            padding: '11px 14px',
            background: screen === s ? 'rgba(26,175,255,0.25)' : 'rgba(255,255,255,0.05)',
            border: screen === s ? '1.5px solid #1AAFFF' : '1px solid rgba(26,175,255,0.2)',
            borderRadius: 11,
            color: screen === s ? '#1AAFFF' : 'rgba(255,255,255,0.75)',
            fontSize: 13,
            fontWeight: screen === s ? 700 : 600,
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 150ms ease',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {screenLabels[s]}
          </button>
        ))}
      </div>

      <PanelSection label="Usuario"/>
      <Toggle label="Premium (poderes activos)" value={tweaks.premium} onChange={v => setTweaks(t => ({ ...t, premium: v }))}/>

      <PanelSection label="Predicciones"/>
      <Toggle label="Predicciones llenas" value={tweaks.filled} onChange={v => setTweaks(t => ({ ...t, filled: v }))}/>
      <Toggle label="Partidos terminados" value={tweaks.pastMatch} onChange={v => setTweaks(t => ({ ...t, pastMatch: v }))}/>

      <PanelSection label="Partido en vivo"/>
      <Toggle label="Activar partido en vivo" value={tweaks.liveMatch} onChange={v => {
        simTimers.current.forEach(clearTimeout); simTimers.current = [];
        setTweaks(t => ({ ...t, liveMatch: v, liveHomeScore: 0, liveAwayScore: 0, liveMinute: 23 }));
      }}/>
      {tweaks.liveMatch && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Minuto</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1AAFFF' }}>{tweaks.liveMinute}&apos;</span>
          </div>
          <input type="range" min={1} max={90} value={tweaks.liveMinute}
            onChange={e => setTweaks(t => ({ ...t, liveMinute: Number(e.target.value) }))}
            style={{ width: '100%', accentColor: '#1AAFFF', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={() => setTweaks(t => ({ ...t, liveMatch: true, liveMinute: 23, liveHomeScore: t.liveHomeScore + 1 }))}
              style={{ flex: 1, padding: '6px', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 7, color: '#4ADE80' }}>
              ⚽ Gol MEX
            </button>
            <button onClick={() => setTweaks(t => ({ ...t, liveMatch: true, liveMinute: 61, liveAwayScore: t.liveAwayScore + 1 }))}
              style={{ flex: 1, padding: '6px', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 7, color: '#4ADE80' }}>
              ⚽ Gol RSA
            </button>
          </div>
        </div>
      )}

      <PanelSection label="Simulación completa"/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        <button onClick={() => {
          simTimers.current.forEach(clearTimeout); simTimers.current = [];
          setTweaks(t => ({ ...t, liveMatch: true, liveHomeScore: 0, liveAwayScore: 0, liveMinute: 10 }));
          simTimers.current.push(window.setTimeout(() => setTweaks(t => ({ ...t, liveMinute: 23, liveHomeScore: t.liveHomeScore + 1 })), 2000));
          simTimers.current.push(window.setTimeout(() => setTweaks(t => ({ ...t, liveMinute: 61, liveAwayScore: t.liveAwayScore + 1 })), 8000));
          simTimers.current.push(window.setTimeout(() => setTweaks(t => ({ ...t, liveMatch: false, liveHomeScore: 0, liveAwayScore: 0 })), 15000));
        }} style={{ padding: '7px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(26,175,255,0.12)', border: '1px solid rgba(26,175,255,0.3)', borderRadius: 8, color: '#1AAFFF', textAlign: 'left' }}>
          ▶ Simular MEX vs RSA (15 seg)
        </button>
        <button onClick={() => {
          simTimers.current.forEach(clearTimeout); simTimers.current = [];
          setTweaks(t => ({ ...t, liveMatch: false, liveHomeScore: 0, liveAwayScore: 0 }));
        }} style={{ padding: '7px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.45)', textAlign: 'left' }}>
          ■ Detener simulación
        </button>
      </div>

      <PanelSection label="Eliminatorias"/>
      <Toggle label="Simular slots de eliminatorias" value={tweaks.knockoutSlots} onChange={v => setTweaks(t => ({ ...t, knockoutSlots: v }))}/>

      <PanelSection label="Posición en ranking"/>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {([1, 3, 10, 20] as const).map(r => (
          <button key={r} onClick={() => setTweaks(t => ({ ...t, rank: r }))} style={{
            flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            background: tweaks.rank === r ? 'rgba(26,175,255,0.25)' : 'rgba(255,255,255,0.06)',
            border: tweaks.rank === r ? '1px solid rgba(26,175,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6, color: tweaks.rank === r ? '#1AAFFF' : 'rgba(255,255,255,0.5)',
          }}>#{r}</button>
        ))}
      </div>
    </div>
  );
}

function PanelSection({ label }: { label: string }) {
  return <div style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.2, textTransform: 'uppercase', margin: '14px 0 8px' }}>{label}</div>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 1.3 }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: value ? '#1AAFFF' : 'rgba(255,255,255,0.15)',
        position: 'relative', flexShrink: 0, marginLeft: 8, transition: 'background 200ms',
      }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: value ? 19 : 3, transition: 'left 200ms' }}/>
      </button>
    </div>
  );
}
