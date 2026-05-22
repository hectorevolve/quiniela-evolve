'use client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { MATCHES, KNOCKOUT_MATCHES, USER_PREDICTIONS, GROUP_MATCH_IDS } from '@/lib/data';
import { EvolveMark } from '@/components/brand/EvolveMark';
import { Avatar } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { getRankings, type RankingEntry, getMatchResults, saveMatchResult } from '@/lib/db';

type View = 'dashboard' | 'usuarios' | 'rankings' | 'predicciones' | 'partidos' | 'grupos';
type AdminUser = { name: string; pts: number; group: string; city: string; pos: number; country: string };
type AdminMatch = typeof MATCHES[number];

const NAV: { id: View; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'usuarios',  label: 'Usuarios' },
  { id: 'rankings',  label: 'Rankings' },
  { id: 'partidos',  label: 'Partidos' },
  { id: 'grupos',    label: 'Grupos' },
];

const ALL_GROUPS = Object.keys({
  'Evolve': 1, 'BEPENSA Spirits': 1, 'ADM': 1, 'Disney': 1,
  'Ruz': 1, 'Zuru': 1, 'AGEMEX': 1, 'Delongi': 1,
});

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
  'AGEMEX':          '#EF4444',
  'Delongi':         '#F97316',
};

const GROUP_LOGOS: Record<string, string> = {
  'BEPENSA Spirits': '/logos/bepensa.png',
  'ADM':             '/logos/adm.svg',
  'Disney':          '/logos/disney.png',
  'Ruz':             '/logos/ruz.png',
  'Zuru':            '/logos/zuru.png',
  'AGEMEX':          '/logos/agemex.png',
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

function GroupBadge({ group }: { group: string }) {
  const col = GROUP_COLORS[group] ?? c.blue;
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${col}22`, color: col, border: `1px solid ${col}44`, whiteSpace: 'nowrap' }}>{group}</span>
  );
}

function GroupIcon({ group, size = 32 }: { group: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const col = GROUP_COLORS[group] ?? c.blue;
  const logo = GROUP_LOGOS[group];
  const initials = group.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (group === 'Evolve') return (
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
function ViewRankings() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState('nacional');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRankings()
      .then(setRankings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(() => {
    if (tab === 'nacional') return rankings;
    return rankings
      .filter(u => u.group_name === tab)
      .map((u, i) => ({ ...u, pos: i + 1 }));
  }, [tab, rankings]);

  return (
    <div>
      <SectionHeader title="Rankings" sub="Clasificaciones por grupo y nacional"/>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setTab('nacional')} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${tab === 'nacional' ? c.blue : c.border}`, background: tab === 'nacional' ? `${c.blue}22` : c.card, color: tab === 'nacional' ? c.blue : c.muted, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Nacional</button>
        {ALL_GROUPS.map(g => {
          const col = GROUP_COLORS[g] ?? c.blue;
          return <button key={g} onClick={() => setTab(g)} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${tab === g ? col : c.border}`, background: tab === g ? `${col}22` : c.card, color: tab === g ? col : c.muted, fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{g}</button>;
        })}
        <div style={{ marginLeft: 'auto' }}><ViewToggle mode={viewMode} onChange={setViewMode}/></div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: c.muted, fontSize: 14 }}>Cargando ranking…</div>
      ) : list.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: c.muted, fontSize: 14, background: c.card, borderRadius: 12, border: `1px solid ${c.border}` }}>
          {tab === 'nacional'
            ? 'No hay usuarios registrados aún.'
            : `No hay usuarios en el grupo ${tab} aún.`}
          <br/><span style={{ fontSize: 12, opacity: 0.7 }}>Los puntos se calcularán cuando el admin ingrese resultados de partidos.</span>
        </div>
      ) : viewMode === 'list' ? (
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <TableWrap>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                  {['#','Usuario','Grupo','Puntos'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: h === 'Puntos' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 0.8, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
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
                    <td style={{ padding: '11px 14px' }}>{u.group_name ? <GroupBadge group={u.group_name}/> : <span style={{ color: c.dim, fontSize: 12 }}>—</span>}</td>
                    <td style={{ padding: '11px 14px', fontSize: 14, fontWeight: 700, color: c.lime, textAlign: 'right' }}>{u.points}</td>
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
            </div>
          ))}
        </div>
      )}
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

// ─── Partidos + Resultados (fusionados) ───────────────────────────────────────
function ViewPartidos() {
  const allMatches = [...MATCHES, ...(KNOCKOUT_MATCHES ?? [])];
  const [matches] = useState<AdminMatch[]>(allMatches);
  // results: loaded from Supabase, updated on save
  const [results, setResults] = useState<Record<string, [number, number]>>({});
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string }>>(() => {
    const d: Record<string, { home: string; away: string }> = {};
    allMatches.forEach(m => { d[m.id] = { home: '', away: '' }; });
    return d;
  });
  const [phaseFilter, setPhaseFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Load existing results from Supabase on mount
  useEffect(() => {
    getMatchResults().then(setResults).catch(console.error);
  }, []);

  const phases = useMemo(() => ['Todos', ...Array.from(new Set(matches.map(m => m.group)))], [matches]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return matches.filter(m =>
      (phaseFilter === 'Todos' || m.group === phaseFilter) &&
      (!q || m.home.code.toLowerCase().includes(q) || m.away.code.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
    );
  }, [matches, phaseFilter, search]);

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
        // Reload results from DB
        const fresh = await getMatchResults();
        setResults(fresh);
      }
    } catch {
      setSyncMsg('⚠ Error de red al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <SectionHeader title="Partidos y Resultados" sub={`${matches.length} partidos en el torneo · ${Object.keys(results).length} resultados registrados`}/>

      {/* Sync bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: `${c.lime}0D`, border: `1px solid ${c.lime}33`, borderRadius: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: c.lime }}>🔄 Sincronizar desde football-data.org</div>
          <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>
            {syncMsg || 'Descarga automáticamente los resultados de partidos terminados del Mundial.'}
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: syncing ? c.border : c.lime, color: syncing ? c.muted : '#000', fontWeight: 700, fontSize: 13, cursor: syncing ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
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
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map(m => {
            const saved = results[m.id];
            const draft = drafts[m.id] ?? { home: '', away: '' };
            return (
              <div key={m.id} style={{ background: c.card, border: `1px solid ${saved ? c.lime + '44' : c.border}`, borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.blue }}>{m.id.toUpperCase()}</span>
                  <span style={{ fontSize: 10, color: c.muted }}>{m.group}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: c.text, marginBottom: 4, textAlign: 'center' }}>
                  {m.home.code} <span style={{ color: c.muted, fontWeight: 400 }}>vs</span> {m.away.code}
                </div>
                <div style={{ fontSize: 10, color: c.dim, textAlign: 'center', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.date}</div>
                {saved ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10, padding: '6px 0', background: `${c.lime}11`, borderRadius: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: c.lime }}>{saved[0]} – {saved[1]}</span>
                    <button onClick={() => clearResult(m.id)} style={{ padding: '2px 6px', borderRadius: 4, border: `1px solid ${c.rose}44`, background: `${c.rose}11`, color: c.rose, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, justifyContent: 'center' }}>
                    <input type="number" min={0} placeholder="0" value={draft.home}
                      onChange={e => setDrafts(prev => ({ ...prev, [m.id]: { ...prev[m.id], home: e.target.value } }))}
                      style={{ width: 44, padding: '5px 6px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 14, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}/>
                    <span style={{ color: c.muted }}>–</span>
                    <input type="number" min={0} placeholder="0" value={draft.away}
                      onChange={e => setDrafts(prev => ({ ...prev, [m.id]: { ...prev[m.id], away: e.target.value } }))}
                      style={{ width: 44, padding: '5px 6px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 14, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}/>
                    <button onClick={() => saveResult(m.id)} disabled={saving === m.id} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: saving === m.id ? c.border : c.lime, color: saving === m.id ? c.muted : '#000', fontSize: 11, fontWeight: 700, cursor: saving === m.id ? 'not-allowed' : 'pointer' }}>{saving === m.id ? '…' : 'Guardar'}</button>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: c.muted }}>Sin resultados</div>}
        </div>
      ) : (
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <TableWrap>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                  {['ID','Fase/Grupo','Partido','Fecha','Resultado guardado','Registrar resultado'].map(h => (
                    <th key={h} style={{ padding: '11px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 0.8, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => {
                  const saved = results[m.id];
                  const draft = drafts[m.id] ?? { home: '', away: '' };
                  return (
                    <tr key={m.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${c.border}` : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = c.rowHov)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: c.blue, whiteSpace: 'nowrap' }}>{m.id.toUpperCase()}</td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: c.muted, whiteSpace: 'nowrap' }}>{m.group}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: c.text, whiteSpace: 'nowrap' }}>
                        {m.home.code} <span style={{ color: c.muted, fontWeight: 400 }}>vs</span> {m.away.code}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: c.muted, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.date}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {saved
                          ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: c.lime }}>{saved[0]} – {saved[1]}</span>
                              <button onClick={() => clearResult(m.id)} style={{ padding: '2px 6px', borderRadius: 4, border: `1px solid ${c.rose}44`, background: `${c.rose}11`, color: c.rose, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>✕</button>
                            </div>
                          : <span style={{ fontSize: 11, color: c.dim, fontStyle: 'italic' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <input type="number" min={0} placeholder="0" value={draft.home}
                            onChange={e => setDrafts(prev => ({ ...prev, [m.id]: { ...prev[m.id], home: e.target.value } }))}
                            style={{ width: 40, padding: '4px 6px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 13, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}/>
                          <span style={{ color: c.muted }}>–</span>
                          <input type="number" min={0} placeholder="0" value={draft.away}
                            onChange={e => setDrafts(prev => ({ ...prev, [m.id]: { ...prev[m.id], away: e.target.value } }))}
                            style={{ width: 40, padding: '4px 6px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 13, fontWeight: 700, textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}/>
                          <button onClick={() => saveResult(m.id)} style={{ padding: '4px 9px', borderRadius: 6, border: 'none', background: c.lime, color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Guardar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
          {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: c.muted }}>Sin resultados</div>}
        </div>
      )}

    </div>
  );
}

// ─── Grupos ───────────────────────────────────────────────────────────────────
function ViewGrupos({ users, onSelectGroup }: { users: AdminUser[]; onSelectGroup: (g: string) => void }) {
  const isMobile = useIsMobile();
  const groups = useMemo(() => Array.from(new Set(users.map(u => u.group))), [users]);

  return (
    <div>
      <SectionHeader title="Grupos" sub={`${groups.length} grupos activos · ${users.length} usuarios`}/>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {groups.map(g => {
          const members = users.filter(u => u.group === g);
          const col = GROUP_COLORS[g] ?? c.blue;
          const leader = members.reduce((best, u) => u.pts > (best?.pts ?? 0) ? u : best, members[0]);
          return (
            <button key={g} onClick={() => onSelectGroup(g)} style={{ background: c.card, border: `1px solid ${col}44`, borderRadius: 16, padding: '18px 20px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 150ms, background 150ms' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${col}99`; (e.currentTarget as HTMLButtonElement).style.background = `${col}0D`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${col}44`; (e.currentTarget as HTMLButtonElement).style.background = c.card; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <GroupIcon group={g} size={40}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g}</div>
                  <div style={{ fontSize: 11, color: c.muted }}>{members.length} miembros</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: col, lineHeight: 1 }}>{leader?.pts ?? '—'}</div>
                  <div style={{ fontSize: 9, color: c.muted, marginTop: 2 }}>pts líder</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: c.muted }}>Promedio</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: c.text }}>{avg(members)} pts</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(members.length / users.length) * 100}%`, background: col, borderRadius: 2 }}/>
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: col, fontWeight: 600 }}>Ver usuarios →</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Crear / Gestionar Usuarios ──────────────────────────────────────────────
function ViewUsuariosAdmin({ liveUsers, onUserCreated }: { liveUsers: { id: string; name: string; email: string; role: string; group_name: string | null; premium: boolean }[]; onUserCreated: (u: { id: string; name: string; email: string; role: string; group_name: string | null; premium: boolean }) => void }) {
  const [showModal, setShowModal]   = useState(false);
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('evo2026');
  const [group, setGroup]           = useState('Evolve');
  const [role, setRole]             = useState<'user' | 'admin'>('user');
  const [premium, setPremium]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting]     = useState(false);

  const resetForm = () => { setName(''); setEmail(''); setPassword('evo2026'); setGroup('Evolve'); setRole('user'); setPremium(false); setError(null); setSuccess(null); };

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) { setError('Nombre, correo y contraseña son obligatorios.'); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('No hay sesión activa. Inicia sesión primero.'); return; }
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password, group_name: group, role, premium }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Error al crear usuario.'); return; }
      setSuccess(`✓ Usuario "${name.trim()}" creado correctamente.`);
      onUserCreated({ id: json.userId, name: name.trim(), email: email.trim().toLowerCase(), role, group_name: group, premium });
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
        <button onClick={() => { resetForm(); setShowModal(true); }} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
          background: c.blue, color: '#fff', border: 'none', borderRadius: 10,
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>+ Agregar usuario</button>
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
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: c.card, border: `1px solid ${c.border}`, borderRadius: 12 }}>
            <Avatar initials={(u.name.split(' ').map((w: string) => w[0]).slice(0,2).join('')).toUpperCase()} size={36}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
              <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{u.email}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              {u.role === 'admin' && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${c.rose}22`, color: c.rose, border: `1px solid ${c.rose}44` }}>ADMIN</span>}
              {u.premium && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${c.amber}22`, color: c.amber, border: `1px solid ${c.amber}44` }}>PRO</span>}
              {u.group_name && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${c.blue}22`, color: c.blue, border: `1px solid ${c.blue}44` }}>{u.group_name}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Create user modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#0D1829', border: `1px solid ${c.border}`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: c.text }}>Agregar usuario</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: c.muted, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            <ModalInput label="Nombre completo" value={name} onChange={setName}/>
            <ModalInput label="Correo electrónico" value={email} onChange={setEmail}/>
            <ModalInput label="Contraseña" value={password} onChange={setPassword}/>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Grupo</label>
              <select value={group} onChange={e => setGroup(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.06)', color: c.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                {ALL_GROUPS.map(g => <option key={g} value={g} style={{ background: '#0D1829' }}>{g}</option>)}
              </select>
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
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
type LiveUser = { id: string; name: string; email: string; role: string; group_name: string | null; premium: boolean };

export default function AdminPage() {
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [groupFilter, setGroupFilter] = useState('Todos');
  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);
  const [authState, setAuthState] = useState<'checking' | 'allowed' | 'denied'>('checking');

  // ── Auth guard: only admin users can access this page ──
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setAuthState('denied'); return; }
      const { data } = await supabase
        .from('profiles').select('role').eq('id', session.user.id).single();
      setAuthState(data?.role === 'admin' ? 'allowed' : 'denied');
    });
  }, []);

  // Load real users from Supabase on mount
  useEffect(() => {
    if (authState !== 'allowed') return;
    supabase.from('profiles').select('id, name, email, role, group_name, premium').order('created_at')
      .then(({ data }) => { if (data) setLiveUsers(data as LiveUser[]); });
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

  const goToGroup = (g: string) => { setGroupFilter(g); navigate('usuarios'); };

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
        {view === 'dashboard'    && <ViewDashboard liveUsers={liveUsers} setView={setView}/>}
        {view === 'usuarios'     && <ViewUsuariosAdmin liveUsers={liveUsers} onUserCreated={u => setLiveUsers(prev => [...prev, u])}/>}
        {view === 'rankings'     && <ViewRankings/>}
        {view === 'predicciones' && <ViewPredicciones users={users}/>}
        {view === 'partidos'     && <ViewPartidos/>}
        {view === 'grupos'       && <ViewGrupos users={users} onSelectGroup={goToGroup}/>}
      </div>
    </div>
  );
}
