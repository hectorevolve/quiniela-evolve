'use client';
import React, { useState, useEffect } from 'react';
import { theme as T } from '@/lib/theme';

// ──────── Header ────────
export function Header({
  title, subtitle, onBack, right, dark = false,
}: {
  title: React.ReactNode; subtitle?: string; onBack?: () => void;
  right?: React.ReactNode; dark?: boolean;
}) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: dark ? T.bgInkSoft : '#fff',
      color: dark ? T.textOnInk : T.ink,
      borderBottom: `1px solid ${dark ? T.borderInk : T.border}`,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ height: 56, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack && (
          <button onClick={onBack} aria-label="Volver" style={{
            width: 36, height: 36, border: 'none',
            background: dark ? 'rgba(255,255,255,0.06)' : T.bgSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', borderRadius: 10, color: 'currentColor', padding: 0,
            transition: 'background 150ms', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-display" style={{
            fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 11, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.55)' : T.muted, marginTop: 2, letterSpacing: 0.2 }}>{subtitle}</div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
      </div>
    </div>
  );
}

// ──────── Avatar ────────
export function Avatar({
  initials = 'JP', size = 36, ring, color, textColor = '#fff', onClick, style,
}: {
  initials?: string; size?: number; ring?: string; color?: string;
  textColor?: string; onClick?: () => void; style?: React.CSSProperties;
}) {
  const bg = color ?? `linear-gradient(135deg, ${T.blue} 0%, ${T.blueDeep} 100%)`;
  return (
    <div onClick={onClick} style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: textColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
      letterSpacing: '-0.02em',
      boxShadow: ring ? `0 0 0 2px ${ring}, 0 0 0 4px #fff` : T.shadowSm,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{initials}</div>
  );
}

// ──────── Button ────────
type ButtonVariant = 'primary' | 'ink' | 'soft' | 'outline' | 'outlineBlue' | 'outlineWhite' | 'ghost' | 'danger' | 'lime';
type ButtonSize = 'sm' | 'md' | 'lg';

const PALETTES: Record<ButtonVariant, { bg: string; color: string; border: string; shadow: string; hover: string }> = {
  primary:      { bg: T.blue,    color: '#fff',       border: T.blue,    shadow: T.shadowBlue,                              hover: T.blueHover },
  ink:          { bg: T.ink,     color: '#fff',       border: T.ink,     shadow: T.shadowMd,                                hover: T.inkSoft },
  soft:         { bg: T.blueSoft,color: T.blueDeep,   border: T.blueSoft,shadow: 'none',                                    hover: '#D9EFFF' },
  outline:      { bg: 'transparent', color: T.ink,    border: T.border,  shadow: 'none',                                    hover: T.bgSoft },
  outlineBlue:  { bg: 'transparent', color: T.blueDeep, border: T.blueDeep, shadow: 'none',                                hover: T.blueSoft },
  outlineWhite: { bg: 'transparent', color: '#fff',   border: 'rgba(255,255,255,0.35)', shadow: 'none',                     hover: 'rgba(255,255,255,0.08)' },
  ghost:        { bg: 'transparent', color: T.ink,    border: 'transparent', shadow: 'none',                                hover: T.bgSoft },
  danger:       { bg: T.rose,    color: '#fff',       border: T.rose,    shadow: '0 8px 20px rgba(244,63,94,0.30)',          hover: '#FB7185' },
  lime:         { bg: T.lime,    color: T.ink,        border: T.lime,    shadow: '0 8px 20px rgba(163,230,53,0.30)',         hover: '#BEF264' },
};

const SIZES: Record<ButtonSize, { padding: string; fontSize: number; height: number }> = {
  sm: { padding: '8px 14px',  fontSize: 13, height: 36 },
  md: { padding: '0 18px',    fontSize: 14, height: 44 },
  lg: { padding: '0 24px',    fontSize: 15, height: 52 },
};

export function Button({
  variant = 'primary', children, onClick, fullWidth = false,
  size = 'md', disabled, style, ...rest
}: {
  variant?: ButtonVariant; children: React.ReactNode; onClick?: () => void;
  fullWidth?: boolean; size?: ButtonSize; disabled?: boolean;
  style?: React.CSSProperties; [key: string]: unknown;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const p = PALETTES[variant];
  const s = SIZES[size];
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)}
      style={{
        background: disabled ? T.bgSoft : (hovered ? p.hover : p.bg),
        color: disabled ? T.muted : p.color,
        border: `1.5px solid ${disabled ? T.border : p.border}`,
        borderRadius: 12, fontWeight: 600, letterSpacing: '-0.01em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : 'auto',
        boxShadow: disabled ? 'none' : p.shadow,
        transition: 'all 150ms ease',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transform: pressed ? 'translateY(1px)' : 'none',
        ...s, ...style,
      }} {...rest}>{children}</button>
  );
}

