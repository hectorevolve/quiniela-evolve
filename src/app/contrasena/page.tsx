'use client';
import { useState } from 'react';

/** Format 10-digit phone: "55 2888 5655" */
function fmtPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
}

type Step = 'phone' | 'password' | 'done';

export default function ContrasenaPage() {
  const [step, setStep]           = useState<Step>('phone');
  const [phone, setPhone]         = useState('');
  const [userName, setUserName]   = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [showCfm, setShowCfm]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  /* ── Step 1: verify phone ─────────────────────────────────── */
  const handleCheckPhone = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { setError('El número debe tener 10 dígitos.'); return; }

    // We probe by trying to set a dummy call — instead just validate with a lightweight check
    // We'll do the real check on submit. For now just move to password step with a preflight.
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/set-own-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, checkOnly: true }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; name?: string };

      if (data.error === 'not_found') {
        setError('Este número no está registrado en la quiniela. Contacta al administrador.');
        return;
      }
      if (!res.ok) {
        setError('No pudimos verificar tu número. Inténtalo de nuevo.');
        return;
      }
      if (data.name) setUserName(data.name);
      setStep('password');
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: set password ─────────────────────────────────── */
  const handleSetPassword = async () => {
    if (!password) { setError('Ingresa una contraseña.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }

    const digits = phone.replace(/\D/g, '');
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/set-own-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, password }),
      });
      const data = await res.json() as { ok?: boolean; name?: string; error?: string };

      if (!res.ok || !data.ok) {
        setError('No se pudo guardar la contraseña. Inténtalo de nuevo.');
        return;
      }
      if (data.name) setUserName(data.name);
      setStep('done');
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Styles ───────────────────────────────────────────────── */
  const inp: React.CSSProperties = {
    width: '100%', height: 52, padding: '0 16px',
    border: '1.5px solid #E2E8F0', borderRadius: 14,
    fontSize: 15, color: '#0F172A', background: '#fff',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const inpPad: React.CSSProperties = { ...inp, paddingRight: 48 };
  const lbl: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: '#64748B',
    letterSpacing: 0.3, display: 'block', marginBottom: 6,
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Hero */}
      <div style={{
        background: '#050B17', padding: '48px 24px 64px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 300, height: 300, background: 'radial-gradient(circle, rgba(26,175,255,0.18) 0%, transparent 65%)', filter: 'blur(20px)', pointerEvents: 'none' }}/>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
            Quiniela Evolve · Torneo 2026
          </div>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Crear contraseña
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: 0, maxWidth: 280 }}>
            {step === 'phone'    && 'Ingresa tu número para verificar que estás registrado'}
            {step === 'password' && `Hola${userName ? ` ${userName.split(' ')[0]}` : ''}, elige una contraseña para tu cuenta`}
            {step === 'done'     && '¡Tu contraseña quedó guardada!'}
          </p>
        </div>
      </div>

      {/* Card */}
      <div style={{
        flex: 1, background: '#F8FAFC',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '0 16px 40px',
      }}>
        <div style={{
          background: '#fff', borderRadius: 24, padding: 32,
          width: '100%', maxWidth: 420,
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          marginTop: -24, position: 'relative',
        }}>

          {/* ── STEP: phone ── */}
          {step === 'phone' && (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Número de celular</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ height: 52, padding: '0 12px', border: '1.5px solid #E2E8F0', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 6, background: '#F8FAFC', flexShrink: 0, fontSize: 15, color: '#64748B', fontWeight: 600 }}>
                    🇲🇽 +52
                  </div>
                  <input
                    type="tel" inputMode="numeric" placeholder="55 2888 5655"
                    value={phone}
                    onChange={e => { setPhone(e.target.value.replace(/[^\d\s]/g, '')); setError(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleCheckPhone()}
                    disabled={loading} maxLength={14}
                    style={{ ...inp, flex: 1 }}
                  />
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>Solo tus 10 dígitos — sin código de país</div>
              </div>

              {error && <ErrorBox msg={error}/>}

              <button
                onClick={handleCheckPhone}
                disabled={loading}
                style={{ width: '100%', height: 52, background: loading ? '#CBD5E1' : '#050B17', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Verificando…' : 'Continuar →'}
              </button>

              <div style={{ marginTop: 20, padding: '14px 16px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0284C7', marginBottom: 4 }}>💡 ¿Para qué sirve esto?</div>
                <div style={{ fontSize: 12, color: '#0369A1', lineHeight: 1.5 }}>
                  Si el código SMS no te llega, puedes crear una contraseña para entrar a la quiniela con tu número de celular.
                </div>
              </div>
            </>
          )}

          {/* ── STEP: password ── */}
          {step === 'password' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, padding: '10px 14px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 12 }}>
                <span>✅</span>
                <div style={{ fontSize: 13, color: '#16A34A', fontWeight: 500 }}>
                  Número verificado: <strong>+52 {fmtPhone(phone.replace(/\D/g, ''))}</strong>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Nueva contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
                    disabled={loading}
                    style={inpPad}
                  />
                  <EyeBtn show={showPwd} onToggle={() => setShowPwd(v => !v)}/>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Confirmar contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCfm ? 'text' : 'password'}
                    placeholder="Repite tu contraseña"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
                    disabled={loading}
                    style={{
                      ...inpPad,
                      borderColor: confirm && confirm !== password ? '#FECACA' : '1.5px solid #E2E8F0',
                    }}
                  />
                  <EyeBtn show={showCfm} onToggle={() => setShowCfm(v => !v)}/>
                </div>
                {confirm && confirm !== password && (
                  <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>Las contraseñas no coinciden</div>
                )}
              </div>

              {error && <ErrorBox msg={error}/>}

              <button
                onClick={handleSetPassword}
                disabled={loading}
                style={{ width: '100%', height: 52, background: loading ? '#CBD5E1' : '#050B17', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 12 }}
              >
                {loading ? 'Guardando…' : '🔑 Crear contraseña'}
              </button>

              <button
                onClick={() => { setStep('phone'); setError(null); setPassword(''); setConfirm(''); }}
                style={{ width: '100%', background: 'none', border: 'none', color: '#94A3B8', fontSize: 13, cursor: 'pointer', padding: '6px 0' }}
              >
                ← Cambiar número
              </button>
            </>
          )}

          {/* ── STEP: done ── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                ¡Contraseña creada!
              </div>
              <div style={{ fontSize: 14, color: '#64748B', marginBottom: 28, lineHeight: 1.6 }}>
                Ya puedes entrar a la quiniela con tu número de celular y tu nueva contraseña.
              </div>
              <a
                href="/"
                style={{ display: 'inline-block', padding: '14px 32px', background: '#050B17', borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}
              >
                Ir a la quiniela →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EyeBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} type="button" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
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
