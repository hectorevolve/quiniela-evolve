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
  // ── GRUPO A ──
  { id: 'a1', group: 'GRUPO A', home: { code: 'MEX', name: 'México' },        away: { code: 'RSA', name: 'Sudáfrica' },     date: 'jue. 11 jun. 2026 01:00 pm', stadium: 'Estadio Azteca · México',               prediction: null, lastUpdate: null },
  { id: 'a2', group: 'GRUPO A', home: { code: 'KOR', name: 'Corea del Sur' }, away: { code: 'CZE', name: 'Chequia' },        date: 'jue. 11 jun. 2026 08:00 pm', stadium: 'Estadio Akron · México',               prediction: null, lastUpdate: null },
  { id: 'a3', group: 'GRUPO A', home: { code: 'CZE', name: 'Chequia' },       away: { code: 'RSA', name: 'Sudáfrica' },     date: 'jue. 18 jun. 2026 10:00 am', stadium: 'Mercedes-Benz Stadium · EUA',           prediction: null, lastUpdate: null },
  { id: 'a4', group: 'GRUPO A', home: { code: 'MEX', name: 'México' },        away: { code: 'KOR', name: 'Corea del Sur' }, date: 'jue. 18 jun. 2026 07:00 pm', stadium: 'Estadio Akron · México',               prediction: null, lastUpdate: null },
  { id: 'a5', group: 'GRUPO A', home: { code: 'RSA', name: 'Sudáfrica' },     away: { code: 'KOR', name: 'Corea del Sur' }, date: 'mié. 24 jun. 2026 07:00 pm', stadium: 'Hard Rock Stadium · EUA',              prediction: null, lastUpdate: null },
  { id: 'a6', group: 'GRUPO A', home: { code: 'CZE', name: 'Chequia' },       away: { code: 'MEX', name: 'México' },        date: 'mié. 24 jun. 2026 07:00 pm', stadium: 'Estadio Azteca · México',               prediction: null, lastUpdate: null },

  // ── GRUPO B ──
  { id: 'b1', group: 'GRUPO B', home: { code: 'CAN', name: 'Canadá' },              away: { code: 'BIH', name: 'Bosnia y Herz.' }, date: 'vie. 12 jun. 2026 01:00 pm', stadium: 'BMO Field · Canadá',                   prediction: null, lastUpdate: null },
  { id: 'b2', group: 'GRUPO B', home: { code: 'QAT', name: 'Catar' },               away: { code: 'SUI', name: 'Suiza' },          date: 'sáb. 13 jun. 2026 01:00 pm', stadium: 'BC Place · Canadá',                    prediction: null, lastUpdate: null },
  { id: 'b3', group: 'GRUPO B', home: { code: 'SUI', name: 'Suiza' },               away: { code: 'BIH', name: 'Bosnia y Herz.' }, date: 'jue. 18 jun. 2026 01:00 pm', stadium: 'Lumen Field · EUA',                    prediction: null, lastUpdate: null },
  { id: 'b4', group: 'GRUPO B', home: { code: 'CAN', name: 'Canadá' },              away: { code: 'QAT', name: 'Catar' },          date: 'jue. 18 jun. 2026 04:00 pm', stadium: 'BC Place · Canadá',                    prediction: null, lastUpdate: null },
  { id: 'b5', group: 'GRUPO B', home: { code: 'SUI', name: 'Suiza' },               away: { code: 'CAN', name: 'Canadá' },         date: 'mié. 24 jun. 2026 01:00 pm', stadium: 'SoFi Stadium · EUA',                   prediction: null, lastUpdate: null },
  { id: 'b6', group: 'GRUPO B', home: { code: 'BIH', name: 'Bosnia y Herz.' },     away: { code: 'QAT', name: 'Catar' },          date: 'mié. 24 jun. 2026 01:00 pm', stadium: 'BMO Field · Canadá',                   prediction: null, lastUpdate: null },

  // ── GRUPO C ──
  { id: 'c1', group: 'GRUPO C', home: { code: 'BRA', name: 'Brasil' },    away: { code: 'MAR', name: 'Marruecos' }, date: 'sáb. 13 jun. 2026 04:00 pm', stadium: 'MetLife Stadium · EUA',                prediction: null, lastUpdate: null },
  { id: 'c2', group: 'GRUPO C', home: { code: 'HTI', name: 'Haití' },     away: { code: 'SCO', name: 'Escocia' },   date: 'sáb. 13 jun. 2026 07:00 pm', stadium: "Levi's Stadium · EUA",                  prediction: null, lastUpdate: null },
  { id: 'c3', group: 'GRUPO C', home: { code: 'SCO', name: 'Escocia' },   away: { code: 'MAR', name: 'Marruecos' }, date: 'jue. 19 jun. 2026 04:00 pm', stadium: 'Gillette Stadium · EUA',                prediction: null, lastUpdate: null },
  { id: 'c4', group: 'GRUPO C', home: { code: 'BRA', name: 'Brasil' },    away: { code: 'HTI', name: 'Haití' },     date: 'jue. 19 jun. 2026 06:30 pm', stadium: 'AT&T Stadium · EUA',                   prediction: null, lastUpdate: null },
  { id: 'c5', group: 'GRUPO C', home: { code: 'MAR', name: 'Marruecos' }, away: { code: 'HTI', name: 'Haití' },     date: 'mié. 24 jun. 2026 04:00 pm', stadium: 'NRG Stadium · EUA',                    prediction: null, lastUpdate: null },
  { id: 'c6', group: 'GRUPO C', home: { code: 'SCO', name: 'Escocia' },   away: { code: 'BRA', name: 'Brasil' },    date: 'mié. 24 jun. 2026 04:00 pm', stadium: 'MetLife Stadium · EUA',                prediction: null, lastUpdate: null },

  // ── GRUPO D ──
  { id: 'd1', group: 'GRUPO D', home: { code: 'USA', name: 'EUA' },       away: { code: 'PAR', name: 'Paraguay' },   date: 'vie. 12 jun. 2026 07:00 pm', stadium: 'SoFi Stadium · EUA',                   prediction: null, lastUpdate: null },
  { id: 'd2', group: 'GRUPO D', home: { code: 'AUS', name: 'Australia' }, away: { code: 'TUR', name: 'Turquía' },    date: 'sáb. 13 jun. 2026 10:00 pm', stadium: 'BC Place · Canadá',                    prediction: null, lastUpdate: null },
  { id: 'd3', group: 'GRUPO D', home: { code: 'USA', name: 'EUA' },       away: { code: 'AUS', name: 'Australia' },  date: 'jue. 19 jun. 2026 01:00 pm', stadium: 'Lumen Field · EUA',                    prediction: null, lastUpdate: null },
  { id: 'd4', group: 'GRUPO D', home: { code: 'TUR', name: 'Turquía' },   away: { code: 'PAR', name: 'Paraguay' },   date: 'jue. 19 jun. 2026 09:00 pm', stadium: 'NRG Stadium · EUA',                    prediction: null, lastUpdate: null },
  { id: 'd5', group: 'GRUPO D', home: { code: 'TUR', name: 'Turquía' },   away: { code: 'USA', name: 'EUA' },        date: 'jue. 25 jun. 2026 08:00 pm', stadium: 'AT&T Stadium · EUA',                   prediction: null, lastUpdate: null },
  { id: 'd6', group: 'GRUPO D', home: { code: 'PAR', name: 'Paraguay' },  away: { code: 'AUS', name: 'Australia' },  date: 'jue. 25 jun. 2026 08:00 pm', stadium: 'BC Place · Canadá',                    prediction: null, lastUpdate: null },

  // ── GRUPO E ──
  { id: 'e1', group: 'GRUPO E', home: { code: 'GER', name: 'Alemania' },      away: { code: 'CUW', name: 'Curazao' },         date: 'dom. 14 jun. 2026 11:00 am', stadium: 'NRG Stadium · EUA',                    prediction: null, lastUpdate: null },
  { id: 'e2', group: 'GRUPO E', home: { code: 'CIV', name: 'Costa de Marfil' }, away: { code: 'ECU', name: 'Ecuador' },      date: 'dom. 14 jun. 2026 05:00 pm', stadium: 'Lincoln Financial Field · EUA',         prediction: null, lastUpdate: null },
  { id: 'e3', group: 'GRUPO E', home: { code: 'GER', name: 'Alemania' },      away: { code: 'CIV', name: 'Costa de Marfil' }, date: 'vie. 20 jun. 2026 02:00 pm', stadium: 'Mercedes-Benz Stadium · EUA',           prediction: null, lastUpdate: null },
  { id: 'e4', group: 'GRUPO E', home: { code: 'ECU', name: 'Ecuador' },       away: { code: 'CUW', name: 'Curazao' },         date: 'vie. 20 jun. 2026 06:00 pm', stadium: 'Hard Rock Stadium · EUA',              prediction: null, lastUpdate: null },
  { id: 'e5', group: 'GRUPO E', home: { code: 'CUW', name: 'Curazao' },       away: { code: 'CIV', name: 'Costa de Marfil' }, date: 'jue. 25 jun. 2026 02:00 pm', stadium: 'Gillette Stadium · EUA',                prediction: null, lastUpdate: null },
  { id: 'e6', group: 'GRUPO E', home: { code: 'ECU', name: 'Ecuador' },       away: { code: 'GER', name: 'Alemania' },        date: 'jue. 25 jun. 2026 02:00 pm', stadium: 'Lincoln Financial Field · EUA',         prediction: null, lastUpdate: null },

  // ── GRUPO F ──
  { id: 'f1', group: 'GRUPO F', home: { code: 'NED', name: 'Países Bajos' }, away: { code: 'JPN', name: 'Japón' },   date: 'dom. 14 jun. 2026 02:00 pm', stadium: 'AT&T Stadium · EUA',                   prediction: null, lastUpdate: null },
  { id: 'f2', group: 'GRUPO F', home: { code: 'SWE', name: 'Suecia' },       away: { code: 'TUN', name: 'Túnez' },   date: 'dom. 14 jun. 2026 08:00 pm', stadium: 'Estadio BBVA · México',                 prediction: null, lastUpdate: null },
  { id: 'f3', group: 'GRUPO F', home: { code: 'NED', name: 'Países Bajos' }, away: { code: 'SWE', name: 'Suecia' },  date: 'vie. 20 jun. 2026 04:00 pm', stadium: 'NRG Stadium · EUA',                    prediction: null, lastUpdate: null },
  { id: 'f4', group: 'GRUPO F', home: { code: 'JPN', name: 'Japón' },        away: { code: 'TUN', name: 'Túnez' },   date: 'vie. 20 jun. 2026 08:00 pm', stadium: 'Lincoln Financial Field · EUA',         prediction: null, lastUpdate: null },
  { id: 'f5', group: 'GRUPO F', home: { code: 'TUN', name: 'Túnez' },        away: { code: 'NED', name: 'Países Bajos' }, date: 'jue. 25 jun. 2026 05:00 pm', stadium: 'Estadio BBVA · México',             prediction: null, lastUpdate: null },
  { id: 'f6', group: 'GRUPO F', home: { code: 'JPN', name: 'Japón' },        away: { code: 'SWE', name: 'Suecia' },  date: 'jue. 25 jun. 2026 05:00 pm', stadium: 'AT&T Stadium · EUA',                   prediction: null, lastUpdate: null },

  // ── GRUPO G ──
  { id: 'g1', group: 'GRUPO G', home: { code: 'BEL', name: 'Bélgica' },      away: { code: 'EGY', name: 'Egipto' },       date: 'lun. 15 jun. 2026 01:00 pm', stadium: 'Lumen Field · EUA',                    prediction: null, lastUpdate: null },
  { id: 'g2', group: 'GRUPO G', home: { code: 'IRN', name: 'Irán' },          away: { code: 'NZL', name: 'Nueva Zelanda' }, date: 'lun. 15 jun. 2026 07:00 pm', stadium: 'SoFi Stadium · EUA',                   prediction: null, lastUpdate: null },
  { id: 'g3', group: 'GRUPO G', home: { code: 'BEL', name: 'Bélgica' },      away: { code: 'IRN', name: 'Irán' },          date: 'sáb. 21 jun. 2026 01:00 pm', stadium: "Levi's Stadium · EUA",                  prediction: null, lastUpdate: null },
  { id: 'g4', group: 'GRUPO G', home: { code: 'NZL', name: 'Nueva Zelanda' }, away: { code: 'EGY', name: 'Egipto' },       date: 'sáb. 21 jun. 2026 07:00 pm', stadium: 'BC Place · Canadá',                    prediction: null, lastUpdate: null },
  { id: 'g5', group: 'GRUPO G', home: { code: 'NZL', name: 'Nueva Zelanda' }, away: { code: 'BEL', name: 'Bélgica' },     date: 'jue. 26 jun. 2026 09:00 pm', stadium: 'Lumen Field · EUA',                    prediction: null, lastUpdate: null },
  { id: 'g6', group: 'GRUPO G', home: { code: 'EGY', name: 'Egipto' },       away: { code: 'IRN', name: 'Irán' },          date: 'jue. 26 jun. 2026 09:00 pm', stadium: 'SoFi Stadium · EUA',                   prediction: null, lastUpdate: null },

  // ── GRUPO H ──
  { id: 'h1', group: 'GRUPO H', home: { code: 'ESP', name: 'España' },    away: { code: 'CPV', name: 'Cabo Verde' },    date: 'dom. 15 jun. 2026 10:00 am', stadium: 'Mercedes-Benz Stadium · EUA',           prediction: null, lastUpdate: null },
  { id: 'h2', group: 'GRUPO H', home: { code: 'KSA', name: 'Arabia Saudita' }, away: { code: 'URU', name: 'Uruguay' }, date: 'dom. 15 jun. 2026 04:00 pm', stadium: 'Hard Rock Stadium · EUA',              prediction: null, lastUpdate: null },
  { id: 'h3', group: 'GRUPO H', home: { code: 'ESP', name: 'España' },    away: { code: 'KSA', name: 'Arabia Saudita' }, date: 'sáb. 21 jun. 2026 10:00 am', stadium: 'Gillette Stadium · EUA',              prediction: null, lastUpdate: null },
  { id: 'h4', group: 'GRUPO H', home: { code: 'URU', name: 'Uruguay' },   away: { code: 'CPV', name: 'Cabo Verde' },    date: 'sáb. 21 jun. 2026 04:00 pm', stadium: 'Mercedes-Benz Stadium · EUA',           prediction: null, lastUpdate: null },
  { id: 'h5', group: 'GRUPO H', home: { code: 'CPV', name: 'Cabo Verde' }, away: { code: 'KSA', name: 'Arabia Saudita' }, date: 'jue. 26 jun. 2026 06:00 pm', stadium: 'Hard Rock Stadium · EUA',            prediction: null, lastUpdate: null },
  { id: 'h6', group: 'GRUPO H', home: { code: 'URU', name: 'Uruguay' },   away: { code: 'ESP', name: 'España' },        date: 'jue. 26 jun. 2026 06:00 pm', stadium: 'MetLife Stadium · EUA',                prediction: null, lastUpdate: null },

  // ── GRUPO I ──
  { id: 'i1', group: 'GRUPO I', home: { code: 'FRA', name: 'Francia' },   away: { code: 'SEN', name: 'Senegal' }, date: 'mar. 16 jun. 2026 01:00 pm', stadium: 'MetLife Stadium · EUA',                prediction: null, lastUpdate: null },
  { id: 'i2', group: 'GRUPO I', home: { code: 'IRQ', name: 'Irak' },      away: { code: 'NOR', name: 'Noruega' }, date: 'mar. 16 jun. 2026 04:00 pm', stadium: 'Gillette Stadium · EUA',                prediction: null, lastUpdate: null },
  { id: 'i3', group: 'GRUPO I', home: { code: 'FRA', name: 'Francia' },   away: { code: 'IRQ', name: 'Irak' },    date: 'lun. 22 jun. 2026 03:00 pm', stadium: 'AT&T Stadium · EUA',                   prediction: null, lastUpdate: null },
  { id: 'i4', group: 'GRUPO I', home: { code: 'NOR', name: 'Noruega' },   away: { code: 'SEN', name: 'Senegal' }, date: 'lun. 22 jun. 2026 06:00 pm', stadium: 'MetLife Stadium · EUA',                prediction: null, lastUpdate: null },
  { id: 'i5', group: 'GRUPO I', home: { code: 'NOR', name: 'Noruega' },   away: { code: 'FRA', name: 'Francia' }, date: 'vie. 26 jun. 2026 01:00 pm', stadium: 'SoFi Stadium · EUA',                   prediction: null, lastUpdate: null },
  { id: 'i6', group: 'GRUPO I', home: { code: 'SEN', name: 'Senegal' },   away: { code: 'IRQ', name: 'Irak' },    date: 'vie. 26 jun. 2026 01:00 pm', stadium: 'NRG Stadium · EUA',                    prediction: null, lastUpdate: null },

  // ── GRUPO J ──
  { id: 'j1', group: 'GRUPO J', home: { code: 'ARG', name: 'Argentina' }, away: { code: 'ALG', name: 'Argelia' },  date: 'mar. 16 jun. 2026 07:00 pm', stadium: 'Estadio BBVA · México',                 prediction: null, lastUpdate: null },
  { id: 'j2', group: 'GRUPO J', home: { code: 'AUT', name: 'Austria' },   away: { code: 'JOR', name: 'Jordania' }, date: 'mar. 16 jun. 2026 10:00 pm', stadium: 'Estadio Akron · México',               prediction: null, lastUpdate: null },
  { id: 'j3', group: 'GRUPO J', home: { code: 'ARG', name: 'Argentina' }, away: { code: 'AUT', name: 'Austria' },  date: 'lun. 22 jun. 2026 11:00 am', stadium: 'Hard Rock Stadium · EUA',              prediction: null, lastUpdate: null },
  { id: 'j4', group: 'GRUPO J', home: { code: 'JOR', name: 'Jordania' },  away: { code: 'ALG', name: 'Argelia' },  date: 'lun. 22 jun. 2026 09:00 pm', stadium: 'Estadio BBVA · México',                 prediction: null, lastUpdate: null },
  { id: 'j5', group: 'GRUPO J', home: { code: 'ALG', name: 'Argelia' },   away: { code: 'AUT', name: 'Austria' },  date: 'sáb. 27 jun. 2026 08:00 pm', stadium: 'BC Place · Canadá',                    prediction: null, lastUpdate: null },
  { id: 'j6', group: 'GRUPO J', home: { code: 'JOR', name: 'Jordania' },  away: { code: 'ARG', name: 'Argentina' }, date: 'sáb. 27 jun. 2026 08:00 pm', stadium: 'Estadio Azteca · México',             prediction: null, lastUpdate: null },

  // ── GRUPO K ──
  { id: 'k1', group: 'GRUPO K', home: { code: 'POR', name: 'Portugal' },  away: { code: 'COD', name: 'RD Congo' },    date: 'mié. 17 jun. 2026 11:00 am', stadium: 'Lincoln Financial Field · EUA',         prediction: null, lastUpdate: null },
  { id: 'k2', group: 'GRUPO K', home: { code: 'UZB', name: 'Uzbekistán' }, away: { code: 'COL', name: 'Colombia' },   date: 'mié. 17 jun. 2026 08:00 pm', stadium: "Levi's Stadium · EUA",                  prediction: null, lastUpdate: null },
  { id: 'k3', group: 'GRUPO K', home: { code: 'POR', name: 'Portugal' },  away: { code: 'UZB', name: 'Uzbekistán' }, date: 'lun. 23 jun. 2026 11:00 am', stadium: 'Gillette Stadium · EUA',                prediction: null, lastUpdate: null },
  { id: 'k4', group: 'GRUPO K', home: { code: 'COL', name: 'Colombia' },  away: { code: 'COD', name: 'RD Congo' },    date: 'lun. 23 jun. 2026 08:00 pm', stadium: 'SoFi Stadium · EUA',                   prediction: null, lastUpdate: null },
  { id: 'k5', group: 'GRUPO K', home: { code: 'COL', name: 'Colombia' },  away: { code: 'POR', name: 'Portugal' },   date: 'sáb. 27 jun. 2026 05:30 pm', stadium: 'Hard Rock Stadium · EUA',              prediction: null, lastUpdate: null },
  { id: 'k6', group: 'GRUPO K', home: { code: 'COD', name: 'RD Congo' },  away: { code: 'UZB', name: 'Uzbekistán' }, date: 'sáb. 27 jun. 2026 05:30 pm', stadium: 'Lumen Field · EUA',                    prediction: null, lastUpdate: null },

  // ── GRUPO L ──
  { id: 'l1', group: 'GRUPO L', home: { code: 'ENG', name: 'Inglaterra' }, away: { code: 'CRO', name: 'Croacia' },  date: 'mié. 17 jun. 2026 02:00 pm', stadium: 'MetLife Stadium · EUA',                prediction: null, lastUpdate: null },
  { id: 'l2', group: 'GRUPO L', home: { code: 'GHA', name: 'Ghana' },      away: { code: 'PAN', name: 'Panamá' },   date: 'mié. 17 jun. 2026 05:00 pm', stadium: 'Estadio Azteca · México',               prediction: null, lastUpdate: null },
  { id: 'l3', group: 'GRUPO L', home: { code: 'ENG', name: 'Inglaterra' }, away: { code: 'GHA', name: 'Ghana' },    date: 'lun. 23 jun. 2026 02:00 pm', stadium: 'Mercedes-Benz Stadium · EUA',           prediction: null, lastUpdate: null },
  { id: 'l4', group: 'GRUPO L', home: { code: 'PAN', name: 'Panamá' },     away: { code: 'CRO', name: 'Croacia' },  date: 'lun. 23 jun. 2026 05:00 pm', stadium: 'NRG Stadium · EUA',                    prediction: null, lastUpdate: null },
  { id: 'l5', group: 'GRUPO L', home: { code: 'PAN', name: 'Panamá' },     away: { code: 'ENG', name: 'Inglaterra' }, date: 'sáb. 27 jun. 2026 03:00 pm', stadium: 'BC Place · Canadá',                  prediction: null, lastUpdate: null },
  { id: 'l6', group: 'GRUPO L', home: { code: 'CRO', name: 'Croacia' },    away: { code: 'GHA', name: 'Ghana' },    date: 'sáb. 27 jun. 2026 03:00 pm', stadium: 'Lincoln Financial Field · EUA',         prediction: null, lastUpdate: null },
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
  ['ARG','Argentina'], ['ALG','Argelia'], ['AUS','Australia'], ['AUT','Austria'],
  ['BEL','Bélgica'], ['BRA','Brasil'], ['BIH','Bosnia y Herz.'], ['CAN','Canadá'],
  ['COL','Colombia'], ['CRC','Costa Rica'], ['CIV','Costa de Marfil'], ['CRO','Croacia'],
  ['CPV','Cabo Verde'], ['CUW','Curazao'], ['CZE','Chequia'], ['DEN','Dinamarca'],
  ['ECU','Ecuador'], ['EGY','Egipto'], ['ESP','España'], ['ENG','Inglaterra'],
  ['FRA','Francia'], ['GHA','Ghana'], ['GER','Alemania'], ['HTI','Haití'],
  ['ITA','Italia'], ['IRN','Irán'], ['IRQ','Irak'], ['JPN','Japón'],
  ['JOR','Jordania'], ['KOR','Corea del Sur'], ['KSA','Arabia Saudita'], ['MAR','Marruecos'],
  ['MEX','México'], ['NED','Países Bajos'], ['NGA','Nigeria'], ['NOR','Noruega'],
  ['NZL','Nueva Zelanda'], ['PAN','Panamá'], ['PAR','Paraguay'], ['POR','Portugal'],
  ['POL','Polonia'], ['QAT','Catar'], ['RSA','Sudáfrica'], ['SCO','Escocia'],
  ['SEN','Senegal'], ['SRB','Serbia'], ['SUI','Suiza'], ['SWE','Suecia'],
  ['TUR','Turquía'], ['TUN','Túnez'], ['UKR','Ucrania'], ['URU','Uruguay'],
  ['USA','EUA'], ['UZB','Uzbekistán'], ['VEN','Venezuela'], ['COD','RD Congo'],
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