// ──────── Pill ────────
export function Pill({
  children, color, textColor, style, size = 'md',
}: {
  children: React.ReactNode; color?: string; textColor?: string;
  style?: React.CSSProperties; size?: 'sm' | 'md' | 'lg';
}) {
  const sz = { sm: { padding: '3px 9px', fontSize: 10.5 }, md: { padding: '4px 11px', fontSize: 11.5 }, lg: { padding: '6px 14px', fontSize: 12.5 } }[size];
  return (
    <span style={{
      background: color ?? T.blueSoft, color: textColor ?? T.blueDeep,
      ...sz, borderRadius: 999, fontWeight: 600, letterSpacing: 0.2,
      display: 'inline-block', whiteSpace: 'nowrap', ...style,
    }}>{children}</span>
  );
}

// ──────── Chip ────────
export function Chip({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: active ? T.ink : '#fff',
      color: active ? '#fff' : T.slate,
      border: active ? `1.5px solid ${T.ink}` : `1.5px solid ${T.border}`,
      padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
      letterSpacing: 0.1, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
      transition: 'all 150ms ease', boxShadow: active ? T.shadowSm : 'none',
    }}>{children}</button>
  );
}

// ──────── LiveDot ────────
export function LiveDot({ label, color }: { label: string; color?: string }) {
  const c = color ?? T.blue;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px 4px 8px', background: 'rgba(255,255,255,0.06)',
      borderRadius: 999, border: `1px solid ${c}`,
      fontSize: 10.5, fontWeight: 600, color: c, letterSpacing: 0.3,
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%', background: c,
        animation: 'evo-pulse 1.4s ease-in-out infinite',
        boxShadow: `0 0 6px ${c}`,
      }}/>
      {label}
    </div>
  );
}

// ──────── Card ────────
export function Card({
  accent, children, style, onClick, dark = false,
}: {
  accent?: string; children: React.ReactNode; style?: React.CSSProperties;
  onClick?: () => void; dark?: boolean;
}) {
  return (
    <div onClick={onClick} style={{
      background: dark ? T.bgInkSoft : '#fff',
      color: dark ? T.textOnInk : T.ink,
      borderRadius: 16, padding: 18,
      border: dark ? `1px solid ${T.borderInk}` : `1px solid ${T.border}`,
      boxShadow: dark ? 'none' : T.shadowSm,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 200ms ease, box-shadow 200ms ease',
      position: 'relative', overflow: 'hidden',
      ...style,
    }}>
      {accent && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent }}/>}
      {children}
    </div>
  );
}

