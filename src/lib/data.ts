export const USER = {
  name: 'Juan Pérez',
  email: 'vendedor.decasa@cdg.mx',
  mayorista: 'DECASA',
  region: 'Centro',
  avatar: 'JP',
  points: 124,
  rank: 47,
};

export interface Match {
  id: string;
  group: string;
  home: { code: string; name: string };
  away: { code: string; name: string };
  date: string;
  stadium: string;
  prediction: [number, number] | null;
  lastUpdate: string | null;
}

export const MATCHES: Match[] = [
  {
    id: 'm1', group: 'GRUPO A',
    home: { code: 'MEX', name: 'México' },
    away: { code: 'RSA', name: 'Sudáfrica' },
    date: 'jue. 11 jun. 2026 01:00 pm',
    stadium: 'Estadio Azteca · México',
    prediction: null, lastUpdate: null,
  },
  {
    id: 'm2', group: 'GRUPO A',
    home: { code: 'MEX', name: 'México' },
    away: { code: 'KOR', name: 'R. de Corea' },
    date: 'lun. 15 jun. 2026 04:00 pm',
    stadium: 'Estadio Akron · Guadalajara',
    prediction: null, lastUpdate: null,
  },
  {
    id: 'm3', group: 'GRUPO D',
    home: { code: 'ARG', name: 'Argentina' },
    away: { code: 'ESP', name: 'España' },
    date: 'mar. 16 jun. 2026 02:00 pm',
    stadium: 'BBVA Stadium · Monterrey',
    prediction: [2, 1], lastUpdate: '11/05/2026 11:20',
  },
  {
    id: 'm4', group: 'GRUPO G',
    home: { code: 'BRA', name: 'Brasil' },
    away: { code: 'FRA', name: 'Francia' },
    date: 'jue. 18 jun. 2026 06:00 pm',
    stadium: 'Estadio Azteca · México',
    prediction: null, lastUpdate: null,
  },
];

export const RANKING = [
  { pos: 1, name: 'Prodefy',        country: 'MEX', pts: 318 },
  { pos: 2, name: 'Carzoncabval90', country: 'MEX', pts: 296 },
  { pos: 3, name: 'THE RUDAS',      country: 'VEN', pts: 281 },
  { pos: 4, name: 'pollo',          country: 'COL', pts: 274 },
  { pos: 5, name: 'Blackleo',       country: 'VEN', pts: 263 },
  { pos: 6, name: 'EL_MEXAS',       country: 'MEX', pts: 251 },
  { pos: 7, name: 'patito99',       country: 'MEX', pts: 244 },
  { pos: 8, name: 'lacomadre',      country: 'MEX', pts: 232 },
];

export const GOLEADORES = [
  { name: 'Lionel Messi',      country: 'ARG', role: 'Delantero' },
  { name: 'Kylian Mbappé',     country: 'FRA', role: 'Delantero' },
  { name: 'Erling Haaland',    country: 'NOR', role: 'Delantero' },
  { name: 'Vinicius Jr',       country: 'BRA', role: 'Delantero' },
  { name: 'Jude Bellingham',   country: 'ENG', role: 'Mediocampista' },
  { name: 'Lamine Yamal',      country: 'ESP', role: 'Delantero' },
  { name: 'Harry Kane',        country: 'ENG', role: 'Delantero' },
  { name: 'Cristiano Ronaldo', country: 'POR', role: 'Delantero' },
  { name: 'Lautaro Martínez',  country: 'ARG', role: 'Delantero' },
  { name: 'Julián Álvarez',    country: 'ARG', role: 'Delantero' },
  { name: 'Antoine Griezmann', country: 'FRA', role: 'Mediocampista' },
  { name: 'Bukayo Saka',       country: 'ENG', role: 'Mediocampista' },
  { name: 'Florian Wirtz',     country: 'GER', role: 'Mediocampista' },
  { name: 'Santiago Giménez',  country: 'MEX', role: 'Delantero' },
  { name: 'Raúl Jiménez',      country: 'MEX', role: 'Delantero' },
  { name: 'Hirving Lozano',    country: 'MEX', role: 'Delantero' },
  { name: 'Álvaro Morata',     country: 'ESP', role: 'Delantero' },
  { name: 'Marcus Thuram',     country: 'FRA', role: 'Delantero' },
  { name: 'Rodrygo',           country: 'BRA', role: 'Delantero' },
  { name: 'Endrick',           country: 'BRA', role: 'Delantero' },
];

