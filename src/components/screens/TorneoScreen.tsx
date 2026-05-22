'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { theme as T } from '@/lib/theme';
import { MATCHES, KNOCKOUT_MATCHES, MOCK_RESULTS, resolveSlots, computeSlots, isMatchPast, isMatchStarted, isMatchOver45Min, DEMO_LIVE_MATCH, DEMO_PAST_IDS, PREDICTION_DISTRIBUTIONS, RANKING, GOLEADORES, SELECCIONES, USER, STADIUM_ALIASES, TEAM_ALIASES, type Match, type PredictionBucket, type SlotMap, type LiveMatch } from '@/lib/data';
import { getInitials, type AppUser } from '@/lib/supabase';
import { useLiveMatch } from '@/hooks/useLiveMatch';
import { loadPrediction, loadBonus, saveBonus } from '@/lib/predictions';
import {
  Header, Avatar, Pill, Chip, Card,
  PowerIcon, BottomSheet, Modal, Eyebrow,
} from '@/components/ui';
import { SpyModal } from '@/components/screens/SpyModal';
import { EvolveMark } from '@/components/brand/EvolveMark';
import { Flag } from '@/components/flags/Flag';
import { BallIcon, SoccerBall } from '@/components/ball/SoccerBall';
import { WorldCupTrophy } from '@/components/trophy/WorldCupTrophy';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Suppress click events that fire as a side-effect of scroll momentum
let _lastScrollMs = 0;
const markScrolled = () => { _lastScrollMs = Date.now(); };
const wasScrolling = () => Date.now() - _lastScrollMs < 350;

type Tab = 'predicciones' | 'ranking' | 'bonus' | 'detalles';

interface Props {
  goto: (s: string, matchId?: string) => void;
  tweaks: { premium: boolean; filled: boolean; liveMatch: boolean; liveMinute?: number; pastMatch: boolean; knockoutSlots: boolean; rank?: number };
  fireToast: (msg: string, color?: string, textColor?: string) => void;
  usedPowers?: Set<string>;
  setUsedPowers?: React.Dispatch<React.SetStateAction<Set<string>>>;
  lateActiveMatchId?: string | null;
  setLateActiveMatchId?: (id: string | null) => void;
  spyMatchId?: string | null;
  setSpyMatchId?: (id: string | null) => void;
  currentUser?: AppUser | null;
}

type SubScreenName = 'puntos' | 'campeon' | 'goleador' | 'subcampeon' | 'tercero' | 'poder-double' | 'poder-late' | 'poder-spy';

// ─── Month index for Spanish date strings ────────────────────────────────────
const MONTH_IDX_MAP: Record<string, number> = {
  'ene.':0,'feb.':1,'mar.':2,'abr.':3,'may.':4,'jun.':5,
  'jul.':6,'ago.':7,'sep.':8,'oct.':9,'nov.':10,'dic.':11,
};

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

