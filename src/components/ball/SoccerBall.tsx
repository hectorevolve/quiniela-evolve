'use client';

interface SoccerBallProps {
  size?: number;
  spinning?: boolean | string;
  glow?: boolean;
  style?: React.CSSProperties;
}

export function SoccerBall({ size = 60, spinning = false, glow = false, style }: SoccerBallProps) {
  const duration = spinning === true ? '1.6s' : (spinning || '1.6s');
  return (
    <img
      src="/soccer-ball.png"
      alt=""
      width={size}
      height={size}
      style={{
        display: 'block',
        userSelect: 'none',
        pointerEvents: 'none',
        animation: spinning ? `evo-ball-spin-tilt ${duration} linear infinite` : 'none',
        filter: glow
          ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.30)) drop-shadow(0 0 18px rgba(26,175,255,0.45))'
          : 'drop-shadow(0 6px 14px rgba(0,0,0,0.25))',
        ...style,
      }}
      draggable={false}
    />
  );
}

interface FallingBallProps {
  size?: number;
  delay?: number;
  duration?: number;
  x?: string;
  glow?: boolean;
  style?: React.CSSProperties;
}

export function FallingBall({ size = 48, delay = 0, duration = 5, x = '50%', glow = false, style }: FallingBallProps) {
  return (
    <div style={{
      position: 'absolute', left: x, top: 0,
      width: size, height: size,
      animation: `evo-ball-fall ${duration}s cubic-bezier(0.5, 0.05, 0.6, 0.2) ${delay}s infinite`,
      pointerEvents: 'none', zIndex: 1,
      ...style,
    }}>
      <SoccerBall size={size} glow={glow} />
    </div>
  );
}

export function BallIcon({ size = 14, color = '#0F172A', style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      style={{ display: 'inline-block', flexShrink: 0, ...style }} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#fff" stroke={color} strokeWidth="1.6"/>
      <polygon points="12,7 16,10 14.5,14.5 9.5,14.5 8,10" fill={color}/>
      <line x1="12" y1="7" x2="12" y2="3.5" stroke={color} strokeWidth="1.4"/>
      <line x1="16" y1="10" x2="19.5" y2="8.5" stroke={color} strokeWidth="1.4"/>
      <line x1="14.5" y1="14.5" x2="17" y2="18" stroke={color} strokeWidth="1.4"/>
      <line x1="9.5" y1="14.5" x2="7" y2="18" stroke={color} strokeWidth="1.4"/>
      <line x1="8" y1="10" x2="4.5" y2="8.5" stroke={color} strokeWidth="1.4"/>
    </svg>
  );
}