export const SELECCIONES: [string, string][] = [
  ['ARG','Argentina'], ['AUS','Australia'], ['BEL','Bélgica'], ['BRA','Brasil'],
  ['CAN','Canadá'], ['COL','Colombia'], ['CRC','Costa Rica'], ['CRO','Croacia'],
  ['DEN','Dinamarca'], ['ESP','España'], ['USA','Estados Unidos'], ['FRA','Francia'],
  ['GER','Alemania'], ['GHA','Ghana'], ['ENG','Inglaterra'], ['ITA','Italia'],
  ['JAM','Jamaica'], ['JPN','Japón'], ['MAR','Marruecos'], ['MEX','México'],
  ['NED','Países Bajos'], ['NGA','Nigeria'], ['NOR','Noruega'], ['PAN','Panamá'],
  ['PAR','Paraguay'], ['PER','Perú'], ['POL','Polonia'], ['POR','Portugal'],
  ['RSA','Sudáfrica'], ['SEN','Senegal'], ['SRB','Serbia'], ['SUI','Suiza'],
  ['TUR','Turquía'], ['UKR','Ucrania'], ['URU','Uruguay'], ['VEN','Venezuela'],
  ['KOR','R. de Corea'], ['CZE','Rep. Checa'],
];

export interface Premio {
  id: string; name: string; cost: number; tier: string; img: string;
}
export const PREMIOS: Premio[] = [
  { id: 'p1', name: 'PlayStation 5 + EA FC 25', cost: 15000, tier: 'HERO',         img: 'ps5' },
  { id: 'p2', name: 'Smart TV 55" 4K',           cost: 15000, tier: 'HERO',         img: 'tv' },
  { id: 'p3', name: 'Jersey Selección Authentic', cost: 4000,  tier: 'ASPIRACIONAL', img: 'jersey' },
  { id: 'p4', name: 'Nintendo Switch',            cost: 4000,  tier: 'ASPIRACIONAL', img: 'switch' },
  { id: 'p5', name: 'Audífonos JBL',              cost: 2000,  tier: 'MEDIO',        img: 'jbl' },
  { id: 'p6', name: 'Balón oficial',              cost: 2000,  tier: 'MEDIO',        img: 'ball' },
  { id: 'p7', name: 'Bufanda Selección',          cost: 500,   tier: 'SIMBÓLICO',    img: 'scarf' },
  { id: 'p8', name: 'Gift card $200',             cost: 500,   tier: 'SIMBÓLICO',    img: 'card' },
];

export const CHAT_MESSAGES = [
  { from: 'Carlos M.',  side: 'other' as const, text: '¿Cómo le ven al Vasco?',                          time: '12:30', avatar: 'CM' },
  { from: 'Tú',         side: 'me'    as const, text: 'Yo creo que el Tri saca el triunfo 2-1',           time: '12:32' },
  { from: 'Mariana R.', side: 'other' as const, text: 'Yo le voy a meter 3-0, hoy tenemos toda la magia', time: '12:33', avatar: 'MR' },
  { from: '',           side: 'system' as const,text: '⚽ INICIA EL PARTIDO',                             time: '13:00' },
  { from: 'Roberto S.', side: 'other' as const, text: 'Vamos México!! 🇲🇽🇲🇽🇲🇽',                          time: '13:01', avatar: 'RS' },
  { from: '',           side: 'system' as const,text: '⚽ GOL DE MÉXICO · 23\'',                           time: '13:23' },
  { from: 'Tú',         side: 'me'    as const, text: '¡¡Vaaaamoooos!!',                                  time: '13:23' },
  { from: 'Carlos M.',  side: 'other' as const, text: 'Te lo dije compa, va el 2-1',                      time: '13:24', avatar: 'CM' },
];
