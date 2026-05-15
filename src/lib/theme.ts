export const theme = {
  bg:            '#FFFFFF',
  bgSoft:        '#F1F5F9',
  bgSubtle:      '#F8FAFC',
  bgInk:         '#0A1424',
  bgInkSoft:     '#0F1B30',
  bgInkRaised:   '#162640',

  blue:          '#1AAFFF',
  blueHover:     '#3DBBFF',
  blueDeep:      '#0085D4',
  blueDark:      '#005FA0',
  blueSoft:      '#E6F5FF',
  blueTint:      '#F0F8FF',

  ink:           '#0F172A',
  inkSoft:       '#1E293B',
  slate:         '#475569',
  muted:         '#94A3B8',
  textWeak:      '#CBD5E1',
  textOnInk:     '#F8FAFC',
  textOnBlue:    '#FFFFFF',

  border:        '#E2E8F0',
  borderSoft:    '#EEF2F7',
  borderInk:     'rgba(255,255,255,0.08)',
  borderInkSoft: 'rgba(255,255,255,0.04)',

  lime:          '#A3E635',
  limeDeep:      '#65A30D',
  limeSoft:      '#ECFCCB',

  amber:         '#FBBF24',
  amberDeep:     '#D97706',
  amberSoft:     '#FEF3C7',

  rose:          '#F43F5E',
  roseDeep:      '#BE123C',
  roseSoft:      '#FFE4E6',

  emerald:       '#10B981',
  emeraldDeep:   '#047857',
  emeraldSoft:   '#D1FAE5',

  shadowSm:  '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
  shadowMd:  '0 4px 12px rgba(15,23,42,0.06), 0 2px 4px rgba(15,23,42,0.04)',
  shadowLg:  '0 12px 32px rgba(15,23,42,0.10), 0 4px 12px rgba(15,23,42,0.06)',
  shadowXl:  '0 24px 60px rgba(15,23,42,0.16), 0 8px 24px rgba(15,23,42,0.08)',
  shadowBlue:'0 8px 24px rgba(26,175,255,0.32), 0 2px 6px rgba(26,175,255,0.18)',
  shadowInk: '0 12px 36px rgba(10,20,36,0.50)',

  rSm: 8, rMd: 12, rLg: 16, rXl: 20, r2Xl: 24,

  fontDisplay: '"Space Grotesk", "Manrope", system-ui, sans-serif',
  fontBody:    '"Inter", system-ui, -apple-system, sans-serif',
  fontMono:    '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
} as const;

export type Theme = typeof theme;
