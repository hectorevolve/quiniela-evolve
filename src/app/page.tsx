'use client';
import { useState, useCallback, useEffect } from 'react';
import { Phone, Toast, Preloader, MiniLoader } from '@/components/ui';
import { LoginScreen } from '@/components/screens/LoginScreen';
import { OnboardingScreen } from '@/components/screens/OnboardingScreen';
import { TorneoScreen } from '@/components/screens/TorneoScreen';
import { DetalleScreen } from '@/components/screens/DetalleScreen';
import { PerfilScreen } from '@/components/screens/PerfilScreen';
import { PremiosScreen } from '@/components/screens/PremiosScreen';
import { AdminScreen } from '@/components/screens/AdminScreen';
import { supabase, type AppUser } from '@/lib/supabase';
import { getProfile, getMatchDates } from '@/lib/db';
import { syncPredictionsFromDB, syncBonusFromDB } from '@/lib/predictions';

type Screen = 'login' | 'onboarding' | 'torneo' | 'detalle' | 'perfil' | 'premios' | 'admin';
interface ToastState { id: number; message: string; color?: string; textColor?: string }
interface Tweaks { premium: boolean; filled: boolean; cumplido: boolean; liveMatch: boolean; liveMinute: number; pastMatch: boolean; rank: number; knockoutSlots: boolean }

const DEV_TWEAKS = process.env.NEXT_PUBLIC_DEV_TWEAKS === '1';

export default function Home() {
  const [screen, setScreen] = useState<Screen>('login');
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [tweaks, setTweaks] = useState<Tweaks>({ premium: true, filled: false, cumplido: true, liveMatch: false, liveMinute: 30, pastMatch: false, rank: 1, knockoutSlots: false });
  const [selectedMatchId, setSelectedMatchId] = useState<string>('a1');
  const [usedPowers, setUsedPowers] = useState<Set<string>>(new Set());
  const [lateActiveMatchId, setLateActiveMatchId] = useState<string | null>(null);
  const [spyMatchId, setSpyMatchId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  // ISO UTC kickoff times from Supabase (synced from football-data.org API)
  const [matchDates, setMatchDates] = useState<Record<string, string>>({});

  useEffect(() => {
    setUsedPowers(new Set(tweaks.premium ? [] : ['double', 'late', 'spy']));
    setLateActiveMatchId(null);
    setSpyMatchId(null);
  }, [tweaks.premium]);

  // ── Auth init: check existing session, then show splash for at least 1.4s ──
  useEffect(() => {
    let minTimerDone = false;
    let authDone = false;

    const maybeHideLoader = () => {
      if (minTimerDone && authDone) setLoading(false);
    };

    const minTimer = setTimeout(() => { minTimerDone = true; maybeHideLoader(); }, 1400);

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await getProfile(session.user.id);
          if (profile) {
            setCurrentUser(profile);
            setScreen('torneo');
            // Sync predictions + dates in the background
            syncPredictionsFromDB(session.user.id).catch(console.error);
            syncBonusFromDB(session.user.id).catch(console.error);
            getMatchDates().then(setMatchDates).catch(console.error);
          }
        }
      } catch (err) {
        console.error('[auth] session check failed:', err);
      } finally {
        authDone = true;
        maybeHideLoader();
      }
    })();

    // Listen for sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setScreen('login');
      }
    });

    return () => { clearTimeout(minTimer); subscription.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleLogin = useCallback((user: AppUser) => {
    setCurrentUser(user);
    // Load official match dates from Supabase (updated by sync-results cron)
    getMatchDates().then(setMatchDates).catch(console.error);
    goto('torneo');
  }, [goto]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    goto('login');
  }, [goto]);

  const renderScreen = () => {
    switch (screen) {
      case 'login':
        return <LoginScreen onLogin={handleLogin} blocked={DEV_TWEAKS ? !tweaks.cumplido : false}/>;
      case 'onboarding':
        return <OnboardingScreen onDone={() => goto('torneo')}/>;
      case 'torneo':
        return <TorneoScreen goto={goto} tweaks={tweaks} fireToast={fireToast}
          usedPowers={usedPowers} setUsedPowers={setUsedPowers}
          lateActiveMatchId={lateActiveMatchId} setLateActiveMatchId={setLateActiveMatchId}
          spyMatchId={spyMatchId} setSpyMatchId={setSpyMatchId}
          currentUser={currentUser} matchDates={matchDates}/>;
      case 'detalle':
        return <DetalleScreen goto={goto} tweaks={tweaks} fireToast={fireToast}
          matchId={selectedMatchId}
          usedPowers={usedPowers} setUsedPowers={setUsedPowers}
          lateActiveMatchId={lateActiveMatchId} setLateActiveMatchId={setLateActiveMatchId}
          spyMatchId={spyMatchId} setSpyMatchId={setSpyMatchId}/>;
      case 'perfil':
        return <PerfilScreen goto={goto} tweaks={tweaks} fireToast={fireToast}
          currentUser={currentUser} onLogout={handleLogout}/>;
      case 'premios':
        return <PremiosScreen goto={goto} fireToast={fireToast} rank={tweaks.rank}/>;
      case 'admin':
        return <AdminScreen goto={goto}/>;
    }
  };

  return (
    // Outer shell: full viewport, dark bg on desktop so the app column stands out
    <div style={{
      width: '100%', height: '100dvh',
      background: '#111', display: 'flex', justifyContent: 'center', alignItems: 'stretch',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
    }}>
      {/* App column: mobile-width, white, full height */}
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
        <Preloader visible={loading}/>
        {transitioning && !loading && <MiniLoader/>}
      </div>

      {DEV_TWEAKS && (
        <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}>
          <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} screen={screen} goto={goto}
            onReplay={() => { setLoading(true); setTimeout(() => setLoading(false), 1400); }}/>
        </div>
      )}
    </div>
  );
}