export function TorneoScreen({ goto, tweaks, fireToast, usedPowers, setUsedPowers, lateActiveMatchId, setLateActiveMatchId, spyMatchId, setSpyMatchId, currentUser }: Props) {
  const displayUser = currentUser ?? USER;
  const displayName     = currentUser?.name       ?? USER.name;
  const displayGroup    = currentUser?.group_name  ?? USER.group;
  const displayInitials = currentUser ? getInitials(currentUser.name) : USER.avatar;
  const [tab, setTab] = useState<Tab>('predicciones');
  const [subScreen, setSubScreen] = useState<SubScreenName | null>(null);

  // Bonus selections — initialised from localStorage so they persist across sessions
  const [champSelected, setChampSelected] = useState(() => loadBonus()?.champCode ?? 'ESP');
  const [subSelected,   setSubSelected]   = useState(() => loadBonus()?.subCode   ?? 'NED');
  const [thirdSelected, setThirdSelected] = useState(() => loadBonus()?.thirdCode ?? '');
  const [goalPlayer,    setGoalPlayer]    = useState(() => loadBonus()?.goalPlayer ?? '');

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
          <div style={{
            width: 50, height: 50, borderRadius: '50%',
            background: T.bgInk,
            border: `2px solid ${T.lime}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <EvolveMark size={28} color={T.lime}/>
          </div>
          <div style={{ fontSize: 8, fontWeight: 700, color: T.ink, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, textAlign: 'center', lineHeight: 1.2, whiteSpace: 'nowrap' }}>Grupo<br/>Evolve</div>
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
        {tab === 'predicciones' && <TabPredicciones goto={goto} tweaks={tweaks} fireToast={fireToast} usedPowers={usedPowers} setUsedPowers={setUsedPowers} lateActiveMatchId={lateActiveMatchId} setLateActiveMatchId={setLateActiveMatchId} spyMatchId={spyMatchId} setSpyMatchId={setSpyMatchId}/>}
        {tab === 'ranking'      && <TabRanking userRank={tweaks.rank ?? USER.rank} userName={displayName} userGroup={displayGroup} userCity={USER.city} userPoints={USER.points}/>}
        {tab === 'bonus'        && (
          <TabBonus
            fireToast={fireToast}
            champSelected={champSelected} setChampSelected={setChampSelected}
            subSelected={subSelected} setSubSelected={setSubSelected}
            thirdSelected={thirdSelected} goalPlayer={goalPlayer}
            openSub={openSub}
          />
        )}
        {tab === 'detalles'     && <TabDetalles goto={goto} openSub={openSub} userGroup={displayGroup}/>}
      </div>

    </div>
  );
}

// ──────── Tab: Predicciones ────────
function TabPredicciones({ goto, tweaks, fireToast, usedPowers: usedPowersFromParent, setUsedPowers: setUsedPowersFromParent, lateActiveMatchId: lateActiveMatchIdFromParent, setLateActiveMatchId: setLateActiveMatchIdFromParent, spyMatchId: spyMatchIdFromParent, setSpyMatchId: setSpyMatchIdFromParent }: Props) {
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [onlyUnpredicted, setOnlyUnpredicted] = useState(false);
  const [modal, setModal] = useState<null | { kind: 'double' | 'late'; match: Match }>(null);
  const [spyModal, setSpyModal] = useState<null | { match: Match; phase: 'confirm' | 'results' }>(null);
  const [localUsedPowers, setLocalUsedPowers] = useState<Set<string>>(new Set(tweaks.premium ? [] : ['double', 'late', 'spy']));
  const [localLateMatchId, setLocalLateMatchId] = useState<string | null>(null);
  const [localSpyMatchId, setLocalSpyMatchId] = useState<string | null>(null);

  const usedPowers = usedPowersFromParent ?? localUsedPowers;
  const setUsedPowers = setUsedPowersFromParent ?? setLocalUsedPowers;
  const lateActiveMatchId = lateActiveMatchIdFromParent !== undefined ? lateActiveMatchIdFromParent : localLateMatchId;
  const setLateActiveMatchId = setLateActiveMatchIdFromParent ?? setLocalLateMatchId;
  const spyMatchId = spyMatchIdFromParent !== undefined ? spyMatchIdFromParent : localSpyMatchId;
  const setSpyMatchId = setSpyMatchIdFromParent ?? setLocalSpyMatchId;

  const liveMatch = useLiveMatch(tweaks.liveMatch ? { ...DEMO_LIVE_MATCH, minute: tweaks.liveMinute ?? DEMO_LIVE_MATCH.minute } : undefined);

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
    const groupMatches = MATCHES.filter(m => !isMatchPast(m.date) && !(tweaks.pastMatch && DEMO_PAST_IDS.has(m.id)));
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
    // Read saved predictions from localStorage only when the filter is active
    const savedPreds = new Set<string>();
    if (onlyUnpredicted && typeof window !== 'undefined') {
      for (const m of allMatches) {
        if (localStorage.getItem(`evo_pred_${m.id}`)) savedPreds.add(m.id);
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
    if (kind === 'double' && isMatchStarted(match.date) && lateActiveMatchId !== match.id) {
      setModal(null);
      fireToast('El partido ya inició, no puedes activar ×2', T.rose, '#fff');
      return;
    }
    if (kind === 'late' && isMatchOver45Min(match.date)) {
      setModal(null);
      fireToast('Ya pasaron los 45 min, no puedes activar Cambio Tardío', T.rose, '#fff');
      return;
    }
    if (kind === 'late') setLateActiveMatchId(match.id);
    setUsedPowers(prev => new Set([...prev, kind]));
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
                lateActiveMatchId={lateActiveMatchId}
                spyMatchId={spyMatchId}
                matchStarted={isMatchStarted(match.date) || liveMatch?.matchId === match.id}
                matchOver45={isMatchOver45Min(match.date) || (liveMatch?.matchId === match.id && (liveMatch?.minute ?? 0) >= 45)}
                onPower={(kind) => {
                  if (kind === 'spy') setSpyModal({ match, phase: spyMatchId === match.id ? 'results' : 'confirm' });
                  else setModal({ kind, match });
                }}
                onView={(id) => goto('detalle', id)}
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
              if (spyModal) setSpyMatchId(spyModal.match.id);
              setSpyModal(s => s ? { ...s, phase: 'results' } : null);
            }}
            onClose={() => setSpyModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function MatchCard({ match, usedPowers, lateActiveMatchId, spyMatchId, matchStarted, matchOver45, onPower, onView }: {
  match: Match;
  usedPowers: Set<string>;
  lateActiveMatchId: string | null;
  spyMatchId?: string | null;
  matchStarted?: boolean;
  matchOver45?: boolean;
  onPower: (kind: 'double' | 'late' | 'spy') => void;
  onView: (matchId: string) => void;
}) {
  const localSaved = loadPrediction(match.id);
  const saved = localSaved ?? (match.prediction
    ? { home: match.prediction[0], away: match.prediction[1], savedAt: '' }
    : null);
  const hasPrediction = saved !== null;

  const ScoreBox = ({ value }: { value: number | null }) => (
    <div style={{
      width: 48, height: 48, borderRadius: 10,
      border: `2px solid ${hasPrediction ? T.lime : T.border}`,
      background: hasPrediction ? T.limeSoft : T.bgSoft,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 22, fontWeight: 800,
      color: hasPrediction ? T.limeDeep : T.muted,
      fontFamily: 'var(--font-jetbrains), monospace',
    }}>
      {value !== null ? value : '–'}
    </div>
  );

  return (
    <Card accent={T.blue} style={{ padding: '16px 16px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <Eyebrow style={{ marginBottom: 2 }}>{match.group}</Eyebrow>
          <div style={{ fontSize: 11, color: T.muted }}>{match.date}</div>
          <div style={{ fontSize: 11, color: T.muted, fontStyle: 'italic' }}>{match.stadium}</div>
        </div>
        {hasPrediction
          ? <Pill color={T.limeSoft} textColor={T.limeDeep} size="sm">✓ Guardado</Pill>
          : <Pill color={T.bgSoft} textColor={T.muted} size="sm">Sin predicción</Pill>}
      </div>

      {/* Teams + Score (read-only) */}
      {(() => {
        const isTBD = match.home.code === 'TBD' || match.away.code === 'TBD';
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
              {match.home.code === 'TBD' ? (
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: T.bgSoft, border: `2px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: T.muted }}>?</div>
              ) : (
                <Flag code={match.home.code} size={56}/>
              )}
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
                    <ScoreBox value={saved?.home ?? null}/>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <SoccerBall size={18} spinning="2s" style={{ opacity: 0.7 }}/>
                      <span style={{ fontSize: 9, fontWeight: 600, color: T.muted, letterSpacing: 0.5 }}>VS</span>
                    </div>
                    <ScoreBox value={saved?.away ?? null}/>
                  </div>
                  {saved?.savedAt && (
                    <div style={{ fontSize: 9.5, color: T.muted }}>Guardado: {saved.savedAt}</div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
              {match.away.code === 'TBD' ? (
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: T.bgSoft, border: `2px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: T.muted }}>?</div>
              ) : (
                <Flag code={match.away.code} size={56}/>
              )}
              <div className="font-mono" style={{ fontSize: match.away.code === 'TBD' ? 9 : 12, fontWeight: 800, color: match.away.code === 'TBD' ? T.muted : T.ink, textAlign: 'center', letterSpacing: match.away.code === 'TBD' ? 0 : 1, maxWidth: 70, wordBreak: 'break-word', lineHeight: 1.2 }}>
                {match.away.code === 'TBD' ? (match.away.placeholder ?? 'Por definir') : match.away.code}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Powers */}
      {match.home.code !== 'TBD' && match.away.code !== 'TBD' && (() => {
        const lateActive = lateActiveMatchId === match.id;
        const started = matchStarted ?? isMatchStarted(match.date);
        const over45  = matchOver45 ?? isMatchOver45Min(match.date);
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

      {(() => {
        if (match.home.code === 'TBD' || match.away.code === 'TBD') {
          return (
            <div style={{ width: '100%', padding: '10px', background: T.bgSoft, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12, color: T.muted, textAlign: 'center' }}>
              🕐 Equipos por definir
            </div>
          );
        }
        const lateActive = lateActiveMatchId === match.id;
        const locked = matchStarted && !lateActive;
        if (locked) {
          return (
            <div style={{
              width: '100%', padding: '10px',
              background: 'rgba(0,0,0,0.04)', border: `1px solid ${T.border}`,
              borderRadius: 10, fontSize: 12, fontWeight: 600,
              color: T.muted, textAlign: 'center',
            }}>
              🔒 Partido en curso — predicción cerrada
            </div>
          );
        }
        return (
          <button onClick={() => onView(match.id)} style={{
            width: '100%', padding: '10px',
            background: hasPrediction ? T.bgInk : T.lime,
            color: hasPrediction ? '#fff' : T.ink,
            border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {hasPrediction ? 'Editar predicción' : 'Agregar mi predicción'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14m-7-7 7 7-7 7"/>
            </svg>
          </button>
        );
      })()}
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
  'AGEMEX':          '#EF4444',
  'Delongi':         '#F97316',
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
  'AGEMEX':          '/logos/agemex.png',
  'Delongi':         '/logos/delongi.png',
};

function groupInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function GroupLogo({ group, size }: { group: string; size: number }) {
  const accent = GROUP_COLORS[group] ?? T.blue;
  const logo   = GROUP_LOGOS[group];
  const [failed, setFailed] = useState(false);

  if (group === 'Evolve') {
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

function TabRanking({ userRank, userName, userGroup, userCity, userPoints }: {
  userRank: number; userName: string; userGroup: string; userCity: string; userPoints: number;
}) {
  const [subTab, setSubTab] = useState('Grupo');
  const [podiumVisible, setPodiumVisible] = useState(false);
  const subTabs = ['Grupo', 'Nacional'];

  useEffect(() => {
    setPodiumVisible(false);
    const t = setTimeout(() => setPodiumVisible(true), 150);
    return () => clearTimeout(t);
  }, [userRank, subTab]);

  // Grupo: only MY group, re-ranked 1..N
  const grupoList = useMemo(() =>
    RANKING.filter(p => p.group === userGroup).map((p, i) => ({ ...p, pos: i + 1 }))
  , [userGroup]);

  // Nacional: all users
  const nacionalList = RANKING;

  const activeList = subTab === 'Grupo' ? grupoList : nacionalList;
  const total = activeList.length;
  const activeRank = Math.min(userRank, total);
  const top3 = activeList.slice(0, 3);
  const N = 4;

  let winStart: number, winEnd: number;
  if (activeRank <= 3) {
    winStart = 4; winEnd = Math.min(total, 4 + N * 2);
  } else {
    winStart = Math.max(4, activeRank - N);
    winEnd   = Math.min(total, activeRank + N);
    if (winEnd - winStart < N * 2) winStart = Math.max(4, winEnd - N * 2);
  }
  const windowRows = activeList.filter(p => p.pos >= winStart && p.pos <= winEnd);
  const showEllipsis = winStart > 4;

  return (
    <div style={{ padding: '12px 14px 80px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {subTabs.map(s => <Chip key={s} active={subTab === s} onClick={() => setSubTab(s)}>{s}</Chip>)}
      </div>

      <RankingPodium top3={top3} visible={podiumVisible} userRank={activeRank} userName={userName} userPoints={userPoints}/>

      <div style={{ fontSize: 11, color: T.muted, marginBottom: 12, paddingLeft: 2 }}>
        {total.toLocaleString('es-MX')} {subTab === 'Grupo' ? `en ${userGroup}` : 'jugadores en total'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {showEllipsis && (
          <div style={{ textAlign: 'center', color: T.muted, fontSize: 18, letterSpacing: 4, padding: '4px 0' }}>···</div>
        )}
        {windowRows.map((player) => {
          const isMe = player.pos === activeRank;
          const displayName  = isMe ? userName  : player.name;
          const displayGroup = isMe ? userGroup : player.group;
          const displayCity  = isMe ? userCity  : player.city;
          return (
            <div key={`${subTab}-${player.pos}`} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: isMe ? T.limeSoft : '#fff',
              borderRadius: 12, padding: '10px 14px',
              border: `1.5px solid ${isMe ? T.lime : T.border}`,
              boxShadow: isMe ? `0 0 0 2px ${T.lime}30` : T.shadowSm,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: isMe ? T.lime : T.blueSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12,
                color: isMe ? T.limeDeep : T.blueDeep, flexShrink: 0,
              }}>#{player.pos}</div>
              <Avatar initials={displayName.slice(0, 2).toUpperCase()} size={32} style={{ flexShrink: 0 }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: isMe ? 700 : 600, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayName}{isMe && <span style={{ fontSize: 10, color: T.limeDeep, marginLeft: 6, fontWeight: 700 }}>TÚ</span>}
                </div>
                <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>{displayGroup} · {displayCity}</div>
              </div>
              <div className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: T.ink, flexShrink: 0 }}>{player.pts} pts</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankingPodium({ top3, visible, userRank, userName, userPoints }: { top3: typeof RANKING; visible: boolean; userRank: number; userName: string; userPoints: number }) {
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
            <span className="font-display" style={{ fontSize: 44, fontWeight: 900, color: T.lime, lineHeight: 1, fontStyle: 'italic' }}>#{userRank}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>{userPoints} pts</span>
          </div>
        </div>
        <Pill color={`${T.lime}22`} textColor={T.lime} style={{ fontSize: 13, fontWeight: 700, padding: '8px 14px' }}>🏆 ¡#{userRank}!</Pill>
      </div>

      {/* Podium stage */}
      <div style={{ display: 'flex', alignItems: 'flex-end', padding: '0 16px' }}>
        {order.map((player, i) => {
          const isCenter = i === 1;
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
                initials={player.name.slice(0, 2).toUpperCase()}
                size={isCenter ? 54 : 42}
                ring={colors[i]}
                style={{ marginBottom: 6 }}
              />

              {/* Name */}
              <div style={{
                fontSize: isCenter ? 11.5 : 10, fontWeight: 700, color: '#fff',
                marginBottom: 8, textAlign: 'center',
                maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                padding: '0 4px',
              }}>
                {player.pos === userRank ? userName.split(' ')[0] : player.name.split(' ')[0]}
                {player.pos === userRank ? <span style={{ color: T.lime }}> (tú)</span> : null}
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
                  {player.pts} pts
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
function TabBonus({ fireToast, champSelected, setChampSelected, subSelected, setSubSelected, thirdSelected, goalPlayer, openSub }: {
  fireToast: Props['fireToast'];
  champSelected: string; setChampSelected: (v: string) => void;
  subSelected: string;   setSubSelected: (v: string) => void;
  thirdSelected: string; goalPlayer: string;
  openSub: (name: SubScreenName) => void;
}) {
  const cards = [
    { label: 'CAMPEÓN',     pts: 10, color: T.lime,  sub: 'campeon'   as SubScreenName, sel: champSelected,  clear: () => setChampSelected(''),  kind: 'country' as const },
    { label: 'GOLEADOR',    pts: 8,  color: T.amber, sub: 'goleador'  as SubScreenName, sel: goalPlayer,     clear: () => {},                    kind: 'player'  as const },
    { label: 'SUBCAMPEÓN',  pts: 5,  color: T.blue,  sub: 'subcampeon'as SubScreenName, sel: subSelected,    clear: () => setSubSelected(''),    kind: 'country' as const },
    { label: 'TERCER LUGAR',pts: 3,  color: T.rose,  sub: 'tercero'   as SubScreenName, sel: thirdSelected,  clear: () => {},                    kind: 'country' as const },
  ];

  return (
    <div style={{ padding: '14px 14px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 4 }}>¡Hasta 26 puntos extra!</div>
        <div style={{ fontSize: 13, color: T.slate, lineHeight: 1.5 }}>Predice estos 4 bonus antes de que empiece el torneo.</div>
      </div>

      {cards.map((card) => (
        <div key={card.label} style={{ borderRadius: 18, padding: '18px 20px', background: T.bgInk, border: `1px solid ${T.borderInk}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: card.color, letterSpacing: 1.2, textTransform: 'uppercase' }}>{card.label}</div>
            <Pill color={`${card.color}25`} textColor={card.color}>{card.pts} pts</Pill>
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
                <button onClick={() => openSub(card.sub)}
                  style={{ background: 'none', border: 'none', fontSize: 12, color: card.color, cursor: 'pointer', fontWeight: 600, padding: '4px 0', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                  Cambiar
                </button>
              </div>
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

      <div style={{ fontSize: 11.5, color: T.muted, textAlign: 'center', fontStyle: 'italic', lineHeight: 1.6 }}>
        ⚠️ Las predicciones cierran al iniciar el primer partido. Después no se pueden cambiar.
      </div>
    </div>
  );
}

// ──────── Tab: Detalles ────────
function TabDetalles({ goto, openSub, userGroup }: { goto: (s: string) => void; openSub: (name: SubScreenName) => void; userGroup: string }) {

  const prizes = [
    { icon: '🥇', label: '1er Lugar', sub: 'Ganador absoluto', val: '$15,000 MXN' },
    { icon: '🥈', label: '2do Lugar', sub: 'Segundo lugar',    val: '$10,000 MXN' },
    { icon: '🥉', label: '3er Lugar', sub: 'Tercer lugar',     val: '$5,000 MXN'  },
  ];

  return (
    <div style={{ padding: '14px 14px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Group hero */}
      <div style={{ borderRadius: 18, padding: '24px 20px', background: T.bgInk, border: `1px solid ${T.borderInk}`, textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: T.bgInkRaised, border: `2px solid ${T.lime}`,
          margin: '0 auto 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <EvolveMark size={44} color={T.lime}/>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Grupo Evolve</div>
        <Pill color={`${T.lime}25`} textColor={T.lime}>Miembros: {RANKING.filter(p => p.group === userGroup).length}</Pill>
      </div>

      {/* Description */}
      <Card accent={T.lime}>
        <div style={{ paddingLeft: 10 }}>
          <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Descripción del grupo</div>
          <div style={{ fontSize: 13, color: T.slate, lineHeight: 1.6 }}>Quiniela oficial del programa Grupo Evolve para el Torneo 2026</div>
        </div>
      </Card>

      {/* Prizes */}
      <button onClick={() => goto('premios')} style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%',
      }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>🏆</span>
              <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Premios</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div style={{ fontSize: 12, color: T.slate, marginTop: 8 }}>Presiona aquí para ver el sistema de premiación</div>
        </Card>
      </button>

      {/* Powers */}
      <Card>
        <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 14 }}>Poderes activos</div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {(['double', 'late', 'spy'] as const).map(kind => (
            <button key={kind} onClick={() => openSub(`poder-${kind}` as SubScreenName)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <PowerIcon kind={kind} size={44} label/>
            </button>
          ))}
        </div>
      </Card>

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
