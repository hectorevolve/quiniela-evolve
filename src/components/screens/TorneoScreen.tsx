'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { theme as T } from '@/lib/theme';
import { MATCHES, KNOCKOUT_MATCHES, MOCK_RESULTS, resolveSlots, computeSlots, isMatchPast, isMatchStarted, isMatchOver45Min, isMatchPastEx, isMatchStartedEx, isMatchOver45MinEx, DEMO_LIVE_MATCH, DEMO_PAST_IDS, PREDICTION_DISTRIBUTIONS, GOLEADORES, SELECCIONES, USER, STADIUM_ALIASES, TEAM_ALIASES, type Match, type PredictionBucket, type SlotMap, type LiveMatch } from '@/lib/data';
import { getInitials, type AppUser } from '@/lib/supabase';
import { getRankings, getGroupSettings, savePowerUsed, type RankingEntry, type GroupSettings } from '@/lib/db';
import { useLiveMatch } from '@/hooks/useLiveMatch';
import { loadPrediction, savePrediction, loadBonus, saveBonus, getAllCachedPredictions } from '@/lib/predictions';
import {
  Header, Avatar, Pill, Chip, Card,
  PowerIcon, BottomSheet, Modal, Eyebrow,
} from '@/components/ui';
import { SpyModal } from '@/components/screens/SpyModal';
import { EvolveMark } from '@/components/brand/EvolveMark';
import { Flag } from '@/components/flags/Flag';
import { BallIcon, SoccerBall } from '@/components/ball/SoccerBall';
import { WorldCupTrophy } from '@/components/trophy/WorldCupTrophy';

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// City abbreviation mapping (same as API)
// Normaliza una ciudad: MAYÚSCULAS, sin acentos, espacios colapsados.
const normCity = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

// Todo el Valle de México (CDMX + municipios conurbados del Edo. Méx.) → CDMX
const CDMX_ZONES = new Set<string>([
  'IZTAPALAPA', 'ECATEPEC', 'NAUCALPAN', 'ATIZAPAN', 'ATIZAPAN DE ZARAGOZA', 'ALVARO OBREGON',
  'TLALPAN', 'NEZAHUALCOYOTL', 'CD NEZAHUALCOYOTL', 'TLALNEPANTLA', 'CHICOLOAPAN', 'TEXCOCO',
  'GUSTAVO A MADERO', 'MIGUEL HIDALGO', 'IXTAPALUCA', 'CUAUTITLAN', 'CUAUTITLAN IZCALLI',
  'BENITO JUAREZ', 'TECAMAC', 'COACALCO', 'TULTITLAN', 'CHALCO', 'VALLE DE CHALCO',
  'CHIMALHUACAN', 'NICOLAS ROMERO', 'HUIXQUILUCAN', 'COYOACAN', 'IZTACALCO', 'AZCAPOTZALCO',
  'XOCHIMILCO', 'TLAHUAC', 'CUAJIMALPA', 'VENUSTIANO CARRANZA', 'CUAUHTEMOC', 'MILPA ALTA',
  'MAGDALENA CONTRERAS', 'LA MAGDALENA CONTRERAS', 'LOS REYES', 'LOS REYES LA PAZ',
]);

const isCDMX = (n: string): boolean =>
  n.includes('CDMX') || n.includes('CIUDAD DE MEXICO') || n.includes('DISTRITO FEDERAL') ||
  n === 'DF' || n === 'MEXICO' || n.includes('VALLE DE MEXICO') || n === 'VDM' ||
  n.includes('ESTADO DE MEXICO') || n.includes('EDO MEX') || n.includes('EDOMEX') ||
  CDMX_ZONES.has(n);

// Nombre completo normalizado → abreviatura
const CITY_MAP: Record<string, string> = {
  'MONTERREY': 'MTY', 'MTY': 'MTY', 'NUEVO LEON': 'MTY', 'GARCIA': 'MTY', 'SAN PEDRO': 'MTY',
  'SAN PEDRO GARZA GARCIA': 'MTY', 'APODACA': 'MTY', 'SAN NICOLAS': 'MTY', 'SANTA CATARINA': 'MTY',
  'GENERAL ESCOBEDO': 'MTY', 'ESCOBEDO': 'MTY',
  'GUADALAJARA': 'GDL', 'GDL': 'GDL', 'JALISCO': 'GDL', 'ZAPOPAN': 'GDL', 'TLAQUEPAQUE': 'GDL',
  'SAN PEDRO TLAQUEPAQUE': 'GDL', 'TONALA': 'GDL', 'TLAJOMULCO': 'GDL', 'TLAJOMULCO DE ZUNIGA': 'GDL',
  'PUEBLA': 'PUE',
  'QUERETARO': 'QRO', 'QRO': 'QRO',
  'CANCUN': 'CUN',
  'PLAYA DEL CARMEN': 'PDC', 'SOLIDARIDAD': 'PDC',
  'MERIDA': 'MID',
  'VERACRUZ': 'VER',
  'TOLUCA': 'TOL', 'METEPEC': 'TOL',
  'TIJUANA': 'TIJ',
  'CUERNAVACA': 'CUE',
  'LEON': 'LEN', 'GUANAJUATO': 'GTO', 'CELAYA': 'CEL', 'IRAPUATO': 'IRA',
  'AGUASCALIENTES': 'AGS',
  'SAN LUIS POTOSI': 'SLP',
  'DURANGO': 'DGO',
  'CHIHUAHUA': 'CHH', 'CD JUAREZ': 'JRZ', 'CIUDAD JUAREZ': 'JRZ', 'JUAREZ': 'JRZ',
  'HERMOSILLO': 'HMO',
  'LA PAZ': 'LPZ',
  'MAZATLAN': 'MZT', 'CULIACAN': 'CUL',
  'MORELIA': 'MOR',
  'OAXACA': 'OAX',
  'ACAPULCO': 'ACA', 'CHILPANCINGO': 'CHP',
  'PACHUCA': 'PAC',
  'SALTILLO': 'SAL', 'TORREON': 'TRC',
  'TUXTLA GUTIERREZ': 'TGZ', 'TUXTLA': 'TGZ',
  'XALAPA': 'XAL', 'CORDOBA': 'COR', 'ORIZABA': 'ORI',
  'VILLAHERMOSA': 'VHA',
  'CAMPECHE': 'CAM', 'CHETUMAL': 'CHE',
  'CUAUTLA': 'CTL',
  'TAMPICO': 'TAM',
  'ZAMORA': 'ZAM', 'URUAPAN': 'URU',
  'PUERTO VALLARTA': 'PVR',
  'ENSENADA': 'ENS', 'MEXICALI': 'MXL',
};

const getCityAbbrev = (city: string | null): string | null => {
  if (!city || !city.trim()) return null;
  const n = normCity(city);
  if (isCDMX(n)) return 'CDMX';
  return CITY_MAP[n] || n.substring(0, 3).toUpperCase();
};

// Suppress click events that fire as a side-effect of scroll momentum
let _lastScrollMs = 0;
const markScrolled = () => { _lastScrollMs = Date.now(); };
const wasScrolling = () => Date.now() - _lastScrollMs < 350;

type Tab = 'predicciones' | 'ranking' | 'bonus' | 'detalles';

interface Props {
  goto: (s: string, matchId?: string) => void;
  tweaks: { premium: boolean; filled: boolean; liveMatch: boolean; liveMinute?: number; liveHomeScore?: number; liveAwayScore?: number; pastMatch: boolean; knockoutSlots: boolean; rank?: number };
  fireToast: (msg: string, color?: string, textColor?: string) => void;
  powersEnabled?: boolean;
  usedPowers?: Set<string>;
  setUsedPowers?: React.Dispatch<React.SetStateAction<Set<string>>>;
  lateActiveMatchId?: string | null;
  setLateActiveMatchId?: (id: string | null) => void;
  spyMatchId?: string | null;
  setSpyMatchId?: (id: string | null) => void;
  currentUser?: AppUser | null;
  matchDates?: Record<string, string>;
  demoRankings?: RankingEntry[];   // presentación: inyecta ranking ficticio sin tocar la DB
  onRankUpdate?: (pos: number) => void;  // notifica la posición real al parent para sincronizar PremiosScreen
}

type SubScreenName = 'puntos' | 'campeon' | 'goleador' | 'subcampeon' | 'tercero' | 'poder-double' | 'poder-late' | 'poder-spy';

// ─── Month index for Spanish date strings ────────────────────────────────────
const MONTH_IDX_MAP: Record<string, number> = {
  'ene.':0,'feb.':1,'mar.':2,'abr.':3,'may.':4,'jun.':5,
  'jul.':6,'ago.':7,'sep.':8,'oct.':9,'nov.':10,'dic.':11,
};

// Nombres en DB vienen como "APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2"
// Devuelve "NOMBRE1 APELLIDO1" para que quepan en pantalla
function shortName(full: string): string {
  const w = full.trim().split(/\s+/);
  if (w.length <= 2) return full;
  return `${w[2]} ${w[0]}`;
}

function parseMatchDate(dateStr: string): Date | null {
  // Format: 'jue. 22 may. 2026 12:45 pm'
  const p = dateStr.split(' ');
  if (p.length < 6) return null;
  let h = parseInt(p[4].split(':')[0]);
  const min = parseInt(p[4].split(':')[1]);
  if (p[5] === 'pm' && h !== 12) h += 12;
  if (p[5] === 'am' && h === 12) h = 0;
  const month = MONTH_IDX_MAP[p[2]];
  if (month === undefined) return null;
  return new Date(parseInt(p[3]), month, parseInt(p[1]), h, min);
}

type MatchPeriod = 'first' | 'halftime' | 'second' | 'extra_first' | 'extra_second' | 'penalties' | 'ft';
interface TimerState { display: string; minute: number; period: MatchPeriod }

// Standard football time constants (minutes)
const T1 = 45; const HT = 15; const T2 = 45; const ST1 = 3; const ST2 = 5;
const ET1 = 15; const ET_HT = 5; const ET2 = 15;

