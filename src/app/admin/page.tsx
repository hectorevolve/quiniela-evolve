'use client';
export const dynamic = 'force-dynamic';
import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { MATCHES, KNOCKOUT_MATCHES, USER_PREDICTIONS, GROUP_MATCH_IDS } from '@/lib/data';
import { EvolveMark } from '@/components/brand/EvolveMark';
import { Avatar } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { getRankings, type RankingEntry, getMatchResults, saveMatchResult, getMatches, updateMatch, createMatch, deleteMatch, type DBMatch } from '@/lib/db';

type View = 'dashboard' | 'encuesta' | 'celulares' | 'usuarios' | 'rankings' | 'predicciones' | 'partidos' | 'grupos' | 'grupo-detalle' | 'grupos-config';
type AdminUser = { name: string; pts: number; group: string; city: string; pos: number; country: string };
type AdminMatch = typeof MATCHES[number];

const NAV: { id: View; label: string }[] = [
  { id: 'dashboard',    label: 'Dashboard' },
  { id: 'encuesta',     label: 'Encuesta' },
  { id: 'celulares',    label: 'Celulares' },
  { id: 'grupos',        label: 'Grupos' },
  { id: 'usuarios',     label: 'Usuarios' },
  { id: 'rankings',     label: 'Rankings' },
  { id: 'partidos',     label: 'Partidos' },
];

// ─── Dynamic groups ───────────────────────────────────────────────────────────
// Hardcoded fallback (used while DB loads, and for color/logo lookups)
const ALL_GROUPS = [
  'Evolve', 'BEPENSA Spirits', 'ADM', 'Disney',
  'Ruz', 'Zuru', 'AJEMEX', 'Delongi', 'Hanes',
];

/** Loads group list from Supabase `groups` table; falls back to ALL_GROUPS. */
function useGroups() {
  const [groups, setGroups] = useState<string[]>(ALL_GROUPS);
  useEffect(() => {
    supabase.from('groups').select('name').order('name')
      .then(({ data }) => { if (data?.length) setGroups(data.map((g: { name: string }) => g.name)); });
  }, []);
  return groups;
}

/** Loads group colors from DB; returns a map groupName → color.
 *  Falls back to GROUP_COLORS for any group not in DB. */
function useGroupColors() {
  const [colorMap, setColorMap] = useState<Record<string, string>>(GROUP_COLORS);
  useEffect(() => {
    fetch('/api/groups')
      .then(r => r.json())
      .then((rows: { name: string; color: string }[]) => {
        if (!rows?.length) return;
        setColorMap(prev => {
          const next = { ...prev };
          for (const g of rows) if (g.name && g.color) next[g.name] = g.color;
          return next;
        });
      })
      .catch(() => {});
  }, []);
  return colorMap;
}

/** Shared group select dropdown backed by live DB list. */
function GroupSelect({ value, onChange, style }: { value: string; onChange: (v: string) => void; style?: React.CSSProperties }) {
  const groups = useGroups();
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: '#0D1829', color: c.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', ...style }}>
      {groups.map(g => <option key={g} value={g} style={{ background: '#0D1829' }}>{g}</option>)}
    </select>
  );
}

const c = {
  bg:      '#070F1E',
  sidebar: '#040B15',
  card:    'rgba(255,255,255,0.04)',
  border:  'rgba(255,255,255,0.08)',
  text:    '#fff',
  muted:   'rgba(255,255,255,0.45)',
  dim:     'rgba(255,255,255,0.22)',
  rowHov:  'rgba(255,255,255,0.05)',
  blue:    '#1AAFFF',
  lime:    '#C9F31D',
  green:   '#22C55E',
  rose:    '#F43F5E',
  amber:   '#F59E0B',
};

const GROUP_COLORS: Record<string, string> = {
  'Evolve':          '#A3E635',
  'BEPENSA Spirits': '#1AAFFF',
  'ADM':             '#F59E0B',
  'Disney':          '#0063E5',
  'Ruz':             '#8B5CF6',
  'Zuru':            '#22C55E',
  'AJEMEX':          '#EF4444',
  'Delongi':         '#F97316',
  'Juguetimax':      '#EC4899',
  'Hanes':           '#14B8A6',
};

const GROUP_LOGOS: Record<string, string> = {
  'BEPENSA Spirits': '/logos/bepensa.png',
  'ADM':             '/logos/adm.svg',
  'Disney':          '/logos/disney.png',
  'Ruz':             '/logos/ruz.png',
  'Zuru':            '/logos/zuru.png',
  'AJEMEX':          '/logos/ajemex.png',
  'Delongi':         '/logos/delongi.png',
};

// ─── Responsive hook ──────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function resortUsers(arr: AdminUser[]): AdminUser[] {
  return [...arr].sort((a, b) => b.pts - a.pts).map((u, i) => ({ ...u, pos: i + 1 }));
}
function avg(arr: AdminUser[]) {
  return arr.length ? Math.round(arr.reduce((s, u) => s + u.pts, 0) / arr.length) : 0;
}

// ─── Shared components ────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: '16px 18px', flex: '1 1 120px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color ?? c.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: c.dim, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: c.text }}>{title}</h2>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 13, color: c.muted }}>{sub}</p>}
    </div>
  );
}

function GroupBadge({ group, colorOverride }: { group: string; colorOverride?: string }) {
  const col = colorOverride ?? GROUP_COLORS[group] ?? c.blue;
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${col}22`, color: col, border: `1px solid ${col}44`, whiteSpace: 'nowrap' }}>{group}</span>
  );
}

function GroupIcon({ group, size = 32, colorOverride, logoUrlOverride }: { group: string; size?: number; colorOverride?: string; logoUrlOverride?: string | null }) {
  const [failed, setFailed] = useState(false);
  const col = colorOverride ?? GROUP_COLORS[group] ?? c.blue;
  const logo = logoUrlOverride ?? GROUP_LOGOS[group];
  const initials = group.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (group === 'Evolve' && !logoUrlOverride) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: `2px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <EvolveMark size={size * 0.55} color={col}/>
    </div>
  );
  if (logo && !failed) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#fff', border: `2px solid ${col}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
      <img src={logo} alt={group} onError={() => setFailed(true)} style={{ width: '80%', height: '80%', objectFit: 'contain' }}/>
    </div>
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: size * 0.3, fontWeight: 800, color: '#fff' }}>{initials}</div>
  );
}

function ModalInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}/>
    </div>
  );
}

// scrollable table wrapper
function TableWrap({ children }: { children: React.ReactNode }) {
  return <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>{children}</div>;
}

