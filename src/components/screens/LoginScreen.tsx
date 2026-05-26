'use client';
import { useState, useRef } from 'react';
import { theme as T } from '@/lib/theme';
import { Button, Pill } from '@/components/ui';
import { EvolveLogo, QELockup, ChevronMotif } from '@/components/brand/EvolveMark';
import { FallingBall } from '@/components/ball/SoccerBall';
import { supabase, type AppUser } from '@/lib/supabase';
import { getProfile } from '@/lib/db';
import { syncPredictionsFromDB, syncBonusFromDB } from '@/lib/predictions';

interface Props {
  onLogin: (user: AppUser) => void;
  blocked?: boolean;
}

const WC_START = new Date('2026-06-11T00:00:00');
function daysUntilWC(): number {
  return Math.max(0, Math.ceil((WC_START.getTime() - Date.now()) / 86_400_000));
}

/** Format 10-digit phone for display: "55 2888 5655" */
function fmtPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
}

// Steps:
// 'phone'      → enter phone number
// 'otp'        → enter SMS code
// 'register'   → new user: choose email + password
// 'email-login'→ returning user: login with email + password
type Step = 'phone' | 'otp' | 'register' | 'email-login';

export function LoginScreen({ onLogin, blocked = false }: Props) {
  const [step, setStep]       = useState<Step>('phone');
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [info, setInfo]       = useState<string | null>(null);

  // Pre-filled from whitelist after OTP verification
  const [prefilledName, setPrefilledName]           = useState('');
  const [prefilledGroup, setPrefilledGroup]          = useState('');

  // Registration form
  const [regName, setRegName]             = useState('');
  const [regEmail, setRegEmail]           = useState('');
  const [regPassword, setRegPassword]     = useState('');
  const [regConfirm, setRegConfirm]       = useState('');
  const [showRegPass, setShowRegPass]     = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // Email login form
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPass, setLoginPass]         = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // ─── Shared: establish Supabase session from token_hash ─────────────────────
  const finishLogin = async (token_hash: string) => {
    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'email',
    });
    if (verifyErr || !data.user) {
      setError('Error al establecer la sesión. Intenta de nuevo.');
      return false;
    }
    const profile = await getProfile(data.user.id);
    if (!profile) {
      setError('No se encontró tu perfil. Contacta al administrador.');
      return false;
    }
    await Promise.all([
      syncPredictionsFromDB(data.user.id),
      syncBonusFromDB(data.user.id),
    ]);
    onLogin(profile);
    return true;
  };

  const goToOtp = (registered: boolean, name?: string, group?: string) => {
    setPrefilledName(name ?? '');
    setPrefilledGroup(group ?? '');
    if (!registered) {
      // Prepare register form
      setRegName(name ?? '');
    }
    setStep('otp');
    setOtp('');
    setTimeout(() => otpInputRef.current?.focus(), 300);
  };

  // ─── Paso 1: Enviar código ───────────────────────────────────────────────────
  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { setError('El número debe tener 10 dígitos.'); return; }

    setLoading(true); setError(null); setInfo(null);
    try {
      const res = await fetch('/api/auth/emetrix-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      });
      const data = await res.json() as {
        code?: string;
        registered?: boolean;
        token_hash?: string;
        name?: string;
        group_name?: string;
        error?: string;
      };

      if (data.error === 'not_in_whitelist') {
        setError('Este número no está registrado. Contacta al administrador.');
        return;
      }
      if (data.error) {
        setError('No pudimos enviar el código. Inténtalo de nuevo.');
        return;
      }

      // verification_04: celular ya conocido por emetrix
      if (data.code === 'verification_04') {
        if (data.registered && data.token_hash) {
          // Tiene cuenta → login directo
          await finishLogin(data.token_hash);
        } else {
          // Sin cuenta → registro
          goToOtp(false, data.name, data.group_name);
        }
        return;
      }

      // verification_01: código enviado
      goToOtp(data.registered ?? false, data.name, data.group_name);
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Paso 2: Verificar código ────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otp.trim()) { setError('Ingresa el código que recibiste.'); return; }
    const digits = phone.replace(/\D/g, '');

    setLoading(true); setError(null); setInfo(null);
    try {
      const res = await fetch('/api/auth/emetrix-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, code: otp.trim() }),
      });
      const data = await res.json() as {
        code?: string;
        registered?: boolean;
        token_hash?: string;
        name?: string;
        group_name?: string;
        error?: string;
      };

      if (data.error) {
        setError('Error de verificación. Inténtalo de nuevo.');
        return;
      }
      if (data.code === 'validation_01') {
        if (data.registered && data.token_hash) {
          // Ya tiene cuenta → login directo
          await finishLogin(data.token_hash);
        } else {
          // Celular verificado pero sin cuenta → mostrar registro
          setPrefilledName(data.name ?? '');
          setPrefilledGroup(data.group_name ?? '');
          setRegName(data.name ?? '');
          setStep('register');
        }
        return;
      }
      if (data.code === 'validation_05') {
        setError('Código incorrecto. Verifica e intenta de nuevo.');
        return;
      }
      if (data.code === 'validation_04') {
        setError('Error en el número. Reinicia el proceso e ingresa tu número nuevamente.');
        return;
      }
      setError('Respuesta inesperada. Inténtalo de nuevo.');
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Reiniciar proceso ───────────────────────────────────────────────────────
  const handleReset = async () => {
    const digits = phone.replace(/\D/g, '');
    setLoading(true);
    try {
      await fetch('/api/auth/emetrix-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      });
    } catch { /* silently ignore */ } finally {
      setLoading(false);
    }
    setStep('phone'); setPhone(''); setOtp('');
    setInfo('Proceso reiniciado. Ingresa nuevamente tu número de celular.');
  };

  // ─── Paso 3: Crear cuenta ────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!regName.trim()) { setError('Ingresa tu nombre completo.'); return; }
    if (!regEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setError('Ingresa un correo electrónico válido.'); return;
    }
    if (regPassword.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (regPassword !== regConfirm) { setError('Las contraseñas no coinciden.'); return; }

    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ''),
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          name: regName.trim(),
        }),
      });
      const data = await res.json() as { token_hash?: string; error?: string };

      if (data.error === 'email_taken') {
        setError('Este correo ya está en uso. Usa uno diferente o inicia sesión.');
        return;
      }
      if (data.error === 'password_too_short') {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (data.error || !data.token_hash) {
        setError('Error al crear la cuenta. Inténtalo de nuevo.');
        return;
      }
      await finishLogin(data.token_hash);
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Email + contraseña (login directo) ─────────────────────────────────────
  const handleEmailLogin = async () => {
    if (!loginEmail.trim() || !loginPass.trim()) {
      setError('Ingresa tu correo y contraseña.'); return;
    }
    setLoading(true); setError(null);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: loginPass,
      });
      if (authErr || !data.user) {
        setError('Correo o contraseña incorrectos.'); return;
      }
      const profile = await getProfile(data.user.id);
      if (!profile) { setError('No se encontró tu perfil. Contacta al administrador.'); return; }
      await Promise.all([
        syncPredictionsFromDB(data.user.id),
        syncBonusFromDB(data.user.id),
      ]);
      onLogin(profile);
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Blocked screen ──────────────────────────────────────────────────────────
  if (blocked) {
    return (
      <div style={{ height: '100%', background: T.bgInk, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <div className="evo-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.4 }}/>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, position: 'relative', zIndex: 1, textAlign: 'center', gap: 20 }}>
          <EvolveLogo size={36} mode="light"/>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: T.bgInkRaised, border: `1px solid ${T.borderInk}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={T.rose} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8, fontFamily: 'var(--font-space-grotesk)' }}>Acceso restringido</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 280 }}>
              Para acceder a la quiniela debes cumplir tu objetivo comercial del mes al 100%.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Common styles ───────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 52, padding: '0 16px',
    border: `1.5px solid ${T.border}`, borderRadius: 14,
    fontSize: 15, color: T.ink, background: '#fff',
    outline: 'none', transition: 'border-color 150ms',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: T.slate,
    letterSpacing: 0.3, display: 'block', marginBottom: 6,
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

      {/* Hero */}
      <div style={{
        height: '38%', minHeight: 200, background: T.bgInk,
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        <div className="evo-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.5 }}/>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 260, height: 260, background: 'radial-gradient(circle, rgba(26,175,255,0.25) 0%, transparent 65%)', filter: 'blur(16px)', pointerEvents: 'none' }}/>
        <ChevronMotif size={180} opacity={0.06} style={{ position: 'absolute', top: -20, right: -30, pointerEvents: 'none' }}/>
        <ChevronMotif size={100} opacity={0.04} style={{ position: 'absolute', bottom: -10, left: -20, pointerEvents: 'none' }}/>
        <FallingBall size={52} delay={0}   duration={4.5} x="22%" glow/>
        <FallingBall size={36} delay={1.2} duration={5.5} x="68%"/>
        <FallingBall size={28} delay={2.4} duration={4.0} x="50%"/>
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', animation: 'evo-slide-up 500ms ease 200ms both' }}>
          <QELockup size={32} mode="light" compact/>
        </div>
        <div style={{ position: 'relative', zIndex: 2, animation: 'evo-fade-in 500ms ease 400ms both' }}>
          <Pill color="rgba(26,175,255,0.15)" textColor={T.blue} style={{ border: `1px solid rgba(26,175,255,0.3)` }}>
            {daysUntilWC() > 0 ? `Torneo 2026 · ${daysUntilWC()} días` : 'Torneo 2026 · ¡Ya comenzó!'}
          </Pill>
        </div>
      </div>

      {/* Card */}
      <div style={{
        flex: 1, background: '#fff', borderRadius: '24px 24px 0 0',
        padding: '24px 24px 32px', marginTop: -20,
        boxShadow: '0 -8px 32px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>

        {/* ════ PASO 1: Número de celular ════ */}
        {step === 'phone' && (
          <>
            <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 6, letterSpacing: '-0.02em' }}>Bienvenido</div>
            <div style={{ fontSize: 14, color: T.slate, marginBottom: 24, lineHeight: 1.5 }}>
              Ingresa tu número de celular para recibir un código de acceso
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Número de celular</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ height: 52, padding: '0 12px', border: `1.5px solid ${T.border}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 6, background: '#F8FAFC', flexShrink: 0, fontSize: 15, color: T.slate, fontWeight: 600 }}>
                  🇲🇽 +52
                </div>
                <input
                  type="tel" inputMode="numeric" placeholder="55 2888 5655"
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/[^\d\s]/g, '')); setError(null); setInfo(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  disabled={loading} maxLength={14}
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => e.currentTarget.style.borderColor = T.blue}
                  onBlur={e => e.currentTarget.style.borderColor = T.border}
                />
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>Solo tus 10 dígitos — sin código de país</div>
            </div>

            {info  && <InfoBox msg={info}/>}
            {error && <ErrorBox msg={error}/>}

            <Button variant="ink" fullWidth onClick={handleSendOtp} size="lg" style={{ opacity: loading ? 0.7 : 1, marginBottom: 14 }}>
              {loading ? 'Enviando…' : 'Enviar código SMS →'}
            </Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0 14px' }}>
              <div style={{ flex: 1, height: 1, background: T.border }}/>
              <span style={{ fontSize: 11, color: T.muted }}>o</span>
              <div style={{ flex: 1, height: 1, background: T.border }}/>
            </div>

            <button
              onClick={() => { setStep('email-login'); setError(null); setInfo(null); }}
              style={{ width: '100%', padding: '14px', background: 'transparent', border: `1.5px solid ${T.border}`, borderRadius: 14, fontSize: 14, fontWeight: 600, color: T.slate, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Iniciar sesión con correo y contraseña
            </button>
          </>
        )}

        {/* ════ PASO 2: Código OTP ════ */}
        {step === 'otp' && (
          <>
            <button onClick={() => { setStep('phone'); setError(null); setInfo(null); setOtp(''); }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: T.blue, fontSize: 13, padding: '0 0 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Cambiar número
            </button>

            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(26,175,255,0.1)', border: `1.5px solid rgba(26,175,255,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>

            <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Código enviado</div>
            <div style={{ fontSize: 13, color: T.slate, marginBottom: 22, lineHeight: 1.5 }}>
              Ingresa el código que te enviamos al{' '}
              <span style={{ fontWeight: 700, color: T.ink }}>+52 {fmtPhone(phone.replace(/\D/g, ''))}</span>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Código de verificación</label>
              <input
                ref={otpInputRef}
                type="text" inputMode="numeric" placeholder="••••"
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                disabled={loading} maxLength={6}
                style={{ ...inputStyle, fontSize: 32, fontWeight: 700, letterSpacing: 14, textAlign: 'center', fontFamily: 'var(--font-jetbrains-mono)' }}
                onFocus={e => e.currentTarget.style.borderColor = T.blue}
                onBlur={e => e.currentTarget.style.borderColor = T.border}
              />
            </div>

            {error && <ErrorBox msg={error}/>}

            <Button variant="ink" fullWidth onClick={handleVerifyOtp} size="lg" style={{ opacity: loading ? 0.7 : 1, marginBottom: 14 }}>
              {loading ? 'Verificando…' : 'Verificar y continuar'}
            </Button>

            <button onClick={handleReset} disabled={loading} style={{ background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer', color: T.rose, fontSize: 13, fontWeight: 600, padding: '4px 0', textAlign: 'center', display: 'block', width: '100%' }}>
              🔄 Reiniciar proceso
            </button>
            <div style={{ fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 4 }}>
              Úsalo si el número era incorrecto o el SMS no llegó
            </div>
          </>
        )}

        {/* ════ PASO 3: Crear cuenta ════ */}
        {step === 'register' && (
          <>
            <button onClick={() => { setStep('otp'); setError(null); }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: T.blue, fontSize: 13, padding: '0 0 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Volver
            </button>

            {/* Celular verificado badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#15803D' }}>Celular verificado</div>
                <div style={{ fontSize: 11, color: '#16A34A' }}>+52 {fmtPhone(phone.replace(/\D/g, ''))}</div>
              </div>
            </div>

            <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Crea tu cuenta</div>
            <div style={{ fontSize: 13, color: T.slate, marginBottom: 20, lineHeight: 1.5 }}>
              Elige tu correo y contraseña para acceder en el futuro
            </div>

            {/* Nombre */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nombre completo</label>
              <input type="text" placeholder="Tu nombre" value={regName}
                onChange={e => { setRegName(e.target.value); setError(null); }}
                disabled={loading} style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = T.blue}
                onBlur={e => e.currentTarget.style.borderColor = T.border}
              />
            </div>

            {/* Correo */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Correo electrónico</label>
              <input type="email" placeholder="tu@correo.com" value={regEmail}
                onChange={e => { setRegEmail(e.target.value); setError(null); }}
                disabled={loading} style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = T.blue}
                onBlur={e => e.currentTarget.style.borderColor = T.border}
              />
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input type={showRegPass ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={regPassword}
                  onChange={e => { setRegPassword(e.target.value); setError(null); }}
                  disabled={loading} style={{ ...inputStyle, paddingRight: 46 }}
                  onFocus={e => e.currentTarget.style.borderColor = T.blue}
                  onBlur={e => e.currentTarget.style.borderColor = T.border}
                />
                <EyeBtn show={showRegPass} onToggle={() => setShowRegPass(v => !v)}/>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Confirmar contraseña</label>
              <div style={{ position: 'relative' }}>
                <input type={showRegConfirm ? 'text' : 'password'} placeholder="Repite tu contraseña" value={regConfirm}
                  onChange={e => { setRegConfirm(e.target.value); setError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  disabled={loading} style={{ ...inputStyle, paddingRight: 46, borderColor: regConfirm && regPassword !== regConfirm ? '#EF4444' : T.border }}
                  onFocus={e => e.currentTarget.style.borderColor = regConfirm && regPassword !== regConfirm ? '#EF4444' : T.blue}
                  onBlur={e => e.currentTarget.style.borderColor = regConfirm && regPassword !== regConfirm ? '#EF4444' : T.border}
                />
                <EyeBtn show={showRegConfirm} onToggle={() => setShowRegConfirm(v => !v)}/>
              </div>
              {regConfirm && regPassword !== regConfirm && (
                <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>Las contraseñas no coinciden</div>
              )}
            </div>

            {error && <ErrorBox msg={error}/>}

            <Button variant="ink" fullWidth onClick={handleRegister} size="lg" style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creando cuenta…' : 'Crear cuenta y entrar →'}
            </Button>
          </>
        )}

        {/* ════ Login con correo + contraseña ════ */}
        {step === 'email-login' && (
          <>
            <button onClick={() => { setStep('phone'); setError(null); }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: T.blue, fontSize: 13, padding: '0 0 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Volver
            </button>

            <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Iniciar sesión</div>
            <div style={{ fontSize: 13, color: T.slate, marginBottom: 22 }}>Con tu correo y contraseña</div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Correo electrónico</label>
              <input type="email" placeholder="tu@correo.com" value={loginEmail}
                onChange={e => { setLoginEmail(e.target.value); setError(null); }}
                onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
                disabled={loading} style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = T.blue}
                onBlur={e => e.currentTarget.style.borderColor = T.border}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input type={showLoginPass ? 'text' : 'password'} placeholder="••••••••" value={loginPass}
                  onChange={e => { setLoginPass(e.target.value); setError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
                  disabled={loading} style={{ ...inputStyle, paddingRight: 46 }}
                  onFocus={e => e.currentTarget.style.borderColor = T.blue}
                  onBlur={e => e.currentTarget.style.borderColor = T.border}
                />
                <EyeBtn show={showLoginPass} onToggle={() => setShowLoginPass(v => !v)}/>
              </div>
            </div>

            {error && <ErrorBox msg={error}/>}

            <Button variant="ink" fullWidth onClick={handleEmailLogin} size="lg" style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Ingresando…' : 'Entrar'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EyeBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} type="button" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ marginBottom: 14, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: 13, color: '#DC2626', lineHeight: 1.4 }}>
      {msg}
    </div>
  );
}

function InfoBox({ msg }: { msg: string }) {
  return (
    <div style={{ marginBottom: 14, padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, fontSize: 13, color: '#1D4ED8', lineHeight: 1.4 }}>
      {msg}
    </div>
  );
}
