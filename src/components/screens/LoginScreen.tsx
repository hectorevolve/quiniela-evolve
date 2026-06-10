'use client';
import { useState, useRef, useEffect } from 'react';
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
// 'phone'        → enter phone number (check whitelist)
// 'survey-promo' → new users: show $15K prize screen + send OTP
// 'otp'          → enter SMS verification code
// 'password'     → alternative login with password (for users who don't get SMS)
// 'admin-login'  → hidden admin: email + password
type Step = 'phone' | 'survey-promo' | 'otp' | 'password' | 'admin-login';

export function LoginScreen({ onLogin, blocked = false }: Props) {
  const [step, setStep]       = useState<Step>('phone');
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [info, setInfo]       = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);


  // Admin login form
  const [adminEmail, setAdminEmail]   = useState('');
  const [adminPass, setAdminPass]     = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Password login
  const [userPass, setUserPass]       = useState('');
  const [showUserPass, setShowUserPass] = useState(false);

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

  // ─── Registrar nuevo usuario (post-OTP) ─────────────────────────────────────
  // Nombre y grupo se toman del whitelist en el backend — no se envían desde el cliente
  const registerAndLogin = async () => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phone.replace(/\D/g, ''),
      }),
    });
    const data = await res.json() as { token_hash?: string; error?: string };

    if (data.error === 'already_registered' && data.token_hash) {
      // Ya registrado pero OTP verificado — hacer login directo
      return finishLogin(data.token_hash);
    }
    if (data.error === 'already_registered') {
      // Sin token_hash — pedir que intenten entrar con contraseña
      setStep('password');
      return false;
    }
    if (data.error || !data.token_hash) {
      setError('Error al crear la cuenta. Inténtalo de nuevo.');
      return false;
    }
    return finishLogin(data.token_hash);
  };

  // ─── Enviar OTP (llamado para ambos flujos) ─────────────────────────────────
  const sendOtp = async (): Promise<'sent' | 'error'> => {
    const digits = phone.replace(/\D/g, '');
    try {
      const res = await fetch('/api/auth/emetrix-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      });
      const data = await res.json() as { code?: string; registered?: boolean; error?: string };

      if (data.error) return 'error';
      // Siempre pedir código, sin importar si es usuario nuevo o existente
      return 'sent';
    } catch {
      return 'error';
    }
  };

  // ─── Paso 1: Verificar whitelist ─────────────────────────────────────────────
  const handleCheckPhone = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { setError('El número debe tener 10 dígitos.'); return; }

    setLoading(true); setError(null); setInfo(null);
    try {
      const res = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      });
      const data = await res.json() as { hasAccount?: boolean; isAdmin?: boolean; error?: string };

      if (data.error === 'not_in_whitelist') {
        setError('Este número no está autorizado. Contacta al administrador.');
        return;
      }
      if (data.error) {
        setError('No pudimos verificar tu número. Inténtalo de nuevo.');
        return;
      }

      if (data.hasAccount || data.isAdmin) {
        // Usuario registrado o admin → enviar OTP directamente (sin encuesta)
        setIsNewUser(false);
        const result = await sendOtp();
        if (result === 'error') {
          setError('No pudimos enviar el código. Inténtalo de nuevo.');
        } else {
          setOtp('');
          setStep('otp');
          setTimeout(() => otpInputRef.current?.focus(), 300);
        }
      } else {
        // Nuevo usuario → encuesta
        setIsNewUser(true);
        setStep('survey-promo');
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Paso survey-promo: enviar OTP directamente (nombre/grupo vienen del whitelist) ──
  const handleSurveySubmit = async () => {
    setLoading(true); setError(null);
    try {
      const result = await sendOtp();
      if (result === 'error') {
        setError('No pudimos enviar el código SMS. Inténtalo de nuevo.');
      } else {
        setOtp('');
        setStep('otp');
        setTimeout(() => otpInputRef.current?.focus(), 300);
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Paso OTP: verificar código ─────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otp.trim()) { setError('Ingresa el código que recibiste.'); return; }
    const digits = phone.replace(/\D/g, '');

    setLoading(true); setError(null);
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
        error?: string;
      };

      if (data.error) {
        setError('Error de verificación. Inténtalo de nuevo.');
        return;
      }
      if (data.code === 'validation_01') {
        if (data.registered && data.token_hash) {
          // Usuario registrado → login directo
          await finishLogin(data.token_hash);
        } else {
          // Código correcto + sin cuenta → crear cuenta con datos de encuesta
          await registerAndLogin();
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

  // ─── Login con contraseña ────────────────────────────────────────────────────
  const handlePasswordLogin = async () => {
    if (!userPass.trim()) { setError('Ingresa tu contraseña.'); return; }
    const digits = phone.replace(/\D/g, '');
    const email  = `${digits}@auth.quinielaevolve.mx`;

    setLoading(true); setError(null);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password: userPass });
      if (authErr || !data.user) {
        setError('Contraseña incorrecta. Pide al administrador que te asigne una.'); return;
      }
      const profile = await getProfile(data.user.id);
      if (!profile) { setError('No se encontró tu perfil. Contacta al administrador.'); return; }
      await Promise.all([syncPredictionsFromDB(data.user.id), syncBonusFromDB(data.user.id)]);
      onLogin(profile);
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

  // ─── Admin login con correo + contraseña ────────────────────────────────────
  const handleAdminLogin = async () => {
    if (!adminEmail.trim() || !adminPass.trim()) {
      setError('Ingresa tu correo y contraseña.'); return;
    }
    setLoading(true); setError(null);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: adminEmail.trim().toLowerCase(),
        password: adminPass,
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

  // ─── Common input styles ──────────────────────────────────────────────────────
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

      {/* ── Hero ── */}
      <div style={{
        height: step === 'survey-promo' ? '30%' : '38%',
        minHeight: step === 'survey-promo' ? 160 : 200,
        background: T.bgInk,
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        transition: 'height 400ms ease',
      }}>
        <div className="evo-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.5 }}/>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 260, height: 260, background: 'radial-gradient(circle, rgba(26,175,255,0.25) 0%, transparent 65%)', filter: 'blur(16px)', pointerEvents: 'none' }}/>
        <ChevronMotif size={180} opacity={0.06} style={{ position: 'absolute', top: -20, right: -30, pointerEvents: 'none' }}/>
        <ChevronMotif size={100} opacity={0.04} style={{ position: 'absolute', bottom: -10, left: -20, pointerEvents: 'none' }}/>
        {step !== 'survey-promo' && (
          <>
            <FallingBall size={52} delay={0}   duration={4.5} x="22%" glow/>
            <FallingBall size={36} delay={1.2} duration={5.5} x="68%"/>
            <FallingBall size={28} delay={2.4} duration={4.0} x="50%"/>
          </>
        )}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', animation: 'evo-slide-up 500ms ease 200ms both' }}>
          <QELockup size={32} mode="light" compact/>
        </div>
        <div style={{ position: 'relative', zIndex: 2, animation: 'evo-fade-in 500ms ease 400ms both' }}>
          {step === 'survey-promo' ? (
            <Pill color="rgba(201,243,29,0.15)" textColor="#C9F31D" style={{ border: '1px solid rgba(201,243,29,0.3)' }}>
              🏆 ¡Premio hasta $15,000 pesos!
            </Pill>
          ) : (
            <Pill color="rgba(26,175,255,0.15)" textColor={T.blue} style={{ border: `1px solid rgba(26,175,255,0.3)` }}>
              {daysUntilWC() > 0 ? `Torneo 2026 · ${daysUntilWC()} días` : 'Torneo 2026 · ¡Ya comenzó!'}
            </Pill>
          )}
        </div>
      </div>

      {/* ── Card ── */}
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
              Ingresa tu número de celular para comenzar
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
                  onKeyDown={e => e.key === 'Enter' && handleCheckPhone()}
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

            <Button variant="ink" fullWidth onClick={handleCheckPhone} size="lg" style={{ opacity: loading ? 0.7 : 1, marginBottom: 14 }}>
              {loading ? 'Verificando…' : 'Continuar →'}
            </Button>

            {/* Admin hidden link */}
            <button
              onClick={() => { setStep('admin-login'); setError(null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 11, padding: '8px 0', textAlign: 'center', marginTop: 'auto', opacity: 0.5 }}
            >
              Administrador
            </button>
          </>
        )}

        {/* ════ PASO 2: Promo encuesta ════ */}
        {step === 'survey-promo' && (
          <>
            {/* Prize highlight */}
            <div style={{
              background: 'linear-gradient(135deg, #0A1628 0%, #0D2210 100%)',
              borderRadius: 20, padding: '28px 24px', marginBottom: 20,
              border: '1.5px solid rgba(201,243,29,0.25)',
              textAlign: 'center', position: 'relative', overflow: 'hidden',
            }}>
              {/* Glow */}
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(201,243,29,0.12) 0%, transparent 65%)', pointerEvents: 'none' }}/>

              <div style={{ fontSize: 44, marginBottom: 10 }}>🏆</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: 500 }}>
                ¡Contesta esta encuesta para participar por hasta
              </div>
              <div style={{
                fontSize: 52, fontWeight: 900, lineHeight: 1, marginBottom: 4,
                color: '#C9F31D',
                textShadow: '0 0 40px rgba(201,243,29,0.5)',
                fontFamily: 'var(--font-space-grotesk)',
                letterSpacing: '-0.03em',
              }}>
                $15,000
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 0 }}>
                pesos en premios!
              </div>
            </div>

            <Button variant="ink" fullWidth size="lg" onClick={handleSurveySubmit} disabled={loading}>
              {loading ? 'Enviando código…' : '¡Contestar encuesta! →'}
            </Button>
          </>
        )}

        {/* ════ PASO 3: Código OTP ════ */}
        {step === 'otp' && (
          <>
            <button onClick={() => { setStep('phone'); setError(null); setOtp(''); }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: T.blue, fontSize: 13, padding: '0 0 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
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

            {isNewUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 14 }}>✅</span>
                <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 500 }}>
                  Encuesta completada — al verificar se crea tu cuenta
                </div>
              </div>
            )}

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
              {loading ? 'Verificando…' : isNewUser ? 'Verificar y crear cuenta →' : 'Verificar y entrar →'}
            </Button>

            <button onClick={handleReset} disabled={loading} style={{ background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer', color: T.rose, fontSize: 13, fontWeight: 600, padding: '4px 0', textAlign: 'center', display: 'block', width: '100%' }}>
              🔄 Reiniciar proceso
            </button>
            <div style={{ fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 4 }}>
              Úsalo si el número era incorrecto o el SMS no llegó
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.border}`, textAlign: 'center' }}>
              <button
                onClick={() => { setUserPass(''); setError(null); setStep('password'); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.slate, fontSize: 12, textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                ¿No te llegó el código? Entrar con contraseña
              </button>
            </div>
          </>
        )}

        {/* ════ PASO: Contraseña ════ */}
        {step === 'password' && (
          <>
            <button onClick={() => { setStep('otp'); setError(null); }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: T.blue, fontSize: 13, padding: '0 0 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Volver al código SMS
            </button>

            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(163,230,53,0.1)', border: '1.5px solid rgba(163,230,53,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              🔑
            </div>

            <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Entrar con contraseña</div>
            <div style={{ fontSize: 13, color: T.slate, marginBottom: 22, lineHeight: 1.5 }}>
              Número: <span style={{ fontWeight: 700, color: T.ink }}>+52 {fmtPhone(phone.replace(/\D/g, ''))}</span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showUserPass ? 'text' : 'password'}
                  inputMode="text"
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  value={userPass}
                  onChange={e => { setUserPass(e.target.value); setError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                  disabled={loading}
                  style={{ ...inputStyle, paddingRight: 46 }}
                  onFocus={e => e.currentTarget.style.borderColor = T.blue}
                  onBlur={e => e.currentTarget.style.borderColor = T.border}
                />
                <EyeBtn show={showUserPass} onToggle={() => setShowUserPass(v => !v)}/>
              </div>
            </div>

            {error && <ErrorBox msg={error}/>}

            <Button variant="ink" fullWidth onClick={handlePasswordLogin} size="lg" style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Verificando…' : 'Entrar →'}
            </Button>
          </>
        )}

        {/* ════ Admin: correo + contraseña ════ */}
        {step === 'admin-login' && (
          <>
            <button onClick={() => { setStep('phone'); setError(null); }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: T.blue, fontSize: 13, padding: '0 0 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Volver
            </button>

            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(244,63,94,0.1)', border: '1.5px solid rgba(244,63,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>

            <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Acceso Admin</div>
            <div style={{ fontSize: 13, color: T.slate, marginBottom: 22 }}>Inicio de sesión con correo y contraseña</div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Correo electrónico</label>
              <input type="email" placeholder="admin@correo.com" value={adminEmail}
                onChange={e => { setAdminEmail(e.target.value); setError(null); }}
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                disabled={loading} style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = T.blue}
                onBlur={e => e.currentTarget.style.borderColor = T.border}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input type={showAdminPass ? 'text' : 'password'} placeholder="••••••••" value={adminPass}
                  onChange={e => { setAdminPass(e.target.value); setError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                  disabled={loading} style={{ ...inputStyle, paddingRight: 46 }}
                  onFocus={e => e.currentTarget.style.borderColor = T.blue}
                  onBlur={e => e.currentTarget.style.borderColor = T.border}
                />
                <EyeBtn show={showAdminPass} onToggle={() => setShowAdminPass(v => !v)}/>
              </div>
            </div>

            {error && <ErrorBox msg={error}/>}

            <Button variant="ink" fullWidth onClick={handleAdminLogin} size="lg" style={{ opacity: loading ? 0.7 : 1 }}>
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