function ViewToggle({ mode, onChange }: { mode: 'grid' | 'list'; onChange: (m: 'grid' | 'list') => void }) {
  return (
    <div style={{ display: 'flex', borderRadius: 7, border: `1px solid ${c.border}`, overflow: 'hidden', flexShrink: 0 }}>
      <button onClick={() => onChange('list')} title="Lista" style={{ padding: '6px 10px', border: 'none', background: mode === 'list' ? `${c.blue}22` : 'transparent', color: mode === 'list' ? c.blue : c.dim, cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>☰</button>
      <button onClick={() => onChange('grid')} title="Cuadrícula" style={{ padding: '6px 10px', border: 'none', borderLeft: `1px solid ${c.border}`, background: mode === 'grid' ? `${c.blue}22` : 'transparent', color: mode === 'grid' ? c.blue : c.dim, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>⊞</button>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function ViewDashboard({ liveUsers, setView }: { liveUsers: LiveUser[]; setView: (v: View) => void }) {
  const isMobile = useIsMobile();
  const groups = useMemo(() => Array.from(new Set(liveUsers.map(u => u.group_name ?? 'Sin grupo'))), [liveUsers]);
  const nonAdmins = liveUsers.filter(u => u.role !== 'admin');
  return (
    <div>
      <SectionHeader title="Dashboard" sub="Resumen general del torneo"/>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="Usuarios"    value={nonAdmins.length}  sub="Registrados"   color={c.blue}/>
        <StatCard label="Grupos"      value={ALL_GROUPS.length} sub="Activos"/>
        <StatCard label="Partidos"    value={MATCHES.length}    sub="En el torneo"/>
        <StatCard label="Jugados"     value={MATCHES.filter(m => m.result).length} sub="Con resultado"/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: 20 }}>
        {/* Users list */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Usuarios registrados</span>
            <button onClick={() => setView('usuarios')} style={{ background: 'none', border: 'none', color: c.blue, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Ver todo →</button>
          </div>
          {liveUsers.length === 0 ? (
            <div style={{ padding: '32px 18px', textAlign: 'center', color: c.muted, fontSize: 13 }}>
              Aún no hay usuarios. Créalos en la sección Usuarios.
            </div>
          ) : liveUsers.slice(0, 10).map((u, i) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: i < Math.min(liveUsers.length, 10) - 1 ? `1px solid ${c.border}` : 'none' }}>
              <Avatar initials={u.name.split(' ').map((w: string) => w[0]).slice(0,2).join('').toUpperCase()} size={28}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                {u.group_name && <GroupBadge group={u.group_name}/>}
              </div>
              {u.role === 'admin' && <span style={{ fontSize: 10, fontWeight: 700, color: c.rose, background: `${c.rose}22`, border: `1px solid ${c.rose}44`, padding: '2px 8px', borderRadius: 6 }}>ADMIN</span>}
            </div>
          ))}
        </div>

        {/* Group cards — always show all groups */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignContent: 'start' }}>
          {ALL_GROUPS.map(g => {
            const members = liveUsers.filter(u => u.group_name === g && u.role !== 'admin');
            const col = GROUP_COLORS[g] ?? c.blue;
            return (
              <div key={g} style={{ background: c.card, border: `1px solid ${col}33`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <GroupIcon group={g} size={22}/>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{g}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: col, lineHeight: 1, marginBottom: 4 }}>{members.length}</div>
                <div style={{ fontSize: 11, color: c.muted }}>{members.length === 1 ? '1 usuario' : `${members.length} usuarios`}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────
function ViewUsuarios({ users, updateUser, deleteUser, groupFilter, setGroupFilter, onBack }: { users: AdminUser[]; updateUser: (name: string, patch: Partial<AdminUser>) => void; deleteUser: (name: string) => void; groupFilter: string; setGroupFilter: (g: string) => void; onBack: () => void }) {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editPts, setEditPts] = useState(0);
  const [editGroup, setEditGroup] = useState('');
  const [editCity, setEditCity] = useState('');
  const [predViewUser, setPredViewUser] = useState<AdminUser | null>(null);
  const [predViewPreds, setPredViewPreds] = useState<Record<string, [number,number]>>({});
  const [predSearch, setPredSearch] = useState('');
  const [predGroupFilter, setPredGroupFilter] = useState('Todos');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [rankMode, setRankMode] = useState<'nacional' | 'grupo'>('nacional');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [predViewMode, setPredViewMode] = useState<'list' | 'grid'>('list');

  const allGroups = useMemo(() => Array.from(new Set(users.map(u => u.group))), [users]);

  const openEdit = (u: AdminUser) => { setEditing(u); setEditPts(u.pts); setEditGroup(u.group); setEditCity(u.city); };
  const saveEdit = () => {
    if (!editing) return;
    updateUser(editing.name, { pts: editPts, group: editGroup, city: editCity });
    setEditing(null);
  };
  const openPredView = (u: AdminUser) => {
    setEditing(null);
    setPredViewUser(u);
    setPredViewPreds({ ...(USER_PREDICTIONS[u.name] ?? {}) });
    setPredSearch('');
    setPredGroupFilter('Todos');
    setPredViewMode('list');
  };
  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteUser(deleteTarget.name);
    setDeleteTarget(null);
  };
  const setLocalPred = (matchId: string, idx: 0 | 1, val: number) => {
    setPredViewPreds(prev => {
      const curr = prev[matchId] ?? [0, 0];
      const next: [number, number] = [curr[0], curr[1]];
      next[idx] = val;
      return { ...prev, [matchId]: next };
    });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u =>
      (groupFilter === 'Todos' || u.group === groupFilter) &&
      (!q || u.name.toLowerCase().includes(q) || u.city.toLowerCase().includes(q))
    );
  }, [users, search, groupFilter]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.card, color: c.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>← Grupos</button>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: c.text }}>Usuarios</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: c.muted }}>{users.length} usuarios registrados</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180, display: 'flex', alignItems: 'center', gap: 8, background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, padding: '8px 14px' }}>
          <span style={{ color: c.dim }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o ciudad…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: c.text, fontSize: 13, fontFamily: 'inherit' }}/>
        </div>
        {groupFilter !== 'Todos' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, background: `${GROUP_COLORS[groupFilter] ?? c.blue}22`, border: `1px solid ${GROUP_COLORS[groupFilter] ?? c.blue}55` }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: GROUP_COLORS[groupFilter] ?? c.blue }}>{groupFilter}</span>
            <button onClick={() => setGroupFilter('Todos')} style={{ background: 'none', border: 'none', color: GROUP_COLORS[groupFilter] ?? c.blue, cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0, opacity: 0.7 }}>✕</button>
          </div>
        )}
        <div style={{ display: 'flex', borderRadius: 7, border: `1px solid ${c.border}`, overflow: 'hidden', flexShrink: 0 }}>
          <button onClick={() => setRankMode('nacional')} style={{ padding: '6px 12px', border: 'none', background: rankMode === 'nacional' ? `${c.blue}22` : 'transparent', color: rankMode === 'nacional' ? c.blue : c.dim, fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5 }}>NAC</button>
          <button onClick={() => setRankMode('grupo')} style={{ padding: '6px 12px', border: 'none', borderLeft: `1px solid ${c.border}`, background: rankMode === 'grupo' ? `${c.amber}22` : 'transparent', color: rankMode === 'grupo' ? c.amber : c.dim, fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5 }}>GRP</button>
        </div>
        <ViewToggle mode={viewMode} onChange={setViewMode}/>
      </div>

      {viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {filtered.map((u, i) => {
            const displayPos = rankMode === 'grupo' ? i + 1 : u.pos;
            const isTop3 = displayPos <= 3;
            return (
              <div key={u.name} style={{ background: c.card, border: `1px solid ${isTop3 ? c.amber + '55' : c.border}`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: isTop3 ? `${c.amber}22` : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isTop3 ? 18 : 11, fontWeight: 800, color: isTop3 ? c.amber : c.dim, flexShrink: 0 }}>
                    {isTop3 ? ['🥇','🥈','🥉'][displayPos - 1] : `#${displayPos}`}
                  </div>
                  <Avatar initials={u.name.slice(0,2).toUpperCase()} size={30}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: c.muted }}>{u.city}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: c.lime, flexShrink: 0 }}>{u.pts}</div>
                </div>
                <GroupBadge group={u.group}/>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button onClick={() => openEdit(u)} style={{ flex: 1, padding: '6px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'none', color: c.blue, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Detalles</button>
                  <button onClick={() => setDeleteTarget(u)} style={{ flex: 1, padding: '6px', borderRadius: 6, border: `1px solid ${c.rose}44`, background: `${c.rose}11`, color: c.rose, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>🗑 Eliminar</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: c.muted }}>Sin resultados</div>}
        </div>
      ) : (
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <TableWrap>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 0.8, textTransform: 'uppercase' }}>#</th>
                  {['Usuario','Grupo','Ciudad','Puntos','Acciones'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: h === 'Puntos' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 0.8, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const displayPos = rankMode === 'grupo' ? i + 1 : u.pos;
                  const isTop3 = displayPos <= 3;
                  return (
                  <tr key={u.name} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${c.border}` : 'none', transition: 'background 100ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = c.rowHov)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: isTop3 ? c.amber : c.dim }}>#{displayPos}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar initials={u.name.slice(0,2).toUpperCase()} size={28}/>
                        <span style={{ fontSize: 13, fontWeight: 600, color: c.text, whiteSpace: 'nowrap' }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}><GroupBadge group={u.group}/></td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: c.muted, whiteSpace: 'nowrap' }}>{u.city}</td>
                    <td style={{ padding: '11px 14px', fontSize: 14, fontWeight: 700, color: c.lime, textAlign: 'right' }}>{u.pts}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(u)} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'none', color: c.blue, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Detalles</button>
                        <button onClick={() => setDeleteTarget(u)} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${c.rose}44`, background: `${c.rose}11`, color: c.rose, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>🗑 Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </TableWrap>
          {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: c.muted }}>Sin resultados</div>}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={() => setEditing(null)}>
          <div style={{ background: '#0D1829', border: `1px solid ${c.border}`, borderRadius: 18, padding: isMobile ? 20 : 28, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <Avatar initials={editing.name.slice(0,2).toUpperCase()} size={40}/>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>{editing.name}</div>
                <div style={{ fontSize: 12, color: c.muted }}>#{editing.pos} · {editing.pts} pts</div>
              </div>
            </div>

            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Puntos</label>
            <input type="number" value={editPts} onChange={e => setEditPts(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 22, fontWeight: 800, textAlign: 'center', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}/>
            <button onClick={() => openPredView(editing)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${c.blue}44`, background: `${c.blue}11`, color: c.blue, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 20 }}>
              🎯 Ver predicciones
            </button>

            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Grupo</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {allGroups.map(g => {
                const col = GROUP_COLORS[g] ?? c.blue;
                return <button key={g} onClick={() => setEditGroup(g)} style={{ flex: '1 1 auto', padding: '8px 10px', borderRadius: 8, border: `1px solid ${editGroup === g ? col : c.border}`, background: editGroup === g ? `${col}22` : 'none', color: editGroup === g ? col : c.muted, fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{g}</button>;
              })}
            </div>

            <ModalInput label="Ciudad" value={editCity} onChange={setEditCity}/>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveEdit} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: c.blue, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Guardar</button>
              <button onClick={() => setEditing(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${c.border}`, background: 'none', color: c.muted, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={() => setDeleteTarget(null)}>
          <div style={{ background: '#0D1829', border: `1px solid ${c.rose}44`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${c.rose}20`, border: `2px solid ${c.rose}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>🗑</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: c.text, marginBottom: 6 }}>Eliminar usuario</div>
            <div style={{ fontSize: 13, color: c.muted, marginBottom: 20, lineHeight: 1.5 }}>
              ¿Estás seguro de que deseas eliminar a <span style={{ color: c.text, fontWeight: 700 }}>{deleteTarget.name}</span>? Esta acción no se puede deshacer.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={confirmDelete} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: c.rose, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Sí, eliminar</button>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${c.border}`, background: 'none', color: c.muted, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Predictions per-user modal */}
      {predViewUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={() => setPredViewUser(null)}>
          <div style={{ background: '#0D1829', border: `1px solid ${c.border}`, borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar initials={predViewUser.name.slice(0,2).toUpperCase()} size={34}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{predViewUser.name}</div>
                  <div style={{ fontSize: 11, color: c.muted }}>{predViewUser.group} · Fase de grupos</div>
                </div>
                <ViewToggle mode={predViewMode} onChange={setPredViewMode}/>
                <button onClick={() => setPredViewUser(null)} style={{ background: 'none', border: 'none', color: c.muted, fontSize: 18, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>✕</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid ${c.border}`, borderRadius: 8, padding: '7px 12px', marginBottom: 10 }}>
                <span style={{ color: c.dim, fontSize: 13 }}>🔍</span>
                <input value={predSearch} onChange={e => setPredSearch(e.target.value)} placeholder="Buscar equipo o partido…"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: c.text, fontSize: 12, fontFamily: 'inherit' }}/>
                {predSearch && <button onClick={() => setPredSearch('')} style={{ background: 'none', border: 'none', color: c.dim, cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>✕</button>}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['Todos', ...Array.from(new Set(MATCHES.map(m => m.group)))].map(g => (
                  <button key={g} onClick={() => setPredGroupFilter(g)} style={{ padding: '4px 9px', borderRadius: 6, border: `1px solid ${predGroupFilter === g ? c.blue : c.border}`, background: predGroupFilter === g ? `${c.blue}22` : 'none', color: predGroupFilter === g ? c.blue : c.muted, fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{g}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: predViewMode === 'grid' ? '12px 16px' : '8px 20px' }}>
              {(() => {
                const filteredMatches = GROUP_MATCH_IDS.filter(matchId => {
                  const match = MATCHES.find(m => m.id === matchId);
                  if (!match) return false;
                  if (predGroupFilter !== 'Todos' && match.group !== predGroupFilter) return false;
                  if (predSearch) {
                    const q = predSearch.toLowerCase();
                    return match.home.name.toLowerCase().includes(q) || match.away.name.toLowerCase().includes(q) || match.home.code.toLowerCase().includes(q) || match.away.code.toLowerCase().includes(q) || matchId.toLowerCase().includes(q);
                  }
                  return true;
                });
                if (predViewMode === 'grid') {
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {filteredMatches.map(matchId => {
                        const match = MATCHES.find(m => m.id === matchId);
                        if (!match) return null;
                        const pred = predViewPreds[matchId];
                        return (
                          <div key={matchId} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: c.blue }}>{matchId.toUpperCase()}</span>
                              <span style={{ fontSize: 9, color: c.muted }}>Gp. {match.group}</span>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: c.text, textAlign: 'center', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {match.home.code} <span style={{ color: c.muted }}>vs</span> {match.away.code}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <input type="number" min={0} max={20} value={pred?.[0] ?? ''} onChange={e => setLocalPred(matchId, 0, Number(e.target.value))} placeholder="–"
                                style={{ width: 36, padding: '4px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 13, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}/>
                              <span style={{ color: c.muted, fontSize: 11 }}>–</span>
                              <input type="number" min={0} max={20} value={pred?.[1] ?? ''} onChange={e => setLocalPred(matchId, 1, Number(e.target.value))} placeholder="–"
                                style={{ width: 36, padding: '4px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 13, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                return (
                  <>
                    {filteredMatches.map(matchId => {
                      const match = MATCHES.find(m => m.id === matchId);
                      if (!match) return null;
                      const pred = predViewPreds[matchId];
                      return (
                        <div key={matchId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${c.border}` }}>
                          <div style={{ width: 34, fontSize: 11, fontWeight: 700, color: c.blue, flexShrink: 0 }}>{matchId.toUpperCase()}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, color: c.muted }}>Grupo {match.group}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {match.home.name} <span style={{ color: c.muted, fontWeight: 400 }}>vs</span> {match.away.name}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                            <input type="number" min={0} max={20} value={pred?.[0] ?? ''} onChange={e => setLocalPred(matchId, 0, Number(e.target.value))} placeholder="–"
                              style={{ width: 42, padding: '5px 6px', borderRadius: 7, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 14, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}/>
                            <span style={{ color: c.muted, fontWeight: 700 }}>–</span>
                            <input type="number" min={0} max={20} value={pred?.[1] ?? ''} onChange={e => setLocalPred(matchId, 1, Number(e.target.value))} placeholder="–"
                              style={{ width: 42, padding: '5px 6px', borderRadius: 7, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 14, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}/>
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
            <div style={{ padding: '14px 20px', borderTop: `1px solid ${c.border}`, flexShrink: 0 }}>
              <button onClick={() => setPredViewUser(null)} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: c.blue, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Guardar y cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rankings ─────────────────────────────────────────────────────────────────

interface EditPlayerState {
  userId: string; name: string; group_name: string;
  used_powers: string[]; bonus_points: number; bonus_reason: string;
  pred_count: number; match_points: number;
}

function EditPlayerModal({ entry, onClose, onSaved, onReload }: {
  entry: RankingEntry;
  onClose: () => void;
  onSaved: (updated: Partial<RankingEntry>) => void;
  onReload: () => void;
}) {
  const [name,        setName]        = useState(entry.name);
  const [group,       setGroup]       = useState(entry.group_name ?? '');
  const [powers,      setPowers]      = useState<string[]>(entry.used_powers ?? []);
  // ptsInput: raw text the admin types ("100", "+10", "-5", "10+10", etc.)
  const [ptsInput,    setPtsInput]    = useState<string>(String(entry.points));
  const [matchPts,    setMatchPts]    = useState<number>(entry.points); // match-only pts (no bonus)
  const [bonusReason, setBonusReason] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState<string | null>(null);
  const groups = useGroups();

  // Load existing bonus so we can compute match-only pts
  useEffect(() => {
    supabase.from('bonus_awards').select('points, reason').eq('user_id', entry.userId).maybeSingle()
      .then(({ data }) => {
        const existingBonus = data?.points ?? 0;
        setMatchPts(entry.points - existingBonus);
        setBonusReason(data?.reason ?? '');
      });
  }, [entry.userId, entry.points]);

  /** Parse admin input: supports "100", "+10", "-5", "10+10", "50-3", etc. */
  const parseInput = (raw: string): number | null => {
    const s = raw.trim();
    if (!s) return null;
    // Only allow digits, +, -, spaces (safe for eval)
    if (!/^[0-9\s+\-]+$/.test(s)) return null;
    try {
      // If starts with + or - treat as delta on current total
      if (/^[+-]/.test(s)) return entry.points + Number(s);
      // Otherwise eval simple arithmetic
      // eslint-disable-next-line no-new-func
      const result = new Function(`"use strict"; return (${s})`)() as number;
      return typeof result === 'number' && isFinite(result) ? Math.round(result) : null;
    } catch { return null; }
  };

  const computedTotal = parseInput(ptsInput) ?? entry.points;
  const bonusDelta    = computedTotal - matchPts;

  const togglePower = (p: string) => {
    setPowers(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleSave = async () => {
    setSaving(true); setErr(null);
    const bonusToStore = bonusDelta; // = computedTotal - matchPts
    try {
      const res = await fetch('/api/admin/update-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:       entry.userId,
          name:         name.trim() || entry.name,
          group_name:   group || null,
          used_powers:  powers,
          bonus_points: bonusToStore,
          bonus_reason: bonusReason.trim() || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Error'); }
      onSaved({ name: name.trim() || entry.name, group_name: group || null, used_powers: powers });
      onReload();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const POWER_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
    double: { emoji: '×2', label: 'Puntos Dobles', color: c.amber },
    late:   { emoji: '⏱', label: 'Cambio Tardío',  color: c.blue  },
    spy:    { emoji: '🕵', label: 'Espía',          color: '#A855F7' },
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#0D1829', border: `1px solid ${c.border}`, borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        {/* Error banner — always visible at top */}
        {err && (
          <div style={{ marginBottom: 20, padding: '12px 16px', background: `${c.rose}20`, border: `1.5px solid ${c.rose}`, borderRadius: 10, fontSize: 13, color: c.rose, lineHeight: 1.5, wordBreak: 'break-word' }}>
            ⚠️ <strong>Error al guardar:</strong> {err}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.text }}>✏️ Editar jugador</div>
            <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>#{entry.pos} · {entry.points} pts actuales</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Nombre</label>
          <input value={name} onChange={e => setName(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}/>
        </div>

        {/* Group */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Grupo</label>
          <select value={group} onChange={e => setGroup(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: '#0D1829', color: group ? c.text : c.muted, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
            <option value="">— Sin grupo —</option>
            {groups.map(g => <option key={g} value={g} style={{ background: '#0D1829' }}>{g}</option>)}
          </select>
        </div>

        {/* Powers */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Superpoderes</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(['double', 'late', 'spy'] as const).map(p => {
              const info = POWER_LABELS[p];
              const used = powers.includes(p);
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: `1px solid ${used ? c.rose + '60' : c.border}`, background: used ? `${c.rose}10` : c.card }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: used ? `${c.rose}22` : `${info.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: used ? c.rose : info.color }}>{info.emoji}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{info.label}</div>
                      <div style={{ fontSize: 11, color: used ? c.rose : c.green }}>{used ? 'Ya usado' : 'Disponible'}</div>
                    </div>
                  </div>
                  <button onClick={() => togglePower(p)} style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${used ? c.green + '60' : c.rose + '60'}`, background: used ? `${c.green}15` : `${c.rose}15`, color: used ? c.green : c.rose, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {used ? '↩ Resetear' : '✓ Marcar usado'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Points override */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Puntos totales del jugador</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            {/* Text input — supports "100", "+10", "-5", "10+10" */}
            <input
              type="text"
              inputMode="numeric"
              value={ptsInput}
              onChange={e => setPtsInput(e.target.value)}
              placeholder={String(entry.points)}
              style={{ width: 150, padding: '12px 16px', borderRadius: 10, border: `2px solid ${parseInput(ptsInput) !== null ? c.lime + '80' : c.rose + '80'}`, background: 'rgba(201,243,29,0.06)', color: c.lime, fontSize: 22, fontWeight: 800, fontFamily: 'monospace', outline: 'none', textAlign: 'center' }}
            />
            {/* Live result preview */}
            <div style={{ fontSize: 13, color: c.muted, lineHeight: 1.8 }}>
              <div>= <strong style={{ color: c.lime, fontSize: 18 }}>{parseInput(ptsInput) !== null ? computedTotal : '?'} pts</strong></div>
              <div style={{ fontSize: 11 }}>
                partidos: <strong style={{ color: c.text }}>{matchPts}</strong>
                {' · '}bonus: <strong style={{ color: bonusDelta >= 0 ? c.green : c.rose }}>
                  {bonusDelta >= 0 ? '+' : ''}{bonusDelta}
                </strong>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: c.muted, marginBottom: 8 }}>
            Escribe el total (<code style={{ color: c.lime }}>100</code>), suma (<code style={{ color: c.lime }}>+10</code>), resta (<code style={{ color: c.lime }}>-5</code>) o expresión (<code style={{ color: c.lime }}>10+10</code>).
          </div>
          {/* Reason */}
          <input value={bonusReason} onChange={e => setBonusReason(e.target.value)}
            placeholder="Motivo del ajuste (opcional)"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}/>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 10, color: c.muted, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', background: c.blue, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User Predictions Modal ───────────────────────────────────────────────────

type PredMap = Record<string, { home: number | ''; away: number | '' }>;

function UserPredictionsModal({ entry, onClose }: { entry: RankingEntry; onClose: () => void }) {
  const [matches,   setMatches]   = useState<DBMatch[]>([]);
  const [preds,     setPreds]     = useState<PredMap>({});
  const [dirty,     setDirty]     = useState<Set<string>>(new Set());
  const [results,   setResults]   = useState<Record<string, [number,number]>>({});
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [savedSet,  setSavedSet]  = useState<Set<string>>(new Set());
  const [err,       setErr]       = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getMatches(),
      supabase.from('predictions').select('match_id,home_score,away_score').eq('user_id', entry.userId),
      supabase.from('matches').select('id,result_home,result_away').not('result_home', 'is', null),
    ]).then(([ms, predsRes, resRes]) => {
      setMatches(ms);
      const pm: PredMap = {};
      for (const p of predsRes.data ?? []) pm[p.match_id] = { home: p.home_score, away: p.away_score };
      setPreds(pm);
      const rm: Record<string, [number,number]> = {};
      for (const r of resRes.data ?? []) rm[r.id] = [r.result_home, r.result_away];
      setResults(rm);
    }).catch(console.error).finally(() => setLoading(false));
  }, [entry.userId]);

  const update = (matchId: string, side: 'home' | 'away', val: string) => {
    const n = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0);
    setPreds(prev => ({ ...prev, [matchId]: { ...prev[matchId] ?? { home: '', away: '' }, [side]: n } }));
    setDirty(prev => new Set(prev).add(matchId));
  };

  const saveAll = async () => {
    const toSave = [...dirty].filter(id => {
      const p = preds[id];
      return p && p.home !== '' && p.away !== '';
    });
    if (toSave.length === 0) return;
    setSaving(true); setErr(null);
    const results2: string[] = [];
    for (const matchId of toSave) {
      const p = preds[matchId];
      const res = await fetch('/api/admin/update-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: entry.userId, matchId, homeScore: p.home, awayScore: p.away }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? 'Error'); setSaving(false); return; }
      results2.push(matchId);
    }
    setSavedSet(prev => { const s = new Set(prev); results2.forEach(id => s.add(id)); return s; });
    setDirty(new Set());
    setSaving(false);
  };

  // Group matches by group_name
  const grouped = useMemo(() => {
    const g: Record<string, DBMatch[]> = {};
    for (const m of matches) {
      if (!g[m.group_name]) g[m.group_name] = [];
      g[m.group_name].push(m);
    }
    return g;
  }, [matches]);

  const countFilled = Object.values(preds).filter(p => p.home !== '' && p.away !== '').length;

  const scoreInputStyle = (matchId: string, side: 'home' | 'away'): React.CSSProperties => ({
    width: 40, height: 36, textAlign: 'center', fontSize: 15, fontWeight: 700,
    border: `1.5px solid ${dirty.has(matchId) ? c.amber + '90' : c.border}`,
    borderRadius: 7, background: 'rgba(255,255,255,0.06)', color: c.text,
    fontFamily: 'inherit', outline: 'none',
    boxShadow: savedSet.has(matchId) ? `0 0 0 2px ${c.green}40` : 'none',
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#0D1829', border: `1px solid ${c.border}`, borderRadius: 18, width: '100%', maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c.text }}>📋 Predicciones — {entry.name}</div>
            <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{countFilled} de {matches.length} partidos predichos · {dirty.size > 0 ? <span style={{ color: c.amber }}>{dirty.size} sin guardar</span> : <span style={{ color: c.green }}>todo guardado</span>}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        {err && (
          <div style={{ margin: '12px 24px 0', padding: '10px 14px', background: `${c.rose}20`, border: `1px solid ${c.rose}`, borderRadius: 8, fontSize: 13, color: c.rose }}>
            ⚠️ {err}
          </div>
        )}

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 16px' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: c.muted }}>Cargando…</div>
          ) : (
            Object.entries(grouped).map(([groupName, gmatches]) => (
              <div key={groupName}>
                <div style={{ fontSize: 10, fontWeight: 700, color: c.muted, letterSpacing: 1.5, textTransform: 'uppercase', padding: '16px 0 8px' }}>{groupName}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {gmatches.map(m => {
                    const pred = preds[m.id];
                    const result = results[m.id];
                    const isSaved = savedSet.has(m.id);
                    const isDirty = dirty.has(m.id);
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, background: isSaved ? `${c.green}08` : isDirty ? `${c.amber}08` : 'transparent', border: `1px solid ${isSaved ? c.green+'30' : isDirty ? c.amber+'40' : 'transparent'}`, transition: 'all 150ms' }}>
                        {/* Home team */}
                        <div style={{ flex: 1, textAlign: 'right', fontSize: 12, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.home_name}
                        </div>
                        {/* Score inputs */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                          <input type="number" min={0} max={99}
                            value={pred?.home ?? ''}
                            onChange={e => update(m.id, 'home', e.target.value)}
                            style={scoreInputStyle(m.id, 'home')}
                          />
                          <span style={{ color: c.muted, fontWeight: 700 }}>:</span>
                          <input type="number" min={0} max={99}
                            value={pred?.away ?? ''}
                            onChange={e => update(m.id, 'away', e.target.value)}
                            style={scoreInputStyle(m.id, 'away')}
                          />
                        </div>
                        {/* Away team */}
                        <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.away_name}
                        </div>
                        {/* Result + pts */}
                        <div style={{ width: 70, textAlign: 'right', flexShrink: 0 }}>
                          {result ? (
                            <span style={{ fontSize: 11, color: c.muted }}>
                              {result[0]}:{result[1]}
                              {pred?.home !== '' && pred?.away !== '' && (() => {
                                const ph = Number(pred.home), pa = Number(pred.away);
                                if (ph === result[0] && pa === result[1]) return <span style={{ color: c.green, fontWeight: 700, marginLeft: 4 }}>+3</span>;
                                if (Math.sign(ph - pa) === Math.sign(result[0] - result[1])) return <span style={{ color: c.amber, fontWeight: 700, marginLeft: 4 }}>+1</span>;
                                return <span style={{ color: c.rose, marginLeft: 4 }}>0</span>;
                              })()}
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: c.dim }}>—</span>
                          )}
                        </div>
                        {/* Saved indicator */}
                        <div style={{ width: 16, flexShrink: 0 }}>
                          {isSaved && !isDirty && <span style={{ color: c.green, fontSize: 12 }}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 10, color: c.muted, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cerrar</button>
          <button onClick={saveAll} disabled={saving || dirty.size === 0}
            style={{ flex: 2, padding: '11px', background: dirty.size > 0 ? c.blue : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 10, color: dirty.size > 0 ? '#fff' : c.dim, fontWeight: 700, fontSize: 14, cursor: dirty.size > 0 ? 'pointer' : 'default', opacity: saving ? 0.7 : 1, transition: 'all 200ms' }}>
            {saving ? 'Guardando…' : dirty.size > 0 ? `Guardar ${dirty.size} cambio${dirty.size > 1 ? 's' : ''}` : 'Sin cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewRankings() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState('nacional');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEntry,      setEditEntry]      = useState<RankingEntry | null>(null);
  const [predsEntry,     setPredsEntry]     = useState<RankingEntry | null>(null);
  const [showCreate,     setShowCreate]     = useState(false);
  const [deleteUser,     setDeleteUser]     = useState<RankingEntry | null>(null);
  const [deletingUser,   setDeletingUser]   = useState(false);
  const groupColors = useGroupColors();
  const [deleteUserErr,  setDeleteUserErr]  = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    // Use server-side route so admin client bypasses RLS on bonus_awards / all tables
    fetch('/api/rankings')
      .then(r => r.json())
      .then(setRankings)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const list = useMemo(() => {
    if (tab === 'nacional') return rankings;
    return rankings
      .filter(u => u.group_name === tab)
      .map((u, i) => ({ ...u, pos: i + 1 }));
  }, [tab, rankings]);

  const handleSaved = (updated: Partial<RankingEntry>) => {
    setRankings(prev => prev.map(u => u.userId === editEntry?.userId ? { ...u, ...updated } : u));
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setDeletingUser(true); setDeleteUserErr(null);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deleteUser.userId }),
      });
      if (!res.ok) { const d = await res.json(); setDeleteUserErr(d.error ?? 'Error'); return; }
      setRankings(prev => prev.filter(u => u.userId !== deleteUser.userId));
      setDeleteUser(null);
    } catch (e) {
      setDeleteUserErr(e instanceof Error ? e.message : 'Error');
    } finally { setDeletingUser(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 10 }}>
        <SectionHeader title="Rankings" sub="Clasificaciones por grupo y nacional"/>
        <button onClick={() => setShowCreate(true)} style={{ padding: '9px 18px', borderRadius: 9, background: c.green, border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Agregar usuario</button>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setTab('nacional')} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${tab === 'nacional' ? c.blue : c.border}`, background: tab === 'nacional' ? `${c.blue}22` : c.card, color: tab === 'nacional' ? c.blue : c.muted, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Nacional</button>
        {ALL_GROUPS.map(g => {
          const col = groupColors[g] ?? c.blue;
          return <button key={g} onClick={() => setTab(g)} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${tab === g ? col : c.border}`, background: tab === g ? `${col}22` : c.card, color: tab === g ? col : c.muted, fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{g}</button>;
        })}
        <div style={{ marginLeft: 'auto' }}><ViewToggle mode={viewMode} onChange={setViewMode}/></div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: c.muted, fontSize: 14 }}>Cargando ranking…</div>
      ) : list.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: c.muted, fontSize: 14, background: c.card, borderRadius: 12, border: `1px solid ${c.border}` }}>
          {tab === 'nacional' ? 'No hay usuarios registrados aún.' : `No hay usuarios en el grupo ${tab} aún.`}
          <br/><span style={{ fontSize: 12, opacity: 0.7 }}>Los puntos se calcularán cuando el admin ingrese resultados de partidos.</span>
        </div>
      ) : viewMode === 'list' ? (
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <TableWrap>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                  {['#','Usuario','Grupo','Poderes','Puntos',''].map((h, i) => (
                    <th key={i} style={{ padding: '12px 14px', textAlign: h === 'Puntos' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 0.8, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((u, i) => (
                  <tr key={u.userId} style={{ borderBottom: i < list.length - 1 ? `1px solid ${c.border}` : 'none', transition: 'background 100ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = c.rowHov)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: u.pos <= 3 ? c.amber : c.dim }}>#{u.pos}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar initials={u.name.slice(0,2).toUpperCase()} size={28}/>
                        <span style={{ fontSize: 13, fontWeight: 600, color: c.text, whiteSpace: 'nowrap' }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>{u.group_name ? <GroupBadge group={u.group_name} colorOverride={groupColors[u.group_name]}/> : <span style={{ color: c.dim, fontSize: 12 }}>—</span>}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(['double','late','spy'] as const).map(p => {
                          const used = (u.used_powers ?? []).includes(p);
                          const labels: Record<string,string> = { double:'×2', late:'⏱', spy:'🕵' };
                          return (
                            <span key={p} title={p} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: used ? `${c.rose}22` : `${c.green}22`, color: used ? c.rose : c.green, fontSize: 11, fontWeight: 700, border: `1px solid ${used ? c.rose+'44' : c.green+'44'}` }}>{labels[p]}</span>
                          );
                        })}
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 14, fontWeight: 700, color: c.lime, textAlign: 'right' }}>{u.points}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => setPredsEntry(u)} style={{ padding: '5px 12px', borderRadius: 7, background: 'rgba(201,243,29,0.1)', border: `1px solid ${c.lime}40`, color: c.lime, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>📋 Predicciones</button>
                        <button onClick={() => setEditEntry(u)} style={{ padding: '5px 12px', borderRadius: 7, background: `${c.blue}20`, border: `1px solid ${c.blue}50`, color: c.blue, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✏️ Editar</button>
                        <button onClick={() => { setDeleteUser(u); setDeleteUserErr(null); }} style={{ padding: '5px 10px', borderRadius: 7, background: `${c.rose}15`, border: `1px solid ${c.rose}40`, color: c.rose, fontSize: 13, cursor: 'pointer' }} title="Eliminar usuario">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {list.map((u) => (
            <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: c.card, border: `1px solid ${u.pos <= 3 ? c.amber + '55' : c.border}`, borderRadius: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: u.pos === 1 ? '#F59E0B33' : u.pos === 2 ? '#94A3B833' : u.pos === 3 ? '#CD7C2F33' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: u.pos <= 3 ? c.amber : c.muted, flexShrink: 0 }}>
                {u.pos <= 3 ? ['🥇','🥈','🥉'][u.pos - 1] : `#${u.pos}`}
              </div>
              <Avatar initials={u.name.slice(0,2).toUpperCase()} size={30} style={{ flexShrink: 0 }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                <div style={{ fontSize: 11, color: c.muted }}>{u.group_name ?? '—'}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: c.lime, flexShrink: 0 }}>{u.points} pts</div>
              <button onClick={() => setPredsEntry(u)} style={{ background: 'none', border: 'none', color: c.lime, cursor: 'pointer', fontSize: 16, flexShrink: 0 }} title="Predicciones">📋</button>
              <button onClick={() => setEditEntry(u)} style={{ background: 'none', border: 'none', color: c.blue, cursor: 'pointer', fontSize: 16, flexShrink: 0 }} title="Editar">✏️</button>
              <button onClick={() => { setDeleteUser(u); setDeleteUserErr(null); }} style={{ background: 'none', border: 'none', color: c.rose, cursor: 'pointer', fontSize: 16, flexShrink: 0 }} title="Eliminar">🗑</button>
            </div>
          ))}
        </div>
      )}

      {editEntry && (
        <EditPlayerModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={handleSaved}
          onReload={reload}
        />
      )}

      {predsEntry && (
        <UserPredictionsModal
          entry={predsEntry}
          onClose={() => setPredsEntry(null)}
        />
      )}

      {/* Create user modal */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { reload(); setShowCreate(false); }}
        />
      )}

      {/* Delete user confirmation */}
      {deleteUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#0D1829', border: `1px solid ${c.rose}44`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 8 }}>¿Eliminar jugador?</div>
            <div style={{ fontSize: 14, color: c.muted, marginBottom: 6 }}>
              <strong style={{ color: c.text }}>{deleteUser.name}</strong>
            </div>
            <div style={{ fontSize: 12, color: c.rose, marginBottom: 20 }}>⚠ Esto borrará su cuenta, predicciones y puntos permanentemente.</div>
            {deleteUserErr && (
              <div style={{ marginBottom: 14, padding: '10px 14px', background: `${c.rose}20`, border: `1px solid ${c.rose}`, borderRadius: 8, fontSize: 13, color: c.rose, textAlign: 'left' }}>⚠️ {deleteUserErr}</div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteUser(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 10, color: c.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDeleteUser} disabled={deletingUser} style={{ flex: 1, padding: '12px', background: c.rose, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: deletingUser ? 'not-allowed' : 'pointer' }}>
                {deletingUser ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reusable Create User Modal ───────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [group,   setGroup]   = useState('Evolve');
  const [role,    setRole]    = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const groups = useGroups();

  const handleCreate = async () => {
    if (!name.trim() || !phone.trim()) { setError('Nombre y celular son obligatorios.'); return; }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { setError('Celular inválido. Mínimo 10 dígitos.'); return; }
    const normalizedPhone = `+52${digits.slice(-10)}`;
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Sin sesión activa.'); return; }
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: name.trim(), phone: normalizedPhone, group_name: group, role, premium: false }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Error al crear.'); return; }
      onCreated();
    } catch { setError('Error de red.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#0D1829', border: `1px solid ${c.border}`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: c.text }}>+ Agregar jugador</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: c.muted, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Nombre completo</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Juan García"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}/>
        </div>

        {/* Phone */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Celular (10 dígitos)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ height: 42, padding: '0 12px', border: `1px solid ${c.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', color: c.muted, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>🇲🇽 +52</div>
            <input type="tel" placeholder="81 1234 5678" value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ''))} inputMode="numeric" maxLength={12}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}/>
          </div>
        </div>

        {/* Group */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Grupo</label>
          <select value={group} onChange={e => setGroup(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: '#0D1829', color: c.text, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
            {groups.map(g => <option key={g} value={g} style={{ background: '#0D1829' }}>{g}</option>)}
          </select>
        </div>

        {/* Role */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Rol</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['user', 'admin'] as const).map(r => (
              <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${role === r ? c.blue : c.border}`, background: role === r ? `${c.blue}22` : 'transparent', color: role === r ? c.blue : c.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {r === 'admin' ? 'Admin' : 'Jugador'}
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ marginBottom: 16, padding: '10px 14px', background: `${c.rose}15`, border: `1px solid ${c.rose}40`, borderRadius: 8, fontSize: 13, color: c.rose }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 10, color: c.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleCreate} disabled={loading} style={{ flex: 2, padding: '12px', background: c.blue, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creando…' : 'Crear jugador'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Predicciones ─────────────────────────────────────────────────────────────
function ViewPredicciones({ users }: { users: AdminUser[] }) {
  const [matchId, setMatchId] = useState<string>(GROUP_MATCH_IDS[0]);
  const [groupFilter, setGroupFilter] = useState('Todos');
  const [localPreds, setLocalPreds] = useState<Record<string, Record<string, [number,number]>>>(() => {
    const copy: Record<string, Record<string, [number,number]>> = {};
    for (const [name, preds] of Object.entries(USER_PREDICTIONS)) copy[name] = { ...preds };
    return copy;
  });
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [cellHome, setCellHome] = useState(0);
  const [cellAway, setCellAway] = useState(0);

  const allGroups = useMemo(() => Array.from(new Set(users.map(u => u.group))), [users]);
  const match = MATCHES.find(m => m.id === matchId);

  const rows = useMemo(() => users.filter(u => groupFilter === 'Todos' || u.group === groupFilter).map(u => ({ user: u, pred: localPreds[u.name]?.[matchId] ?? null })), [users, matchId, groupFilter, localPreds]);
  const dist = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach(r => { if (!r.pred) return; const key = `${r.pred[0]}-${r.pred[1]}`; counts.set(key, (counts.get(key) ?? 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const openCellEdit = (userName: string, pred: [number,number] | null) => { setEditingCell(userName); setCellHome(pred?.[0] ?? 0); setCellAway(pred?.[1] ?? 0); };
  const saveCellEdit = (userName: string) => {
    setLocalPreds(prev => ({ ...prev, [userName]: { ...prev[userName], [matchId]: [cellHome, cellAway] } }));
    setEditingCell(null);
  };

  return (
    <div>
      <SectionHeader title="Predicciones" sub="Edita las predicciones de cada usuario por partido"/>
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Partido</label>
          <select value={matchId} onChange={e => setMatchId(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${c.border}`, background: '#0D1829', color: c.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
            {GROUP_MATCH_IDS.map(id => { const m = MATCHES.find(x => x.id === id); return <option key={id} value={id}>{id.toUpperCase()} — {m ? `${m.home.code} vs ${m.away.code}` : id}</option>; })}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Grupo</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Todos', ...allGroups].map(g => { const col = g === 'Todos' ? c.blue : (GROUP_COLORS[g] ?? c.blue); const active = groupFilter === g; return <button key={g} onClick={() => setGroupFilter(g)} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${active ? col : c.border}`, background: active ? `${col}22` : c.card, color: active ? col : c.muted, fontWeight: 700, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>{g}</button>; })}
          </div>
        </div>
      </div>

      {match && (
        <div style={{ background: '#040B15', border: `1px solid ${c.border}`, borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{match.group} · {matchId.toUpperCase()}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.text }}>{match.home.code} <span style={{ color: c.muted, fontWeight: 400 }}>vs</span> {match.away.code}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {dist.slice(0, 4).map(([key, count]) => <span key={key} style={{ padding: '4px 10px', borderRadius: 20, background: `${c.blue}22`, color: c.blue, fontSize: 11, fontWeight: 700 }}>{key} ({count})</span>)}
          </div>
        </div>
      )}

      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <TableWrap>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                {['#','Usuario','Grupo','Ciudad','Predicción',''].map((h, i) => <th key={i} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 0.8, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ user: u, pred }, i) => (
                <tr key={u.name} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${c.border}` : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = c.rowHov)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: c.dim }}>#{u.pos}</td>
                  <td style={{ padding: '10px 14px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar initials={u.name.slice(0,2).toUpperCase()} size={26}/><span style={{ fontSize: 12, fontWeight: 600, color: c.text, whiteSpace: 'nowrap' }}>{u.name}</span></div></td>
                  <td style={{ padding: '10px 14px' }}><GroupBadge group={u.group}/></td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: c.muted, whiteSpace: 'nowrap' }}>{u.city}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {editingCell === u.name ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <input type="number" min={0} value={cellHome} onChange={e => setCellHome(Number(e.target.value))} style={{ width: 42, padding: '4px 6px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 14, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}/>
                        <span style={{ color: c.muted }}>–</span>
                        <input type="number" min={0} value={cellAway} onChange={e => setCellAway(Number(e.target.value))} style={{ width: 42, padding: '4px 6px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 14, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}/>
                        <button onClick={() => saveCellEdit(u.name)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: c.blue, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>OK</button>
                        <button onClick={() => setEditingCell(null)} style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'none', color: c.muted, fontSize: 11, cursor: 'pointer' }}>✕</button>
                      </div>
                    ) : pred ? <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: c.lime }}>{pred[0]} – {pred[1]}</span>
                      : <span style={{ fontSize: 11, color: c.dim, fontStyle: 'italic' }}>Sin predicción</span>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {editingCell !== u.name && <button onClick={() => openCellEdit(u.name, pred)} style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'none', color: c.blue, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✏ Editar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </div>
    </div>
  );
}

// ─── Match form modal (create + edit) ─────────────────────────────────────────
const PHASE_OPTIONS = [
  'GRUPO A','GRUPO B','GRUPO C','GRUPO D','GRUPO E','GRUPO F',
  'GRUPO G','GRUPO H','GRUPO I','GRUPO J','GRUPO K','GRUPO L',
  'DIECISEISAVOS','OCTAVOS DE FINAL','CUARTOS DE FINAL',
  'SEMIFINALES','TERCER LUGAR','FINAL','SERIE A',
];

const WC_TEAMS: { code: string; name: string }[] = [
  { code: 'TBD', name: 'Por definir' },
  { code: 'ALG', name: 'Argelia' },
  { code: 'ARG', name: 'Argentina' },
  { code: 'AUS', name: 'Australia' },
  { code: 'AUT', name: 'Austria' },
  { code: 'BEL', name: 'Bélgica' },
  { code: 'BIH', name: 'Bosnia y Herzegovina' },
  { code: 'BRA', name: 'Brasil' },
  { code: 'CAN', name: 'Canadá' },
  { code: 'CHI', name: 'Chile' },
  { code: 'CHN', name: 'China' },
  { code: 'CIV', name: 'Costa de Marfil' },
  { code: 'COD', name: 'Rep. Dem. del Congo' },
  { code: 'COL', name: 'Colombia' },
  { code: 'CPV', name: 'Cabo Verde' },
  { code: 'CRO', name: 'Croacia' },
  { code: 'CUW', name: 'Curazao' },
  { code: 'CZE', name: 'República Checa' },
  { code: 'DEN', name: 'Dinamarca' },
  { code: 'ECU', name: 'Ecuador' },
  { code: 'EGY', name: 'Egipto' },
  { code: 'ENG', name: 'Inglaterra' },
  { code: 'ESP', name: 'España' },
  { code: 'FRA', name: 'Francia' },
  { code: 'GER', name: 'Alemania' },
  { code: 'GHA', name: 'Ghana' },
  { code: 'HAI', name: 'Haití' },
  { code: 'IDN', name: 'Indonesia' },
  { code: 'IRN', name: 'Irán' },
  { code: 'IRQ', name: 'Irak' },
  { code: 'JOR', name: 'Jordania' },
  { code: 'JPN', name: 'Japón' },
  { code: 'KOR', name: 'Corea del Sur' },
  { code: 'KSA', name: 'Arabia Saudita' },
  { code: 'MAR', name: 'Marruecos' },
  { code: 'MEX', name: 'México' },
  { code: 'NED', name: 'Países Bajos' },
  { code: 'NGA', name: 'Nigeria' },
  { code: 'NOR', name: 'Noruega' },
  { code: 'NZL', name: 'Nueva Zelanda' },
  { code: 'PAN', name: 'Panamá' },
  { code: 'PAR', name: 'Paraguay' },
  { code: 'PER', name: 'Perú' },
  { code: 'POL', name: 'Polonia' },
  { code: 'POR', name: 'Portugal' },
  { code: 'QAT', name: 'Qatar' },
  { code: 'RSA', name: 'Sudáfrica' },
  { code: 'SCO', name: 'Escocia' },
  { code: 'SEN', name: 'Senegal' },
  { code: 'SRB', name: 'Serbia' },
  { code: 'SUI', name: 'Suiza' },
  { code: 'SWE', name: 'Suecia' },
  { code: 'TUN', name: 'Túnez' },
  { code: 'TUR', name: 'Turquía' },
  { code: 'UKR', name: 'Ucrania' },
  { code: 'URU', name: 'Uruguay' },
  { code: 'USA', name: 'Estados Unidos' },
  { code: 'UZB', name: 'Uzbekistán' },
  { code: 'VEN', name: 'Venezuela' },
];

function MatchFormModal({ initial, onSave, onClose }: {
  initial?: DBMatch | null;
  onSave: (m: DBMatch) => void;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [id, setId]             = useState(initial?.id ?? '');
  const [groupName, setGroup]   = useState(initial?.group_name ?? 'GRUPO A');
  const [homeCode, setHomeCode] = useState(initial?.home_code ?? '');
  const [homeName, setHomeName] = useState(initial?.home_name ?? '');
  const [awayCode, setAwayCode] = useState(initial?.away_code ?? '');
  const [awayName, setAwayName] = useState(initial?.away_name ?? '');
  const [matchDate, setDate]    = useState(initial?.match_date ?? '');
  const [stadium, setStadium]   = useState(initial?.stadium ?? '');
  const [sortOrder, setSort]    = useState(initial?.sort_order ?? 0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSave = async () => {
    if (!id.trim() || !homeCode.trim() || !awayCode.trim()) {
      setError('ID, equipo local y equipo visitante son obligatorios.');
      return;
    }
    setLoading(true); setError(null);
    const data: DBMatch = {
      id: id.trim().toLowerCase(),
      group_name: groupName,
      home_code: homeCode.trim().toUpperCase(),
      home_name: homeName.trim(),
      away_code: awayCode.trim().toUpperCase(),
      away_name: awayName.trim(),
      match_date: matchDate.trim(),
      stadium: stadium.trim() || null,
      sort_order: sortOrder,
      result_home: initial?.result_home ?? null,
      result_away: initial?.result_away ?? null,
    };
    try {
      if (isEdit) {
        await updateMatch(id, {
          group_name: data.group_name, home_code: data.home_code, home_name: data.home_name,
          away_code: data.away_code, away_name: data.away_name, match_date: data.match_date,
          stadium: data.stadium, sort_order: data.sort_order,
        });
      } else {
        await createMatch(data);
      }
      onSave(data);
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)',
    color: c.text, fontSize: 13, fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: c.muted,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div style={{ background: '#0D1829', border: `1px solid ${c.border}`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: c.text }}>{isEdit ? '✏️ Editar partido' : '➕ Nuevo partido'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: c.muted, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>ID del partido</label>
            <input value={id} onChange={e => setId(e.target.value)} disabled={isEdit}
              placeholder="ej. a1, qf1, final"
              style={{ ...inputStyle, opacity: isEdit ? 0.6 : 1 }}/>
          </div>
          <div>
            <label style={labelStyle}>Fase / Grupo</label>
            <select value={groupName} onChange={e => setGroup(e.target.value)} style={{ ...inputStyle, background: '#0D1829' }}>
              {PHASE_OPTIONS.map(p => <option key={p} value={p} style={{ background: '#0D1829' }}>{p}</option>)}
            </select>
          </div>
        </div>

        <div style={{ margin: '14px 0', borderTop: `1px solid ${c.border}` }}/>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>🏠 Equipo local</label>
            <select
              value={homeCode}
              onChange={e => {
                const team = WC_TEAMS.find(t => t.code === e.target.value);
                setHomeCode(e.target.value);
                setHomeName(team?.name ?? '');
              }}
              style={{ ...inputStyle, background: '#0D1829', cursor: 'pointer' }}
            >
              {WC_TEAMS.map(t => (
                <option key={t.code} value={t.code} style={{ background: '#0D1829' }}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>✈️ Equipo visitante</label>
            <select
              value={awayCode}
              onChange={e => {
                const team = WC_TEAMS.find(t => t.code === e.target.value);
                setAwayCode(e.target.value);
                setAwayName(team?.name ?? '');
              }}
              style={{ ...inputStyle, background: '#0D1829', cursor: 'pointer' }}
            >
              {WC_TEAMS.map(t => (
                <option key={t.code} value={t.code} style={{ background: '#0D1829' }}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ margin: '14px 0', borderTop: `1px solid ${c.border}` }}/>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Fecha / hora (ISO o texto)</label>
            <input value={matchDate} onChange={e => setDate(e.target.value)} placeholder="2026-06-11T17:00:00Z" style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Estadio (opcional)</label>
            <input value={stadium} onChange={e => setStadium(e.target.value)} placeholder="SoFi Stadium" style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Orden (sort)</label>
            <input type="number" value={sortOrder} onChange={e => setSort(Number(e.target.value))} style={inputStyle}/>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: '9px 13px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 8, fontSize: 13, color: c.rose }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 10, color: c.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={loading} style={{ flex: 2, padding: '12px', background: loading ? `${c.blue}66` : c.blue, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear partido'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Partidos + Resultados (fusionados) ───────────────────────────────────────
function ViewPartidos() {
  const [matches, setMatches] = useState<DBMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [results, setResults] = useState<Record<string, [number, number]>>({});
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string }>>({});
  const [phaseFilter, setPhaseFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<DBMatch | null | undefined>(undefined); // undefined=closed, null=new
  const [deleteTarget, setDeleteTarget] = useState<DBMatch | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Load matches + results from Supabase on mount
  useEffect(() => {
    Promise.all([getMatches(), getMatchResults()]).then(([ms, rs]) => {
      setMatches(ms);
      setResults(rs);
      // Pre-fill drafts with existing results so they're always editable
      const d: Record<string, { home: string; away: string }> = {};
      ms.forEach(m => {
        const saved = rs[m.id];
        d[m.id] = saved ? { home: String(saved[0]), away: String(saved[1]) } : { home: '', away: '' };
      });
      setDrafts(d);
      setLoadingMatches(false);
    });
  }, []);

  const phases = useMemo(() => ['Todos', ...Array.from(new Set(matches.map(m => m.group_name)))], [matches]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return matches.filter(m =>
      (phaseFilter === 'Todos' || m.group_name === phaseFilter) &&
      (!q || m.home_code.toLowerCase().includes(q) || m.away_code.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
    );
  }, [matches, phaseFilter, search]);

  const handleMatchSaved = (saved: DBMatch) => {
    setMatches(prev => {
      const idx = prev.findIndex(m => m.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [...prev, saved].sort((a, b) => a.sort_order - b.sort_order);
    });
    setDrafts(prev => ({ ...prev, [saved.id]: prev[saved.id] ?? { home: '', away: '' } }));
    setEditingMatch(undefined);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/admin/delete-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: deleteTarget.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        setDeleteError(d.error ?? 'Error al borrar');
        return;
      }
      // Only remove from UI after confirmed DB delete
      setMatches(prev => prev.filter(m => m.id !== deleteTarget.id));
      setDrafts(prev => { const n = { ...prev }; delete n[deleteTarget.id]; return n; });
      setDeleteTarget(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Error al borrar');
    } finally {
      setDeleting(false);
    }
  };

  // Save a result to Supabase
  const saveResult = async (matchId: string) => {
    const h = parseInt(drafts[matchId]?.home ?? '');
    const a = parseInt(drafts[matchId]?.away ?? '');
    if (isNaN(h) || isNaN(a)) return;
    setSaving(matchId);
    await saveMatchResult(matchId, h, a);
    setResults(prev => ({ ...prev, [matchId]: [h, a] }));
    setDrafts(prev => ({ ...prev, [matchId]: { home: '', away: '' } }));
    setSaving(null);
  };

  const clearResult = async (matchId: string) => {
    await saveMatchResult(matchId, null, null);
    setResults(prev => { const n = { ...prev }; delete n[matchId]; return n; });
    setDrafts(prev => ({ ...prev, [matchId]: { home: '', away: '' } }));
  };

  // Call /api/sync-results to pull finished matches from football-data.org
  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/sync-results');
      const json = await res.json();
      if (json.error) {
        setSyncMsg(`⚠ ${json.error}`);
      } else {
        setSyncMsg(`✓ ${json.synced} resultado${json.synced !== 1 ? 's' : ''} sincronizado${json.synced !== 1 ? 's' : ''} (${json.total} partidos en la API)`);
        const fresh = await getMatchResults();
        setResults(fresh);
      }
    } catch {
      setSyncMsg('⚠ Error de red al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const [seedingH2H, setSeedingH2H] = useState(false);
  const [seedH2HMsg, setSeedH2HMsg] = useState('');
  const handleSeedH2H = async () => {
    setSeedingH2H(true); setSeedH2HMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSeedH2HMsg('⚠ Sin sesión'); return; }
      const res = await fetch('/api/admin/seed-h2h', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.error) setSeedH2HMsg(`⚠ ${json.error}`);
      else setSeedH2HMsg(`✓ ${json.seeded} partidos con historial migrados a Supabase`);
    } catch { setSeedH2HMsg('⚠ Error de red'); }
    finally { setSeedingH2H(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: c.text }}>Partidos y Resultados</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: c.muted }}>
            {loadingMatches ? 'Cargando…' : `${matches.length} partidos · ${Object.keys(results).length} resultados registrados`}
          </p>
        </div>
        <button onClick={() => setEditingMatch(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: c.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ＋ Agregar partido
        </button>
      </div>

      {/* Sync results bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: '12px 16px', background: `${c.lime}0D`, border: `1px solid ${c.lime}33`, borderRadius: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: c.lime }}>🔄 Sincronizar resultados</div>
          <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>
            {syncMsg || 'Descarga automáticamente los resultados de partidos terminados del Mundial.'}
          </div>
        </div>
        <button onClick={handleSync} disabled={syncing} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: syncing ? c.border : c.lime, color: syncing ? c.muted : '#000', fontWeight: 700, fontSize: 13, cursor: syncing ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>
      </div>

      {/* Seed H2H bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: `${c.blue}0D`, border: `1px solid ${c.blue}33`, borderRadius: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: c.blue }}>📊 Historial H2H — migrar a Supabase</div>
          <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>
            {seedH2HMsg || 'Sube el historial de todos los partidos de grupos a la base de datos. Hazlo una sola vez.'}
          </div>
        </div>
        <button onClick={handleSeedH2H} disabled={seedingH2H} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: seedingH2H ? c.border : c.blue, color: '#fff', fontWeight: 700, fontSize: 13, cursor: seedingH2H ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {seedingH2H ? 'Migrando…' : 'Migrar historial'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', gap: 8, background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, padding: '8px 14px' }}>
          <span style={{ color: c.dim }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar equipo o ID…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: c.text, fontSize: 13, fontFamily: 'inherit' }}/>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {phases.map(p => <button key={p} onClick={() => setPhaseFilter(p)} style={{ padding: '6px 11px', borderRadius: 8, border: `1px solid ${phaseFilter === p ? c.blue : c.border}`, background: phaseFilter === p ? `${c.blue}22` : c.card, color: phaseFilter === p ? c.blue : c.muted, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{p}</button>)}
          <ViewToggle mode={viewMode} onChange={setViewMode}/>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtered.map(m => {
            const saved = results[m.id];
            const draft = drafts[m.id] ?? { home: '', away: '' };
            const isDirty = saved ? (draft.home !== String(saved[0]) || draft.away !== String(saved[1])) : (draft.home !== '' || draft.away !== '');
            return (
              <div key={m.id} style={{ background: c.card, border: `1px solid ${saved ? c.lime + '44' : c.border}`, borderRadius: 14, padding: '16px 18px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.blue }}>{m.id.toUpperCase()}</span>
                    <span style={{ fontSize: 9, color: c.muted }}>{m.group_name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setEditingMatch(m)} title="Editar equipos/fecha"
                      style={{ padding: '3px 7px', borderRadius: 5, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.muted, fontSize: 11, cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => setDeleteTarget(m)} title="Borrar partido"
                      style={{ padding: '3px 7px', borderRadius: 5, border: `1px solid ${c.rose}33`, background: `${c.rose}11`, color: c.rose, fontSize: 11, cursor: 'pointer' }}>🗑</button>
                  </div>
                </div>
                {/* Teams */}
                <div style={{ fontSize: 15, fontWeight: 800, color: c.text, marginBottom: 2, textAlign: 'center' }}>
                  {m.home_code} <span style={{ color: c.muted, fontWeight: 400 }}>vs</span> {m.away_code}
                </div>
                <div style={{ fontSize: 10, color: c.dim, textAlign: 'center', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.match_date}</div>
                {/* Result inputs — always editable, pre-filled */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                  <input type="number" min={0} placeholder="–" value={draft.home}
                    onChange={e => setDrafts(prev => ({ ...prev, [m.id]: { ...prev[m.id], home: e.target.value } }))}
                    style={{ width: 44, padding: '5px 6px', borderRadius: 6, border: `1px solid ${isDirty ? c.amber : saved ? c.lime + '88' : c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 14, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}/>
                  <span style={{ color: c.muted }}>–</span>
                  <input type="number" min={0} placeholder="–" value={draft.away}
                    onChange={e => setDrafts(prev => ({ ...prev, [m.id]: { ...prev[m.id], away: e.target.value } }))}
                    style={{ width: 44, padding: '5px 6px', borderRadius: 6, border: `1px solid ${isDirty ? c.amber : saved ? c.lime + '88' : c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 14, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}/>
                  <button onClick={() => saveResult(m.id)} disabled={saving === m.id || (!draft.home && !draft.away)}
                    style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: saving === m.id ? c.border : isDirty ? c.amber : c.lime, color: saving === m.id ? c.muted : '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {saving === m.id ? '…' : isDirty ? 'Actualizar' : 'Guardar'}
                  </button>
                  {saved && (
                    <button onClick={() => { clearResult(m.id); setDrafts(prev => ({ ...prev, [m.id]: { home: '', away: '' } })); }} title="Borrar resultado"
                      style={{ padding: '5px 7px', borderRadius: 6, border: `1px solid ${c.rose}44`, background: `${c.rose}11`, color: c.rose, fontSize: 11, cursor: 'pointer' }}>✕</button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: c.muted }}>Sin partidos</div>}
        </div>
      ) : (
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <TableWrap>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                  {['','ID','Fase/Grupo','Partido','Fecha','Resultado'].map(h => (
                    <th key={h} style={{ padding: '11px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 0.8, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => {
                  const saved = results[m.id];
                  const draft = drafts[m.id] ?? { home: '', away: '' };
                  const isDirty = saved ? (draft.home !== String(saved[0]) || draft.away !== String(saved[1])) : (draft.home !== '' || draft.away !== '');
                  return (
                    <tr key={m.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${c.border}` : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = c.rowHov)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {/* Edit / Delete — FIRST column, always visible */}
                      <td style={{ padding: '8px 8px 8px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setEditingMatch(m)} title="Editar equipos/fecha"
                            style={{ padding: '4px 7px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.05)', color: c.muted, fontSize: 12, cursor: 'pointer' }}>✏️</button>
                          <button onClick={() => setDeleteTarget(m)} title="Borrar partido"
                            style={{ padding: '4px 7px', borderRadius: 6, border: `1px solid ${c.rose}33`, background: `${c.rose}11`, color: c.rose, fontSize: 12, cursor: 'pointer' }}>🗑</button>
                        </div>
                      </td>
                      <td style={{ padding: '10px 10px', fontSize: 12, fontWeight: 700, color: c.blue, whiteSpace: 'nowrap' }}>{m.id.toUpperCase()}</td>
                      <td style={{ padding: '10px 10px', fontSize: 11, color: c.muted, whiteSpace: 'nowrap' }}>{m.group_name}</td>
                      <td style={{ padding: '10px 10px', fontSize: 13, fontWeight: 700, color: c.text, whiteSpace: 'nowrap' }}>
                        {m.home_code} <span style={{ color: c.muted, fontWeight: 400 }}>vs</span> {m.away_code}
                      </td>
                      <td style={{ padding: '10px 10px', fontSize: 11, color: c.muted, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.match_date}</td>
                      {/* Unified result cell — always editable, pre-filled with saved value */}
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input type="number" min={0} placeholder="–" value={draft.home}
                            onChange={e => setDrafts(prev => ({ ...prev, [m.id]: { ...prev[m.id], home: e.target.value } }))}
                            style={{ width: 38, padding: '4px 4px', borderRadius: 6, border: `1px solid ${isDirty ? c.amber : saved ? c.lime + '88' : c.border}`, background: saved && !isDirty ? `${c.lime}11` : 'rgba(255,255,255,0.06)', color: saved && !isDirty ? c.lime : c.text, fontSize: 13, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}/>
                          <span style={{ color: c.muted, fontSize: 12 }}>–</span>
                          <input type="number" min={0} placeholder="–" value={draft.away}
                            onChange={e => setDrafts(prev => ({ ...prev, [m.id]: { ...prev[m.id], away: e.target.value } }))}
                            style={{ width: 38, padding: '4px 4px', borderRadius: 6, border: `1px solid ${isDirty ? c.amber : saved ? c.lime + '88' : c.border}`, background: saved && !isDirty ? `${c.lime}11` : 'rgba(255,255,255,0.06)', color: saved && !isDirty ? c.lime : c.text, fontSize: 13, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}/>
                          <button onClick={() => saveResult(m.id)} disabled={saving === m.id || (!draft.home && !draft.away)}
                            style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: saving === m.id ? c.border : isDirty && saved ? c.amber : c.lime, color: saving === m.id ? c.muted : '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: (!draft.home && !draft.away) ? 0.4 : 1 }}>
                            {saving === m.id ? '…' : isDirty && saved ? 'Actualizar' : 'Guardar'}
                          </button>
                          {saved && (
                            <button onClick={() => { clearResult(m.id); setDrafts(prev => ({ ...prev, [m.id]: { home: '', away: '' } })); }} title="Borrar resultado"
                              style={{ padding: '4px 6px', borderRadius: 6, border: `1px solid ${c.rose}44`, background: `${c.rose}11`, color: c.rose, fontSize: 11, cursor: 'pointer' }}>✕</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
          {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: c.muted }}>Sin partidos</div>}
        </div>
      )}

      {/* Edit / Create modal */}
      {editingMatch !== undefined && (
        <MatchFormModal
          initial={editingMatch}
          onSave={handleMatchSaved}
          onClose={() => setEditingMatch(undefined)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: '#0D1829', border: `1px solid ${c.rose}44`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 8 }}>¿Borrar partido?</div>
            <div style={{ fontSize: 14, color: c.muted, marginBottom: 6 }}>
              <strong style={{ color: c.text }}>{deleteTarget.id.toUpperCase()}</strong> — {deleteTarget.home_code} vs {deleteTarget.away_code}
            </div>
            <div style={{ fontSize: 12, color: c.rose, marginBottom: 24 }}>
              ⚠ Esto también borrará todas las predicciones de este partido.
            </div>
            {deleteError && (
              <div style={{ marginBottom: 14, padding: '10px 14px', background: `${c.rose}20`, border: `1px solid ${c.rose}`, borderRadius: 8, fontSize: 13, color: c.rose, textAlign: 'left' }}>
                ⚠️ {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setDeleteTarget(null); setDeleteError(null); }} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 10, color: c.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDeleteConfirm} disabled={deleting} style={{ flex: 1, padding: '12px', background: c.rose, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? 'Borrando…' : 'Sí, borrar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Grupo Detalle ────────────────────────────────────────────────────────────
interface GroupPrizes { prize_1st: string; prize_2nd: string; prize_3rd: string }
interface BonusConfig { type: 'puntos' | 'otro'; value: string; result: string }
type BonusKey = 'champ' | 'runner' | 'third' | 'scorer';

const BONUS_CATEGORIES: { key: BonusKey; label: string; icon: string; field: string }[] = [
  { key: 'champ',  label: 'Campeón del mundo',  icon: '🏆', field: 'champ_code' },
  { key: 'runner', label: 'Subcampeón',          icon: '🥈', field: 'runner_up_code' },
  { key: 'third',  label: '3er Lugar',           icon: '🥉', field: 'third_code' },
  { key: 'scorer', label: 'Goleador del torneo', icon: '⚽', field: 'top_scorer' },
];

const defaultBonus = (): Record<BonusKey, BonusConfig> => ({
  champ:  { type: 'otro', value: '', result: '' },
  runner: { type: 'otro', value: '', result: '' },
  third:  { type: 'otro', value: '', result: '' },
  scorer: { type: 'otro', value: '', result: '' },
});

// ─── Shared: PowerPills ───────────────────────────────────────────────────────
function PowerPills({ usedPowers }: { usedPowers: string[] }) {
  const labels: Record<string, string> = { double: '×2', late: '⏱', spy: '🕵' };
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {(['double', 'late', 'spy'] as const).map(p => {
        const used = usedPowers.includes(p);
        return (
          <span key={p} title={p} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: used ? `${c.rose}22` : `${c.green}22`, color: used ? c.rose : c.green, fontSize: 11, fontWeight: 700, border: `1px solid ${used ? c.rose + '44' : c.green + '44'}` }}>{labels[p]}</span>
        );
      })}
    </div>
  );
}

// ─── Shared: UserDeleteModal ──────────────────────────────────────────────────
function UserDeleteModal({ user, onConfirm, onCancel, deleting, err }: { user: { name: string }; onConfirm: () => void; onCancel: () => void; deleting: boolean; err: string | null }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div style={{ background: '#0D1829', border: `1px solid ${c.rose}44`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🗑</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 8 }}>¿Eliminar jugador?</div>
        <div style={{ fontSize: 14, color: c.muted, marginBottom: 6 }}><strong style={{ color: c.text }}>{user.name}</strong></div>
        <div style={{ fontSize: 12, color: c.rose, marginBottom: 20 }}>⚠ Esto borrará su cuenta, predicciones y puntos permanentemente.</div>
        {err && <div style={{ marginBottom: 14, padding: '10px 14px', background: `${c.rose}20`, border: `1px solid ${c.rose}`, borderRadius: 8, fontSize: 13, color: c.rose, textAlign: 'left' }}>⚠️ {err}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 10, color: c.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: '12px', background: c.rose, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer' }}>{deleting ? 'Eliminando…' : 'Sí, eliminar'}</button>
        </div>
      </div>
    </div>
  );
}

function ViewGrupoDetalle({ group, liveUsers, onBack, onUserUpdated, onUserRemoved }: {
  group: string;
  liveUsers: LiveUser[];
  onBack: () => void;
  onUserUpdated: (u: LiveUser) => void;
  onUserRemoved: (id: string) => void;
}) {
  const isNacional  = group === '__nacional__';
  const isSinGrupo  = group === '__sin_grupo__';
  const isSpecial   = isNacional || isSinGrupo;
  const displayName = isNacional ? 'Nacional' : isSinGrupo ? 'Sin grupo' : group;
  const col = isNacional ? c.blue : isSinGrupo ? c.dim : (GROUP_COLORS[group] ?? c.blue);

  const nonAdmins = liveUsers.filter(u => u.role !== 'admin');
  const members = isNacional
    ? nonAdmins
    : isSinGrupo
      ? nonAdmins.filter(u => !u.group_name)
      : nonAdmins.filter(u => u.group_name === group);

  // Prizes
  const defaultPrizes: GroupPrizes = { prize_1st: '', prize_2nd: '', prize_3rd: '' };
  const [prizes, setPrizes] = useState<GroupPrizes>(defaultPrizes);
  const [prizesLoading, setPrizesLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Bonus prizes
  const [bonus, setBonus] = useState<Record<BonusKey, BonusConfig>>(defaultBonus());
  const [bonusSaveStatus, setBonusSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [applyingKey, setApplyingKey] = useState<BonusKey | null>(null);
  const [applyResults, setApplyResults] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isSinGrupo) { setPrizesLoading(false); return; }
    setPrizesLoading(true);
    (async () => {
      const { data } = await supabase.from('group_settings')
        .select('prize_1st,prize_2nd,prize_3rd,bonus_champ_type,bonus_champ_value,result_champ,bonus_runner_type,bonus_runner_value,result_runner,bonus_third_type,bonus_third_value,result_third,bonus_scorer_type,bonus_scorer_value,result_scorer')
        .eq('group_name', group).single();
      if (data) {
        setPrizes({ prize_1st: data.prize_1st, prize_2nd: data.prize_2nd, prize_3rd: data.prize_3rd });
        setBonus({
          champ:  { type: data.bonus_champ_type  as 'puntos'|'otro', value: data.bonus_champ_value  ?? '', result: data.result_champ  ?? '' },
          runner: { type: data.bonus_runner_type as 'puntos'|'otro', value: data.bonus_runner_value ?? '', result: data.result_runner ?? '' },
          third:  { type: data.bonus_third_type  as 'puntos'|'otro', value: data.bonus_third_value  ?? '', result: data.result_third  ?? '' },
          scorer: { type: data.bonus_scorer_type as 'puntos'|'otro', value: data.bonus_scorer_value ?? '', result: data.result_scorer ?? '' },
        });
      }
      setPrizesLoading(false);
    })();
  }, [group]); // eslint-disable-line react-hooks/exhaustive-deps

  const savePrizes = async () => {
    setSaveStatus('saving');
    const { error } = await supabase.from('group_settings')
      .upsert({ group_name: group, ...prizes, updated_at: new Date().toISOString() }, { onConflict: 'group_name' });
    setSaveStatus(error ? 'error' : 'saved');
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  const saveBonus = async () => {
    setBonusSaveStatus('saving');
    const patch = {
      group_name: group,
      bonus_champ_type:   bonus.champ.type,  bonus_champ_value:   bonus.champ.value,  result_champ:   bonus.champ.result  || null,
      bonus_runner_type:  bonus.runner.type, bonus_runner_value:  bonus.runner.value, result_runner:  bonus.runner.result || null,
      bonus_third_type:   bonus.third.type,  bonus_third_value:   bonus.third.value,  result_third:   bonus.third.result  || null,
      bonus_scorer_type:  bonus.scorer.type, bonus_scorer_value:  bonus.scorer.value, result_scorer:  bonus.scorer.result || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('group_settings').upsert(patch, { onConflict: 'group_name' });
    setBonusSaveStatus(error ? 'error' : 'saved');
    setTimeout(() => setBonusSaveStatus('idle'), 2500);
  };

  const applyBonusPoints = async (key: BonusKey) => {
    const cfg = bonus[key];
    const cat = BONUS_CATEGORIES.find(c => c.key === key)!;
    if (cfg.type !== 'puntos' || !cfg.result.trim() || !cfg.value) return;
    const pts = parseInt(cfg.value);
    if (isNaN(pts) || pts <= 0) return;
    setApplyingKey(key);

    // Find bonus picks matching the result, filtered to this group's members
    const memberIds = new Set(members.map(m => m.id));
    const { data: picks } = await supabase.from('bonus_picks').select('user_id, champ_code, runner_up_code, third_code, top_scorer').eq(cat.field as 'champ_code', cfg.result.trim());
    const eligible = (picks ?? []).filter((p: { user_id: string }) => memberIds.has(p.user_id));

    let awarded = 0;
    for (const p of eligible) {
      const { error } = await supabase.from('bonus_awards').upsert(
        { user_id: p.user_id, group_name: group, category: key, points: pts },
        { onConflict: 'user_id,group_name,category' },
      );
      if (!error) awarded++;
    }
    setApplyResults(r => ({ ...r, [key]: awarded }));
    setApplyingKey(null);
  };

  // Member actions
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editEntry, setEditEntry]   = useState<RankingEntry | null>(null);
  const [predsEntry, setPredsEntry] = useState<RankingEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<LiveUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteErr, setDeleteErr]   = useState<string | null>(null);

  const handleDeleteUser = async () => {
    if (!deleteEntry) return;
    setDeletingUser(true); setDeleteErr(null);
    try {
      const res = await fetch('/api/admin/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: deleteEntry.id }) });
      if (!res.ok) { const d = await res.json(); setDeleteErr(d.error ?? 'Error'); setDeletingUser(false); return; }
      onUserRemoved(deleteEntry.id);
      setDeleteEntry(null);
    } catch { setDeleteErr('Error de red'); }
    setDeletingUser(false);
  };

  const togglePremium = async (u: LiveUser) => {
    setTogglingId(u.id);
    await supabase.from('profiles').update({ premium: !u.premium }).eq('id', u.id);
    onUserUpdated({ ...u, premium: !u.premium });
    setTogglingId(null);
  };

  const removeFromGroup = async (u: LiveUser) => {
    if (!confirm(`¿Quitar a ${u.name} del grupo ${group}?`)) return;
    setRemovingId(u.id);
    await supabase.from('profiles').update({ group_name: null }).eq('id', u.id);
    onUserRemoved(u.id);
    setRemovingId(null);
  };

  const prizeFields: { key: keyof GroupPrizes; icon: string; label: string }[] = [
    { key: 'prize_1st', icon: '🥇', label: '1er Lugar' },
    { key: 'prize_2nd', icon: '🥈', label: '2do Lugar' },
    { key: 'prize_3rd', icon: '🥉', label: '3er Lugar' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button onClick={onBack} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.card, color: c.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>← Grupos</button>
        {isNacional
          ? <div style={{ width: 42, height: 42, borderRadius: '50%', background: `${c.blue}22`, border: `2px solid ${c.blue}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🌎</div>
          : isSinGrupo
            ? <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: `2px solid rgba(255,255,255,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>❓</div>
            : <GroupIcon group={group} size={42}/>}
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: c.text }}>{displayName}</div>
          <div style={{ fontSize: 12, color: c.muted }}>{members.length} miembro{members.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ marginLeft: 'auto', padding: '4px 14px', borderRadius: 20, background: `${col}22`, border: `1px solid ${col}44`, fontSize: 11, fontWeight: 700, color: col }}>
          {isNacional ? 'Todos los usuarios' : isSinGrupo ? 'Sin asignar' : 'Grupo activo'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isSinGrupo ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: 24, alignItems: 'start' }}>

        {/* ── Premios del grupo ── */}
        {!isSinGrupo && <div>
          <SectionHeader title="Premios del grupo" sub="Qué gana cada lugar dentro de este grupo"/>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {prizesLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: c.muted, fontSize: 13 }}>Cargando…</div>
            ) : (
              <>
                {prizeFields.map(({ key, icon, label }) => (
                  <div key={key}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: c.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      <span style={{ fontSize: 16 }}>{icon}</span>{label}
                    </label>
                    <input
                      value={prizes[key]}
                      onChange={e => setPrizes(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={`Ej. $15,000 MXN`}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <button onClick={savePrizes} disabled={saveStatus === 'saving'} style={{
                  width: '100%', padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  background: saveStatus === 'saved' ? `${c.lime}33` : saveStatus === 'error' ? `${c.rose}33` : `${col}33`,
                  color: saveStatus === 'saved' ? c.lime : saveStatus === 'error' ? c.rose : col,
                  transition: 'all 200ms',
                }}>
                  {saveStatus === 'saving' ? 'Guardando…' : saveStatus === 'saved' ? '✓ Guardado' : saveStatus === 'error' ? '✗ Error al guardar' : 'Guardar premios'}
                </button>
              </>
            )}
          </div>
        </div>}

        {/* ── Miembros ── */}
        <div>
          <SectionHeader
            title={isNacional ? 'Todos los usuarios' : isSinGrupo ? 'Sin grupo asignado' : 'Miembros'}
            sub={`${members.length} usuario${members.length !== 1 ? 's' : ''}`}
          />
          {members.length === 0 ? (
            <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: '32px 20px', textAlign: 'center', color: c.muted, fontSize: 13 }}>
              {isSinGrupo ? 'Todos los usuarios tienen grupo asignado.' : 'No hay usuarios en este grupo aún.'}<br/>
              <span style={{ fontSize: 11, opacity: 0.7 }}>Asigna usuarios desde la sección Usuarios.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, flexWrap: 'wrap' }}>
                  <Avatar initials={u.name.slice(0, 2).toUpperCase()} size={32}/>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: c.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isNacional && u.group_name ? <span style={{ color: GROUP_COLORS[u.group_name] ?? c.blue, fontWeight: 600 }}>{u.group_name} · </span> : null}
                      {u.email}
                    </div>
                  </div>
                  <PowerPills usedPowers={u.used_powers ?? []}/>
                  {/* Premium toggle */}
                  <button onClick={() => togglePremium(u)} disabled={togglingId === u.id} title={u.premium ? 'Quitar Premium' : 'Dar Premium'}
                    style={{ padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, background: u.premium ? `${c.lime}33` : 'rgba(255,255,255,0.08)', color: u.premium ? c.lime : c.dim, flexShrink: 0 }}>
                    {togglingId === u.id ? '…' : u.premium ? '⭐ Premium' : 'Free'}
                  </button>
                  {/* Action buttons */}
                  <button onClick={() => setPredsEntry(liveUserToEntry(u))} style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(201,243,29,0.1)', border: `1px solid ${c.lime}40`, color: c.lime, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>📋 Predicciones</button>
                  <button onClick={() => setEditEntry(liveUserToEntry(u))} style={{ padding: '5px 10px', borderRadius: 7, background: `${c.blue}20`, border: `1px solid ${c.blue}50`, color: c.blue, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✏️ Editar</button>
                  {!isSpecial && (
                    <button onClick={() => removeFromGroup(u)} disabled={removingId === u.id} title="Quitar del grupo"
                      style={{ padding: '5px 8px', borderRadius: 7, border: `1px solid ${c.border}`, background: 'transparent', color: c.dim, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
                      {removingId === u.id ? '…' : '✕ Grupo'}
                    </button>
                  )}
                  <button onClick={() => { setDeleteEntry(u); setDeleteErr(null); }} style={{ padding: '5px 8px', borderRadius: 7, background: `${c.rose}15`, border: `1px solid ${c.rose}40`, color: c.rose, fontSize: 13, cursor: 'pointer' }} title="Eliminar usuario">🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Premios Bonus ── */}
      {!isSinGrupo && (
        <div style={{ marginTop: 28 }}>
          <SectionHeader title="Premios bonus" sub="Predicciones especiales — elige si el premio son puntos o algo más"/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {BONUS_CATEGORIES.map(cat => {
              const cfg = bonus[cat.key];
              const isPuntos = cfg.type === 'puntos';
              const applied = applyResults[cat.key];
              return (
                <div key={cat.key} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 20 }}>{cat.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{cat.label}</span>
                  </div>

                  {/* Type toggle */}
                  <div style={{ display: 'flex', borderRadius: 8, border: `1px solid ${c.border}`, overflow: 'hidden', marginBottom: 12 }}>
                    {(['puntos', 'otro'] as const).map(t => (
                      <button key={t} onClick={() => setBonus(b => ({ ...b, [cat.key]: { ...b[cat.key], type: t } }))} style={{
                        flex: 1, padding: '7px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        background: cfg.type === t ? (t === 'puntos' ? `${c.lime}33` : `${c.blue}33`) : 'transparent',
                        color: cfg.type === t ? (t === 'puntos' ? c.lime : c.blue) : c.dim,
                        transition: 'all 150ms',
                      }}>
                        {t === 'puntos' ? '⭐ Puntos' : '🎁 Otro'}
                      </button>
                    ))}
                  </div>

                  {/* Value input */}
                  <label style={{ fontSize: 11, color: c.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {isPuntos ? 'Cantidad de puntos' : 'Descripción del premio'}
                  </label>
                  <input
                    type={isPuntos ? 'number' : 'text'}
                    value={cfg.value}
                    onChange={e => setBonus(b => ({ ...b, [cat.key]: { ...b[cat.key], value: e.target.value } }))}
                    placeholder={isPuntos ? 'Ej. 15' : 'Ej. Tarjeta Amazon $500'}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginTop: 6, marginBottom: 12 }}
                  />

                  {/* Result input + apply button (only for puntos) */}
                  {isPuntos && (
                    <>
                      <label style={{ fontSize: 11, color: c.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {cat.key === 'scorer' ? 'Nombre del goleador real' : 'Código del equipo real (ej. ARG)'}
                      </label>
                      <input
                        value={cfg.result}
                        onChange={e => setBonus(b => ({ ...b, [cat.key]: { ...b[cat.key], result: e.target.value } }))}
                        placeholder={cat.key === 'scorer' ? 'Ej. Messi' : 'Ej. ARG'}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginTop: 6, marginBottom: 12 }}
                      />
                      <button
                        onClick={() => applyBonusPoints(cat.key)}
                        disabled={applyingKey === cat.key || !cfg.result.trim() || !cfg.value}
                        style={{
                          width: '100%', padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                          background: applied !== undefined ? `${c.lime}33` : `${c.blue}22`,
                          color: applied !== undefined ? c.lime : c.blue,
                        }}>
                        {applyingKey === cat.key ? 'Aplicando…' : applied !== undefined ? `✓ ${applied} usuario${applied !== 1 ? 's' : ''} premiado${applied !== 1 ? 's' : ''}` : '⚡ Aplicar puntos'}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={saveBonus} disabled={bonusSaveStatus === 'saving'} style={{
            marginTop: 14, padding: '11px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
            background: bonusSaveStatus === 'saved' ? `${c.lime}33` : bonusSaveStatus === 'error' ? `${c.rose}33` : `${col}33`,
            color: bonusSaveStatus === 'saved' ? c.lime : bonusSaveStatus === 'error' ? c.rose : col,
          }}>
            {bonusSaveStatus === 'saving' ? 'Guardando…' : bonusSaveStatus === 'saved' ? '✓ Configuración guardada' : bonusSaveStatus === 'error' ? '✗ Error' : 'Guardar configuración bonus'}
          </button>
        </div>
      )}

      {/* Edit / Preds / Delete modals */}
      {editEntry && (
        <EditPlayerModal entry={editEntry} onClose={() => setEditEntry(null)}
          onSaved={updated => { if (updated.name || updated.group_name !== undefined) onUserUpdated({ ...members.find(m => m.id === editEntry.userId)!, ...(updated.name ? { name: updated.name } : {}), ...(updated.group_name !== undefined ? { group_name: updated.group_name } : {}) }); }}
          onReload={() => {}}/>
      )}
      {predsEntry && <UserPredictionsModal entry={predsEntry} onClose={() => setPredsEntry(null)}/>}
      {deleteEntry && (
        <UserDeleteModal user={deleteEntry} onConfirm={handleDeleteUser} onCancel={() => setDeleteEntry(null)} deleting={deletingUser} err={deleteErr}/>
      )}

    </div>
  );
}

// ─── Gestión de Grupos ───────────────────────────────────────────────────────
type DBGroup = { id: number; name: string; color: string; logo_url?: string | null };

const COLOR_PRESETS = [
  '#A3E635','#1AAFFF','#F59E0B','#0063E5','#8B5CF6',
  '#22C55E','#EF4444','#F97316','#EC4899','#14B8A6',
  '#F43F5E','#84CC16','#06B6D4','#A855F7','#FB923C',
];

function ViewGruposConfig({ onSelectGroup, onBack }: { onSelectGroup: (g: string) => void; onBack?: () => void }) {
  const isMobile = useIsMobile();
  const [dbGroups, setDbGroups] = useState<DBGroup[]>([]);
  const [loading, setLoading]   = useState(true);
  const [newName, setNewName]   = useState('');
  const [newColor, setNewColor] = useState('#1AAFFF');
  const [adding, setAdding]     = useState(false);
  const [editing, setEditing]   = useState<DBGroup | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    supabase.from('groups').select('id, name, color, logo_url').order('name')
      .then(({ data }) => { setDbGroups((data ?? []) as DBGroup[]); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) { setErr('Ingresa el nombre del grupo.'); return; }
    setSaving(true); setErr(null);
    const { error } = await supabase.from('groups').insert({ name: newName.trim(), color: newColor });
    if (error) { setErr(error.message); setSaving(false); return; }
    setNewName(''); setNewColor('#1AAFFF'); setAdding(false);
    load();
    setSaving(false);
  };

  const handleSaveEdit = async () => {
    if (!editing || !editName.trim()) return;
    setSaving(true); setErr(null);

    // Upload logo if a new file was selected, or clear if explicitly removed
    let newLogoUrl: string | null | undefined = undefined; // undefined = no change
    if (!editLogoPreview && editing.logo_url) {
      // User removed the existing logo
      newLogoUrl = null;
    } else if (editLogoFile) {
      setUploadingLogo(true);
      const ext = editLogoFile.name.split('.').pop()?.toLowerCase() ?? 'png';
      const path = `${editName.trim().toLowerCase().replace(/\s+/g, '-')}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('group-logos')
        .upload(path, editLogoFile, { upsert: true, contentType: editLogoFile.type });
      if (upErr) { setErr(`Error subiendo logo: ${upErr.message}`); setSaving(false); setUploadingLogo(false); return; }
      newLogoUrl = supabase.storage.from('group-logos').getPublicUrl(path).data.publicUrl;
      setUploadingLogo(false);
    }

    // Save via server-side route (uses service role, bypasses RLS)
    const body: Record<string, unknown> = {
      id: editing.id,
      name: editName.trim(),
      color: editColor,
      old_name: editing.name,
    };
    if (newLogoUrl !== undefined) body.logo_url = newLogoUrl;
    const res = await fetch('/api/admin/update-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr((data as { error?: string }).error ?? 'Error guardando');
      setSaving(false);
      return;
    }
    setEditing(null); setEditLogoFile(null); setEditLogoPreview(null);
    load();
    setSaving(false);
  };

  const handleDelete = async (g: DBGroup) => {
    if (!confirm(`¿Eliminar el grupo "${g.name}"? Los usuarios de este grupo quedarán sin grupo asignado.`)) return;
    setSaving(true);
    await supabase.from('profiles').update({ group_name: null }).eq('group_name', g.name);
    await supabase.from('allowed_phones').update({ group_name: null }).eq('group_name', g.name);
    await supabase.from('groups').delete().eq('id', g.id);
    load();
    setSaving(false);
  };

  const openEdit = (g: DBGroup) => { setEditing(g); setEditName(g.name); setEditColor(g.color); setEditLogoFile(null); setEditLogoPreview(g.logo_url ?? null); setErr(null); };

  const inputS: React.CSSProperties = {
    padding: '9px 12px', borderRadius: 8, border: `1px solid ${c.border}`,
    background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 13,
    fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <button onClick={onBack} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.card, color: c.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>← Grupos</button>
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: c.text }}>Configurar grupos</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: c.muted }}>
              {loading ? 'Cargando…' : `${dbGroups.length} grupos configurados`}
            </p>
          </div>
        </div>
        <button onClick={() => { setAdding(true); setErr(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: c.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Nuevo grupo
        </button>
      </div>

      {err && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 8, fontSize: 13, color: c.rose }}>{err}</div>}

      {/* Group list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: c.muted }}>Cargando grupos…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
          {dbGroups.map(g => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: c.card, border: `1px solid ${g.color}44`, borderRadius: 14 }}>
              <GroupIcon group={g.name} size={40} colorOverride={g.color} logoUrlOverride={g.logo_url}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: g.color }}/>
                  <span style={{ fontSize: 11, color: c.muted, fontFamily: 'monospace' }}>{g.color}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => openEdit(g)} style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, cursor: 'pointer', fontSize: 12 }}>✏️</button>
                <button onClick={() => onSelectGroup(g.name)} title="Ver usuarios" style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${c.border}`, background: 'transparent', color: c.blue, cursor: 'pointer', fontSize: 12 }}>👥</button>
                <button onClick={() => handleDelete(g)} disabled={saving} style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${c.border}`, background: 'transparent', color: c.rose, cursor: 'pointer', fontSize: 12, opacity: saving ? 0.4 : 1 }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add group modal */}
      {adding && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#0D1829', border: `1px solid ${c.border}`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: c.text }}>Nuevo grupo</h3>
              <button onClick={() => setAdding(false)} style={{ background: 'none', border: 'none', color: c.muted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Nombre del grupo</label>
              <input type="text" placeholder="Ej. Mi Empresa" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} style={inputS}/>
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Color</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {COLOR_PRESETS.map(col => (
                  <button key={col} onClick={() => setNewColor(col)} style={{ width: 28, height: 28, borderRadius: '50%', background: col, border: newColor === col ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer', boxShadow: newColor === col ? `0 0 0 2px ${col}` : 'none' }}/>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: 40, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'none', padding: 0 }}/>
                <span style={{ fontSize: 12, color: c.muted, fontFamily: 'monospace' }}>{newColor}</span>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: newColor }}/>
              </div>
            </div>
            {err && <div style={{ marginBottom: 14, padding: '9px 12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 8, fontSize: 13, color: c.rose }}>{err}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setAdding(false)} style={{ flex: 1, padding: '11px', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 10, color: c.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleAdd} disabled={saving} style={{ flex: 1, padding: '11px', background: c.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando…' : 'Crear grupo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit group modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#0D1829', border: `1px solid ${c.border}`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: c.text }}>Editar grupo</h3>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: c.muted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Nombre del grupo</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={inputS}/>
              {editName !== editing.name && (
                <div style={{ fontSize: 11, color: c.amber, marginTop: 4 }}>⚠ Se actualizará en todos los usuarios y celulares autorizados</div>
              )}
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Color</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {COLOR_PRESETS.map(col => (
                  <button key={col} onClick={() => setEditColor(col)} style={{ width: 28, height: 28, borderRadius: '50%', background: col, border: editColor === col ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer', boxShadow: editColor === col ? `0 0 0 2px ${col}` : 'none' }}/>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: 40, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'none', padding: 0 }}/>
                <span style={{ fontSize: 12, color: c.muted, fontFamily: 'monospace' }}>{editColor}</span>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: editColor }}/>
              </div>
            </div>
            {/* Logo upload */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Logo del grupo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Preview */}
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: editLogoPreview ? '#fff' : 'rgba(255,255,255,0.06)', border: `2px solid ${editLogoPreview ? editColor + '66' : c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {editLogoPreview
                    ? <img src={editLogoPreview} alt="logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }}/>
                    : <span style={{ fontSize: 20, color: c.dim }}>🖼</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {uploadingLogo ? 'Subiendo…' : editLogoFile ? editLogoFile.name : 'Elegir imagen'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setEditLogoFile(f);
                      setEditLogoPreview(URL.createObjectURL(f));
                    }}/>
                  </label>
                  {editLogoPreview && (
                    <button onClick={() => { setEditLogoFile(null); setEditLogoPreview(null); }} style={{ marginLeft: 8, background: 'none', border: 'none', color: c.rose, fontSize: 12, cursor: 'pointer' }}>✕ Quitar</button>
                  )}
                  <div style={{ fontSize: 11, color: c.dim, marginTop: 4 }}>PNG, JPG o SVG recomendado</div>
                </div>
              </div>
            </div>

            {err && <div style={{ marginBottom: 14, padding: '9px 12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 8, fontSize: 13, color: c.rose }}>{err}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setEditing(null); setEditLogoFile(null); setEditLogoPreview(null); }} style={{ flex: 1, padding: '11px', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 10, color: c.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSaveEdit} disabled={saving || uploadingLogo} style={{ flex: 1, padding: '11px', background: c.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: (saving || uploadingLogo) ? 'default' : 'pointer', opacity: (saving || uploadingLogo) ? 0.7 : 1 }}>
                {uploadingLogo ? 'Subiendo logo…' : saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Grupos ───────────────────────────────────────────────────────────────────
function GroupCard({ label, col, icon, memberCount, totalUsers, onClick }: {
  label: string; col: string; icon: React.ReactNode;
  memberCount: number; totalUsers: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{ background: c.card, border: `1px solid ${col}44`, borderRadius: 16, padding: '18px 20px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 150ms, background 150ms' }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${col}99`; (e.currentTarget as HTMLButtonElement).style.background = `${col}0D`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${col}44`; (e.currentTarget as HTMLButtonElement).style.background = c.card; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        {icon}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
          <div style={{ fontSize: 11, color: c.muted }}>{memberCount} miembro{memberCount !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: totalUsers > 0 ? `${(memberCount / totalUsers) * 100}%` : '0%', background: col, borderRadius: 2 }}/>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: col, fontWeight: 600 }}>Ver usuarios →</div>
    </button>
  );
}

function ViewGrupos({ liveUsers, onSelectGroup, onConfigure }: { liveUsers: LiveUser[]; onSelectGroup: (g: string) => void; onConfigure?: () => void }) {
  const isMobile = useIsMobile();
  const nonAdmins = liveUsers.filter(u => u.role !== 'admin');
  const sinGrupo = nonAdmins.filter(u => !u.group_name);
  const totalUsers = nonAdmins.length;

  // Load groups from /api/groups (service-role, bypasses RLS, includes logo_url)
  const [dbGroups, setDbGroups] = useState<DBGroup[]>([]);
  useEffect(() => {
    fetch('/api/groups')
      .then(r => r.json())
      .then((rows: { name: string; color: string; logo_url?: string | null }[]) => {
        if (rows?.length) {
          // Map to DBGroup shape (id not needed here, use 0)
          setDbGroups(rows.map(r => ({ id: 0, name: r.name, color: r.color, logo_url: r.logo_url ?? null })));
        }
      })
      .catch(() => {});
  }, []);

  const groupList = dbGroups.length > 0 ? dbGroups : ALL_GROUPS.map(name => ({ id: 0, name, color: GROUP_COLORS[name] ?? c.blue, logo_url: null }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: c.text }}>Grupos</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: c.muted }}>{groupList.length} grupos · {totalUsers} usuarios</p>
        </div>
        {onConfigure && (
          <button onClick={onConfigure} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${c.border}`, borderRadius: 10, color: c.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ⚙️ Configurar grupos
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>

        {/* Nacional — todos */}
        <GroupCard
          label="Nacional" col={c.blue}
          icon={
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${c.blue}22`, border: `2px solid ${c.blue}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🌎</div>
          }
          memberCount={totalUsers} totalUsers={totalUsers}
          onClick={() => onSelectGroup('__nacional__')}
        />

        {/* Grupos reales */}
        {groupList.map(g => (
          <GroupCard key={g.name} label={g.name} col={g.color}
            icon={<GroupIcon group={g.name} size={40} colorOverride={g.color} logoUrlOverride={g.logo_url}/>}
            memberCount={nonAdmins.filter(u => u.group_name === g.name).length}
            totalUsers={totalUsers}
            onClick={() => onSelectGroup(g.name)}
          />
        ))}

        {/* Sin grupo */}
        <GroupCard
          label="Sin grupo" col={c.dim}
          icon={
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: `2px solid rgba(255,255,255,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>❓</div>
          }
          memberCount={sinGrupo.length} totalUsers={totalUsers}
          onClick={() => onSelectGroup('__sin_grupo__')}
        />

      </div>
    </div>
  );
}

// ─── Crear / Gestionar Usuarios ──────────────────────────────────────────────
// ─── Import helpers ───────────────────────────────────────────────────────────
const toSlug = (s: string) =>
  s.trim().toLowerCase()
   .normalize('NFD').replace(/[̀-ͯ]/g, '')
   .replace(/\s+/g, '.')
   .replace(/[^a-z0-9.]/g, '');

const genPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

interface ImportRow {
  numero:     string;
  nombre:     string;
  grupo:      string;
  ciudad:     string;
  telefono:   string;  // priority: Celular Laboral → Celular Personal
  phone_type: 'laboral' | 'personal' | null;
  status:     'pending' | 'ok' | 'error';
  errorMsg:   string;
}

function normalizePhoneImport(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+52${digits}`;
  if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`;
  if (raw.startsWith('+')) return raw.trim();
  return `+${digits}`;
}

function ImportModal({ onClose, onDone }: {
  onClose: () => void;
  onDone: (created: ImportRow[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [defaultGroup, setDefaultGroup] = useState('Evolve');
  const [premium, setPremium] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const parseFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    let rawRows: Record<string, unknown>[] = [];
    if (ext === 'csv') {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
      rawRows = lines.slice(1).map(line => {
        const vals = line.split(',');
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim(); });
        return obj;
      });
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[];
    }

    const norm = (v: unknown) => String(v ?? '').trim();
    const findCol = (obj: Record<string, unknown>, ...keys: string[]) => {
      for (const k of Object.keys(obj)) {
        const kl = k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        for (const target of keys) if (kl.includes(target)) return norm(obj[k]);
      }
      return '';
    };

    const parsed: ImportRow[] = rawRows
      .filter(r => findCol(r, 'nombre', 'name') || findCol(r, 'telefono', 'tel', 'phone', 'celular', 'movil', 'cel'))
      .map(r => {
        const nombre   = findCol(r, 'nombre', 'name');
        const numero   = findCol(r, 'numero', 'num', '#');
        const grupo    = findCol(r, 'grupo', 'group') || defaultGroup;
        const rawTel   = findCol(r, 'telefono', 'tel', 'phone', 'celular', 'movil', 'cel');
        const telefono = rawTel ? normalizePhoneImport(rawTel) : '';
        return { numero, nombre, grupo, ciudad: '', telefono, phone_type: null, status: 'pending' as const, errorMsg: '' };
      });

    setRows(parsed);
    setStep('preview');
  };

  const handleFile = (file: File | null) => { if (file) parseFile(file); };

  const handleImport = async () => {
    setStep('importing');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const updated = [...rows];
    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      if (!row.telefono) {
        updated[i] = { ...row, status: 'error', errorMsg: 'Sin teléfono' };
        setProgress(Math.round(((i + 1) / updated.length) * 100));
        setRows([...updated]);
        continue;
      }
      try {
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ name: row.nombre || row.telefono, phone: row.telefono, group_name: row.grupo, role: 'user', premium }),
        });
        const json = await res.json();
        updated[i] = { ...row, status: res.ok ? 'ok' : 'error', errorMsg: res.ok ? '' : (json.error ?? 'Error') };
      } catch {
        updated[i] = { ...row, status: 'error', errorMsg: 'Error de red' };
      }
      setProgress(Math.round(((i + 1) / updated.length) * 100));
      setRows([...updated]);
    }
    setStep('done');
    onDone(updated.filter(r => r.status === 'ok'));
  };

  const okCount    = rows.filter(r => r.status === 'ok').length;
  const errorCount = rows.filter(r => r.status === 'error').length;
  const noPhoneCount = rows.filter(r => !r.telefono).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div style={{ background: '#0D1829', border: `1px solid ${c.border}`, borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c.text }}>📥 Importar usuarios</div>
            <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
              {step === 'upload' && 'Sube un archivo Excel o CSV con el número celular de cada empleado'}
              {step === 'preview' && `${rows.length} usuarios detectados · ${noPhoneCount > 0 ? `⚠ ${noPhoneCount} sin teléfono` : 'todos con teléfono ✓'}`}
              {step === 'importing' && `Importando… ${progress}%`}
              {step === 'done' && `✓ ${okCount} creados · ${errorCount} errores`}
            </div>
          </div>
          {step !== 'importing' && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: c.muted, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? c.blue : c.border}`,
                  borderRadius: 14, padding: '40px 24px',
                  textAlign: 'center', cursor: 'pointer',
                  background: dragOver ? `${c.blue}10` : 'rgba(255,255,255,0.02)',
                  transition: 'all 200ms',
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 6 }}>Arrastra tu archivo aquí o haz clic</div>
                <div style={{ fontSize: 12, color: c.muted }}>.xlsx · .xls · .csv</div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0] ?? null)}/>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Grupo por defecto</label>
                <GroupSelect value={defaultGroup} onChange={setDefaultGroup}/>
                <div style={{ fontSize: 10, color: c.muted, marginTop: 4 }}>Se usa si la columna Grupo está vacía en el archivo</div>
              </div>

              <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: c.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>Formato del archivo</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>{['Numero', 'Nombre', 'Celular', 'Grupo'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: c.blue, borderBottom: `1px solid ${c.border}`, fontWeight: 700 }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {[['1', 'Juan Pérez', '8121234567', 'Evolve'], ['2', 'María García', '+528127654321', 'ADM'], ['3', 'Carlos López', '9991111222', '']].map((row, i) => (
                        <tr key={i}>{row.map((v, j) => <td key={j} style={{ padding: '5px 10px', color: v ? c.text : c.dim, fontStyle: v || j < 3 ? 'normal' : 'italic' }}>{v || '(usa grupo por defecto)'}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: c.muted, lineHeight: 1.5 }}>
                  ✦ El celular es la <strong style={{ color: c.blue }}>llave de acceso</strong> de cada empleado — es obligatorio.<br/>
                  ✦ Se acepta con o sin +52 — se normaliza automáticamente.
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: `1px solid ${c.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>Acceso Premium</div>
                  <div style={{ fontSize: 11, color: c.muted }}>Para todos los importados</div>
                </div>
                <button onClick={() => setPremium(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: premium ? c.blue : 'rgba(255,255,255,0.15)', position: 'relative', flexShrink: 0, transition: 'background 200ms' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: premium ? 23 : 3, transition: 'left 200ms' }}/>
                </button>
              </div>

              {noPhoneCount > 0 && (
                <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, fontSize: 12, color: c.amber }}>
                  ⚠ {noPhoneCount} fila{noPhoneCount > 1 ? 's' : ''} sin número de celular — no se podrán importar
                </div>
              )}

              <div style={{ border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#0D1829', zIndex: 1 }}>
                      <tr>{['#', 'Nombre', 'Celular', 'Grupo'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: c.muted, borderBottom: `1px solid ${c.border}`, fontWeight: 600 }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${c.border}`, opacity: row.telefono ? 1 : 0.5 }}>
                          <td style={{ padding: '8px 12px', color: c.dim }}>{row.numero || i + 1}</td>
                          <td style={{ padding: '8px 12px', color: c.text, fontWeight: 600 }}>{row.nombre || <span style={{ color: c.muted, fontStyle: 'italic' }}>sin nombre</span>}</td>
                          <td style={{ padding: '8px 12px', color: row.telefono ? c.blue : c.rose, fontFamily: 'monospace', fontWeight: 600 }}>
                            {row.telefono || <span style={{ fontStyle: 'italic', fontWeight: 400 }}>⚠ sin celular</span>}
                          </td>
                          <td style={{ padding: '8px 12px', color: c.muted }}>{row.grupo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, overflow: 'hidden', height: 8 }}>
                <div style={{ height: '100%', background: c.blue, width: `${progress}%`, transition: 'width 300ms ease', borderRadius: 10 }}/>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
                {rows.map((row, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <span style={{ fontSize: 14, width: 20, flexShrink: 0 }}>
                      {row.status === 'ok' ? '✅' : row.status === 'error' ? '❌' : '⏳'}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: c.text }}>{row.nombre || row.telefono}</span>
                    <span style={{ fontSize: 11, color: c.muted, fontFamily: 'monospace' }}>{row.telefono}</span>
                    {row.status === 'error' && <span style={{ fontSize: 11, color: c.rose }}>{row.errorMsg}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: '16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#22C55E' }}>{okCount}</div>
                  <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>Creados correctamente</div>
                </div>
                <div style={{ padding: '16px', background: errorCount > 0 ? 'rgba(244,63,94,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${errorCount > 0 ? 'rgba(244,63,94,0.3)' : c.border}`, borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: errorCount > 0 ? c.rose : c.muted }}>{errorCount}</div>
                  <div style={{ fontSize: 12, color: c.muted, marginTop: 4 }}>Con errores</div>
                </div>
              </div>

              {okCount > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Usuarios creados</div>
                  <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#0D1829' }}>
                          <tr>{['Nombre', 'Celular (acceso)', 'Grupo'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: c.muted, borderBottom: `1px solid ${c.border}`, fontWeight: 600 }}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {rows.filter(r => r.status === 'ok').map((row, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${c.border}` }}>
                              <td style={{ padding: '7px 12px', color: c.text, fontWeight: 600 }}>{row.nombre}</td>
                              <td style={{ padding: '7px 12px', color: c.blue, fontFamily: 'monospace', fontWeight: 700 }}>{row.telefono}</td>
                              <td style={{ padding: '7px 12px', color: c.muted }}>{row.grupo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const csvLines = ['Nombre,Celular,Grupo', ...rows.filter(r => r.status === 'ok').map(r => `${r.nombre},${r.telefono},${r.grupo}`)];
                      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
                      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'usuarios_importados.csv'; a.click();
                    }}
                    style={{ marginTop: 10, width: '100%', padding: '10px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${c.border}`, borderRadius: 8, color: c.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ⬇ Descargar lista (.csv)
                  </button>
                </div>
              )}

              {errorCount > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.rose, marginBottom: 6 }}>Errores</div>
                  {rows.filter(r => r.status === 'error').map((row, i) => (
                    <div key={i} style={{ padding: '8px 12px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 8, marginBottom: 6, fontSize: 12 }}>
                      <span style={{ color: c.text, fontWeight: 600 }}>{row.nombre || row.telefono}</span>
                      <span style={{ color: c.rose, marginLeft: 8 }}>{row.errorMsg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
          {step === 'upload' && (
            <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 10, color: c.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => { setRows([]); setStep('upload'); }} style={{ flex: 1, padding: '11px', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 10, color: c.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Volver</button>
              <button onClick={handleImport} disabled={rows.filter(r => r.telefono).length === 0} style={{ flex: 2, padding: '11px', background: c.blue, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Importar {rows.filter(r => r.telefono).length} usuarios →
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose} style={{ flex: 1, padding: '11px', background: c.blue, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Listo ✓</button>
          )}
        </div>
      </div>
    </div>
  );
}

function ViewUsuariosAdmin({ liveUsers, onUserCreated, onUserDeleted }: { liveUsers: LiveUser[]; onUserCreated: (u: LiveUser) => void; onUserDeleted?: (id: string) => void }) {
  const [showModal, setShowModal]   = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [group, setGroup]           = useState('Evolve');
  const [role, setRole]             = useState<'user' | 'admin'>('user');
  const [premium, setPremium]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [editEntry,  setEditEntry]  = useState<RankingEntry | null>(null);
  const [predsEntry, setPredsEntry] = useState<RankingEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<LiveUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteErr, setDeleteErr]   = useState<string | null>(null);

  const handleDeleteUser = async () => {
    if (!deleteEntry) return;
    setDeletingUser(true); setDeleteErr(null);
    try {
      const res = await fetch('/api/admin/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: deleteEntry.id }) });
      if (!res.ok) { const d = await res.json(); setDeleteErr(d.error ?? 'Error'); setDeletingUser(false); return; }
      onUserDeleted?.(deleteEntry.id);
      setDeleteEntry(null);
    } catch { setDeleteErr('Error de red'); }
    setDeletingUser(false);
  };

  const resetForm = () => { setName(''); setPhone(''); setGroup('Evolve'); setRole('user'); setPremium(false); setError(null); setSuccess(null); };

  const handleCreate = async () => {
    if (!name.trim() || !phone.trim()) { setError('Nombre y número de celular son obligatorios.'); return; }
    const normalizedPhone = normalizePhoneImport(phone.trim());
    if (normalizedPhone.length < 13) { setError('Número de celular inválido. Debe tener 10 dígitos.'); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('No hay sesión activa. Inicia sesión primero.'); return; }
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: name.trim(), phone: normalizedPhone, group_name: group, role, premium }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Error al crear usuario.'); return; }
      setSuccess(`✓ Usuario "${name.trim()}" creado. Celular: ${normalizedPhone}`);
      onUserCreated({ id: json.userId, name: name.trim(), email: null, phone: normalizedPhone, role, group_name: group, premium, used_powers: [] });
      resetForm();
    } catch { setError('Error de red. Verifica tu conexión.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: c.text }}>Usuarios</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: c.muted }}>{liveUsers.length} usuarios registrados en Supabase</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowImport(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            background: 'rgba(255,255,255,0.06)', color: c.muted, border: `1px solid ${c.border}`, borderRadius: 10,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>📥 Importar Excel/CSV</button>
          <button onClick={() => { resetForm(); setShowModal(true); }} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            background: c.blue, color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>+ Agregar usuario</button>
        </div>
      </div>

      {success && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, fontSize: 13, color: '#22C55E' }}>{success}</div>
      )}

      {/* User list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {liveUsers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: c.muted, fontSize: 14 }}>
            No hay usuarios aún. ¡Crea el primero!
          </div>
        )}
        {liveUsers.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, flexWrap: 'wrap' }}>
            <Avatar initials={(u.name.split(' ').map((w: string) => w[0]).slice(0,2).join('')).toUpperCase()} size={32}/>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
              <div style={{ fontSize: 11, color: c.muted, marginTop: 2, fontFamily: 'monospace' }}>
                {u.phone || u.email || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>sin contacto</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              {u.role === 'admin' && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${c.rose}22`, color: c.rose, border: `1px solid ${c.rose}44` }}>ADMIN</span>}
              {u.premium && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${c.amber}22`, color: c.amber, border: `1px solid ${c.amber}44` }}>PRO</span>}
              {u.group_name && <GroupBadge group={u.group_name}/>}
            </div>
            <PowerPills usedPowers={u.used_powers ?? []}/>
            <button onClick={() => setPredsEntry(liveUserToEntry(u))} style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(201,243,29,0.1)', border: `1px solid ${c.lime}40`, color: c.lime, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>📋 Predicciones</button>
            <button onClick={() => setEditEntry(liveUserToEntry(u))} style={{ padding: '5px 10px', borderRadius: 7, background: `${c.blue}20`, border: `1px solid ${c.blue}50`, color: c.blue, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✏️ Editar</button>
            <button onClick={() => { setDeleteEntry(u); setDeleteErr(null); }} style={{ padding: '5px 8px', borderRadius: 7, background: `${c.rose}15`, border: `1px solid ${c.rose}40`, color: c.rose, fontSize: 13, cursor: 'pointer' }} title="Eliminar usuario">🗑</button>
          </div>
        ))}
      </div>

      {/* Import modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDone={(created) => {
            created.forEach(r => onUserCreated({ id: '', name: r.nombre, email: null, phone: r.telefono, role: 'user', group_name: r.grupo, premium: false, used_powers: [] }));
            setShowImport(false);
          }}
        />
      )}

      {/* Create user modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#0D1829', border: `1px solid ${c.border}`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: c.text }}>Agregar usuario</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: c.muted, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            <ModalInput label="Nombre completo" value={name} onChange={setName}/>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Número de celular</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ height: 42, padding: '0 12px', border: `1px solid ${c.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', color: c.muted, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>🇲🇽 +52</div>
                <input
                  type="tel" placeholder="81 1234 5678"
                  value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                  inputMode="numeric" maxLength={12}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
              <div style={{ fontSize: 10, color: c.muted, marginTop: 4 }}>Solo los 10 dígitos — sin código de país</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Grupo</label>
              <GroupSelect value={group} onChange={setGroup} style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 14px' }}/>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Rol</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['user', 'admin'] as const).map(r => (
                  <button key={r} onClick={() => setRole(r)} style={{
                    flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${role === r ? c.blue : c.border}`,
                    background: role === r ? `${c.blue}22` : 'transparent', color: role === r ? c.blue : c.muted,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                  }}>{r === 'admin' ? 'Admin' : 'Usuario'}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: `1px solid ${c.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>Acceso Premium</div>
                <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>Poderes habilitados (Doble, Tardío, Espía)</div>
              </div>
              <button onClick={() => setPremium(v => !v)} style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: premium ? c.blue : 'rgba(255,255,255,0.15)', position: 'relative', flexShrink: 0, transition: 'background 200ms',
              }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: premium ? 23 : 3, transition: 'left 200ms' }}/>
              </button>
            </div>

            {error && <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 8, fontSize: 13, color: c.rose }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 10, color: c.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleCreate} disabled={loading} style={{ flex: 2, padding: '12px', background: loading ? `${c.blue}66` : c.blue, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Creando…' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Preds / Delete modals */}
      {editEntry && (
        <EditPlayerModal entry={editEntry} onClose={() => setEditEntry(null)} onSaved={() => {}} onReload={() => {}}/>
      )}
      {predsEntry && <UserPredictionsModal entry={predsEntry} onClose={() => setPredsEntry(null)}/>}
      {deleteEntry && (
        <UserDeleteModal user={deleteEntry} onConfirm={handleDeleteUser} onCancel={() => setDeleteEntry(null)} deleting={deletingUser} err={deleteErr}/>
      )}
    </div>
  );
}

// ─── Encuesta ─────────────────────────────────────────────────────────────────
type SurveyRow = { id: string; name: string; phone: string | null; group_name: string | null; created_at: string | null };

function ViewEncuesta() {
  const [rows, setRows]             = useState<SurveyRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [groupFilter, setGroupFilter] = useState('Todos');
  const [search, setSearch]         = useState('');

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, name, phone, group_name, created_at')
      .neq('role', 'admin')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setRows((data ?? []) as SurveyRow[]);
        setLoading(false);
      });
  }, []);

  const groups = useMemo(() => ['Todos', ...Array.from(new Set(rows.map(r => r.group_name ?? 'Sin grupo')))], [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r => {
      const matchGroup = groupFilter === 'Todos' || (r.group_name ?? 'Sin grupo') === groupFilter;
      const matchSearch = !q || r.name.toLowerCase().includes(q) || (r.phone ?? '').includes(q);
      return matchGroup && matchSearch;
    });
  }, [rows, groupFilter, search]);

  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map((r, i) => ({
      '#':           i + 1,
      'Nombre':      r.name,
      'Grupo':       r.group_name ?? 'Sin grupo',
      'Celular':     r.phone ?? '',
      'Registro':    r.created_at ? new Date(r.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
    })));

    // Column widths
    ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 20 }, { wch: 16 }, { wch: 14 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Encuesta');
    const fileName = groupFilter === 'Todos'
      ? `encuesta_todos_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `encuesta_${groupFilter.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const col = (group: string) => GROUP_COLORS[group] ?? c.blue;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: c.text }}>Resultados de encuesta</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: c.muted }}>
            {loading ? 'Cargando…' : `${filtered.length} respuestas${groupFilter !== 'Todos' ? ` · ${groupFilter}` : ''}`}
          </p>
        </div>
        <button
          onClick={downloadExcel}
          disabled={filtered.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: filtered.length > 0 ? c.lime : 'rgba(255,255,255,0.06)', color: filtered.length > 0 ? '#0A1628' : c.muted, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: filtered.length > 0 ? 'pointer' : 'default', transition: 'all 150ms' }}
        >
          ⬇ Descargar Excel
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 180, display: 'flex', alignItems: 'center', gap: 8, background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, padding: '8px 14px' }}>
          <span style={{ color: c.dim }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o celular…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: c.text, fontSize: 13, fontFamily: 'inherit' }}
          />
        </div>

        {/* Group filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {groups.map(g => {
            const active = groupFilter === g;
            const gCol   = g === 'Todos' ? c.blue : col(g);
            return (
              <button
                key={g}
                onClick={() => setGroupFilter(g)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: active ? `1.5px solid ${gCol}` : `1px solid ${c.border}`,
                  background: active ? `${gCol}22` : c.card,
                  color: active ? gCol : c.muted,
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  cursor: 'pointer', transition: 'all 150ms',
                }}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: c.muted }}>Cargando encuesta…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: c.muted, fontSize: 14 }}>
          {rows.length === 0 ? 'Aún no hay respuestas.' : 'Sin resultados para el filtro seleccionado.'}
        </div>
      ) : (
        <TableWrap>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                {['#', 'Nombre', 'Grupo', 'Celular', 'Registro'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: c.muted, fontWeight: 600, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', borderBottom: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const gCol = r.group_name ? col(r.group_name) : c.dim;
                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${c.border}` }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = c.rowHov}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                    <td style={{ padding: '11px 14px', color: c.dim, fontWeight: 500, minWidth: 40 }}>{i + 1}</td>
                    <td style={{ padding: '11px 14px', color: c.text, fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: '11px 14px', minWidth: 120 }}>
                      {r.group_name ? (
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${gCol}22`, color: gCol, border: `1px solid ${gCol}44` }}>{r.group_name}</span>
                      ) : (
                        <span style={{ color: c.dim, fontSize: 11, fontStyle: 'italic' }}>Sin grupo</span>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px', color: c.muted, fontFamily: 'monospace', fontSize: 12 }}>{r.phone ?? '—'}</td>
                    <td style={{ padding: '11px 14px', color: c.dim, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}

      {/* Summary by group */}
      {!loading && rows.length > 0 && groupFilter === 'Todos' && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 12 }}>Resumen por grupo</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Array.from(new Set(rows.map(r => r.group_name ?? 'Sin grupo'))).map(g => {
              const count = rows.filter(r => (r.group_name ?? 'Sin grupo') === g).length;
              const gCol = col(g === 'Sin grupo' ? '' : g);
              return (
                <button
                  key={g}
                  onClick={() => setGroupFilter(g)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', borderRadius: 10,
                    background: c.card, border: `1px solid ${gCol}44`,
                    cursor: 'pointer', transition: 'all 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = `${gCol}12`}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = c.card}
                >
                  <span style={{ fontSize: 20, fontWeight: 800, color: gCol }}>{count}</span>
                  <span style={{ fontSize: 12, color: c.muted }}>{g}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Celulares autorizados ────────────────────────────────────────────────────
type AllowedPhone = { phone: string; name: string | null; group_name: string | null; premium: boolean; phone_type: string | null };

function ViewCelulares() {
  const [phones, setPhones]       = useState<AllowedPhone[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newPhone, setNewPhone]   = useState('');
  const [newName, setNewName]     = useState('');
  const [newGroup, setNewGroup]   = useState('Evolve');
  const [newPremium, setNewPremium] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [err, setErr]             = useState<string | null>(null);
  const [ok, setOk]               = useState<string | null>(null);
  const [search, setSearch]       = useState('');

  const load = async () => {
    setLoadingList(true);
    const { data } = await supabase.from('allowed_phones').select('phone, name, group_name, premium, phone_type').order('phone');
    setPhones((data ?? []) as AllowedPhone[]);
    setLoadingList(false);
  };
  useEffect(() => { load(); }, []);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? '';
  };

  const handleAdd = async () => {
    const digits = newPhone.replace(/\D/g, '');
    if (digits.length < 10) { setErr('Número inválido (10 dígitos).'); return; }
    setSaving(true); setErr(null); setOk(null);
    const token = await getToken();
    const res = await fetch('/api/admin/allow-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone: digits, name: newName || null, group_name: newGroup, premium: newPremium }),
    });
    const json = await res.json();
    if (!res.ok) { setErr(json.error ?? 'Error'); setSaving(false); return; }
    setOk(`✓ ${json.phone} agregado`);
    setNewPhone(''); setNewName(''); setNewGroup('Evolve'); setNewPremium(false); setShowAdd(false);
    load();
    setSaving(false);
  };

  const handleDelete = async (phone: string) => {
    if (!confirm(`¿Eliminar ${phone} del whitelist?`)) return;
    setDeleting(phone);
    const token = await getToken();
    await fetch('/api/admin/allow-phone', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone }),
    });
    setPhones(prev => prev.filter(p => p.phone !== phone));
    setDeleting(null);
  };

  const inputS: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: c.text }}>Celulares autorizados</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: c.muted }}>
            Solo los números en esta lista pueden registrarse en la app · {phones.length} celulares
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowImport(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'rgba(255,255,255,0.06)', color: c.muted, border: `1px solid ${c.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            📥 Importar Excel/CSV
          </button>
          <button onClick={() => { setShowAdd(true); setErr(null); setOk(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: c.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Agregar celular
          </button>
        </div>
      </div>

      {ok && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, fontSize: 13, color: c.green }}>{ok}</div>}
      {err && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 8, fontSize: 13, color: c.rose }}>{err}</div>}

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none', opacity: 0.4 }}>🔍</span>
        <input
          type="text"
          placeholder="Buscar por nombre, número o grupo…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.05)', color: c.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
        )}
      </div>

      {loadingList ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: c.muted }}>Cargando…</div>
      ) : phones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: c.muted, fontSize: 14 }}>
          No hay celulares autorizados. ¡Agrega el primero!
        </div>
      ) : (() => {
        const q = search.toLowerCase();
        const filtered = search
          ? phones.filter(p =>
              p.phone.includes(q) ||
              (p.name ?? '').toLowerCase().includes(q) ||
              (p.group_name ?? '').toLowerCase().includes(q)
            )
          : phones;
        return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {search && <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''} de {phones.length}</div>}
          {filtered.map(p => (
            <div key={p.phone} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(26,175,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📱</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text, fontFamily: 'monospace' }}>{p.phone}</div>
                <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>
                  {p.name ?? <span style={{ fontStyle: 'italic' }}>Sin nombre</span>}
                  {p.group_name && <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 4, background: `${c.blue}22`, color: c.blue, fontSize: 10, fontWeight: 700 }}>{p.group_name}</span>}
                  {p.phone_type === 'personal' && <span style={{ marginLeft: 4, padding: '1px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontSize: 10, fontWeight: 700 }}>Personal</span>}
                  {p.premium && <span style={{ marginLeft: 4, padding: '1px 6px', borderRadius: 4, background: `${c.amber}22`, color: c.amber, fontSize: 10, fontWeight: 700 }}>PRO</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(p.phone)} disabled={deleting === p.phone} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.rose, fontSize: 16, opacity: deleting === p.phone ? 0.4 : 1 }}>🗑</button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 24px', color: c.muted, fontSize: 13 }}>Sin resultados para &quot;{search}&quot;</div>
          )}
        </div>
        );
      })()}

      {/* Add modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#0D1829', border: `1px solid ${c.border}`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: c.text }}>Agregar celular</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: c.muted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Número de celular</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ height: 38, padding: '0 10px', border: `1px solid ${c.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', color: c.muted, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>🇲🇽 +52</div>
                <input type="tel" placeholder="55 2888 5655" value={newPhone} onChange={e => setNewPhone(e.target.value.replace(/[^\d\s]/g, ''))} inputMode="numeric" maxLength={12} style={{ ...inputS, flex: 1 }}/>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Nombre (opcional)</label>
              <input type="text" placeholder="Nombre del usuario" value={newName} onChange={e => setNewName(e.target.value)} style={inputS}/>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Grupo</label>
              <GroupSelect value={newGroup} onChange={setNewGroup}/>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '11px', background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 10, color: c.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleAdd} disabled={saving} style={{ flex: 1, padding: '11px', background: c.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando…' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <ImportModalCelulares
          onClose={() => setShowImport(false)}
          onDone={(count) => { setShowImport(false); setOk(`✓ ${count} celulares importados`); load(); }}
        />
      )}
    </div>
  );
}

function ImportModalCelulares({ onClose, onDone }: { onClose: () => void; onDone: (count: number) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep]           = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [rows, setRows]           = useState<ImportRow[]>([]);
  const [defaultGroup, setDefaultGroup] = useState('Evolve');
  const [progress, setProgress]   = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [okCount, setOkCount]     = useState(0);
  const [createdCount, setCreatedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [dragOver, setDragOver]   = useState(false);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);

  // ── Parse any Excel/CSV ──────────────────────────────────────────────────────
  const parseFile = async (file: File) => {
    let rawRows: Record<string, unknown>[] = [];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
      rawRows = lines.slice(1).map(line => {
        const vals = line.split(',');
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim(); });
        return obj;
      });
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // Read as raw arrays first to auto-detect the real header row
      // (Excel files often have blank rows at the top before actual headers)
      const allRows2 = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];

      const normH = (v: unknown) =>
        String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

      const KNOWN_COLS = ['nombre', 'celular', 'telefono', 'laboral', 'personal', 'ciudad', 'cuenta', 'grupo'];
      let hdrIdx = 0;
      for (let i = 0; i < Math.min(15, allRows2.length); i++) {
        const cells = (allRows2[i] as unknown[]).map(normH);
        if (KNOWN_COLS.some(k => cells.some(c => c.includes(k)))) { hdrIdx = i; break; }
      }
      const hdrRow = (allRows2[hdrIdx] as unknown[]).map(c => String(c ?? ''));
      rawRows = allRows2.slice(hdrIdx + 1)
        .filter(row => (row as unknown[]).some(c => String(c ?? '').trim() !== ''))
        .map(row => {
          const obj: Record<string, unknown> = {};
          hdrRow.forEach((h, i) => { obj[h || `__COL_${i}`] = (row as unknown[])[i] ?? ''; });
          return obj;
        });
    }

    const norm = (v: unknown) => String(v ?? '').trim();

    // Normalize column header for matching (remove accents, lowercase, collapse spaces)
    const hdr = (k: string) =>
      k.toLowerCase()
       .normalize('NFD').replace(/[̀-ͯ]/g, '')
       .replace(/\s+/g, ' ').trim();

    // Capture all headers for debugging
    const allHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]).map(k => k) : [];
    setDetectedHeaders(allHeaders);

    // Find first column whose header contains any of the given keywords
    const findCol = (obj: Record<string, unknown>, ...keys: string[]) => {
      for (const k of Object.keys(obj)) {
        const h = hdr(k);
        for (const t of keys) if (h.includes(t)) return norm(obj[k]);
      }
      return '';
    };

    // Find laboral phone: header contains "laboral" or "empresarial"
    const findLaboral = (obj: Record<string, unknown>) =>
      findCol(obj, 'laboral', 'empresarial');

    // Find personal phone: header contains "personal"
    const findPersonal = (obj: Record<string, unknown>) =>
      findCol(obj, 'personal');

    // General phone fallback — matches any column with phone-like keywords
    const findGenericPhone = (obj: Record<string, unknown>) =>
      findCol(obj, 'telefono', 'phone', 'celular', 'movil', 'cel', 'tel');

    const parsed: ImportRow[] = rawRows
      .filter(r => {
        const laboral  = findLaboral(r);
        const personal = findPersonal(r);
        const generic  = findGenericPhone(r);
        return !!(laboral || personal || generic);
      })
      .map(r => {
        const nombre  = findCol(r, 'nombre', 'name');
        const numero  = findCol(r, 'numero', 'num', '#');
        const ciudad  = findCol(r, 'ciudad', 'city', 'localidad', 'estado', 'municipio');
        // Group from "Cuenta" first, then "Grupo", then default
        const grupo   = findCol(r, 'cuenta', 'account', 'grupo', 'group') || defaultGroup;

        // Phone priority: laboral → personal → generic
        const rawLaboral  = findLaboral(r);
        const rawPersonal = findPersonal(r);
        const rawGeneric  = findGenericPhone(r);
        const rawTel      = rawLaboral || rawPersonal || rawGeneric;
        const telefono    = rawTel ? normalizePhoneImport(rawTel) : '';
        const phone_type: ImportRow['phone_type'] = rawLaboral ? 'laboral' : rawPersonal ? 'personal' : null;

        return { numero, nombre, grupo, ciudad, telefono, phone_type, status: 'pending' as const, errorMsg: '' };
      });

    // Deduplicate by phone (keep first occurrence)
    const seen = new Set<string>();
    const deduped = parsed.filter(r => {
      if (!r.telefono || seen.has(r.telefono)) return false;
      seen.add(r.telefono);
      return true;
    });

    setRows(deduped);
    setStep('preview');
  };

  // ── Submit to API ────────────────────────────────────────────────────────────
  const handleImport = async () => {
    setStep('importing');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const CHUNK = 20;
    const all = rows.filter(r => r.telefono);
    const rowPayload = (r: ImportRow) => ({
      phone:      r.telefono,
      name:       r.nombre     || null,
      group_name: r.grupo      || null,
      city:       r.ciudad     || null,
      phone_type: r.phone_type || null,
    });

    // ── Fase 1: whitelist ────────────────────────────────────────────────────
    setProgressLabel('Agregando al whitelist…');
    let done = 0;
    for (let i = 0; i < all.length; i += CHUNK) {
      const chunk = all.slice(i, i + CHUNK);
      await fetch('/api/admin/allow-phones-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ rows: chunk.map(rowPayload) }),
      });
      done += chunk.length;
      setProgress(Math.round((done / all.length) * 50)); // 0-50%
    }

    // ── Fase 2: crear cuentas ────────────────────────────────────────────────
    setProgressLabel('Creando cuentas de usuario…');
    done = 0;
    let totalCreated = 0;
    let totalSkipped = 0;
    for (let i = 0; i < all.length; i += CHUNK) {
      const chunk = all.slice(i, i + CHUNK);
      const res = await fetch('/api/admin/bulk-create-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ rows: chunk.map(rowPayload) }),
      });
      if (res.ok) {
        const data = await res.json() as { created: number; skipped: number };
        totalCreated += data.created ?? 0;
        totalSkipped += data.skipped ?? 0;
      }
      done += chunk.length;
      setProgress(50 + Math.round((done / all.length) * 50)); // 50-100%
    }

    setOkCount(all.length);
    setCreatedCount(totalCreated);
    setSkippedCount(totalSkipped);
    setStep('done');
  };

  const withPhone    = rows.filter(r => r.telefono).length;
  const withoutPhone = rows.filter(r => !r.telefono).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div style={{ background: '#0D1829', border: `1px solid ${c.border}`, borderRadius: 20, width: '100%', maxWidth: 620, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>📥 Importar celulares autorizados</div>
            <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
              {step === 'upload'    && 'Sube el Excel con la lista de empleados'}
              {step === 'preview'   && `${withPhone} con teléfono${withoutPhone > 0 ? ` · ⚠ ${withoutPhone} sin teléfono` : ' ✓'} · Revisa antes de importar`}
              {step === 'importing' && `Importando… ${progress}%`}
              {step === 'done'      && `✓ ${okCount} celulares agregados al whitelist`}
            </div>
          </div>
          {step !== 'importing' && <button onClick={onClose} style={{ background: 'none', border: 'none', color: c.muted, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>

          {/* ── STEP 1: Upload ── */}
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f); }}
                onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? c.blue : c.border}`, borderRadius: 14, padding: '36px 24px', textAlign: 'center', cursor: 'pointer', background: dragOver ? `${c.blue}10` : 'rgba(255,255,255,0.02)', transition: 'all 200ms' }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 4 }}>Arrastra tu archivo aquí o haz clic</div>
                <div style={{ fontSize: 12, color: c.muted }}>.xlsx · .xls · .csv</div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); }}/>
              </div>

              {/* Default group */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Grupo por defecto</label>
                <GroupSelect value={defaultGroup} onChange={setDefaultGroup}/>
                <div style={{ fontSize: 10, color: c.muted, marginTop: 4 }}>Se usa si la columna &quot;Cuenta&quot; o &quot;Grupo&quot; está vacía</div>
              </div>

              {/* Column guide */}
              <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.blue, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>Columnas reconocidas automáticamente</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12 }}>
                  {[
                    ['Ciudad', 'ciudad, city'],
                    ['Nombre', 'nombre, name'],
                    ['Cuenta/Grupo', 'cuenta, grupo, group'],
                    ['Celular Laboral ★', 'laboral, empresarial'],
                    ['Celular Personal', 'personal'],
                    ['Genérico', 'celular, telefono, tel'],
                  ].map(([label, hint]) => (
                    <div key={label}>
                      <span style={{ color: c.text, fontWeight: 600 }}>{label}</span>
                      <span style={{ color: c.dim }}> — {hint}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: c.muted, lineHeight: 1.5 }}>
                  ★ <strong style={{ color: c.lime }}>Celular Laboral</strong> tiene prioridad sobre Personal · Solo un número por persona · Se eliminan duplicados automáticamente
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Preview ── */}
          {step === 'preview' && (
            <div>
              {/* Debug: show detected headers when 0 rows parsed */}
              {rows.length === 0 && detectedHeaders.length > 0 && (
                <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c.rose, marginBottom: 6 }}>⚠ No se encontraron números — columnas detectadas en tu archivo:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {detectedHeaders.map(h => (
                      <span key={h} style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.07)', borderRadius: 6, fontSize: 11, color: c.muted, fontFamily: 'monospace' }}>{h}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: c.dim, marginTop: 8 }}>
                    El sistema busca columnas que contengan: <strong style={{ color: c.text }}>laboral, empresarial, personal, celular, telefono, movil, tel</strong>
                  </div>
                </div>
              )}
              <div style={{ maxHeight: 380, overflowY: 'auto', marginBottom: 18, borderRadius: 10, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)', position: 'sticky', top: 0 }}>
                      {['Nombre', 'Ciudad', 'Celular', 'Tipo', 'Grupo'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: c.muted, fontWeight: 600, borderBottom: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${c.border}`, opacity: r.telefono ? 1 : 0.4 }}>
                        <td style={{ padding: '8px 12px', color: c.text }}>{r.nombre || <span style={{ fontStyle: 'italic', color: c.muted }}>—</span>}</td>
                        <td style={{ padding: '8px 12px', color: c.muted, fontSize: 11 }}>{r.ciudad || '—'}</td>
                        <td style={{ padding: '8px 12px', color: r.telefono ? c.green : c.rose, fontFamily: 'monospace', fontSize: 11 }}>{r.telefono || '⚠ sin tel.'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {r.phone_type === 'personal'
                            ? <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>Personal</span>
                            : r.phone_type === 'laboral'
                            ? <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>Laboral</span>
                            : <span style={{ color: c.dim, fontSize: 11 }}>—</span>}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {r.grupo ? <GroupBadge group={r.grupo}/> : <span style={{ color: c.dim, fontSize: 11 }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={handleImport} style={{ width: '100%', padding: '13px', background: c.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Agregar {withPhone} celulares al whitelist →
              </button>
            </div>
          )}

          {/* ── STEP 3: Progress ── */}
          {step === 'importing' && (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 4 }}>Procesando…</div>
              <div style={{ fontSize: 12, color: c.muted, marginBottom: 16 }}>{progressLabel}</div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: c.blue, width: `${progress}%`, transition: 'width 300ms ease', borderRadius: 4 }}/>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: c.muted }}>{progress}%</div>
            </div>
          )}

          {/* ── STEP 4: Done ── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: c.text, marginBottom: 20 }}>Importación completada</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: '14px 22px', minWidth: 100 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#22C55E' }}>{okCount}</div>
                  <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>en whitelist</div>
                </div>
                <div style={{ background: 'rgba(26,175,255,0.1)', border: '1px solid rgba(26,175,255,0.3)', borderRadius: 12, padding: '14px 22px', minWidth: 100 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: c.blue }}>{createdCount}</div>
                  <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>cuentas creadas</div>
                </div>
                {skippedCount > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 22px', minWidth: 100 }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: c.muted }}>{skippedCount}</div>
                    <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>ya existían</div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, color: c.muted, marginBottom: 24 }}>
                Los usuarios pueden iniciar sesión con su número vía SMS
              </div>
              <button onClick={() => onDone(okCount)} style={{ padding: '12px 28px', background: c.blue, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cerrar</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
type LiveUser = { id: string; name: string; email: string | null; phone?: string | null; role: string; group_name: string | null; premium: boolean; used_powers: string[] };
const liveUserToEntry = (u: LiveUser): RankingEntry => ({ userId: u.id, name: u.name, group_name: u.group_name, points: 0, pos: 0, used_powers: u.used_powers ?? [] });

export default function AdminPage() {
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [groupFilter, setGroupFilter] = useState('Todos');
  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [authState, setAuthState] = useState<'checking' | 'allowed' | 'denied'>('checking');

  // ── Auth guard: only admin users can access this page ──
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setAuthState('denied'); return; }
      const { data } = await supabase
        .from('profiles').select('role').eq('id', session.user.id).single();
      setAuthState(data?.role === 'admin' || data?.role === 'superadmin' ? 'allowed' : 'denied');
    });
  }, []);

  // Load real users from Supabase on mount
  useEffect(() => {
    if (authState !== 'allowed') return;
    supabase.from('profiles').select('id, name, email, phone, role, group_name, premium, used_powers').order('created_at')
      .then(({ data }) => { if (data) setLiveUsers(data.map((u: LiveUser & { used_powers: string[] | null }) => ({ ...u, used_powers: u.used_powers ?? [] })) as LiveUser[]); });
  }, [authState]);

  // ── Guard screens ──
  if (authState === 'checking') {
    return (
      <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', color: c.muted, fontSize: 14 }}>Verificando acceso…</div>
      </div>
    );
  }
  if (authState === 'denied') {
    return (
      <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-inter), system-ui, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: c.text, marginBottom: 8 }}>Acceso restringido</div>
          <div style={{ fontSize: 14, color: c.muted, marginBottom: 24, lineHeight: 1.6 }}>
            Esta área es solo para administradores. Inicia sesión con una cuenta con permisos de admin.
          </div>
          <Link href="/" style={{ display: 'inline-block', padding: '12px 24px', background: c.blue, color: '#fff', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            Ir a la app →
          </Link>
        </div>
      </div>
    );
  }

  const updateUser = (name: string, patch: Partial<AdminUser>) => {
    setUsers(prev => resortUsers(prev.map(u => u.name === name ? { ...u, ...patch } : u)));
  };
  const deleteUser = (name: string) => {
    setUsers(prev => resortUsers(prev.filter(u => u.name !== name)));
  };

  const groups = Array.from(new Set(users.map(u => u.group)));

  const navigate = (v: View) => { setView(v); setMenuOpen(false); };

  const goToGroup = (g: string) => { setSelectedGroup(g); navigate('grupo-detalle'); };

  return (
    <div style={{
      display: 'flex', flexDirection: isMobile ? 'column' : 'row',
      minHeight: '100vh', height: isMobile ? 'auto' : '100vh',
      background: c.bg, fontFamily: 'var(--font-inter), system-ui, sans-serif',
      color: c.text, overflow: isMobile ? 'visible' : 'hidden',
    }}>

      {/* ── Mobile top nav ── */}
      {isMobile && (
        <div style={{ background: c.sidebar, borderBottom: `1px solid ${c.border}`, flexShrink: 0, position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <EvolveMark size={18} color={c.lime}/>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Quiniela Evolve</div>
                <div style={{ fontSize: 9, color: c.rose, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Admin Panel</div>
              </div>
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: 8, padding: '6px 12px', color: c.text, fontSize: 15, cursor: 'pointer', lineHeight: 1 }}>
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
          {menuOpen && (
            <div style={{ borderTop: `1px solid ${c.border}`, padding: '8px 12px 12px' }}>
              {NAV.map(item => (
                <button key={item.id} onClick={() => navigate(item.id)} style={{
                  display: 'block', width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2,
                  background: view === item.id ? `${c.blue}20` : 'transparent',
                  color: view === item.id ? c.blue : c.muted,
                  fontSize: 13, fontWeight: view === item.id ? 700 : 500, textAlign: 'left',
                }}>{item.label}</button>
              ))}
              <Link href="/" style={{ display: 'block', fontSize: 12, color: c.dim, textDecoration: 'none', padding: '8px 12px', marginTop: 4 }}>← Volver a la app</Link>
            </div>
          )}
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      {!isMobile && (
        <div style={{ width: 224, background: c.sidebar, borderRight: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${c.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <EvolveMark size={22} color={c.lime}/>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Quiniela Evolve</span>
            </div>
            <div style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, background: `${c.rose}22`, color: c.rose, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Admin Panel</div>
          </div>
          <nav style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
            {NAV.map(item => (
              <button key={item.id} onClick={() => setView(item.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2,
                background: view === item.id ? `${c.blue}20` : 'transparent',
                color: view === item.id ? c.blue : c.muted,
                fontSize: 13, fontWeight: view === item.id ? 700 : 500, textAlign: 'left', transition: 'all 150ms',
              }}>{item.label}</button>
            ))}
          </nav>
          <div style={{ padding: '14px', borderTop: `1px solid ${c.border}` }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: c.dim, textDecoration: 'none', padding: '8px 10px', borderRadius: 8 }}>← Volver a la app</Link>
            <div style={{ fontSize: 10, color: c.dim, marginTop: 6, paddingLeft: 10 }}>{users.length} usuarios · {groups.length} grupos</div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflow: isMobile ? 'visible' : 'auto', padding: isMobile ? 16 : 32 }}>
        {view === 'dashboard'     && <ViewDashboard liveUsers={liveUsers} setView={setView}/>}
        {view === 'encuesta'      && <ViewEncuesta/>}
        {view === 'celulares'     && <ViewCelulares/>}
        {view === 'grupos-config' && <ViewGruposConfig onBack={() => navigate('grupos')} onSelectGroup={g => { setSelectedGroup(g); navigate('grupo-detalle'); }}/>}
        {view === 'usuarios'      && <ViewUsuariosAdmin liveUsers={liveUsers} onUserCreated={u => setLiveUsers(prev => [...prev, u])} onUserDeleted={id => setLiveUsers(prev => prev.filter(u => u.id !== id))}/>}
        {view === 'rankings'      && <ViewRankings/>}
        {view === 'predicciones'  && <ViewPredicciones users={users}/>}
        {view === 'partidos'      && <ViewPartidos/>}
        {view === 'grupos'        && <ViewGrupos liveUsers={liveUsers} onSelectGroup={goToGroup} onConfigure={() => navigate('grupos-config')}/>}
        {view === 'grupo-detalle' && selectedGroup && (
          <ViewGrupoDetalle
            group={selectedGroup}
            liveUsers={liveUsers}
            onBack={() => navigate('grupos')}
            onUserUpdated={updated => setLiveUsers(prev => prev.map(u => u.id === updated.id ? updated : u))}
            onUserRemoved={id => setLiveUsers(prev => prev.filter(u => u.id !== id))}
          />
        )}
      </div>
    </div>
  );
}
