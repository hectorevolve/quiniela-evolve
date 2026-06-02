import type { RankingEntry } from '@/lib/db';

export const DEMO_USER_ID = 'demo-00000000-0000-0000-0000-000000000001';

// Ranking ficticio para la presentación — pre-ordenado por puntos (desc).
// Mezcla de varios grupos para la vista "Nacional"; "Mi grupo" filtra Evolve.
const RAW: { name: string; group: string; city: string; pts: number; bonus: number; exact: number }[] = [
  { name: 'Santiago Ramírez',     group: 'Evolve',          city: 'MTY',  pts: 168, bonus: 30, exact: 11 },
  { name: 'Ricardo Núñez',        group: 'BEPENSA Spirits', city: 'MTY',  pts: 161, bonus: 25, exact: 10 },
  { name: 'María Fernanda López',  group: 'Evolve',          city: 'GDL',  pts: 155, bonus: 20, exact: 9 },
  { name: 'Carlos Mendoza',        group: 'Evolve',          city: 'CDMX', pts: 149, bonus: 25, exact: 9 },
  { name: 'Sofía Aguilar',         group: 'ADM',             city: 'GDL',  pts: 144, bonus: 20, exact: 8 },
  { name: 'Demo Evolve',           group: 'Evolve',          city: 'CDMX', pts: 138, bonus: 20, exact: 8 }, // ← usuario
  { name: 'Andrea Torres',         group: 'Evolve',          city: 'PUE',  pts: 132, bonus: 15, exact: 7 },
  { name: 'Emilio Rivera',         group: 'Disney',          city: 'CDMX', pts: 130, bonus: 20, exact: 7 },
  { name: 'Luis Hernández',        group: 'Evolve',          city: 'MTY',  pts: 127, bonus: 15, exact: 7 },
  { name: 'Camila Ortiz',          group: 'Ruz',             city: 'PUE',  pts: 121, bonus: 15, exact: 6 },
  { name: 'Valeria Gómez',         group: 'Evolve',          city: 'QRO',  pts: 119, bonus: 10, exact: 6 },
  { name: 'Diego Martínez',        group: 'Evolve',          city: 'CDMX', pts: 112, bonus: 15, exact: 6 },
  { name: 'Héctor Jiménez',        group: 'Zuru',            city: 'QRO',  pts: 108, bonus: 10, exact: 5 },
  { name: 'Paola Sánchez',         group: 'Evolve',          city: 'GDL',  pts: 104, bonus: 10, exact: 5 },
  { name: 'Roberto Díaz',          group: 'Evolve',          city: 'MID',  pts: 98,  bonus: 10, exact: 5 },
  { name: 'Lucía Morales',         group: 'AJEMEX',          city: 'MID',  pts: 96,  bonus: 10, exact: 4 },
  { name: 'Fernanda Ruiz',         group: 'Evolve',          city: 'CUN',  pts: 91,  bonus: 5,  exact: 4 },
  { name: 'José Luis Castro',      group: 'Evolve',          city: 'CDMX', pts: 85,  bonus: 10, exact: 4 },
  { name: 'Pablo Guerrero',        group: 'Delongi',         city: 'CUN',  pts: 82,  bonus: 5,  exact: 3 },
  { name: 'Gabriela Flores',       group: 'Evolve',          city: 'MTY',  pts: 78,  bonus: 5,  exact: 3 },
  { name: 'Miguel Ángel Reyes',    group: 'Evolve',          city: 'VER',  pts: 70,  bonus: 5,  exact: 3 },
  { name: 'Renata Campos',         group: 'Disney',          city: 'CDMX', pts: 69,  bonus: 5,  exact: 2 },
  { name: 'Daniela Vargas',        group: 'Evolve',          city: 'TOL',  pts: 63,  bonus: 0,  exact: 2 },
  { name: 'Alejandro Cruz',        group: 'Evolve',          city: 'LEN',  pts: 55,  bonus: 0,  exact: 2 },
];

export const DEMO_RANKINGS: RankingEntry[] = RAW.map((r, i) => ({
  userId: r.name === 'Demo Evolve' ? DEMO_USER_ID : `demo-user-${i}`,
  name: r.name,
  group_name: r.group,
  city: r.city,
  points: r.pts,
  matchPoints: r.pts - r.bonus,
  bonusPoints: r.bonus,
  exactScores: r.exact,
  pos: i + 1,
  used_powers: [],
}));

// Estadísticas ficticias para el perfil del usuario demo (gráfica llena)
export const DEMO_STATS = {
  months: [
    { label: 'May', pct: 45, color: '#1AAFFF' },
    { label: 'Jun', pct: 82, color: '#A3E635' },
    { label: 'Jul', pct: 68, color: '#A3E635' },
  ],
  played: 32,
  hits: 21,
  exact: 8,
  totalPts: 138,
};
