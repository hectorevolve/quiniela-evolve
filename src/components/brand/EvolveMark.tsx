'use client';
import { theme as T } from '@/lib/theme';

interface Props {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export function EvolveMark({ size = 40, color, style }: Props) {
  const c = color ?? T.blue;
  return (
    <svg viewBox="60 0 245 264" width={size} height={size}
      style={{ display: 'block', flexShrink: 0, ...style }} aria-hidden="true">
      <g fill={c}>
        <path d="M64.87,133.51L240.97,30.9c1.05-.64,1.04-2.22-.03-2.84L195.55,1.93c-4.5-2.59-10-2.58-14.49.04l-109.94,63.01c-3.86,2.25-6.25,6.47-6.25,11.04v57.48Z"/>
        <path d="M64.87,175.88v19.75c0,4.59,2.4,8.84,6.27,11.13l20.5,12.14,105.68-61.96c8.09-4.74,7.83-16.81-.46-21.18l-38.88-20.5-89.74,54.55c-2.1,1.27-3.37,3.57-3.37,6.06"/>
        <path d="M123.39,236.41l47.92,28.48c5.12,2.95,11.36,2.93,16.46-.05l104.98-61.29c5.07-2.96,8.21-8.51,8.21-14.51l-.02-53.27c0-1.61-1.71-2.61-3.06-1.81l-174.49,102.44Z"/>
      </g>
    </svg>
  );
}

export function EvolveWordmark({ height = 24, color, style }: { height?: number; color?: string; style?: React.CSSProperties }) {
  const c = color ?? T.blue;
  return (
    <svg viewBox="0 0 366 67" height={height}
      style={{ display: 'block', flexShrink: 0, ...style }}
      preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <g fill={c} transform="translate(0, -303.81)">
        <path d="M351.22,331.41v-8.73c0-3.77-1.59-5.66-4.88-5.66h-24.36c-3.29,0-4.88,1.88-4.88,5.66v8.73h34.11ZM346.35,303.81c13.52,0,19.49,6.01,19.49,18.86v19.57h-48.73v8.73c0,3.77,1.59,5.66,4.88,5.66h24.36c3.29,0,4.88-1.89,4.88-5.66v-4.72h14.62v4.72c0,12.86-5.97,18.87-19.49,18.87h-24.36c-13.52,0-19.5-6.01-19.5-18.87v-28.3c0-12.85,5.97-18.86,19.5-18.86h24.36ZM265.26,356.64h1.22l19.49-52.83h15.59l-24.36,66.03h-22.54l-24.36-66.03h15.47l19.49,52.83ZM221.45,353.33c0,2.36.37,3.3,2.44,3.3h12.19v13.21h-12.19c-12.18,0-17.05-4.72-17.05-16.51v-73.11h14.62v73.11ZM185.19,350.98v-28.3c0-3.77-1.58-5.66-4.87-5.66h-24.36c-3.3,0-4.88,1.88-4.88,5.66v28.3c0,3.77,1.58,5.66,4.88,5.66h24.36c3.29,0,4.87-1.89,4.87-5.66M180.32,303.81c13.52,0,19.49,6.01,19.49,18.86v28.3c0,12.86-5.97,18.87-19.49,18.87h-24.36c-13.52,0-19.49-6.01-19.49-18.87v-28.3c0-12.85,5.97-18.86,19.49-18.86h24.36ZM99.24,356.64l-19.49-52.83h-15.48l24.37,66.03h22.53l24.37-66.03h-15.59l-19.49,52.83h-1.22ZM48.73,331.41v-8.73c0-3.77-1.59-5.66-4.88-5.66h-24.36c-3.29,0-4.87,1.88-4.87,5.66v8.73h34.11ZM43.85,303.81c13.52,0,19.49,6.01,19.49,18.86v19.57H14.62v8.73c0,3.77,1.58,5.66,4.87,5.66h24.36c3.29,0,4.88-1.89,4.88-5.66v-4.72h14.62v4.72c0,12.86-5.97,18.87-19.49,18.87h-24.36c-13.52,0-19.49-6.01-19.49-18.87v-28.3c0-12.85,5.97-18.86,19.49-18.86h24.36Z"/>
      </g>
    </svg>
  );
}

export function EvolveLogo({ size = 32, mode = 'dark', mark = true, style }: {
  size?: number; mode?: 'dark' | 'light'; mark?: boolean; style?: React.CSSProperties;
}) {
  const c = mode === 'light' ? '#FFFFFF' : T.blue;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.32, lineHeight: 0, ...style }}>
      {mark && <EvolveMark size={size * 1.05} color={c} />}
      <EvolveWordmark height={size * 0.62} color={c} />
    </div>
  );
}

export function QELockup({ size = 28, mode = 'light', style, compact = false }: {
  size?: number; mode?: 'dark' | 'light'; style?: React.CSSProperties; compact?: boolean;
}) {
  const c = mode === 'light' ? '#FFFFFF' : T.blue;
  const subColor = mode === 'light' ? 'rgba(255,255,255,0.7)' : T.slate;
  if (compact) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, ...style }}>
        <EvolveMark size={size * 1.1} color={c} />
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: size * 0.40, fontWeight: 600, color: subColor, letterSpacing: 0.8, textTransform: 'uppercase' }}>Quiniela</div>
          <EvolveWordmark height={size * 0.62} color={c} style={{ marginTop: 4 }} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, ...style }}>
      <div style={{ fontSize: size * 0.38, fontWeight: 600, color: subColor, letterSpacing: 1.4, textTransform: 'uppercase' }}>Quiniela</div>
      <EvolveLogo size={size} mode={mode} />
    </div>
  );
}

export function ChevronMotif({ size = 100, opacity = 0.08, color = '#1AAFFF', style }: {
  size?: number; opacity?: number; color?: string; style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="60 0 245 264" width={size} height={size} style={style} aria-hidden="true">
      <g fill={color} opacity={opacity}>
        <path d="M64.87,133.51L240.97,30.9c1.05-.64,1.04-2.22-.03-2.84L195.55,1.93c-4.5-2.59-10-2.58-14.49.04l-109.94,63.01c-3.86,2.25-6.25,6.47-6.25,11.04v57.48Z"/>
        <path d="M64.87,175.88v19.75c0,4.59,2.4,8.84,6.27,11.13l20.5,12.14,105.68-61.96c8.09-4.74,7.83-16.81-.46-21.18l-38.88-20.5-89.74,54.55c-2.1,1.27-3.37,3.57-3.37,6.06"/>
        <path d="M123.39,236.41l47.92,28.48c5.12,2.95,11.36,2.93,16.46-.05l104.98-61.29c5.07-2.96,8.21-8.51,8.21-14.51l-.02-53.27c0-1.61-1.71-2.61-3.06-1.81l-174.49,102.44Z"/>
      </g>
    </svg>
  );
}
