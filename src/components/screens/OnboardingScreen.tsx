'use client';
import { useState } from 'react';
import { theme as T } from '@/lib/theme';
import { Button } from '@/components/ui';
import { EvolveMark } from '@/components/brand/EvolveMark';

interface Props { onDone: () => void }

const SLIDES = [
  {
    icon: (
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="12,7 16,10 14.5,14.5 9.5,14.5 8,10" fill="currentColor" stroke="none"/>
        <line x1="12" y1="7" x2="12" y2="3.5"/>
        <line x1="16" y1="10" x2="19.5" y2="8.5"/>
        <line x1="14.5" y1="14.5" x2="17" y2="18"/>
        <line x1="9.5" y1="14.5" x2="7" y2="18"/>
        <line x1="8" y1="10" x2="4.5" y2="8.5"/>
      </svg>
    ),
    color: T.blue,
    title: '¡Bienvenido a Quiniela Evolve!',
    text: 'La quiniela de fútbol del programa de lealtad Evolve. Compite con tu mayorista y gana premios reales.',
  },
  {
    icon: (
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="22" y1="12" x2="18" y2="12"/>
        <line x1="6" y1="12" x2="2" y2="12"/>
        <line x1="12" y1="6" x2="12" y2="2"/>
        <line x1="12" y1="22" x2="12" y2="18"/>
        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
      </svg>
    ),
    color: T.lime,
    title: 'Predice resultados',
    text: 'Ingresa tus marcadores para los partidos del Torneo 2026 y gana puntos por precisión. ¡El marcador exacto vale el doble!',
  },
  {
    icon: (
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
      </svg>
    ),
    color: T.amber,
    title: 'Escala en los rankings',
    text: 'Compite con tu mayorista y a nivel nacional. Mira cómo te ubicas frente a los 3,347 vendedores participantes.',
  },
  {
    icon: (
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    color: T.blue,
    title: 'Activa Superpoderes',
    text: 'Usa Puntos Dobles, Cambio Tardío y Espía para ganar ventaja. Cada poder solo se puede usar UNA VEZ en todo el torneo.',
  },
  {
    icon: (
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 12 20 22 4 22 4 12"/>
        <rect x="2" y="7" width="20" height="5"/>
        <line x1="12" y1="22" x2="12" y2="7"/>
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
      </svg>
    ),
    color: T.lime,
    title: 'Canjea premios',
    text: 'Convierte tus puntos en jerseys, balones, electrónicos y más. Los mejores vendedores ganan hasta $15,000.',
    last: true,
  },
];

export function OnboardingScreen({ onDone }: Props) {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      {/* Skip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 0' }}>
        <EvolveMark size={28} color={T.blue}/>
        <button onClick={onDone} style={{ background: 'none', border: 'none', fontSize: 13, color: T.muted, cursor: 'pointer', fontWeight: 600 }}>Saltar</button>
      </div>

      {/* Content */}
      <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 32px', textAlign: 'center', animation: 'evo-fade-in 300ms ease both' }}>
        <div style={{
          width: 120, height: 120, borderRadius: '50%',
          background: `${slide.color}18`,
          border: `2px solid ${slide.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: slide.color, marginBottom: 28,
        }}>
          {slide.icon}
        </div>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 12, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {slide.title}
        </div>
        <div style={{ fontSize: 14, color: T.slate, lineHeight: 1.65, maxWidth: 280 }}>{slide.text}</div>
      </div>

      {/* Pagination + nav */}
      <div style={{ padding: '0 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {SLIDES.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)} style={{
              width: i === idx ? 24 : 8, height: 8, borderRadius: 4,
              background: i === idx ? T.ink : T.border,
              cursor: 'pointer', transition: 'all 250ms ease',
            }}/>
          ))}
        </div>
        {isLast ? (
          <Button variant="lime" fullWidth size="lg" onClick={onDone}>¡Vamos a jugar!</Button>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} style={{ background: 'none', border: 'none', fontSize: 13, color: idx === 0 ? 'transparent' : T.muted, cursor: idx === 0 ? 'default' : 'pointer', fontWeight: 600 }}>Anterior</button>
            <button onClick={() => setIdx(i => Math.min(SLIDES.length - 1, i + 1))} style={{ background: 'none', border: 'none', fontSize: 13, color: T.ink, cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2 }}>Siguiente</button>
          </div>
        )}
      </div>
    </div>
  );
}