// ──────── ScoreBox ────────
export function ScoreBox({
  value, focused, onFocus,
}: {
  value?: number | null; focused?: boolean; onFocus?: () => void;
}) {
  return (
    <div onClick={onFocus} style={{
      width: 56, height: 64, borderRadius: 12,
      border: focused ? `2px solid ${T.blue}` : `1.5px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
      fontSize: 32, fontWeight: 700, color: T.ink,
      background: focused ? T.blueTint : '#fff',
      cursor: 'pointer', transition: 'all 150ms', userSelect: 'none',
      transform: focused ? 'scale(1.04)' : 'scale(1)',
      boxShadow: focused ? `0 0 0 4px ${T.blueSoft}, ${T.shadowMd}` : T.shadowSm,
      lineHeight: 1,
    }}>{value != null ? value : <span style={{ color: T.textWeak }}>–</span>}</div>
  );
}

// ──────── PowerIcon ────────
const POWERS = {
  double: { label: 'Puntos Dobles', icon: 'x2',    color: T.amber,   bg: T.amberSoft,   stroke: T.amberDeep },
  late:   { label: 'Cambio Tardío', icon: 'clock', color: T.blue,    bg: T.blueSoft,    stroke: T.blueDeep },
  spy:    { label: 'Espía',         icon: 'eye',   color: T.lime,    bg: T.limeSoft,    stroke: T.limeDeep },
};

export function PowerIcon({
  kind, size = 44, used = false, onClick, label = false,
}: {
  kind: 'double' | 'late' | 'spy'; size?: number; used?: boolean;
  onClick?: () => void; label?: boolean;
}) {
  const p = POWERS[kind];
  const body = (
    <div onClick={used ? undefined : onClick} style={{
      width: size, height: size, borderRadius: 12,
      border: `1.5px solid ${used ? T.border : p.color}`,
      background: used ? T.bgSoft : p.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: used ? 'default' : (onClick ? 'pointer' : 'default'),
      opacity: used ? 0.45 : 1, position: 'relative',
      transition: 'transform 120ms', boxShadow: used ? 'none' : T.shadowSm,
    }}>
      {p.icon === 'x2' && (
        <span className="font-display" style={{ fontSize: size * 0.42, fontWeight: 700, color: p.stroke, letterSpacing: -1, fontStyle: 'italic' }}>×2</span>
      )}
      {p.icon === 'clock' && (
        <svg width={size*0.52} height={size*0.52} viewBox="0 0 24 24" fill="none" stroke={p.stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
        </svg>
      )}
      {p.icon === 'eye' && (
        <svg width={size*0.55} height={size*0.55} viewBox="0 0 24 24" fill="none" stroke={p.stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
      {used && (
        <div style={{
          position: 'absolute', top: -6, right: -6, width: 18, height: 18,
          background: T.emerald, borderRadius: '50%', display: 'flex',
          alignItems: 'center', justifyContent: 'center', border: '2px solid #fff',
        }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      )}
    </div>
  );
  if (!label) return body;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {body}
      <span style={{ fontSize: 10.5, fontWeight: 600, color: T.slate, textAlign: 'center', lineHeight: 1.2 }}>{p.label}</span>
    </div>
  );
}

// ──────── FAB ────────
export function FAB({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      position: 'absolute', bottom: 24, right: 18, width: 56, height: 56,
      borderRadius: '50%',
      background: `linear-gradient(135deg, ${T.blue} 0%, ${T.blueDeep} 100%)`,
      border: 'none',
      boxShadow: '0 10px 28px rgba(26,175,255,0.45), 0 4px 8px rgba(0,0,0,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', zIndex: 5,
      animation: 'evo-pulse-ring 2.4s ease-out infinite',
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    </button>
  );
}

// ──────── Toast ────────
export function Toast({ message, color, textColor = '#fff', visible }: {
  message: string; color?: string; textColor?: string; visible: boolean;
}) {
  return (
    <div style={{
      position: 'absolute', top: visible ? 16 : -80, left: 16, right: 16,
      minHeight: 48, padding: '12px 18px',
      background: color ?? T.ink, color: textColor,
      borderRadius: 14, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontWeight: 600, fontSize: 13.5, gap: 8,
      letterSpacing: '-0.01em',
      transition: 'top 320ms cubic-bezier(0.32, 0.72, 0, 1)',
      boxShadow: T.shadowXl, zIndex: 500, textAlign: 'center',
      border: `1px solid ${!color || color === T.ink ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
    }}>{message}</div>
  );
}

// ──────── BottomSheet ────────
export function BottomSheet({
  open, onClose, title, children, maxHeight = '75%',
}: {
  open: boolean; onClose: () => void; title?: string;
  children: React.ReactNode; maxHeight?: string;
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: open ? 'auto' : 'none', zIndex: 200 }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(10, 20, 36, 0.55)', backdropFilter: 'blur(4px)',
        opacity: open ? 1 : 0, transition: 'opacity 250ms ease',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#fff', borderRadius: '24px 24px 0 0',
        maxHeight, display: 'flex', flexDirection: 'column',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 360ms cubic-bezier(0.32, 0.72, 0, 1)',
        boxShadow: '0 -16px 48px rgba(0,0,0,0.18)',
        border: `1px solid ${T.border}`, borderBottom: 'none',
      }}>
        <div style={{ width: 38, height: 4, background: T.border, borderRadius: 3, margin: '10px auto 4px' }}/>
        {title && (
          <div style={{
            padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: `1px solid ${T.borderSoft}`,
          }}>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>{title}</div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 8, border: 'none',
              background: T.bgSoft, color: T.slate, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 16px' }}>{children}</div>
      </div>
    </div>
  );
}

// ──────── Modal ────────
export function Modal({
  open, onClose, children,
}: {
  open: boolean; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: open ? 'auto' : 'none', zIndex: 300 }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(10,20,36,0.70)', backdropFilter: 'blur(6px)',
        opacity: open ? 1 : 0, transition: 'opacity 250ms ease',
      }}/>
      <div style={{
        position: 'absolute', inset: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: '#fff', borderRadius: 24, padding: '28px 24px',
          width: '100%', maxWidth: 360,
          transform: open ? 'scale(1)' : 'scale(0.94)',
          opacity: open ? 1 : 0,
          transition: 'transform 300ms cubic-bezier(0.22,1,0.36,1), opacity 250ms ease',
          boxShadow: T.shadowXl,
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ──────── Eyebrow ────────
export function Eyebrow({ children, color, style }: { children: React.ReactNode; color?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 600, color: color ?? T.muted, letterSpacing: 1.4, textTransform: 'uppercase', ...style }}>
      {children}
    </div>
  );
}