function calcMatchTime(startDate: Date, apiStatus: string, apiDuration: string): TimerState {
  const realMin = Math.floor((Date.now() - startDate.getTime()) / 60_000);

  // ── API says halftime (PAUSED) → use it directly ──
  if (apiStatus === 'PAUSED') {
    return { display: 'Medio tiempo', minute: T1, period: 'halftime' };
  }

  // ── API says penalties ──
  if (apiDuration === 'PENALTY_SHOOTOUT') {
    return { display: 'Penales', minute: 120, period: 'penalties' };
  }

  // ── Extra time: 90+ST2+ET_HT = period boundary ──
  if (apiDuration === 'EXTRA_TIME') {
    const etElapsed = realMin - (T1 + ST1 + HT + T2 + ST2);
    if (etElapsed <= ET1) {
      const min = 90 + Math.min(etElapsed, ET1);
      return { display: `${min}'`, minute: min, period: 'extra_first' };
    }
    if (etElapsed <= ET1 + ET_HT) {
      return { display: 'T. Extra ½', minute: 105, period: 'extra_first' };
    }
    const et2Elapsed = etElapsed - ET1 - ET_HT;
    const min = 105 + Math.min(et2Elapsed, ET2);
    const stoppage = et2Elapsed > ET2 ? et2Elapsed - ET2 : 0;
    const display = stoppage > 0 ? `120+${stoppage}'` : `${min}'`;
    return { display, minute: min, period: 'extra_second' };
  }

  // ── Regular time ──
  if (realMin <= T1 + ST1) {
    const min = Math.min(realMin, T1);
    const stoppage = realMin > T1 ? realMin - T1 : 0;
    return { display: stoppage > 0 ? `45+${stoppage}'` : `${min}'`, minute: realMin, period: 'first' };
  }
  if (realMin <= T1 + ST1 + HT) {
    return { display: 'Medio tiempo', minute: T1, period: 'halftime' };
  }
  const s2 = realMin - (T1 + ST1 + HT);
  if (s2 <= T2 + ST2) {
    const min = T1 + Math.min(s2, T2);
    const stoppage = s2 > T2 ? s2 - T2 : 0;
    return { display: stoppage > 0 ? `90+${stoppage}'` : `${min}'`, minute: min, period: 'second' };
  }
  return { display: 'Fin', minute: 90, period: 'ft' };
}

function useMatchTimer(dateStr: string, apiStatus: string, apiDuration: string, active: boolean): TimerState | null {
  const startDate = parseMatchDate(dateStr);
  const [state, setState] = useState<TimerState | null>(
    active && startDate ? calcMatchTime(startDate, apiStatus, apiDuration) : null
  );
  useEffect(() => {
    if (!active || !startDate) { setState(null); return; }
    const tick = () => setState(calcMatchTime(startDate, apiStatus, apiDuration));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, dateStr, apiStatus, apiDuration]);
  return state;
}

