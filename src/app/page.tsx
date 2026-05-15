'use client';
import { useState, useCallback, useEffect } from 'react';
import { Phone, Toast, Preloader, MiniLoader } from '@/components/ui';
import { LoginScreen } from '@/components/screens/LoginScreen';
import { OnboardingScreen } from '@/components/screens/OnboardingScreen';
import { TorneoScreen } from '@/components/screens/TorneoScreen';
import { DetalleScreen } from '@/components/screens/DetalleScreen';
import { ChatScreen } from '@/components/screens/ChatScreen';
import { PerfilScreen } from '@/components/screens/PerfilScreen';
import { PremiosScreen } from '@/components/screens/PremiosScreen';

type Screen = 'login' | 'onboarding' | 'torneo' | 'detalle' | 'chat' | 'perfil' | 'premios';
interface ToastState { id: number; message: string; color?: string; textColor?: string }
interface Tweaks { premium: boolean; filled: boolean; cumplido: boolean }

export default function Home() {
  const [screen, setScreen] = useState<Screen>('login');
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [tweaks, setTweaks] = useState<Tweaks>({ premium: false, filled: false, cumplido: true });

  useEffect(() => {
    const tid = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(tid);
  }, []);

  const goto = useCallback((next: string) => {
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
      case 'login':      return <LoginScreen onLogin={() => goto('onboarding')} blocked={!tweaks.cumplido}/>;
      case 'onboarding': return <OnboardingScreen onDone={() => goto('torneo')}/>;
      case 'torneo':     return <TorneoScreen goto={goto} tweaks={tweaks} fireToast={fireToast}/>;
      case 'detalle':    return <DetalleScreen goto={goto} tweaks={tweaks} fireToast={fireToast}/>;
      case 'chat':       return <ChatScreen goto={goto} fireToast={fireToast}/>;
      case 'perfil':     return <PerfilScreen goto={goto} tweaks={tweaks} fireToast={fireToast}/>;
      case 'premios':    return <PremiosScreen goto={goto} fireToast={fireToast}/>;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 20% 20%, rgba(26,175,255,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(26,175,255,0.05) 0%, transparent 50%), #050B17',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 12px', position: 'relative',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
    }}>
      <div className="evo-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none' }}/>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', position: 'relative', zIndex: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Phone>
          <div style={{ position: 'relative', width: '100%', height: '100%', background: '#fff', overflow: 'hidden' }}>
            <div style={{
              position: 'relative', width: '100%', height: '100%',
              overflowY: 'auto', overflowX: 'hidden',
              opacity: transitioning ? 0 : 1, transition: 'opacity 200ms ease',
            }}>
              {renderScreen()}
            </div>
            {toast && <Toast key={toast.id} message={toast.message} color={toast.color} textColor={toast.textColor} visible/>}
            <Preloader visible={loading}/>
            {transitioning && !loading && <MiniLoader/>}
          </div>
        </Phone>

        <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} screen={screen} goto={goto}
          onReplay={() => { setLoading(true); setTimeout(() => setLoading(false), 1400); }}/>
      </div>
    </div>
  );
}

function TweaksPanel({ tweaks, setTweaks, screen, goto, onReplay }: {
  tweaks: Tweaks; setTweaks: React.Dispatch<React.SetStateAction<Tweaks>>;
  screen: string; goto: (s: string) => void; onReplay: () => void;
}) {
  const screens: Screen[] = ['login', 'onboarding', 'torneo', 'detalle', 'chat', 'perfil', 'premios'];
  return (
    <div style={{
      background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
      padding: '16px', width: 220, color: '#fff',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
      alignSelf: 'center',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(255,255,255,0.4)', marginBottom: 14, textTransform: 'uppercase' }}>Dev Tweaks</div>
      <PanelSection label="Usuario"/>
      <Toggle label="Premium (poderes activos)" value={tweaks.premium} onChange={v => setTweaks(t => ({ ...t, premium: v }))}/>
      <Toggle label="Predicciones llenas" value={tweaks.filled} onChange={v => setTweaks(t => ({ ...t, filled: v }))}/>
      <Toggle label="Mes cumplido (acceso)" value={tweaks.cumplido} onChange={v => setTweaks(t => ({ ...t, cumplido: v }))}/>
      <PanelSection label="Navegación"/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {screens.map(s => (
          <button key={s} onClick={() => goto(s)} style={{
            padding: '7px 10px',
            background: screen === s ? 'rgba(26,175,255,0.15)' : 'transparent',
            border: screen === s ? '1px solid rgba(26,175,255,0.4)' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, color: screen === s ? '#1AAFFF' : 'rgba(255,255,255,0.7)',
            fontSize: 12, fontWeight: screen === s ? 700 : 500, cursor: 'pointer',
            textAlign: 'left', transition: 'all 150ms',
          }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>
      <PanelSection label="Preloader"/>
      <button onClick={onReplay} style={{
        width: '100%', padding: '8px', background: 'rgba(26,175,255,0.12)',
        border: '1px solid rgba(26,175,255,0.3)', borderRadius: 8,
        color: '#1AAFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}>▶ Reproducir</button>
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