// ──────── Phone shell ────────
export function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 392, height: 800, borderRadius: 44,
      background: '#0A0F1A', padding: 8,
      boxShadow: `0 30px 80px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.04) inset, 0 0 60px rgba(26,175,255,0.15)`,
      position: 'relative', zIndex: 2,
    }}>
      <div style={{ position: 'absolute', right: -3, top: 140, width: 3, height: 70, background: '#1a1f2c', borderRadius: 3 }}/>
      <div style={{ position: 'absolute', right: -3, top: 220, width: 3, height: 36, background: '#1a1f2c', borderRadius: 3 }}/>
      <div style={{ width: '100%', height: '100%', borderRadius: 36, overflow: 'hidden', background: '#fff', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#0A0F1A', zIndex: 1000 }}/>
        {/* Status bar */}
        <div style={{
          height: 32, padding: '0 22px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: '#fff', position: 'relative', zIndex: 2,
          fontSize: 13, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em',
        }}>
          <span>9:41</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="10" viewBox="0 0 14 10" fill={T.ink}>
              <rect x="0" y="6" width="2" height="4" rx="0.3"/>
              <rect x="3" y="4" width="2" height="6" rx="0.3"/>
              <rect x="6" y="2" width="2" height="8" rx="0.3"/>
              <rect x="9" y="0" width="2" height="10" rx="0.3"/>
            </svg>
            <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
              <rect x="0.5" y="0.5" width="18" height="9" rx="2" stroke={T.ink}/>
              <rect x="2" y="2" width="14" height="6" rx="1" fill={T.ink}/>
              <rect x="19.5" y="3.5" width="1.5" height="3" rx="0.5" fill={T.ink}/>
            </svg>
          </div>
        </div>
        <div style={{ height: 'calc(100% - 32px - 18px)', overflow: 'hidden', position: 'relative' }}>
          {children}
        </div>
        <div style={{ height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
          <div style={{ width: 100, height: 4, borderRadius: 2, background: T.ink, opacity: 0.7 }}/>
        </div>
      </div>
    </div>
  );
}

// ──────── Preloader ────────
export function Preloader({ visible }: { visible: boolean }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: T.bgInk,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 24,
      opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none',
      transition: 'opacity 300ms ease', zIndex: 9000, overflow: 'hidden',
    }}>
      <div className="evo-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.4 }}/>
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(26,175,255,0.30) 0%, transparent 60%)',
        filter: 'blur(20px)',
      }}/>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <svg viewBox="60 0 245 264" width="96" height="96" aria-hidden="true">
          <g fill={T.blue}>
            <path d="M64.87,133.51L240.97,30.9c1.05-.64,1.04-2.22-.03-2.84L195.55,1.93c-4.5-2.59-10-2.58-14.49.04l-109.94,63.01c-3.86,2.25-6.25,6.47-6.25,11.04v57.48Z"
              style={{ animation: 'evo-fade-in 400ms ease 0ms both' }}/>
            <path d="M64.87,175.88v19.75c0,4.59,2.4,8.84,6.27,11.13l20.5,12.14,105.68-61.96c8.09-4.74,7.83-16.81-.46-21.18l-38.88-20.5-89.74,54.55c-2.1,1.27-3.37,3.57-3.37,6.06"
              style={{ animation: 'evo-fade-in 400ms ease 180ms both' }}/>
            <path d="M123.39,236.41l47.92,28.48c5.12,2.95,11.36,2.93,16.46-.05l104.98-61.29c5.07-2.96,8.21-8.51,8.21-14.51l-.02-53.27c0-1.61-1.71-2.61-3.06-1.81l-174.49,102.44Z"
              style={{ animation: 'evo-fade-in 400ms ease 360ms both' }}/>
          </g>
        </svg>
      </div>
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 2, animation: 'evo-fade-in 500ms ease 400ms both' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)' }}>evolve</div>
        <div style={{ fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,0.45)', marginTop: 10, letterSpacing: 1, textTransform: 'uppercase', animation: 'evo-fade-in 500ms ease 600ms both' }}>
          Quiniela · Torneo 2026
        </div>
      </div>
      <div style={{ width: 80, height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', position: 'relative', zIndex: 2 }}>
        <div style={{ position: 'absolute', top: 0, width: 40, height: '100%', background: T.blue, borderRadius: 2, animation: 'evo-shimmer 1.1s ease-in-out infinite' }}/>
      </div>
    </div>
  );
}

// ──────── MiniLoader ────────
export function MiniLoader() {
  return (
    <div style={{
      position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
      zIndex: 8000, animation: 'evo-fade-in 200ms ease',
      background: 'rgba(15,23,42,0.95)', padding: '6px 14px',
      borderRadius: 999, display: 'flex', alignItems: 'center', gap: 8,
      backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{
        width: 12, height: 12, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.15)', borderTopColor: T.blue,
        animation: 'evo-spin 700ms linear infinite',
      }}/>
      <span style={{ fontSize: 10.5, fontWeight: 500, color: '#fff', letterSpacing: 0.3 }}>Cargando</span>
    </div>
  );
}
