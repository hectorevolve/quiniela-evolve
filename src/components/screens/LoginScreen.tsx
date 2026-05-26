'use client';
import { useState, useRef } from 'react';
import { theme as T } from '@/lib/theme';
import { Button, Pill } from '@/components/ui';
import { EvolveLogo, QELockup, ChevronMotif } from '@/components/brand/EvolveMark';
import { FallingBall } from '@/components/ball/SoccerBall';
import { supabase, normalizePhone, type AppUser } from '@/lib/supabase';
import { getProfile } from '@/lib/db';
import { syncPredictionsFromDB, syncBonusFromDB } from '@/lib/predictions';

interface Props {
  onLogin: (user: AppUser) => void;
  blocked?: boolean;
}

// Days until WC 2026 kick-off
const WC_START = new Date('2026-06-11T00:00:00');
function daysUntilWC(): number {
  const diff = WC_START.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

type Step = 'phone' | 'otp' | 'admin';

export function LoginScreen({ onLogin, blocked = false }: Props) {
  const [step, setStep]         = useState<Step>('phone');
  const [phone, setPhone]       = useState('');
  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [resent, setResent]     = useState(false);

  // Admin fallback
  const [adminEmail, setAdminEmail]   = useState('');
  const [adminPass, setAdminPass]     = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // ── Normalize phone display (add spaces for readability) ─────────────────
  function formatPhoneDisplay(raw: string) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length <= 2)  return digits;
    if (digits.length <= 6)  return `${digits.slice(0,2)} ${digits.slice(2)}`;
    if (digits.length <= 10) return `${digits.slice(0,2)} ${digits.slice(2,6)} ${digits.slice(6)}`;
    return digits; // let them type more, normalizePhone handles it
  }

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    const raw = phone.trim();
    if (!raw) { setError('Ingresa tu número de celular.'); return; }
    const normalized = normalizePhone(raw);
    if (normalized.length < 13) { setError('Número inválido. Debe tener 10 dígitos.'); return; }

    setLoading(true);
    setError(null);
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({ phone: normalized });
      if (otpErr) {
        // Supabase returns this when signups disabled and phone not found
        if (otpErr.message.toLowerCase().includes('signup') ||
            otpErr.message.toLowerCase().includes('not allowed') ||
            otpErr.message.toLowerCase().includes('disabled')) {
          setError('Este número no está registrado. Contacta al administrador.');
        } else {
          setError('No pudimos enviar el código. Inténtalo de nuevo.');
        }
        return;
      }
      setStep('otp');
      setOtp('');
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length < 6) { setError('El código tiene 6 dígitos.'); return; }
    const normalized = normalizePhone(phone.trim());
    setLoading(true);
    setError(null);
    try {
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        phone: normalized,
        token: otp.trim(),
        type: 'sms',
      });
      if (verifyErr || !data.user) {
        setError('Código incorrecto o expirado. Inténtalo de nuevo.');
        return;
      }
      const profile = await getProfile(data.user.id);
      if (!profile) {
        setError('No se encontró tu perfil. Contacta al administrador.');
        return;
      }
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

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resent) return;
    const normalized = normalizePhone(phone.trim());
    await supabase.auth.signInWithOtp({ phone: normalized });
    setResent(true);
    setTimeout(() => setResent(false), 30000);
  };

  // ── Admin email/password login ────────────────────────────────────────────
  const handleAdminLogin = async () => {
    if (!adminEmail.trim() || !adminPass.trim()) {
      setError('Ingresa correo y contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: adminEmail.trim().toLowerCase(),
        password: adminPass,
      });
      if (authError) { setError('Correo o contraseña incorrectos.'); return; }
      const profile = await getProfile(data.user.id);
      if (!profile) { setError('No se encontró tu perfil.'); return; }
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

  // ── Blocked screen ────────────────────────────────────────────────────────
  if (blocked) {
    return (
      <div style={{ height: '100%', background: T.bgInk, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <div className="evo-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.4 }}/>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, position: 'relative', zIndex: 1, textAlign: 'center', gap: 20 }}>
          <EvolveLogo size={36} mode="light"/>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: T.bgInkRaised, border: `1px solid ${T.borderInk}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={T.rose} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
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

  // ── Common input style ────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 52, padding: '0 16px',
    border: `1.5px solid ${T.border}`, borderRadius: 14,
    fontSize: 16, color: T.ink, background: '#fff',
    outline: 'none', transition: 'border-color 150ms',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* Hero */}
      <div style={{
        height: '38%', minHeight: 210,
        background: T.bgInk,
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12,
      }}>
        <div className="evo-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.5 }}/>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 260, height: 260, background: 'radial-gradient(circle, rgba(26,175,255,0.25) 0%, transparent 65%)', filter: 'blur(16px)', pointerEvents: 'none' }}/>
        <ChevronMotif size={180} opacity={0.06} style={{ position: 'absolute', top: -20, right: -30, pointerEvents: 'none' }}/>
        <ChevronMotif size={100} opacity={0.04} style={{ position: 'absolute', bottom: -10, left: -20, pointerEvents: 'none' }}/>
        <FallingBall size={52} delay={0}   duration={4.5} x="22%"  glow />
        <FallingBall size={36} delay={1.2} duration={5.5} x="68%"  />
        <FallingBall size={28} delay={2.4} duration={4.0} x="50%"  />
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
        padding: '28px 24px 32px', marginTop: -20,
        boxShadow: '0 -8px 32px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>

        {/* ── ADMIN email/password ── */}
        {step === 'admin' && (
          <>
            <button
              onClick={() => { setStep('phone'); setError(null); }}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: T.blue, fontSize: 13, padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              ← Volver
            </button>
            <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Acceso admin</div>
            <div style={{ fontSize: 14, color: T.slate, marginBottom: 24 }}>Ingresa con tu correo y contraseña</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.slate, letterSpacing: 0.3, display: 'block', marginBottom: 6 }}>Correo electrónico</label>
              <input type="email" placeholder="admin@correo.com" value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                disabled={loading} style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = T.blue}
                onBlur={e => e.currentTarget.style.borderColor = T.border}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.slate, letterSpacing: 0.3, display: 'block', marginBottom: 6 }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input type={showAdminPass ? 'text' : 'password'} placeholder="••••••••" value={adminPass}
                  onChange={e => setAdminPass(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                  disabled={loading} style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={e => e.currentTarget.style.borderColor = T.blue}
                  onBlur={e => e.currentTarget.style.borderColor = T.border}
                />
                <button onClick={() => setShowAdminPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.muted }}>
                  {showAdminPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <ErrorBox msg={error} />}

            <Button variant="ink" fullWidth onClick={handleAdminLogin} size="lg" style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Ingresando…' : 'Entrar como admin'}
            </Button>
          </>
        )}

        {/* ── STEP 1: Phone ── */}
        {step === 'phone' && (
          <>
            <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 6, letterSpacing: '-0.02em' }}>Bienvenido</div>
            <div style={{ fontSize: 14, color: T.slate, marginBottom: 28, lineHeight: 1.5 }}>
              Ingresa tu número de celular para recibir un código de acceso
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.slate, letterSpacing: 0.3, display: 'block', marginBottom: 8 }}>
                Número de celular
              </label>
              {/* Phone input with +52 prefix */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  height: 52, padding: '0 12px',
                  border: `1.5px solid ${T.border}`, borderRadius: 14,
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#F8FAFC', flexShrink: 0, fontSize: 15, color: T.slate,
                  fontWeight: 600,
                }}>
                  🇲🇽 +52
                </div>
                <input
                  type="tel"
                  placeholder="81 1234 5678"
                  value={phone}
                  onChange={e => {
                    // Only allow digits and spaces
                    const clean = e.target.value.replace(/[^\d\s]/g, '');
                    setPhone(clean);
                    setError(null);
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  disabled={loading}
                  inputMode="numeric"
                  maxLength={14}
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => e.currentTarget.style.borderColor = T.blue}
                  onBlur={e => e.currentTarget.style.borderColor = T.border}
                />
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
                Sin código de país — solo tus 10 dígitos
              </div>
            </div>

            {error && <ErrorBox msg={error} />}

            <Button
              variant="ink" fullWidth onClick={handleSendOtp} size="lg"
              style={{ opacity: loading ? 0.7 : 1, marginBottom: 16 }}
            >
              {loading ? 'Enviando…' : 'Enviar código SMS →'}
            </Button>

            {/* Admin fallback link */}
            <button
              onClick={() => { setStep('admin'); setError(null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 12, padding: '4px 0', textAlign: 'center' }}
            >
              Acceso administrativo
            </button>
          </>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === 'otp' && (
          <>
            <button
              onClick={() => { setStep('phone'); setError(null); setOtp(''); }}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: T.blue, fontSize: 13, padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              ← Cambiar número
            </button>

            {/* SMS icon */}
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(26,175,255,0.1)', border: `1.5px solid rgba(26,175,255,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>

            <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Código enviado</div>
            <div style={{ fontSize: 14, color: T.slate, marginBottom: 28, lineHeight: 1.5 }}>
              Ingresa el código de 6 dígitos que te enviamos al{' '}
              <span style={{ fontWeight: 600, color: T.ink }}>+52 {phone.replace(/\D/g, '').replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3')}</span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.slate, letterSpacing: 0.3, display: 'block', marginBottom: 8 }}>
                Código de verificación
              </label>
              <input
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={otp}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(val);
                  setError(null);
                }}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                disabled={loading}
                maxLength={6}
                style={{
                  ...inputStyle,
                  fontSize: 28, fontWeight: 700, letterSpacing: 12,
                  textAlign: 'center', fontFamily: 'var(--font-jetbrains-mono)',
                }}
                onFocus={e => e.currentTarget.style.borderColor = T.blue}
                onBlur={e => e.currentTarget.style.borderColor = T.border}
              />
            </div>

            {error && <ErrorBox msg={error} />}

            <Button
              variant="ink" fullWidth onClick={handleVerifyOtp} size="lg"
              style={{ opacity: loading ? 0.7 : 1, marginBottom: 16 }}
            >
              {loading ? 'Verificando…' : 'Verificar y entrar'}
            </Button>

            {/* Resend */}
            <button
              onClick={handleResend}
              disabled={resent}
              style={{ background: 'none', border: 'none', cursor: resent ? 'default' : 'pointer', color: resent ? T.muted : T.blue, fontSize: 13, padding: '4px 0', textAlign: 'center' }}
            >
              {resent ? '✓ Código reenviado' : '¿No llegó? Reenviar código'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      marginBottom: 14, padding: '10px 14px',
      background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
      fontSize: 13, color: '#DC2626', lineHeight: 1.4,
    }}>
      {msg}
    </div>
  );
}