export function TorneoScreen({ goto, tweaks, fireToast, powersEnabled = true, usedPowers, setUsedPowers, lateActiveMatchId, setLateActiveMatchId, spyMatchId, setSpyMatchId, currentUser, matchDates, demoRankings, onRankUpdate }: Props) {
  const displayUser = currentUser ?? USER;
  const displayName     = currentUser?.name       ?? USER.name;
  const displayGroup    = currentUser?.group_name  ?? USER.group;
  const displayInitials = currentUser ? getInitials(currentUser.name) : USER.avatar;
  const [tab, setTab] = useState<Tab>('predicciones');
  const [subScreen, setSubScreen] = useState<SubScreenName | null>(null);

  // Bonus selections — initialised from in-memory cache (synced from Supabase on login)
  const [champSelected, setChampSelected] = useState(() => loadBonus()?.champCode ?? '');
  const [subSelected,   setSubSelected]   = useState(() => loadBonus()?.subCode   ?? '');
  const [thirdSelected, setThirdSelected] = useState(() => loadBonus()?.thirdCode ?? '');
  const [goalPlayer,    setGoalPlayer]    = useState(() => loadBonus()?.goalPlayer ?? '');

  // Live rankings from Supabase — re-fetch every time the user opens the Ranking tab
  const [liveRankings, setLiveRankings]     = useState<RankingEntry[]>(demoRankings ?? []);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const fetchRankings = () => {
    if (demoRankings) { setLiveRankings(demoRankings); setRankingsLoading(false); return; } // presentación
    setRankingsLoading(true);
    getRankings()
      .then(data => {
        setLiveRankings(data);
        // Notifica la posición real al parent para sincronizar PremiosScreen
        if (onRankUpdate && currentUser?.id) {
          const entry = data.find(e => e.userId === currentUser.id);
          if (entry) onRankUpdate(entry.pos);
        }
      })
      .catch(console.error)
      .finally(() => setRankingsLoading(false));
  };
  useEffect(() => { fetchRankings(); }, []); // initial load
  useEffect(() => { if (tab === 'ranking') fetchRankings(); }, [tab]); // refresh on tab open

  // Dynamic group colors & logos from DB (overrides hardcoded maps)
  const [dbGroupColors, setDbGroupColors] = useState<Record<string, string>>({});
  const [dbGroupLogos, setDbGroupLogos] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch('/api/groups')
      .then(r => r.json())
      .then((groups: { name: string; color: string; logo_url?: string | null }[]) => {
        const colorMap: Record<string, string> = {};
        const logoMap: Record<string, string> = {};
        for (const g of groups) {
          if (g.name && g.color) colorMap[g.name] = g.color;
          if (g.name && g.logo_url) logoMap[g.name] = g.logo_url;
        }
        setDbGroupColors(colorMap);
        setDbGroupLogos(logoMap);
      })
      .catch(() => {});
  }, []);

  // Merge: DB color takes priority, hardcoded GROUP_COLORS as fallback
  const getGroupColor = (group: string) =>
    dbGroupColors[group] ?? GROUP_COLORS[group] ?? T.lime;
  const getGroupLogo = (group: string) =>
    dbGroupLogos[group] ?? undefined;

  const openSub = (name: SubScreenName) => setSubScreen(name);
  const closeSub = () => setSubScreen(null);

  if (subScreen) {
    return (
      <TorneoSubScreen
        screen={subScreen}
        onBack={closeSub}
        fireToast={fireToast}
        onSelectCountry={(code) => {
          if (subScreen === 'campeon')    { setChampSelected(code); saveBonus({ champCode: code }); }
          else if (subScreen === 'subcampeon') { setSubSelected(code);   saveBonus({ subCode: code });   }
          else if (subScreen === 'tercero')    { setThirdSelected(code); saveBonus({ thirdCode: code }); }
          closeSub();
          fireToast('¡Predicción guardada!', T.bgInk, '#fff');
        }}
        onSelectPlayer={(name) => {
          setGoalPlayer(name);
          saveBonus({ goalPlayer: name });
          closeSub();
          fireToast('¡Predicción guardada!', T.bgInk, '#fff');
        }}
      />
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'predicciones', label: 'Predicciones' },
    { key: 'ranking',      label: 'Ranking' },
    { key: 'bonus',        label: 'Bonus' },
    { key: 'detalles',     label: 'Detalles' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgSubtle, overflow: 'hidden' }}>
      <Header
        title="Torneo 2026"
        right={<Avatar initials={displayInitials} size={34} ring={T.lime} onClick={() => goto('perfil')}/>}
      />

      {/* Group strip */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${T.border}`, padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', width: 60 }}>
          <GroupLogo key={getGroupLogo(displayGroup) ?? displayGroup} group={displayGroup} size={50} colorOverride={getGroupColor(displayGroup)} logoUrlOverride={getGroupLogo(displayGroup)}/>
          <div style={{ fontSize: 8, fontWeight: 700, color: T.ink, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, textAlign: 'center', lineHeight: 1.2, whiteSpace: 'nowrap' }}>Grupo<br/>{displayGroup}</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, minWidth: 80, padding: '12px 4px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11.5, fontWeight: 600, letterSpacing: 0.3,
              color: tab === t.key ? T.ink : T.muted,
              borderBottom: `2.5px solid ${tab === t.key ? T.blue : 'transparent'}`,
              transition: 'all 200ms ease',
              textTransform: 'uppercase',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'predicciones' && <TabPredicciones goto={goto} tweaks={tweaks} fireToast={fireToast} powersEnabled={powersEnabled} usedPowers={usedPowers} setUsedPowers={setUsedPowers} lateActiveMatchId={lateActiveMatchId} setLateActiveMatchId={setLateActiveMatchId} spyMatchId={spyMatchId} setSpyMatchId={setSpyMatchId} matchDates={matchDates}/>}
        {tab === 'ranking'      && <TabRanking rankings={liveRankings} loading={rankingsLoading} userId={currentUser?.id ?? ''} userName={displayName} userGroup={displayGroup} groupAccent={getGroupColor(displayGroup)}/>}
        {tab === 'bonus'        && (
          <TabBonus
            fireToast={fireToast}
            champSelected={champSelected} setChampSelected={setChampSelected}
            subSelected={subSelected} setSubSelected={setSubSelected}
            thirdSelected={thirdSelected} goalPlayer={goalPlayer}
            openSub={openSub}
            userGroup={displayGroup}
          />
        )}
        {tab === 'detalles'     && <TabDetalles goto={goto} openSub={openSub} userGroup={displayGroup} rankings={liveRankings} groupAccent={getGroupColor(displayGroup)} groupLogoUrl={getGroupLogo(displayGroup)} powersEnabled={powersEnabled}/>}
      </div>

    </div>
  );
}

// ──────── Tab: Predicciones ────────
function TabPredicciones({ goto, tweaks, fireToast, powersEnabled = true, usedPowers: usedPowersFromParent, setUsedPowers: setUsedPowersFromParent, lateActiveMatchId: lateActiveMatchIdFromParent, setLateActiveMatchId: setLateActiveMatchIdFromParent, spyMatchId: spyMatchIdFromParent, setSpyMatchId: setSpyMatchIdFromParent, matchDates }: Props) {
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [onlyUnpredicted, setOnlyUnpredicted] = useState(false);
  const [modal, setModal] = useState<null | { kind: 'double' | 'late'; match: Match }>(null);
  const [spyModal, setSpyModal] = useState<null | { match: Match; phase: 'confirm' | 'results' }>(null);
  const [localUsedPowers, setLocalUsedPowers] = useState<Set<string>>(new Set());
  const [localLateMatchId, setLocalLateMatchId] = useState<string | null>(null);
  const [localSpyMatchId, setLocalSpyMatchId] = useState<string | null>(null);

  const usedPowers = usedPowersFromParent ?? localUsedPowers;
  const setUsedPowers = setUsedPowersFromParent ?? setLocalUsedPowers;
  const lateActiveMatchId = lateActiveMatchIdFromParent !== undefined ? lateActiveMatchIdFromParent : localLateMatchId;
  const setLateActiveMatchId = setLateActiveMatchIdFromParent ?? setLocalLateMatchId;
  const spyMatchId = spyMatchIdFromParent !== undefined ? spyMatchIdFromParent : localSpyMatchId;
  const setSpyMatchId = setSpyMatchIdFromParent ?? setLocalSpyMatchId;

  const liveMatch = useLiveMatch(tweaks.liveMatch ? {
    ...DEMO_LIVE_MATCH,
    minute: tweaks.liveMinute ?? DEMO_LIVE_MATCH.minute,
    homeScore: tweaks.liveHomeScore ?? DEMO_LIVE_MATCH.homeScore,
    awayScore: tweaks.liveAwayScore ?? DEMO_LIVE_MATCH.awayScore,
  } : undefined);

  const [displayedLive, setDisplayedLive] = useState<LiveMatch | null>(liveMatch);
  const [bannerAnim, setBannerAnim] = useState<'idle' | 'exit' | 'enter'>('idle');
  const prevLiveNullRef = useRef(liveMatch === null);

  useEffect(() => {
    const wasNull = prevLiveNullRef.current;
    const isNull = liveMatch === null;
    prevLiveNullRef.current = isNull;
    if (wasNull === isNull) { setDisplayedLive(liveMatch); return; }
    setBannerAnim('exit');
    const t1 = setTimeout(() => { setDisplayedLive(liveMatch); setBannerAnim('enter'); }, 320);
    const t2 = setTimeout(() => setBannerAnim('idle'), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [liveMatch]);

  // Goal modal
  type GoalInfo = { side: 'home' | 'away'; minute: number; homeScore: number; awayScore: number };
  const [goalModal, setGoalModal] = useState<GoalInfo | null>(null);
  const prevScoreRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!displayedLive) { prevScoreRef.current = null; return; }
    const curr: [number, number] = [displayedLive.homeScore, displayedLive.awayScore];
    const prev = prevScoreRef.current;
    prevScoreRef.current = curr;
    if (!prev) return;
    const side = curr[0] > prev[0] ? 'home' : curr[1] > prev[1] ? 'away' : null;
    if (!side) return;
    const minute = displayedLive.minute ?? 0;
    setGoalModal({ side, minute, homeScore: curr[0], awayScore: curr[1] });
    const t = setTimeout(() => setGoalModal(null), 5000);
    return () => clearTimeout(t);
  }, [displayedLive]);

  // Client-side match timer — used when the API doesn't return the minute
  const liveMatchForTimer = MATCHES.find(m => m.id === displayedLive?.matchId);
  const matchTimer = useMatchTimer(
    liveMatchForTimer?.date ?? '',
    displayedLive?.status   ?? 'IN_PLAY',
    displayedLive?.duration ?? 'REGULAR',
    displayedLive !== null && displayedLive.minute === null,
  );

  // Maps each chip label to the match.group value it represents
  const CHIP_GROUP: Record<string, string> = {
    'Grupo A':'GRUPO A','Grupo B':'GRUPO B','Grupo C':'GRUPO C','Grupo D':'GRUPO D',
    'Grupo E':'GRUPO E','Grupo F':'GRUPO F','Grupo G':'GRUPO G','Grupo H':'GRUPO H',
    'Grupo I':'GRUPO I','Grupo J':'GRUPO J','Grupo K':'GRUPO K','Grupo L':'GRUPO L',
    'Dieciseisavos':'DIECISEISAVOS','Octavos':'OCTAVOS DE FINAL',
    'Cuartos':'CUARTOS DE FINAL','Semis':'SEMIFINALES',
    '3er Lugar':'TERCER LUGAR','Final':'FINAL',
  };
  const ALL_CHIPS = ['Todos','Grupo A','Grupo B','Grupo C','Grupo D','Grupo E','Grupo F','Grupo G','Grupo H','Grupo I','Grupo J','Grupo K','Grupo L','Dieciseisavos','Octavos','Cuartos','Semis','3er Lugar','Final'];

  const allMatches = useMemo(() => {
    const slots: SlotMap = tweaks.knockoutSlots
      ? computeSlots(MATCHES, KNOCKOUT_MATCHES, MOCK_RESULTS)
      : {};
    const groupMatches = MATCHES.filter(m => !isMatchPastEx(matchDates?.[m.id], m.date) && !(tweaks.pastMatch && DEMO_PAST_IDS.has(m.id)));
    const knockoutResolved = resolveSlots(KNOCKOUT_MATCHES, slots);
    const groupFilledMatches = tweaks.filled
      ? groupMatches.map(m => ({ ...m, prediction: m.prediction ?? [1, 0] as [number, number] }))
      : groupMatches;
    return [...groupFilledMatches, ...knockoutResolved];
  }, [tweaks.filled, tweaks.pastMatch, tweaks.knockoutSlots]);

  // Only show chips for categories that still have remaining matches
  const filters = useMemo(() => {
    const groupsPresent = new Set(allMatches.map(m => m.group));
    return ALL_CHIPS.filter(chip => chip === 'Todos' || groupsPresent.has(CHIP_GROUP[chip] ?? ''));
  }, [allMatches]);

  // Reset filter to 'Todos' if the active chip disappears
  useEffect(() => {
    if (!filters.includes(filter)) setFilter('Todos');
  }, [filters, filter]);

  const filtered = useMemo(() => {
    const q = norm(search.trim());
    // Read saved predictions from in-memory cache (Supabase-backed) when filter is active
    const savedPreds = new Set<string>();
    if (onlyUnpredicted) {
      const cache = getAllCachedPredictions();
      for (const m of allMatches) {
        if (cache[m.id]) savedPreds.add(m.id);
      }
    }
    return allMatches.filter(m => {
      let matchesGroup: boolean;
      if (filter === 'Todos') {
        matchesGroup = true;
      } else if (filter === 'Dieciseisavos') {
        matchesGroup = m.group === 'DIECISEISAVOS';
      } else if (filter === 'Octavos') {
        matchesGroup = m.group === 'OCTAVOS DE FINAL';
      } else if (filter === 'Cuartos') {
        matchesGroup = m.group === 'CUARTOS DE FINAL';
      } else if (filter === 'Semis') {
        matchesGroup = m.group === 'SEMIFINALES';
      } else if (filter === '3er Lugar') {
        matchesGroup = m.group === 'TERCER LUGAR';
      } else if (filter === 'Final') {
        matchesGroup = m.group === 'FINAL';
      } else {
        matchesGroup = m.group.toLowerCase().includes(filter.toLowerCase().replace('grupo ', ''));
      }
      const stadiumKey = m.stadium.split(' · ')[0];
      const matchesSearch = !q ||
        norm(m.home.name).includes(q) ||
        norm(m.away.name).includes(q) ||
        norm(m.home.code).includes(q) ||
        norm(m.away.code).includes(q) ||
        norm(m.group).includes(q) ||
        norm(m.stadium).includes(q) ||
        (TEAM_ALIASES[m.home.code] ?? []).some(a => norm(a).includes(q)) ||
        (TEAM_ALIASES[m.away.code] ?? []).some(a => norm(a).includes(q)) ||
        (STADIUM_ALIASES[stadiumKey] ?? []).some(a => norm(a).includes(q));
      const matchesPredicted = !onlyUnpredicted || (m.prediction === null && !savedPreds.has(m.id));
      return matchesGroup && matchesSearch && matchesPredicted;
    });
  }, [allMatches, filter, search, onlyUnpredicted]);

  const MONTH_ORDER: Record<string, number> = {
    ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
    jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
  };

  type DateGroup = { key: string; label: string; sortVal: number; matches: Match[] };
  const dateGroups = useMemo(() => {
    const map = new Map<string, DateGroup>();
    for (const m of filtered) {
      // date format: "jue. 11 jun. 2026 01:00 pm"
      const parts = m.date.split(' ');
      const key = `${parts[3]}-${parts[2]}-${parts[1]}`;
      if (!map.has(key)) {
        const day = parts[0].replace('.', '');
        const mon = parts[2].replace('.', '');
        const label = `${day.charAt(0).toUpperCase()}${day.slice(1)}. ${parts[1]} ${mon.charAt(0).toUpperCase()}${mon.slice(1)}. ${parts[3]}`;
        const sortVal = Number(parts[3]) * 10000 + (MONTH_ORDER[mon] ?? 0) * 100 + Number(parts[1]);
        map.set(key, { key, label, sortVal, matches: [] });
      }
      map.get(key)!.matches.push(m);
    }
    return Array.from(map.values()).sort((a, b) => a.sortVal - b.sortVal);
  }, [filtered]);

  const confirmPower = () => {
    if (!modal) return;
    const { kind, match } = modal;
    if (kind === 'double' && isMatchStartedEx(matchDates?.[match.id], match.date) && lateActiveMatchId !== match.id) {
      setModal(null);
      fireToast('El partido ya inició, no puedes activar ×2', T.rose, '#fff');
      return;
    }
    if (kind === 'late' && isMatchOver45MinEx(matchDates?.[match.id], match.date)) {
      setModal(null);
      fireToast('Ya pasaron los 45 min, no puedes activar Cambio Tardío', T.rose, '#fff');
      return;
    }
    if (kind === 'late') setLateActiveMatchId(match.id);
    setUsedPowers(prev => new Set([...prev, kind]));
    // Pasa el matchId para ×2 (duplica puntos) y late (restaura al recargar)
    savePowerUsed(kind, (kind === 'double' || kind === 'late') ? match.id : undefined).catch(console.error);
    setModal(null);
    fireToast(`¡Poder "${kind === 'double' ? 'Puntos Dobles' : kind === 'late' ? 'Cambio Tardío' : 'Espía'}" activado!`, T.bgInk, '#fff');
  };

  // Find next upcoming match
  const MONTH_IDX: Record<string, number> = {
    'ene.':0,'feb.':1,'mar.':2,'abr.':3,'may.':4,'jun.':5,
    'jul.':6,'ago.':7,'sep.':8,'oct.':9,'nov.':10,'dic.':11,
  };
  const nextMatch = (() => {
    const now = new Date();
    for (const m of MATCHES) {
      const p = m.date.split(' ');
      let h = parseInt(p[4].split(':')[0]);
      const min = parseInt(p[4].split(':')[1]);
      if (p[5] === 'pm' && h !== 12) h += 12;
      if (p[5] === 'am' && h === 12) h = 0;
      const d = new Date(parseInt(p[3]), MONTH_IDX[p[2]] ?? 5, parseInt(p[1]), h, min);
      if (d > now) return { match: m, day: p[1], month: p[2].replace('.',''), time: p[4] };
    }
    const p = MATCHES[0].date.split(' ');
    return { match: MATCHES[0], day: p[1], month: p[2].replace('.',''), time: p[4] };
  })();

  return (
    <div style={{ padding: '0 0 80px' }}>
      {/* ── Banner: partido en curso OR próximo partido ── */}
      {displayedLive ? (() => {
        const live = displayedLive;
        const liveMatchData = MATCHES.find(m => m.id === live.matchId) ?? MATCHES[0];
        const liveIdx = MATCHES.findIndex(m => m.id === live.matchId);
        const afterLive = MATCHES[liveIdx + 1] ?? MATCHES[0];
        const afterP = afterLive.date.split(' ');
        const nextAfterLive = { match: afterLive, day: afterP[1], month: afterP[2].replace('.',''), time: afterP[4] };
        const animStyle = bannerAnim === 'exit' ? { animation: 'banner-exit 320ms cubic-bezier(0.4,0,0.6,1) both' } : bannerAnim === 'enter' ? { animation: 'banner-enter 380ms cubic-bezier(0.22,1,0.36,1) both' } : {};
        return (
          <div style={{
            margin: '12px 14px', borderRadius: 16,
            background: T.bgInk, border: `1px solid ${T.borderInk}`,
            overflow: 'hidden', ...animStyle,
          }}>
            {/* Live header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 0' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', flexShrink: 0, animation: 'evo-pulse 1.4s ease-in-out infinite', boxShadow: '0 0 7px #22C55E' }}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.4 }}>Partido en curso</span>
            </div>

            {/* Score section */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px 14px', gap: 8 }}>
              {/* Home */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 38, fontWeight: 900, color: T.textOnInk, fontFamily: 'var(--font-jetbrains),monospace', lineHeight: 1 }}>{live.homeScore}</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: T.textOnInk, letterSpacing: 1 }}>{liveMatchData.home.code}</span>
              </div>

              {/* Center: minute + trophy */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                {live.minute != null
                  ? <span style={{ fontSize: 13, fontWeight: 800, color: '#22C55E', letterSpacing: 0.5, fontFamily: 'var(--font-jetbrains),monospace' }}>{live.minute}&apos;</span>
                  : matchTimer
                    ? <span style={{
                        fontSize: ['halftime','ft','extra_first','extra_second','penalties'].includes(matchTimer.period) ? 9 : 13,
                        fontWeight: 800,
                        color: matchTimer.period === 'halftime'    ? '#F59E0B'
                             : matchTimer.period === 'penalties'   ? '#A78BFA'
                             : matchTimer.period === 'ft'          ? 'rgba(255,255,255,0.4)'
                             : ['extra_first','extra_second'].includes(matchTimer.period) ? '#FB923C'
                             : '#22C55E',
                        letterSpacing: 0.5,
                        fontFamily: 'var(--font-jetbrains),monospace',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}>{matchTimer.display}</span>
                    : <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', letterSpacing: 0.5 }}>●</span>
                }
                <WorldCupTrophy size={62}/>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>vs</span>
              </div>

              {/* Away */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 38, fontWeight: 900, color: T.textOnInk, fontFamily: 'var(--font-jetbrains),monospace', lineHeight: 1 }}>{live.awayScore}</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: T.textOnInk, letterSpacing: 1 }}>{liveMatchData.away.code}</span>
              </div>
            </div>

            {/* Bottom strip: next match + cierre */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.blue, flexShrink: 0, animation: 'evo-pulse 1.4s ease-in-out infinite', boxShadow: `0 0 5px ${T.blue}` }}/>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Próximo partido</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.textOnInk, whiteSpace: 'nowrap' }}>
                      {nextAfterLive.match.home.code} <span style={{ opacity: 0.5, fontWeight: 400 }}>vs</span> {nextAfterLive.match.away.code}
                    </span>
                    <span style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }}/>
                    <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{nextAfterLive.day} {nextAfterLive.month}. · {nextAfterLive.time}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>Cierre 10 jun.</span>
                <Pill color="rgba(26,175,255,0.15)" textColor={T.blue}>4 partidos</Pill>
              </div>
            </div>
          </div>
        );
      })() : (() => {
        const animStyle = bannerAnim === 'exit' ? { animation: 'banner-exit 320ms cubic-bezier(0.4,0,0.6,1) both' } : bannerAnim === 'enter' ? { animation: 'banner-enter 380ms cubic-bezier(0.22,1,0.36,1) both' } : {};
        return (
        <div style={{
          margin: '12px 14px', borderRadius: 14,
          background: T.bgInk, padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: `1px solid ${T.borderInk}`, ...animStyle,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.blue, flexShrink: 0, animation: 'evo-pulse 1.4s ease-in-out infinite', boxShadow: `0 0 6px ${T.blue}` }}/>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.3, marginBottom: 1 }}>Próximo Partido</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.textOnInk, letterSpacing: 0.3 }}>
                {nextMatch.match.home.code} <span style={{ opacity: 0.5 }}>vs</span> {nextMatch.match.away.code}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{nextMatch.day} {nextMatch.month}. · {nextMatch.time}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.2 }}>Próximo cierre · 10 jun.</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <SoccerBall size={14} style={{ opacity: 0.6 }}/>
              <Pill color="rgba(26,175,255,0.15)" textColor={T.blue}>4 partidos</Pill>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Search bar + Sin predicción toggle */}
      <div style={{ padding: '0 14px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', borderRadius: 12,
          border: `1.5px solid ${search ? T.blue : T.border}`,
          padding: '10px 14px', transition: 'border-color 200ms',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar equipo, grupo o sede…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 13,
              color: T.ink, background: 'transparent', fontFamily: 'inherit',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, display: 'flex', alignItems: 'center', color: T.muted,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        <button onClick={() => setOnlyUnpredicted(v => !v)} style={{
          flexShrink: 0, width: 80, padding: '0 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 600,
          cursor: 'pointer', transition: 'all 150ms ease',
          background: onlyUnpredicted ? T.lime : '#fff',
          color: onlyUnpredicted ? T.limeDeep : T.slate,
          border: onlyUnpredicted ? `1.5px solid ${T.lime}` : `1.5px solid ${T.border}`,
          boxShadow: onlyUnpredicted ? T.shadowSm : 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          alignSelf: 'stretch', gap: 1, lineHeight: 1.2,
        }}>
          <span>{onlyUnpredicted ? '✓ Sin' : 'Sin'}</span>
          <span>predicción</span>
        </button>
      </div>

      {/* Group filter chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 14px 12px', scrollbarWidth: 'none' }}>
        {filters.map(f => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>)}
      </div>

      {/* Match cards grouped by date */}
      {dateGroups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: T.muted }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Sin resultados</div>
          <div style={{ fontSize: 13 }}>Intenta con otro término de búsqueda</div>
        </div>
      ) : dateGroups.map(group => (
        <div key={group.key}>
          <div style={{ padding: '4px 14px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ height: 1, flex: 1, background: T.border }}/>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>
              📅 {group.label}
            </span>
            <div style={{ height: 1, flex: 1, background: T.border }}/>
          </div>
          <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }} className="evo-stagger">
            {group.matches.map(match => (
              <MatchCard key={match.id} match={match} usedPowers={usedPowers}
                powersEnabled={powersEnabled}
                lateActiveMatchId={lateActiveMatchId}
                spyMatchId={spyMatchId}
                matchStarted={isMatchStartedEx(matchDates?.[match.id], match.date) || liveMatch?.matchId === match.id}
                matchOver45={isMatchOver45MinEx(matchDates?.[match.id], match.date) || (liveMatch?.matchId === match.id && (liveMatch?.minute ?? 0) >= 45)}
                onPower={(kind) => {
                  if (kind === 'spy') setSpyModal({ match, phase: spyMatchId === match.id ? 'results' : 'confirm' });
                  else setModal({ kind, match });
                }}
                onView={(id) => goto('detalle', id)}
                fireToast={fireToast}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Power modal (double / late) */}
      <Modal open={!!modal} onClose={() => setModal(null)}>
        {modal && <PowerModal kind={modal.kind} matchName={`${modal.match.home.name} vs ${modal.match.away.name}`} onConfirm={confirmPower} onCancel={() => setModal(null)}/>}
      </Modal>

      {/* Spy modal */}
      <Modal open={!!spyModal} onClose={() => setSpyModal(null)}>
        {spyModal && (
          <SpyModal
            match={spyModal.match}
            phase={spyModal.phase}
            onConfirm={() => {
              setUsedPowers(prev => new Set([...prev, 'spy']));
              savePowerUsed('spy').catch(console.error);
              if (spyModal) setSpyMatchId(spyModal.match.id);
              setSpyModal(s => s ? { ...s, phase: 'results' } : null);
            }}
            onClose={() => setSpyModal(null)}
          />
        )}
      </Modal>

      {/* ── GoalModal overlay ── */}
      {goalModal && (() => {
        const gm = goalModal;
        const liveMatchData = MATCHES.find(m => m.id === displayedLive?.matchId) ?? MATCHES[0];
        const scoringName = gm.side === 'home' ? liveMatchData.home.name : liveMatchData.away.name;
        return (
          <div
            onClick={() => setGoalModal(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,6,20,0.82)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'linear-gradient(160deg, #0D1F3C 0%, #091428 60%, #060E1E 100%)',
                borderRadius: 24,
                padding: '32px 28px 28px',
                width: 300,
                textAlign: 'center',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.7)',
                animation: 'evo-goal-modal-enter 500ms cubic-bezier(0.22,1,0.36,1) both',
              }}
            >
              {/* Ball: outer handles drop-in, inner spins then stops */}
              <div style={{ lineHeight: 1, marginBottom: 12, animation: 'evo-goal-ball-drop 500ms cubic-bezier(0.22,1,0.36,1) 80ms both' }}>
                <span style={{ display: 'inline-block', fontSize: 56, animation: 'evo-goal-ball-spin 2.5s cubic-bezier(0.15,0,0.3,1) both' }}>⚽</span>
              </div>

              {/* ¡GOL! */}
              <div style={{
                fontSize: 58, fontWeight: 900, lineHeight: 0.95,
                fontStyle: 'italic', letterSpacing: -1,
                background: 'linear-gradient(135deg, #FDE047 0%, #FBBF24 50%, #F59E0B 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'evo-goal-text 600ms cubic-bezier(0.22,1,0.36,1) 120ms both',
                marginBottom: 12,
              }}>¡GOL!</div>

              {/* Scorer + minute */}
              <div style={{ fontSize: 13, fontWeight: 700, color: '#4ADE80', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 18 }}>
                {scoringName} · MIN. {gm.minute}
              </div>

              {/* Flags + score */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 }}>
                <Flag code={liveMatchData.home.code} size={44}/>
                <span style={{
                  fontSize: 42, fontWeight: 900, color: '#FFFFFF',
                  fontFamily: 'var(--font-jetbrains), monospace',
                  letterSpacing: -1, lineHeight: 1,
                }}>{gm.homeScore}–{gm.awayScore}</span>
                <Flag code={liveMatchData.away.code} size={44}/>
              </div>

              {/* Team names */}
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.3 }}>
                {liveMatchData.home.name} · {liveMatchData.away.name}
              </div>

              {/* Progress bar auto-dismiss 5s */}
              <div style={{ marginTop: 20, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: 'rgba(74,222,128,0.6)',
                  transformOrigin: 'left',
                  animation: 'evo-goal-bar 5s linear both',
                }}/>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 0.5 }}>Toca para cerrar</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function MatchCard({ match, usedPowers, powersEnabled = true, lateActiveMatchId, spyMatchId, matchStarted, matchOver45, onPower, onView, fireToast }: {
  match: Match;
  usedPowers: Set<string>;
  powersEnabled?: boolean;
  lateActiveMatchId: string | null;
  spyMatchId?: string | null;
  matchStarted?: boolean;
  matchOver45?: boolean;
  onPower: (kind: 'double' | 'late' | 'spy') => void;
  onView: (matchId: string) => void;
  fireToast: Props['fireToast'];
}) {
  const localSaved = loadPrediction(match.id);
  const initSaved = localSaved ?? (match.prediction
    ? { home: match.prediction[0], away: match.prediction[1], savedAt: '' }
    : null);

  const [homeScore, setHomeScore] = useState<string>(initSaved ? String(initSaved.home) : '');
  const [awayScore, setAwayScore] = useState<string>(initSaved ? String(initSaved.away) : '');
  const [savedAt, setSavedAt] = useState<string | null>(initSaved?.savedAt ?? null);
  const [focusedSide, setFocusedSide] = useState<'home' | 'away' | null>(null);

  const hasPrediction = savedAt !== null || initSaved !== null;
  const isDirty = (() => {
    if (!initSaved) return homeScore !== '' || awayScore !== '';
    return homeScore !== String(initSaved.home) || awayScore !== String(initSaved.away);
  })();
  const canConfirm = isDirty && homeScore !== '' && awayScore !== '';

  const isTBD = match.home.code === 'TBD' || match.away.code === 'TBD';
  const lateActive = lateActiveMatchId === match.id;
  const started = matchStarted ?? isMatchStarted(match.date);
  const over45  = matchOver45 ?? isMatchOver45Min(match.date);
  const isLocked = isTBD || (started && !lateActive);

  const handleConfirm = () => {
    if (!canConfirm) return;
    const pred = savePrediction(match.id, Number(homeScore), Number(awayScore));
    setSavedAt(pred.savedAt);
    fireToast('¡Predicción guardada! ✓', T.emerald, '#fff');
  };

  const scoreInputStyle = (side: 'home' | 'away'): React.CSSProperties => {
    const isFocused = focusedSide === side;
    const hasVal = side === 'home' ? homeScore !== '' : awayScore !== '';
    const savedVal = side === 'home' ? initSaved?.home : initSaved?.away;
    const currentVal = side === 'home' ? homeScore : awayScore;
    const changed = isDirty && (hasVal ? currentVal !== String(savedVal) : savedVal !== undefined);
    return {
      width: 48, height: 48, borderRadius: 10,
      border: `2px solid ${isLocked ? (hasPrediction ? T.lime : T.border) : (isFocused ? T.blue : (isDirty ? T.amber : (hasPrediction ? T.lime : T.border)))}`,
      background: isLocked ? (hasPrediction ? T.limeSoft : T.bgSoft) : (isDirty ? '#FFFBEB' : (hasPrediction ? T.limeSoft : T.bgSoft)),
      textAlign: 'center' as const, fontSize: 22, fontWeight: 800,
      color: isLocked ? (hasPrediction ? T.limeDeep : T.muted) : (isDirty ? T.amber : (hasPrediction ? T.limeDeep : T.ink)),
      outline: 'none',
      WebkitAppearance: 'none' as React.CSSProperties['WebkitAppearance'],
      fontFamily: 'var(--font-jetbrains), monospace',
      cursor: isLocked ? 'default' : 'text',
      transition: 'border-color 200ms, background 200ms',
      caretColor: T.blue,
    };
  };

  return (
    <Card accent={T.blue} style={{ padding: '16px 16px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <Eyebrow style={{ marginBottom: 2 }}>{match.group}</Eyebrow>
          <div style={{ fontSize: 11, color: T.muted }}>{match.date}</div>
          <div style={{ fontSize: 11, color: T.muted, fontStyle: 'italic' }}>{match.stadium}</div>
        </div>
        {isDirty
          ? <Pill color={`${T.amber}20`} textColor={T.amber} size="sm">✎ Editando</Pill>
          : hasPrediction
            ? <Pill color={T.limeSoft} textColor={T.limeDeep} size="sm">✓ Guardado</Pill>
            : <Pill color={T.bgSoft} textColor={T.muted} size="sm">Sin predicción</Pill>}
      </div>

      {/* Teams + Score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
          {match.home.code === 'TBD'
            ? <div style={{ width: 56, height: 56, borderRadius: '50%', background: T.bgSoft, border: `2px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: T.muted }}>?</div>
            : <Flag code={match.home.code} size={56}/>}
          <div className="font-mono" style={{ fontSize: match.home.code === 'TBD' ? 9 : 12, fontWeight: 800, color: match.home.code === 'TBD' ? T.muted : T.ink, textAlign: 'center', letterSpacing: match.home.code === 'TBD' ? 0 : 1, maxWidth: 70, wordBreak: 'break-word', lineHeight: 1.2 }}>
            {match.home.code === 'TBD' ? (match.home.placeholder ?? 'Por definir') : match.home.code}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 0 }}>
          {isTBD ? (
            <div style={{ textAlign: 'center', padding: '12px 0', color: T.muted, fontSize: 12, fontStyle: 'italic' }}>
              Por definir · Equipos aún no clasificados
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number" min={0} max={99} placeholder="–"
                  value={homeScore}
                  readOnly={isLocked}
                  onChange={e => !isLocked && setHomeScore(e.target.value)}
                  onFocus={() => !isLocked && setFocusedSide('home')}
                  onBlur={() => setFocusedSide(null)}
                  style={scoreInputStyle('home')}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <SoccerBall size={18} spinning="2s" style={{ opacity: 0.7 }}/>
                  <span style={{ fontSize: 9, fontWeight: 600, color: T.muted, letterSpacing: 0.5 }}>VS</span>
                </div>
                <input
                  type="number" min={0} max={99} placeholder="–"
                  value={awayScore}
                  readOnly={isLocked}
                  onChange={e => !isLocked && setAwayScore(e.target.value)}
                  onFocus={() => !isLocked && setFocusedSide('away')}
                  onBlur={() => setFocusedSide(null)}
                  style={scoreInputStyle('away')}
                />
              </div>
              {savedAt && !isDirty && (
                <div style={{ fontSize: 9.5, color: T.muted }}>Guardado: {savedAt}</div>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
          {match.away.code === 'TBD'
            ? <div style={{ width: 56, height: 56, borderRadius: '50%', background: T.bgSoft, border: `2px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: T.muted }}>?</div>
            : <Flag code={match.away.code} size={56}/>}
          <div className="font-mono" style={{ fontSize: match.away.code === 'TBD' ? 9 : 12, fontWeight: 800, color: match.away.code === 'TBD' ? T.muted : T.ink, textAlign: 'center', letterSpacing: match.away.code === 'TBD' ? 0 : 1, maxWidth: 70, wordBreak: 'break-word', lineHeight: 1.2 }}>
            {match.away.code === 'TBD' ? (match.away.placeholder ?? 'Por definir') : match.away.code}
          </div>
        </div>
      </div>

      {/* Powers */}
      {powersEnabled && !isTBD && (() => {
        const spyUsed = spyMatchId === match.id;
        const spyUsedElsewhere = usedPowers.has('spy') && !spyUsed;
        const doubleLocked = started && !usedPowers.has('double') && !lateActive;
        const lateLocked   = over45  && !usedPowers.has('late');
        const spyLocked    = spyUsedElsewhere || (started && !spyUsed && !lateActive);
        const showHint = doubleLocked || lateLocked;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 10px', borderTop: `1px solid ${T.borderSoft}`, paddingTop: 10 }}>
            <span style={{ fontSize: 10.5, color: T.muted, fontWeight: 600, flexShrink: 0 }}>Poderes:</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <PowerIcon kind="double" size={34} used={usedPowers.has('double')} locked={doubleLocked} onClick={() => onPower('double')}/>
              <PowerIcon kind="late"   size={34} used={usedPowers.has('late')}   locked={lateLocked}   onClick={() => onPower('late')}/>
              <PowerIcon kind="spy"    size={34} used={usedPowers.has('spy')} locked={spyLocked} allowClickWhenUsed={spyUsed} onClick={() => onPower('spy')}/>
            </div>
            {showHint && !lateActive && (
              <span style={{ fontSize: 9.5, color: T.muted, fontStyle: 'italic' }}>
                {lateLocked ? 'Tiempo agotado' : '×2 bloqueado'}
              </span>
            )}
          </div>
        );
      })()}

      {/* Action button */}
      {isTBD ? (
        <div style={{ width: '100%', padding: '10px', background: T.bgSoft, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12, color: T.muted, textAlign: 'center' }}>
          🕐 Equipos por definir
        </div>
      ) : started && !lateActive ? (
        <div style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.04)', border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12, fontWeight: 600, color: T.muted, textAlign: 'center' }}>
          🔒 Partido en curso — predicción cerrada
        </div>
      ) : canConfirm ? (
        <button onClick={handleConfirm} style={{
          width: '100%', padding: '10px',
          background: T.lime, color: T.ink,
          border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          Confirmar predicción ✓
        </button>
      ) : (
        <button onClick={() => onView(match.id)} style={{
          width: '100%', padding: '10px',
          background: hasPrediction ? T.bgInk : T.lime,
          color: hasPrediction ? '#fff' : T.ink,
          border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          {hasPrediction ? 'Detalles del partido' : 'Agregar mi predicción'}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14m-7-7 7 7-7 7"/>
          </svg>
        </button>
      )}
    </Card>
  );
}

function PowerModal({ kind, matchName, onConfirm, onCancel }: {
  kind: 'double' | 'late'; matchName: string; onConfirm: () => void; onCancel: () => void;
}) {
  const labels = { double: 'Puntos Dobles', late: 'Cambio Tardío', spy: 'Espía' };
  const descs = {
    double: 'Duplica los puntos que ganas de esta predicción si es correcta.',
    late: 'Cambia tu predicción después de que el partido haya comenzado.',
  };
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
        <PowerIcon kind={kind} size={72}/>
      </div>
      <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{labels[kind]}</div>
      <div style={{ fontSize: 13.5, color: T.slate, marginBottom: 16, lineHeight: 1.6 }}>{descs[kind]}</div>
      <div style={{ background: T.bgSoft, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Partido</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{matchName}</div>
      </div>
      <div style={{ fontSize: 12, color: T.rose, fontWeight: 700, marginBottom: 20 }}>⚠️ Esta decisión no se puede cambiar ni eliminar</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={onConfirm} style={{
          width: '100%', padding: '14px', background: T.ink, color: '#fff',
          border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>Confirmar</button>
        <button onClick={onCancel} style={{
          width: '100%', padding: '14px', background: 'transparent', color: T.ink,
          border: `1.5px solid ${T.border}`, borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer',
        }}>Cancelar</button>
      </div>
    </div>
  );
}


// ──────── Tab: Ranking ────────
// Group accent colors
const GROUP_COLORS: Record<string, string> = {
  'Evolve':          '#A3E635',
  'BEPENSA Spirits': '#1AAFFF',
  'ADM':             '#F59E0B',
  'Disney':          '#0063E5',
  'Ruz':             '#8B5CF6',
  'Zuru':            '#22C55E',
  'AJEMEX':          '#EF4444',
  'Delongi':         '#F97316',
  'Hanes':           '#14B8A6',
};

// Drop any PNG/SVG into /public/logos/ with the filename below.
// Cards will show the logo; if the file is missing they fall back to initials.
const GROUP_LOGOS: Record<string, string> = {
  'Evolve':          '/logos/evolve.png',
  'BEPENSA Spirits': '/logos/bepensa.png',
  'ADM':             '/logos/adm.svg',
  'Disney':          '/logos/disney.png',
  'Ruz':             '/logos/ruz.png',
  'Zuru':            '/logos/zuru.png',
  'AJEMEX':          '/logos/ajemex.png',
  'Delongi':         '/logos/delongi.png',
};

function groupInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function GroupLogo({ group, size, colorOverride, logoUrlOverride }: { group: string; size: number; colorOverride?: string; logoUrlOverride?: string | null }) {
  const accent = colorOverride ?? GROUP_COLORS[group] ?? T.blue;
  const logo   = logoUrlOverride ?? GROUP_LOGOS[group];
  const [failed, setFailed] = useState(false);
  // Reset failed when a new URL arrives (e.g. from DB after initial render)
  useEffect(() => { setFailed(false); }, [logo]);

  if (group === 'Evolve' && !logoUrlOverride) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: T.bgInk, border: `2px solid ${accent}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <EvolveMark size={size * 0.55} color={accent}/>
      </div>
    );
  }

  if (logo && !failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: '#fff', border: `1.5px solid ${accent}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        <img
          src={logo} alt={group}
          onError={() => setFailed(true)}
          style={{ width: '80%', height: '80%', objectFit: 'contain' }}
        />
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: accent,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 800, color: '#fff',
    }}>{groupInitials(group)}</div>
  );
}

function TabRanking({ rankings, loading, userId, userName, userGroup, groupAccent = T.lime }: {
  rankings: RankingEntry[]; loading: boolean;
  userId: string; userName: string; userGroup: string; groupAccent?: string;
}) {
  const [subTab, setSubTab] = useState<'grupo' | 'nacional'>('grupo');
  const [podiumVisible, setPodiumVisible] = useState(false);

  const myEntry = rankings.find(e => e.userId === userId);
  const userPoints = myEntry?.points ?? 0;

  // Grupo: only my group, re-ranked 1..N
  const grupoList = useMemo(() => {
    const filtered = rankings.filter(p => p.group_name === userGroup);
    return filtered.map((p, i) => ({ ...p, pos: i + 1 }));
  }, [rankings, userGroup]);

  // Nacional: everyone
  const nacionalList = useMemo(() => rankings, [rankings]);

  const activeList = subTab === 'grupo' ? grupoList : nacionalList;
  const total = activeList.length;
  const userRank = activeList.findIndex(e => e.userId === userId) + 1 || total + 1;

  useEffect(() => {
    setPodiumVisible(false);
    const t = setTimeout(() => setPodiumVisible(true), 150);
    return () => clearTimeout(t);
  }, [userRank, subTab]);

  const top3 = activeList.slice(0, 3);
  const N = 4;

  let winStart: number, winEnd: number;
  if (userRank <= 3) {
    winStart = 4; winEnd = Math.min(total, 4 + N * 2);
  } else {
    winStart = Math.max(4, userRank - N);
    winEnd   = Math.min(total, userRank + N);
    if (winEnd - winStart < N * 2) winStart = Math.max(4, winEnd - N * 2);
  }
  const windowRows = activeList.filter(p => p.pos >= winStart && p.pos <= winEnd);
  const showEllipsis = winStart > 4;

  if (loading) {
    return <div style={{ padding: '40px 14px', textAlign: 'center', color: T.muted, fontSize: 14 }}>Cargando ranking…</div>;
  }
  if (total === 0) {
    return (
      <div style={{ padding: '40px 14px', textAlign: 'center', color: T.muted, fontSize: 14 }}>
        {subTab === 'grupo'
          ? `Todavía no hay jugadores registrados en ${userGroup}.`
          : 'El ranking estará disponible cuando haya jugadores registrados.'}
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 14px 80px' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <Chip active={subTab === 'grupo'} onClick={() => setSubTab('grupo')}>Mi grupo</Chip>
        <Chip active={subTab === 'nacional'} onClick={() => setSubTab('nacional')}>Nacional</Chip>
      </div>

      {/* Prize context note */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
        padding: '8px 12px', borderRadius: 10,
        background: subTab === 'grupo' ? `${groupAccent}18` : T.blueSoft,
        border: `1px solid ${subTab === 'grupo' ? groupAccent + '60' : T.blue + '60'}`,
      }}>
        <span style={{ fontSize: 14 }}>{subTab === 'grupo' ? '🏆' : '🌎'}</span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: subTab === 'grupo' ? groupAccent : T.blueDeep }}>
          {subTab === 'grupo'
            ? `Premios de ${userGroup} — compites con tu grupo`
            : 'Premios nacionales — compites con todos'}
        </span>
      </div>

      <RankingPodium top3={top3} visible={podiumVisible} userRank={userRank} userName={userName} userPoints={userPoints} userId={userId} showGroup={subTab === 'nacional'} groupAccent={groupAccent}/>

      <div style={{ fontSize: 11, color: T.muted, marginBottom: 12, paddingLeft: 2 }}>
        {total.toLocaleString('es-MX')} {subTab === 'grupo' ? `en ${userGroup}` : 'jugadores en total'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {showEllipsis && (
          <div style={{ textAlign: 'center', color: T.muted, fontSize: 18, letterSpacing: 4, padding: '4px 0' }}>···</div>
        )}
        {windowRows.map((player) => {
          const isMe = player.userId === userId;
          const rowName  = isMe ? shortName(userName) : shortName(player.name);
          const cityAbbrev = getCityAbbrev(player.city);
          const rowGroup = subTab === 'nacional' ? (isMe ? userGroup : (player.group_name ?? '')) : undefined;
          // "Nacional": grupo · ciudad — "Mi grupo": solo la ciudad (el grupo es el mismo)
          const rowGroupWithCity = subTab === 'nacional'
            ? ([rowGroup, cityAbbrev].filter(Boolean).join(' · ') || undefined)
            : (cityAbbrev || undefined);
          return (
            <div key={`${subTab}-${player.pos}`} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: isMe ? `${groupAccent}18` : '#fff',
              borderRadius: 12, padding: '10px 14px',
              border: `1.5px solid ${isMe ? groupAccent : T.border}`,
              boxShadow: isMe ? `0 0 0 2px ${groupAccent}30` : T.shadowSm,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: isMe ? groupAccent : T.blueSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12,
                color: isMe ? T.ink : T.blueDeep, flexShrink: 0,
              }}>#{player.pos}</div>
              <Avatar initials={rowName.slice(0, 2).toUpperCase()} size={32} style={{ flexShrink: 0 }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: isMe ? 700 : 600, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {rowName}{isMe && <span style={{ fontSize: 10, color: groupAccent, marginLeft: 6, fontWeight: 700 }}>TÚ</span>}
                </div>
                {rowGroupWithCity && <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{rowGroupWithCity}</div>}
              </div>
              <div className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: T.ink, flexShrink: 0 }}>{player.points} pts</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankingPodium({ top3, visible, userRank, userName, userPoints, userId, showGroup, groupAccent = T.lime }: { top3: RankingEntry[]; visible: boolean; userRank: number; userName: string; userPoints: number; userId: string; showGroup?: boolean; groupAccent?: string }) {
  // Podium order: 2nd (left) · 1st (center) · 3rd (right)
  const order   = [top3[1], top3[0], top3[2]];
  const heights = [96, 132, 72];
  const colors  = ['#94A3B8', '#F59E0B', '#CD7C2F'];
  const ranks   = [2, 1, 3];
  const delays  = ['120ms', '0ms', '240ms'];
  const crowDelay = '480ms';

  return (
    <div style={{
      background: T.bgInk, borderRadius: 20, marginBottom: 16,
      border: `1px solid ${T.borderInk}`, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: T.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Tu posición</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="font-display" style={{ fontSize: 44, fontWeight: 900, color: groupAccent, lineHeight: 1, fontStyle: 'italic' }}>#{userRank}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>{userPoints} pts</span>
          </div>
        </div>
        <Pill color={`${groupAccent}22`} textColor={groupAccent} style={{ fontSize: 13, fontWeight: 700, padding: '8px 14px' }}>🏆 ¡#{userRank}!</Pill>
      </div>

      {/* Podium stage */}
      <div style={{ display: 'flex', alignItems: 'flex-end', padding: '0 16px' }}>
        {order.map((player, i) => {
          const isCenter = i === 1;
          // Slot might be empty if fewer than 3 players — show a ghost placeholder
          if (!player) {
            return (
              <div key={`ghost-${i}`} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                opacity: 0.2,
              }}>
                <div style={{ width: isCenter ? 54 : 42, height: isCenter ? 54 : 42, borderRadius: '50%', background: colors[i] + '44', marginBottom: 6 }}/>
                <div style={{ width: '100%', height: heights[i], borderRadius: '8px 8px 0 0', background: colors[i] + '22', border: `1px solid ${colors[i]}44`, borderBottom: 'none' }}/>
              </div>
            );
          }
          return (
            <div key={player.pos} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              transform: visible ? 'translateY(0)' : 'translateY(64px)',
              opacity: visible ? 1 : 0,
              transition: `transform 700ms cubic-bezier(0.34, 1.45, 0.64, 1) ${delays[i]}, opacity 350ms ease ${delays[i]}`,
            }}>
              {/* Crown (center only) */}
              <div style={{
                fontSize: 22, lineHeight: 1, marginBottom: 4,
                opacity: isCenter ? (visible ? 1 : 0) : 0,
                transform: isCenter ? (visible ? 'translateY(0) rotate(-8deg)' : 'translateY(-20px) rotate(-8deg)') : 'none',
                transition: `opacity 400ms ease ${crowDelay}, transform 500ms cubic-bezier(0.34, 1.7, 0.64, 1) ${crowDelay}`,
              }}>👑</div>

              {/* Avatar */}
              <Avatar
                initials={shortName(player.name).slice(0, 2).toUpperCase()}
                size={isCenter ? 54 : 42}
                ring={colors[i]}
                style={{ marginBottom: 6 }}
              />

              {/* Name + group */}
              <div style={{ marginBottom: 8, textAlign: 'center', maxWidth: '100%', padding: '0 4px' }}>
                <div style={{
                  fontSize: isCenter ? 11.5 : 10, fontWeight: 700, color: '#fff',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {player.userId === userId ? shortName(userName) : shortName(player.name)}
                  {player.userId === userId ? <span style={{ color: groupAccent }}> (tú)</span> : null}
                </div>
                {(() => {
                  // "Nacional": grupo · ciudad — "Mi grupo": solo ciudad
                  const cityAbbrev = getCityAbbrev(player.city);
                  const sub = showGroup
                    ? ([player.group_name, cityAbbrev].filter(Boolean).join(' · ') || null)
                    : (cityAbbrev || null);
                  return sub ? (
                    <div style={{ fontSize: 8.5, color: T.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Platform */}
              <div style={{
                width: '100%', height: heights[i], borderRadius: '8px 8px 0 0',
                background: `linear-gradient(180deg, ${colors[i]}55 0%, ${colors[i]}22 100%)`,
                border: `1px solid ${colors[i]}66`, borderBottom: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              }}>
                <div className="font-display" style={{
                  fontSize: isCenter ? 28 : 22, fontWeight: 900,
                  color: colors[i], lineHeight: 1, fontStyle: 'italic',
                }}>#{ranks[i]}</div>
                <div className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                  {player.points} pts
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────── Tab: Bonus ────────
// Bonus picks close June 11 2026 at 1:00 PM Mexico City time (UTC-6 = 19:00 UTC)
const BONUS_DEADLINE = new Date('2026-06-11T19:00:00Z');

function TabBonus({ fireToast, champSelected, setChampSelected, subSelected, setSubSelected, thirdSelected, goalPlayer, openSub, userGroup }: {
  fireToast: Props['fireToast'];
  champSelected: string; setChampSelected: (v: string) => void;
  subSelected: string;   setSubSelected: (v: string) => void;
  thirdSelected: string; goalPlayer: string;
  openSub: (name: SubScreenName) => void;
  userGroup: string;
}) {
  const [settings, setSettings] = useState<GroupSettings | null>(null);
  useEffect(() => {
    if (userGroup) getGroupSettings(userGroup).then(setSettings).catch(console.error);
  }, [userGroup]);

  const bonusLocked = Date.now() >= BONUS_DEADLINE.getTime();

  const bonusPrize = (type: string | undefined, value: string | null | undefined): string => {
    if (!value) return '';
    return type === 'puntos' ? `+${value} pts` : value;
  };

  const cards = [
    { label: 'CAMPEÓN',     color: T.lime,  sub: 'campeon'   as SubScreenName, sel: champSelected,  clear: () => setChampSelected(''),  kind: 'country' as const, prize: bonusPrize(settings?.bonus_champ_type,  settings?.bonus_champ_value)  },
    { label: 'GOLEADOR',    color: T.amber, sub: 'goleador'  as SubScreenName, sel: goalPlayer,     clear: () => {},                    kind: 'player'  as const, prize: bonusPrize(settings?.bonus_scorer_type, settings?.bonus_scorer_value) },
    { label: 'SUBCAMPEÓN',  color: T.blue,  sub: 'subcampeon'as SubScreenName, sel: subSelected,    clear: () => setSubSelected(''),    kind: 'country' as const, prize: bonusPrize(settings?.bonus_runner_type, settings?.bonus_runner_value) },
    { label: 'TERCER LUGAR',color: T.rose,  sub: 'tercero'   as SubScreenName, sel: thirdSelected,  clear: () => {},                    kind: 'country' as const, prize: bonusPrize(settings?.bonus_third_type,  settings?.bonus_third_value)  },
  ];

  return (
    <div style={{ padding: '14px 14px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 4 }}>🏆 ¡Gana premios extra!</div>
        <div style={{ fontSize: 13, color: T.slate, lineHeight: 1.5 }}>Haz tus predicciones especiales y escala en el ranking.</div>
      </div>

      {/* Deadline banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
        borderRadius: 12, marginBottom: 4,
        background: bonusLocked ? 'rgba(244,63,94,0.08)' : 'rgba(245,158,11,0.08)',
        border: `1px solid ${bonusLocked ? 'rgba(244,63,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
      }}>
        <span style={{ fontSize: 16 }}>{bonusLocked ? '🔒' : '⏰'}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: bonusLocked ? T.rose : T.amber }}>
          {bonusLocked
            ? 'Picks bonus cerrados — jue. 11 jun. 2026 01:00 pm'
            : 'Cierre: jue. 11 jun. 2026 01:00 pm'}
        </span>
      </div>

      {cards.map((card) => (
        <div key={card.label} style={{ borderRadius: 18, padding: '18px 20px', background: T.bgInk, border: `1px solid ${T.borderInk}`, opacity: bonusLocked ? 0.75 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: card.color, letterSpacing: 1.2, textTransform: 'uppercase' }}>{card.label}</div>
            {card.prize ? (
              <Pill color={`${card.color}25`} textColor={card.color}>{card.prize}</Pill>
            ) : null}
          </div>
          {card.sel ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {card.kind === 'country'
                ? <Flag code={card.sel} size={64}/>
                : <Flag code={GOLEADORES.find(g => g.name === card.sel)?.country ?? 'MEX'} size={64}/>
              }
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                  {card.kind === 'country' ? (SELECCIONES.find(s => s[0] === card.sel)?.[1] ?? card.sel) : card.sel}
                </div>
                {!bonusLocked && (
                  <button onClick={() => openSub(card.sub)}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: card.color, cursor: 'pointer', fontWeight: 600, padding: '4px 0', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                    Cambiar
                  </button>
                )}
              </div>
            </div>
          ) : bonusLocked ? (
            <div style={{ textAlign: 'center', padding: '10px', fontSize: 13, color: T.muted, fontStyle: 'italic' }}>
              🔒 Sin selección — cierre pasado
            </div>
          ) : (
            <button onClick={() => openSub(card.sub)} style={{
              width: '100%', padding: '12px', background: `${card.color}18`,
              border: `1.5px solid ${card.color}40`, borderRadius: 10,
              color: card.color, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {card.kind === 'player' ? 'Selecciona el goleador' : 'Selecciona una selección'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ──────── Group metadata ────────
interface GroupInfo { label: string; description: string }
const GROUP_INFO: Record<string, GroupInfo> = {
  'Evolve':          { label: 'Grupo Evolve',    description: 'Quiniela oficial del programa Grupo Evolve para el Torneo 2026' },
  'BEPENSA Spirits': { label: 'BEPENSA Spirits', description: 'Quiniela del equipo BEPENSA Spirits para el Mundial 2026' },
  'ADM':             { label: 'Grupo ADM',       description: 'Quiniela interna ADM — ¿quién se lleva el trofeo?' },
  'Disney':          { label: 'Disney',          description: 'Quiniela Disney para el Mundial 2026 — que gane la magia' },
  'Ruz':             { label: 'Grupo Ruz',       description: 'Quiniela del equipo Ruz para el Torneo 2026' },
  'Zuru':            { label: 'Zuru',            description: 'Quiniela Zuru — predicciones al máximo nivel' },
  'AJEMEX':          { label: 'AJEMEX',          description: 'Quiniela oficial AGEMEX para el Mundial 2026' },
  'Delongi':         { label: "De'Longhi",       description: "Quiniela De'Longhi — el mejor café, las mejores predicciones" },
  'Hanes':           { label: 'Hanes',           description: 'Quiniela Hanes para el Mundial 2026' },
};
function getGroupInfo(group: string): GroupInfo {
  return GROUP_INFO[group] ?? { label: group || 'Mi Grupo', description: `Quiniela del grupo ${group || 'Evolve'} para el Torneo 2026` };
}

function GroupAvatar({ group, size = 80, colorOverride, logoUrlOverride }: { group: string; size?: number; colorOverride?: string; logoUrlOverride?: string | null }) {
  const [failed, setFailed] = useState(false);
  const col = colorOverride ?? GROUP_COLORS[group] ?? '#A3E635';
  const logo = logoUrlOverride ?? GROUP_LOGOS[group];
  // Reset failed when a new URL arrives (e.g. from DB after initial render)
  useEffect(() => { setFailed(false); }, [logo]);
  if (group === 'Evolve' && !logoUrlOverride) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: T.bgInkRaised, border: `2px solid ${col}`, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <EvolveMark size={size * 0.55} color={col}/>
    </div>
  );
  if (logo && !failed) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#fff', border: `2px solid ${col}44`, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <img src={logo} alt={group} onError={() => setFailed(true)} style={{ width: '80%', height: '80%', objectFit: 'contain' }}/>
    </div>
  );
  const initials = group.trim().split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: col, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.3, fontWeight: 800, color: '#fff' }}>{initials}</div>
  );
}

// ──────── Tab: Detalles ────────
function TabDetalles({ goto, openSub, userGroup, rankings, groupAccent = T.lime, groupLogoUrl, powersEnabled = true }: { goto: (s: string) => void; openSub: (name: SubScreenName) => void; userGroup: string; rankings: RankingEntry[]; groupAccent?: string; groupLogoUrl?: string | null; powersEnabled?: boolean }) {
  const [settings, setSettings] = useState<GroupSettings | null>(null);
  useEffect(() => {
    if (userGroup) getGroupSettings(userGroup).then(setSettings).catch(console.error);
  }, [userGroup]);

  const prizes = [
    { icon: '🥇', label: '1er Lugar', color: '#F59E0B', val: settings?.prize_1st?.trim() || null },
    { icon: '🥈', label: '2do Lugar', color: '#94A3B8', val: settings?.prize_2nd?.trim() || null },
    { icon: '🥉', label: '3er Lugar', color: '#CD7C2F', val: settings?.prize_3rd?.trim() || null },
  ];

  const grp = getGroupInfo(userGroup);
  const memberCount = rankings.filter(p => p.group_name === userGroup).length;

  return (
    <div style={{ padding: '14px 14px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Group hero */}
      <div style={{ borderRadius: 18, padding: '24px 20px', background: T.bgInk, border: `1px solid ${T.borderInk}`, textAlign: 'center' }}>
        <GroupAvatar group={userGroup} size={80} colorOverride={groupAccent} logoUrlOverride={groupLogoUrl}/>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{grp.label}</div>
        <Pill color={`${groupAccent}25`} textColor={groupAccent}>Miembros: {memberCount}</Pill>
      </div>

      {/* Description */}
      <Card accent={groupAccent}>
        <div style={{ paddingLeft: 10 }}>
          <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Descripción del grupo</div>
          <div style={{ fontSize: 13, color: T.slate, lineHeight: 1.6 }}>{grp.description}</div>
        </div>
      </Card>

      {/* Prizes */}
      <button onClick={() => goto('premios')} style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%',
      }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>🏆</span>
              <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Premios</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          {prizes.map(p => (
            <div key={p.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{p.icon}</span>
                <span style={{ fontSize: 12, color: T.slate }}>{p.label}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: p.val ? p.color : T.muted }}>
                {p.val ?? 'Por definir'}
              </span>
            </div>
          ))}
        </Card>
      </button>

      {/* Powers */}
      {powersEnabled && <Card>
        <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 14 }}>Poderes activos</div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {(['double', 'late', 'spy'] as const).map(kind => (
            <button key={kind} onClick={() => openSub(`poder-${kind}` as SubScreenName)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <PowerIcon kind={kind} size={44} label/>
            </button>
          ))}
        </div>
      </Card>}

      {/* Points system */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Sistema de Puntos</div>
            <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>Cómo se calculan los puntos por fase</div>
          </div>
          <button
            onClick={() => openSub('puntos')}
            style={{
              width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`,
              background: T.bgSoft, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </Card>

      <button style={{ padding: '12px', background: 'transparent', border: `1.5px solid ${T.rose}`, borderRadius: 12, color: T.rose, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
        Salir del grupo
      </button>

    </div>
  );
}

// ──────── Sub-screens (full-screen replacements) ────────
function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ padding: '10px 14px', background: '#fff', borderBottom: `1px solid ${T.border}` }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: T.bgSoft, borderRadius: 10,
        border: `1.5px solid ${value ? T.blue : T.border}`,
        padding: '9px 12px', transition: 'border-color 200ms',
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder="Buscar…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: T.ink, background: 'transparent', fontFamily: 'inherit' }}
        />
        {value && (
          <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: T.muted, display: 'flex' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function TorneoSubScreen({ screen, onBack, onSelectCountry, onSelectPlayer }: {
  screen: SubScreenName;
  onBack: () => void;
  fireToast: Props['fireToast'];
  onSelectCountry: (code: string) => void;
  onSelectPlayer: (name: string) => void;
}) {
  const [search, setSearch] = useState('');

  const titles: Record<SubScreenName, string> = {
    puntos:        'Sistema de Puntos',
    campeon:       'Selecciona el Campeón',
    goleador:      'Selecciona el Goleador',
    subcampeon:    'Selecciona el Subcampeón',
    tercero:       'Selecciona el 3er Lugar',
    'poder-double':'Puntos Dobles',
    'poder-late':  'Cambio Tardío',
    'poder-spy':   'Espía',
  };

  if (screen === 'poder-double' || screen === 'poder-late' || screen === 'poder-spy') {
    const kind = screen.replace('poder-', '') as 'double' | 'late' | 'spy';
    const info: Record<'double' | 'late' | 'spy', { color: string; tag: string; what: string; how: string; example: string }> = {
      double: {
        color: T.amber,
        tag: '×2',
        what: 'Duplica los puntos que ganas si tu predicción es correcta.',
        how: 'Actívalo antes de que inicie el partido en la pantalla de detalle del partido. Si aciertas el ganador, tus puntos se multiplican por 2. Si además aciertas el marcador exacto, también se duplican los puntos extra.',
        example: 'Si un partido de Grupos vale 1 pt y lo aciertas con Puntos Dobles activo, ganas 2 pts. Si además aciertas el marcador exacto, suman 6 pts en total.',
      },
      late: {
        color: T.blue,
        tag: '⏱',
        what: 'Te permite editar tu predicción y activar poderes bloqueados hasta 45 minutos después de que haya iniciado el partido.',
        how: 'Actívalo durante los primeros 45 minutos del partido. Una vez activo, puedes cambiar tu predicción y usar poderes como ×2 que normalmente se bloquean al inicio. Pasados los 45 min ya no es posible activarlo.',
        example: 'Si predijiste 1-0 pero a los 30\' el marcador va 0-2, activa Cambio Tardío, ajusta tu predicción y además activa ×2 para duplicar tus puntos.',
      },
      spy: {
        color: T.lime,
        tag: '👁',
        what: 'Revela cómo se distribuyen las predicciones de todos los participantes del grupo para ese partido.',
        how: 'Actívalo en cualquier partido antes de hacer tu predicción. Verás cuántas personas predijeron cada marcador, ordenado de mayor a menor, con porcentajes.',
        example: 'Si 847 personas predijeron 2-1 y solo 100 predijeron 0-1, puedes decidir si seguir a la mayoría o ir contra la corriente.',
      },
    };
    const p = info[kind];
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgSubtle, overflow: 'hidden' }}>
        <Header title={titles[screen]} onBack={onBack}/>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Icon hero */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0 16px' }}>
            <PowerIcon kind={kind} size={80}/>
            <div style={{
              display: 'inline-block', padding: '4px 14px',
              background: `${p.color}20`, borderRadius: 20,
              fontSize: 12, fontWeight: 700, color: p.color, letterSpacing: 0.5,
            }}>
              Un solo uso · Todo el torneo
            </div>
          </div>

          {/* What */}
          <Card accent={p.color} style={{ overflow: 'visible' }}>
            <div style={{ paddingLeft: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>¿Qué hace?</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.6 }}>{p.what}</div>
            </div>
          </Card>

          {/* How */}
          <Card style={{ overflow: 'visible' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>¿Cómo se usa?</div>
            <div style={{ fontSize: 13, color: T.slate, lineHeight: 1.7 }}>{p.how}</div>
          </Card>

          {/* Example */}
          <div style={{ background: `${p.color}12`, border: `1.5px solid ${p.color}30`, borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: p.color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Ejemplo</div>
            <div style={{ fontSize: 13, color: T.slate, lineHeight: 1.7 }}>{p.example}</div>
          </div>

          {/* Warning */}
          <div style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
            <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6, fontWeight: 500 }}>
              Solo puedes usar este poder <strong>una vez en todo el torneo</strong>. Una vez activado no se puede revertir, así que úsalo en el momento que más te convenga.
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (screen === 'puntos') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgSubtle, overflow: 'hidden' }}>
        <Header title={titles.puntos} onBack={onBack}/>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 40px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', color: T.muted, fontWeight: 600, fontSize: 12 }}>Fase</th>
                <th style={{ padding: '14px 8px', textAlign: 'center', color: T.muted, fontWeight: 600, fontSize: 12 }}>Ganador</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', color: T.muted, fontWeight: 600, fontSize: 12 }}>+ Exacto</th>
              </tr>
            </thead>
            <tbody>
              {[['Grupos','1 pt','3 pts'],['16avos','2 pts','4 pts'],['Octavos','3 pts','5 pts'],['Cuartos','4 pts','6 pts'],['Semis','5 pts','7 pts'],['Final','6 pts','8 pts']].map(([fase, pts, exact]) => (
                <tr key={fase} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: T.ink }}>{fase}</td>
                  <td style={{ padding: '14px 8px', textAlign: 'center', fontWeight: 700, color: T.blue, fontSize: 15 }}>{pts}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: T.limeDeep, fontSize: 15 }}>{exact}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.7, marginTop: 16, fontStyle: 'italic', textAlign: 'center' }}>
            El marcador exacto otorga +2 pts adicionales al acertar al ganador. Si no aciertas el ganador, no ganas puntos aunque hayas predicho los goles correctamente.
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'goleador') {
    const q = norm(search.trim());
    const filteredPlayers = q
      ? GOLEADORES.filter(p => norm(p.name).includes(q) || norm(p.role).includes(q) || norm(p.country).includes(q))
      : GOLEADORES;

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgSubtle, overflow: 'hidden' }}>
        <Header title={titles.goleador} onBack={onBack}/>
        <SearchBar value={search} onChange={setSearch}/>
        <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
          {filteredPlayers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: T.muted }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Sin resultados</div>
            </div>
          ) : filteredPlayers.map(p => (
            <button key={p.name} onClick={() => onSelectPlayer(p.name)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: `1px solid ${T.borderSoft}`, textAlign: 'left',
            }}>
              <Flag code={p.country} size={36}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{p.name}</div>
                <div style={{ fontSize: 12, color: T.muted }}>{p.role}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Country selector (campeon, subcampeon, tercero)
  const q = norm(search.trim());
  const filteredCountries = q
    ? SELECCIONES.filter(([code, name]) =>
        norm(name).includes(q) || norm(code).includes(q) ||
        (TEAM_ALIASES[code] ?? []).some(a => norm(a).includes(q))
      )
    : SELECCIONES;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgSubtle, overflow: 'hidden' }}>
      <Header title={titles[screen]} onBack={onBack}/>
      <SearchBar value={search} onChange={setSearch}/>
      <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
        {filteredCountries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: T.muted }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Sin resultados</div>
          </div>
        ) : filteredCountries.map(([code, name]) => (
          <button key={code} onClick={() => onSelectCountry(code)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: `1px solid ${T.borderSoft}`, textAlign: 'left',
          }}>
            <Flag code={code} size={40}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: T.ink }}>{name}</div>
              <div className="font-mono" style={{ fontSize: 11, color: T.muted, letterSpacing: 1 }}>{code}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
