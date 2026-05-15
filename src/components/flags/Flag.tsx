'use client';

const FLAG_MAP: Record<string, string> = {
  ARG: 'ar', AUS: 'au', BEL: 'be', BRA: 'br', CAN: 'ca', CHI: 'cl',
  COL: 'co', CRC: 'cr', CRO: 'hr', DEN: 'dk', EGY: 'eg', ESP: 'es',
  USA: 'us', FRA: 'fr', GHA: 'gh', ENG: 'gb-eng', IRN: 'ir', ITA: 'it',
  JAM: 'jm', JPN: 'jp', KSA: 'sa', MAR: 'ma', MEX: 'mx', NED: 'nl',
  NGA: 'ng', NOR: 'no', NZL: 'nz', PAN: 'pa', PAR: 'py', PER: 'pe',
  POL: 'pl', POR: 'pt', QAT: 'qa', ROU: 'ro', RSA: 'za', SCO: 'gb-sct',
  SEN: 'sn', SRB: 'rs', SUI: 'ch', SWE: 'se', TUR: 'tr', UKR: 'ua',
  URU: 'uy', VEN: 've', KOR: 'kr', GER: 'de', CZE: 'cz', TUN: 'tn',
};

interface FlagProps {
  code: string;
  size?: number;
  ring?: string;
  style?: React.CSSProperties;
}

export function Flag({ code, size = 80, ring, style }: FlagProps) {
  const cdnCode = FLAG_MAP[code] ?? code.toLowerCase();
  const bucket = size <= 20 ? 40 : size <= 40 ? 80 : size <= 80 ? 160 : 320;
  const src = `https://flagcdn.com/w${bucket}/${cdnCode}.png`;

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      overflow: 'hidden', flexShrink: 0,
      boxShadow: ring
        ? `0 0 0 2.5px ${ring}, 0 0 0 4px #fff, 0 1px 3px rgba(0,0,0,0.15)`
        : 'inset 0 0 0 1px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.12)',
      background: '#f3f4f6',
      ...style,
    }}>
      <img
        src={src}
        alt={code}
        width={size}
        height={size}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
}
