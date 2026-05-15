'use client';
import { useState } from 'react';
import { theme as T } from '@/lib/theme';
import { Button, Pill } from '@/components/ui';
import { EvolveLogo, QELockup, ChevronMotif } from '@/components/brand/EvolveMark';
import { FallingBall } from '@/components/ball/SoccerBall';

interface Props {
  onLogin: () => void;
  blocked?: boolean;
}

export function LoginScreen({ onLogin, blocked = false }: Props) {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

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
          <div style={{ background: T.bgInkRaised, borderRadius: 16, padding: '16px 20px', border: `1px solid ${T.borderInk}`, width: '100%', maxWidth: 320 }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Tu avance — Mayo 2026</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: T.rose, fontFamily: 'var(--font-jetbrains-mono)' }}>75%</span>
              <Pill color={T.roseSoft} textColor={T.rose}>Incompleto</Pill>
            </div>
            <div style={{ height: 6, background: T.bgInk, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: '75%', height: '100%', background: T.rose, borderRadius: 3 }}/>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 260 }}>
            Habla con tu supervisor para más información sobre tu objetivo mensual.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* Hero */}
      <div style={{
        height: '40%', minHeight: 220,
        background: T.bgInk,
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12,
      }}>
        <div className="evo-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.5 }}/>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 260, height: 260, background: 'radial-gradient(circle, rgba(26,175,255,0.25) 0%, transparent 65%)', filter: 'blur(16px)', pointerEvents: 'none' }}/>

        {/* Decorative chevrons */}
        <ChevronMotif size={180} opacity={0.06} style={{ position: 'absolute', top: -20, right: -30, pointerEvents: 'none' }}/>
        <ChevronMotif size={100} opacity={0.04} style={{ position: 'absolute', bottom: -10, left: -20, pointerEvents: 'none' }}/>

        {/* Falling balls */}
        <FallingBall size={52} delay={0}   duration={4.5} x="22%"  glow />
        <FallingBall size={36} delay={1.2} duration={5.5} x="68%"  />
        <FallingBall size={28} delay={2.4} duration={4.0} x="50%"  />

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', animation: 'evo-slide-up 500ms ease 200ms both' }}>
          <QELockup size={32} mode="light" compact/>
        </div>
        <div style={{ position: 'relative', zIndex: 2, animation: 'evo-fade-in 500ms ease 400ms both' }}>
          <Pill color="rgba(26,175,255,0.15)" textColor={T.blue} style={{ border: `1px solid rgba(26,175,255,0.3)` }}>
            Torneo 2026 · 39 días
          </Pill>
        </div>
      </div>

      {/* Login card */}
      <div style={{
        flex: 1, background: '#fff', borderRadius: '24px 24px 0 0',
        padding: '28px 24px 32px', marginTop: -20,
        boxShadow: '0 -8px 32px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', gap: 0,
        overflowY: 'auto',
      }}>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 6, letterSpacing: '-0.02em' }}>Bienvenido</div>
        <div style={{ fontSize: 14, color: T.slate, marginBottom: 24, lineHeight: 1.5 }}>Ingresa con tu cuenta de vendedor para participar</div>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.slate, letterSpacing: 0.3, display: 'block', marginBottom: 6 }}>Correo electrónico</label>
          <input
            type="email" placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%', height: 48, padding: '0 14px',
              border: `1.5px solid ${T.border}`, borderRadius: 12,
              fontSize: 15, color: T.ink, background: '#fff',
              outline: 'none', transition: 'border-color 150ms',
            }}
            onFocus={e => e.currentTarget.style.borderColor = T.blue}
            onBlur={e => e.currentTarget.style.borderColor = T.border}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.slate, letterSpacing: 0.3, display: 'block', marginBottom: 6 }}>Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'} placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)}
              style={{
                width: '100%', height: 48, padding: '0 44px 0 14px',
                border: `1.5px solid ${T.border}`, borderRadius: 12,
                fontSize: 15, color: T.ink, background: '#fff',
                outline: 'none', transition: 'border-color 150ms',
              }}
              onFocus={e => e.currentTarget.style.borderColor = T.blue}
              onBlur={e => e.currentTarget.style.borderColor = T.border}
            />
            <button onClick={() => setShowPass(v => !v)} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: T.muted,
            }}>
              {showPass ? (
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

        <button style={{ alignSelf: 'flex-end', background: 'none', border: 'none', fontSize: 12, color: T.blue, cursor: 'pointer', marginBottom: 20, padding: '4px 0' }}>
          ¿Olvidaste tu contraseña?
        </button>

        <Button variant="ink" fullWidth onClick={onLogin} size="lg" style={{ marginBottom: 14 }}>
          Entrar
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: T.border }}/>
          <span style={{ fontSize: 12, color: T.muted }}>o</span>
          <div style={{ flex: 1, height: 1, background: T.border }}/>
        </div>

        <Button variant="outlineBlue" fullWidth onClick={onLogin} size="lg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          Entrar con Club de Ganadores
        </Button>
      </div>
    </div>
  );
}