function TweaksPanel({ tweaks, setTweaks, screen, goto, onReplay }: {
  tweaks: Tweaks; setTweaks: React.Dispatch<React.SetStateAction<Tweaks>>;
  screen: string; goto: (s: string) => void; onReplay: () => void;
}) {
  const screens: Screen[] = ['login', 'onboarding', 'torneo', 'detalle', 'perfil', 'premios'];
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
      <Toggle label="Mes cumplido (acceso)" value={tweaks.cumplido} onChange={v => setTweaks(t => ({ ...t, cumplido: v }))}/>
      <Toggle label="Premium (poderes activos)" value={tweaks.premium} onChange={v => setTweaks(t => ({ ...t, premium: v }))}/>

      <PanelSection label="Predicciones"/>
      <Toggle label="Predicciones llenas" value={tweaks.filled} onChange={v => setTweaks(t => ({ ...t, filled: v }))}/>
      <Toggle label="Partidos terminados" value={tweaks.pastMatch} onChange={v => setTweaks(t => ({ ...t, pastMatch: v }))}/>
      <Toggle label="Partido en vivo" value={tweaks.liveMatch} onChange={v => setTweaks(t => ({ ...t, liveMatch: v }))}/>
      {tweaks.liveMatch && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Minuto</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1AAFFF' }}>{tweaks.liveMinute}&apos;</span>
          </div>
          <input
            type="range" min={1} max={90} value={tweaks.liveMinute}
            onChange={e => setTweaks(t => ({ ...t, liveMinute: Number(e.target.value) }))}
            style={{ width: '100%', accentColor: '#1AAFFF', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>1&apos;</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>45&apos;</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>90&apos;</span>
          </div>
        </div>
      )}
      <Toggle label="Simular eliminatorias" value={tweaks.knockoutSlots} onChange={v => setTweaks(t => ({ ...t, knockoutSlots: v }))}/>

      <PanelSection label="Posición en ranking"/>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {([1, 3, 15, 20] as const).map(r => (
          <button key={r} onClick={() => setTweaks(t => ({ ...t, rank: r }))} style={{
            flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            background: tweaks.rank === r ? 'rgba(26,175,255,0.25)' : 'rgba(255,255,255,0.06)',
            border: tweaks.rank === r ? '1px solid rgba(26,175,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6, color: tweaks.rank === r ? '#1AAFFF' : 'rgba(255,255,255,0.5)',
          }}>#{r}</button>
        ))}
      </div>

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
      <PanelSection label="Panel Admin"/>
      <button onClick={() => window.open('/admin', '_blank')} style={{
        width: '100%', padding: '8px', background: 'rgba(244,63,94,0.12)',
        border: '1px solid rgba(244,63,94,0.3)', borderRadius: 8,
        color: '#F43F5E', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 10,
      }}>⚙ Abrir panel admin ↗</button>
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
