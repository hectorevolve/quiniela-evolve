'use client';

export function WorldCupTrophy({ size = 80 }: { size?: number }) {
  return (
    <img
      src="/trophy.png"
      alt="FIFA World Cup"
      width={size}
      height={Math.round(size * 1.4)}
      style={{ objectFit: 'contain', display: 'block' }}
    />
  );
}

// ── Legacy SVG (unused) ────────────────────────────────────────────────────────
function _WorldCupTrophySVG({ size = 80 }: { size?: number }) {
  const h = Math.round(size * 1.4);
  return (
    <svg width={size} height={h} viewBox="0 0 80 112" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wct-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#7A5200"/>
          <stop offset="25%"  stopColor="#C8870A"/>
          <stop offset="48%"  stopColor="#FFD050"/>
          <stop offset="72%"  stopColor="#C8870A"/>
          <stop offset="100%" stopColor="#7A5200"/>
        </linearGradient>
        <linearGradient id="wct-gold-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FFD050"/>
          <stop offset="100%" stopColor="#9A6800"/>
        </linearGradient>
        <linearGradient id="wct-stem" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#5A3C00"/>
          <stop offset="40%"  stopColor="#B07818"/>
          <stop offset="60%"  stopColor="#E8B030"/>
          <stop offset="100%" stopColor="#5A3C00"/>
        </linearGradient>
        <linearGradient id="wct-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2E7D32"/>
          <stop offset="100%" stopColor="#145214"/>
        </linearGradient>
        <linearGradient id="wct-globe" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#1565C0"/>
          <stop offset="100%" stopColor="#0D47A1"/>
        </linearGradient>
        <radialGradient id="wct-cup-shine" cx="38%" cy="30%" r="55%">
          <stop offset="0%"   stopColor="#FFF0A0" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="#FFF0A0" stopOpacity="0"/>
        </radialGradient>
        <filter id="wct-glow">
          <feGaussianBlur stdDeviation="1.2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ── Green malachite base ── */}
      <rect x="8" y="92" width="64" height="18" rx="5" fill="url(#wct-green)"/>
      <rect x="10" y="94" width="60" height="3" rx="1.5" fill="#FFD050" opacity="0.35"/>
      <text x="40" y="105.5" textAnchor="middle" fill="#FFD050"
            fontSize="5.2" fontFamily="Arial, sans-serif" fontWeight="bold" letterSpacing="0.5">
        FIFA WORLD CUP
      </text>

      {/* ── Stem / plinth ── */}
      <path d="M27 92 L27 80 Q27 76 31 76 L49 76 Q53 76 53 80 L53 92 Z"
            fill="url(#wct-stem)"/>
      <rect x="22" y="74" width="36" height="5" rx="2.5" fill="url(#wct-gold)"/>

      {/* ── Main cup body ── */}
      <path d="M10 42 Q7 26 18 16 L28 10 Q40 -1 52 10 L62 16 Q73 26 70 42 L64 74 Q60 78 40 78 Q20 78 16 74 Z"
            fill="url(#wct-gold)"/>
      {/* cup shine overlay */}
      <path d="M10 42 Q7 26 18 16 L28 10 Q40 -1 52 10 L62 16 Q73 26 70 42 L64 74 Q60 78 40 78 Q20 78 16 74 Z"
            fill="url(#wct-cup-shine)"/>
      {/* inner cup highlight line */}
      <path d="M22 44 Q20 31 28 22 L35 16 Q40 8 45 16 L52 22 Q60 31 58 44"
            stroke="#FFE87A" strokeWidth="1" fill="none" opacity="0.5"/>

      {/* ── Globe (Earth) on top ── */}
      <circle cx="40" cy="9" r="10" fill="url(#wct-globe)" filter="url(#wct-glow)"/>
      {/* continents - simplified patches */}
      <ellipse cx="37" cy="7"  rx="5" ry="3.5" fill="#2E7D32" opacity="0.85" transform="rotate(-15 37 7)"/>
      <ellipse cx="45" cy="9"  rx="3" ry="4"   fill="#2E7D32" opacity="0.85" transform="rotate(20 45 9)"/>
      <ellipse cx="36" cy="13" rx="3" ry="2"   fill="#2E7D32" opacity="0.85"/>
      {/* globe shine */}
      <ellipse cx="37" cy="5.5" rx="4" ry="2.5" fill="white" opacity="0.18"/>

      {/* ── Two figures holding the globe ── */}
      {/* left figure */}
      <path d="M28 16 Q23 22 26 14 L31 9 Q33 15 28 16 Z" fill="#C8870A"/>
      <circle cx="29" cy="12" r="2.5" fill="#C8870A"/>
      {/* right figure */}
      <path d="M52 16 Q57 22 54 14 L49 9 Q47 15 52 16 Z" fill="#C8870A"/>
      <circle cx="51" cy="12" r="2.5" fill="#C8870A"/>
    </svg>
  );
}
