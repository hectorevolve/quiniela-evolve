'use client';
import { useState, useMemo } from 'react';
import { theme as T } from '@/lib/theme';
import { RANKING, MATCHES, KNOCKOUT_MATCHES, USER_PREDICTIONS, GROUP_MATCH_IDS } from '@/lib/data';
import { Header, Avatar, Chip, Card, Eyebrow } from '@/components/ui';
import { EvolveMark } from '@/components/brand/EvolveMark';

type AdminUser = typeof RANKING[number];
type AdminMatch = typeof MATCHES[number];
type Tab = 'usuarios' | 'predicciones' | 'partidos' | 'resultados' | 'grupos';

interface Props { goto: (s: string) => void }

function resortUsers(arr: AdminUser[]): AdminUser[] {
  return [...arr].sort((a, b) => b.pts - a.pts).map((u, i) => ({ ...u, pos: i + 1 }));
}
function avg(arr: AdminUser[]) {
  return arr.length ? Math.round(arr.reduce((s, u) => s + u.pts, 0) / arr.length) : 0;
}

function GroupTag({ group }: { group: string }) {
  const isEvolve = group === 'Evolve';
  return (
    <span style={{
      display: 'inline-block', padding: '1px 8px', borderRadius: 20,
      fontSize: 10, fontWeight: 700,
      background: isEvolve ? `${T.blue}22` : `${T.amber}22`,
      color: isEvolve ? T.blue : T.amber,
    }}>{group}</span>
  );
}

// Small label helper
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{children}</div>;
}

export function AdminScreen({ goto }: Props) {
  const [tab, setTab] = useState<Tab>('usuarios');
  const [users, setUsers] = useState<AdminUser[]>([...RANKING]);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editPts, setEditPts] = useState(0);
  const [editGroup, setEditGroup] = useState('');
  const [editCity, setEditCity] = useState('');
  const [groupFilter, setGroupFilter] = useState('Todos');
  const [predViewUser, setPredViewUser] = useState<AdminUser | null>(null);
  const [predViewPreds, setPredViewPreds] = useState<Record<string, [number,number]>>({});

  const updateUser = (name: string, patch: Partial<AdminUser>) => {
    setUsers(prev => resortUsers(prev.map(u => u.name === name ? { ...u, ...patch } : u)));
  };

  const openEdit = (u: AdminUser) => { setEditUser(u); setEditPts(u.pts); setEditGroup(u.group); setEditCity(u.city); };
  const saveEdit = () => {
    if (!editUser) return;
    updateUser(editUser.name, { pts: editPts, group: editGroup, city: editCity });
    setEditUser(null);
  };

  const openPredView = (u: AdminUser) => {
    setEditUser(null);
    setPredViewUser(u);
    setPredViewPreds({ ...(USER_PREDICTIONS[u.name] ?? {}) });
  };
  const setLocalPred = (matchId: string, idx: 0 | 1, val: number) => {
    setPredViewPreds(prev => {
      const curr = prev[matchId] ?? [0, 0];
      const next: [number, number] = [curr[0], curr[1]];
      next[idx] = val;
      return { ...prev, [matchId]: next };
    });
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'usuarios',     label: 'Usuarios' },
    { id: 'predicciones', label: 'Preds.' },
    { id: 'partidos',     label: 'Partidos' },
    { id: 'resultados',   label: 'Result.' },
    { id: 'grupos',       label: 'Grupos' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgSubtle, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: T.bgInk, borderBottom: `1px solid ${T.borderInk}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <EvolveMark size={22} color={T.lime}/>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Panel Admin</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.rose, letterSpacing: 1, textTransform: 'uppercase' }}>Administración</div>
          </div>
        </div>
        <button onClick={() => goto('torneo')} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>← App</button>
      </div>

      {/* Stats strip */}
      <div style={{ background: T.bgInk, borderBottom: `1px solid ${T.borderInk}`, padding: '10px 16px', display: 'flex', gap: 6 }}>
        {[
          { label: 'Usuarios', val: users.length, color: T.blue },
          { label: 'Grupos', val: new Set(users.map(u => u.group)).size, color: T.amber },
          { label: 'Prom. pts', val: avg(users), color: T.lime },
          { label: 'Líder', val: users[0]?.pts, color: T.lime },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '6px 4px' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${T.border}`, display: 'flex', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '10px 4px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 10, fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap',
            color: tab === t.id ? T.ink : T.muted,
            borderBottom: `2.5px solid ${tab === t.id ? T.blue : 'transparent'}`,
            minWidth: 58,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'usuarios'     && <TabUsuarios users={users} onEdit={openEdit} groupFilter={groupFilter} setGroupFilter={setGroupFilter}/>}
        {tab === 'predicciones' && <TabPredicciones users={users}/>}
        {tab === 'partidos'     && <TabPartidos/>}
        {tab === 'resultados'   && <TabResultados/>}
        {tab === 'grupos'       && <TabGrupos users={users} setUsers={setUsers} onSelectGroup={g => { setGroupFilter(g); setTab('usuarios'); }}/>}
      </div>

      {/* Predictions view overlay */}
      {predViewUser && (
        <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 60, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${T.border}`, flexShrink: 0, background: '#fff' }}>
            <button onClick={() => setPredViewUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: T.muted, padding: '0 4px', lineHeight: 1 }}>←</button>
            <Avatar initials={predViewUser.name.slice(0,2).toUpperCase()} size={34}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{predViewUser.name}</div>
              <div style={{ fontSize: 10, color: T.muted }}>{predViewUser.group} · Fase de grupos</div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 24px' }}>
            {GROUP_MATCH_IDS.map(matchId => {
              const match = MATCHES.find(m => m.id === matchId);
              if (!match) return null;
              const pred = predViewPreds[matchId];
              return (
                <div key={matchId} style={{ background: T.bgSoft, borderRadius: 12, border: `1px solid ${T.border}`, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: T.muted, marginBottom: 2 }}>Grupo {match.group} · {matchId.toUpperCase()}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {match.home.name} <span style={{ color: T.muted }}>vs</span> {match.away.name}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <input type="number" min={0} max={20} value={pred?.[0] ?? ''}
                      onChange={e => setLocalPred(matchId, 0, Number(e.target.value))}
                      placeholder="–"
                      style={{ width: 38, padding: '6px', borderRadius: 8, border: `1.5px solid ${T.border}`, textAlign: 'center', fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: 'inherit', outline: 'none', background: '#fff' }}
                    />
                    <span style={{ fontSize: 14, color: T.muted, fontWeight: 600 }}>–</span>
                    <input type="number" min={0} max={20} value={pred?.[1] ?? ''}
                      onChange={e => setLocalPred(matchId, 1, Number(e.target.value))}
                      placeholder="–"
                      style={{ width: 38, padding: '6px', borderRadius: 8, border: `1.5px solid ${T.border}`, textAlign: 'center', fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: 'inherit', outline: 'none', background: '#fff' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '12px 14px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            <button onClick={() => setPredViewUser(null)} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: T.ink, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Guardar y volver
            </button>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editUser && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={() => setEditUser(null)}>
          <div style={{ width: '100%', background: '#fff', borderRadius: '18px 18px 0 0', padding: '20px 20px 32px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: '0 auto 16px' }}/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <Avatar initials={editUser.name.slice(0,2).toUpperCase()} size={40}/>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>{editUser.name}</div>
                <div style={{ fontSize: 12, color: T.muted }}>#{editUser.pos} · {editUser.pts} pts actuales</div>
              </div>
            </div>

            <Eyebrow style={{ marginBottom: 8 }}>Puntos</Eyebrow>
            <input type="number" value={editPts} onChange={e => setEditPts(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 20, fontWeight: 800, textAlign: 'center', color: T.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}/>
            <button onClick={() => openPredView(editUser!)} style={{ width: '100%', padding: '10px', borderRadius: 10, border: `1.5px solid ${T.blue}`, background: T.blueSoft, color: T.blueDeep, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>
              Ver predicciones
            </button>

            <Eyebrow style={{ marginBottom: 8 }}>Grupo</Eyebrow>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {Array.from(new Set(users.map(u => u.group))).map(g => (
                <button key={g} onClick={() => setEditGroup(g)} style={{ flex: '1 1 auto', padding: '8px 10px', borderRadius: 10, border: `1.5px solid ${editGroup === g ? T.blue : T.border}`, background: editGroup === g ? T.blueSoft : T.bgSoft, color: editGroup === g ? T.blueDeep : T.muted, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>{g}</button>
              ))}
            </div>

            <Eyebrow style={{ marginBottom: 8 }}>Ciudad</Eyebrow>
            <input value={editCity} onChange={e => setEditCity(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 18 }}/>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveEdit} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: T.ink, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Guardar</button>
              <button onClick={() => setEditUser(null)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: `1.5px solid ${T.border}`, background: 'transparent', color: T.muted, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Usuarios ──────────────────────────────────────────────────────────────
function TabUsuarios({ users, onEdit, groupFilter, setGroupFilter }: { users: AdminUser[]; onEdit: (u: AdminUser) => void; groupFilter: string; setGroupFilter: (g: string) => void }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u =>
      (groupFilter === 'Todos' || u.group === groupFilter) &&
      (!q || u.name.toLowerCase().includes(q) || u.city.toLowerCase().includes(q))
    );
  }, [users, search, groupFilter]);

  return (
    <div style={{ padding: '12px 14px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '9px 14px', marginBottom: 10 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuario o ciudad…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: T.ink, background: 'transparent', fontFamily: 'inherit' }}/>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['Todos', ...Array.from(new Set(users.map(u => u.group)))].map(g => (
          <Chip key={g} active={groupFilter === g} onClick={() => setGroupFilter(g)}>{g}</Chip>
        ))}
      </div>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>{filtered.length} usuarios</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(u => (
          <div key={u.name} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: T.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: T.blueDeep, flexShrink: 0 }}>#{u.pos}</div>
            <Avatar initials={u.name.slice(0,2).toUpperCase()} size={32} style={{ flexShrink: 0 }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <GroupTag group={u.group}/>
                <span style={{ fontSize: 10.5, color: T.muted }}>{u.city}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>{u.pts}</span>
              <button onClick={() => onEdit(u)} style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.bgSoft, color: T.blue, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Editar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Predicciones ──────────────────────────────────────────────────────────
function TabPredicciones({ users }: { users: AdminUser[] }) {
  const [matchId, setMatchId] = useState<string>(GROUP_MATCH_IDS[0]);
  const [groupFilter, setGroupFilter] = useState('Todos');
  const [localPreds, setLocalPreds] = useState<Record<string, Record<string, [number,number]>>>(() => {
    const copy: Record<string, Record<string, [number,number]>> = {};
    for (const [name, preds] of Object.entries(USER_PREDICTIONS)) {
      copy[name] = { ...preds };
    }
    return copy;
  });
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [cellHome, setCellHome] = useState(0);
  const [cellAway, setCellAway] = useState(0);

  const match = MATCHES.find(m => m.id === matchId);

  const rows = useMemo(() => {
    return users
      .filter(u => groupFilter === 'Todos' || u.group === groupFilter)
      .map(u => ({ user: u, pred: localPreds[u.name]?.[matchId] ?? null }));
  }, [users, matchId, groupFilter, localPreds]);

  const dist = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach(r => { if (!r.pred) return; const k = `${r.pred[0]}-${r.pred[1]}`; counts.set(k, (counts.get(k) ?? 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [rows]);

  const openCellEdit = (userName: string, pred: [number,number] | null) => {
    setEditingCell(userName);
    setCellHome(pred?.[0] ?? 0);
    setCellAway(pred?.[1] ?? 0);
  };

  const saveCellEdit = (userName: string) => {
    setLocalPreds(prev => ({
      ...prev,
      [userName]: { ...prev[userName], [matchId]: [cellHome, cellAway] },
    }));
    setEditingCell(null);
  };

  return (
    <div style={{ padding: '12px 14px 80px' }}>
      <div style={{ background: '#fff', border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '2px 12px', marginBottom: 10 }}>
        <select value={matchId} onChange={e => setMatchId(e.target.value)}
          style={{ width: '100%', padding: '10px 0', border: 'none', outline: 'none', fontSize: 13, color: T.ink, fontFamily: 'inherit', background: 'transparent', cursor: 'pointer' }}>
          {GROUP_MATCH_IDS.map(id => {
            const m = MATCHES.find(x => x.id === id);
            return <option key={id} value={id}>{id.toUpperCase()} — {m ? `${m.home.code} vs ${m.away.code}` : id}</option>;
          })}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['Todos', ...Array.from(new Set(users.map(u => u.group)))].map(g => <Chip key={g} active={groupFilter === g} onClick={() => setGroupFilter(g)}>{g}</Chip>)}
      </div>

      {match && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{match.group}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.ink, marginBottom: 8 }}>{match.home.code} vs {match.away.code}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {dist.map(([key, count]) => (
              <span key={key} style={{ padding: '3px 10px', borderRadius: 20, background: T.blueSoft, color: T.blueDeep, fontSize: 12, fontWeight: 700 }}>{key} <span style={{ opacity: 0.7 }}>({count})</span></span>
            ))}
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(({ user: u, pred }) => (
          <div key={u.name} style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, width: 28, textAlign: 'right' }}>#{u.pos}</span>
            <Avatar initials={u.name.slice(0,2).toUpperCase()} size={28} style={{ flexShrink: 0 }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
              <GroupTag group={u.group}/>
            </div>
            {editingCell === u.name ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="number" min={0} value={cellHome} onChange={e => setCellHome(Number(e.target.value))}
                  style={{ width: 38, padding: '4px 6px', borderRadius: 6, border: `1.5px solid ${T.border}`, fontSize: 14, fontWeight: 800, textAlign: 'center', color: T.ink, fontFamily: 'inherit', outline: 'none' }}/>
                <span style={{ color: T.muted, fontWeight: 600, fontSize: 12 }}>–</span>
                <input type="number" min={0} value={cellAway} onChange={e => setCellAway(Number(e.target.value))}
                  style={{ width: 38, padding: '4px 6px', borderRadius: 6, border: `1.5px solid ${T.border}`, fontSize: 14, fontWeight: 800, textAlign: 'center', color: T.ink, fontFamily: 'inherit', outline: 'none' }}/>
                <button onClick={() => saveCellEdit(u.name)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: T.ink, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>OK</button>
                <button onClick={() => setEditingCell(null)} style={{ padding: '4px 6px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: T.muted, fontSize: 11, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {pred ? (
                  <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: 18, fontWeight: 800, color: T.limeDeep }}>{pred[0]} – {pred[1]}</span>
                ) : (
                  <span style={{ fontSize: 11, color: T.muted, fontStyle: 'italic' }}>Sin pred.</span>
                )}
                <button onClick={() => openCellEdit(u.name, pred)} style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.bgSoft, color: T.blue, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>✏</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Partidos ──────────────────────────────────────────────────────────────
function TabPartidos() {
  const allMatches = [...MATCHES, ...(KNOCKOUT_MATCHES ?? [])];
  const [matches, setMatches] = useState<AdminMatch[]>(allMatches);
  const [editing, setEditing] = useState<AdminMatch | null>(null);
  const [editHome, setEditHome] = useState('');
  const [editAway, setEditAway] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStadium, setEditStadium] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('Todos');
  const [search, setSearch] = useState('');

  const phases = useMemo(() => {
    const set = new Set(matches.map(m => m.group));
    return ['Todos', ...Array.from(set)];
  }, [matches]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return matches.filter(m =>
      (phaseFilter === 'Todos' || m.group === phaseFilter) &&
      (!q || m.home.code.toLowerCase().includes(q) || m.away.code.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.group.toLowerCase().includes(q))
    );
  }, [matches, phaseFilter, search]);

  const openEdit = (m: AdminMatch) => {
    setEditing(m);
    setEditHome(m.home.code);
    setEditAway(m.away.code);
    setEditDate(m.date);
    setEditStadium(m.stadium);
    setEditGroup(m.group);
  };

  const saveEdit = () => {
    if (!editing) return;
    setMatches(prev => prev.map(m => m.id === editing.id ? {
      ...m,
      home: { ...m.home, code: editHome },
      away: { ...m.away, code: editAway },
      date: editDate,
      stadium: editStadium,
      group: editGroup,
    } : m));
    setEditing(null);
  };

  return (
    <div style={{ padding: '12px 14px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '9px 14px', marginBottom: 12 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar equipo o ID…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: T.ink, background: 'transparent', fontFamily: 'inherit' }}/>
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10, scrollbarWidth: 'none' }}>
        {phases.map(p => (
          <button key={p} onClick={() => setPhaseFilter(p)} style={{
            padding: '5px 11px', borderRadius: 20, border: `1.5px solid ${phaseFilter === p ? T.blue : T.border}`,
            background: phaseFilter === p ? T.blueSoft : '#fff', color: phaseFilter === p ? T.blueDeep : T.muted,
            fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>{p}</button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>{filtered.length} partidos</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(m => (
          <div key={m.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: T.blue, background: T.blueSoft, padding: '2px 8px', borderRadius: 6 }}>{m.id.toUpperCase()}</span>
                <span style={{ fontSize: 10, color: T.muted }}>{m.group}</span>
              </div>
              <button onClick={() => openEdit(m)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.bgSoft, color: T.blue, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✏ Editar</button>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, marginBottom: 4 }}>{m.home.code} <span style={{ color: T.muted, fontWeight: 400 }}>vs</span> {m.away.code}</div>
            <div style={{ fontSize: 11, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.date}</div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.stadium}</div>
          </div>
        ))}
      </div>

      {/* Edit sheet */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={() => setEditing(null)}>
          <div style={{ width: '100%', background: '#fff', borderRadius: '18px 18px 0 0', padding: '20px 20px 32px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: '0 auto 16px' }}/>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Editar partido</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>{editing.id.toUpperCase()} · {editing.group}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <Label>Equipo local</Label>
                <input value={editHome} onChange={e => setEditHome(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}/>
              </div>
              <div>
                <Label>Equipo visitante</Label>
                <input value={editAway} onChange={e => setEditAway(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}/>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <Label>Fase / Grupo</Label>
              <input value={editGroup} onChange={e => setEditGroup(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}/>
            </div>

            <div style={{ marginBottom: 14 }}>
              <Label>Fecha</Label>
              <input value={editDate} onChange={e => setEditDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 12, color: T.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}/>
            </div>

            <div style={{ marginBottom: 22 }}>
              <Label>Estadio</Label>
              <input value={editStadium} onChange={e => setEditStadium(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 12, color: T.ink, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}/>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveEdit} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: T.ink, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Guardar</button>
              <button onClick={() => setEditing(null)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: `1.5px solid ${T.border}`, background: 'transparent', color: T.muted, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Resultados ────────────────────────────────────────────────────────────
function TabResultados() {
  const allMatches = [...MATCHES, ...(KNOCKOUT_MATCHES ?? [])];
  const [results, setResults] = useState<Record<string, [number,number]>>({});
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string }>>(() => {
    const d: Record<string, { home: string; away: string }> = {};
    allMatches.forEach(m => { d[m.id] = { home: '', away: '' }; });
    return d;
  });
  const [phaseFilter, setPhaseFilter] = useState('Todos');
  const [search, setSearch] = useState('');

  const phases = useMemo(() => {
    const set = new Set(allMatches.map(m => m.group));
    return ['Todos', ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allMatches.filter(m =>
      (phaseFilter === 'Todos' || m.group === phaseFilter) &&
      (!q || m.home.code.toLowerCase().includes(q) || m.away.code.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
    );
  }, [phaseFilter, search]);

  const saveResult = (matchId: string) => {
    const h = parseInt(drafts[matchId]?.home ?? '');
    const a = parseInt(drafts[matchId]?.away ?? '');
    if (isNaN(h) || isNaN(a)) return;
    setResults(prev => ({ ...prev, [matchId]: [h, a] }));
    setDrafts(prev => ({ ...prev, [matchId]: { home: '', away: '' } }));
  };

  const clearResult = (matchId: string) => {
    setResults(prev => { const n = { ...prev }; delete n[matchId]; return n; });
  };

  const savedCount = Object.keys(results).length;

  return (
    <div style={{ padding: '12px 14px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '9px 14px', marginBottom: 12 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar partido…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: T.ink, background: 'transparent', fontFamily: 'inherit' }}/>
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, scrollbarWidth: 'none' }}>
        {phases.map(p => (
          <button key={p} onClick={() => setPhaseFilter(p)} style={{
            padding: '5px 11px', borderRadius: 20, border: `1.5px solid ${phaseFilter === p ? T.lime : T.border}`,
            background: phaseFilter === p ? T.limeSoft : '#fff', color: phaseFilter === p ? T.limeDeep : T.muted,
            fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>{p}</button>
        ))}
      </div>

      {savedCount > 0 && (
        <div style={{ background: `${T.lime}18`, border: `1px solid ${T.lime}44`, borderRadius: 10, padding: '8px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.limeDeep }}>{savedCount} resultado{savedCount !== 1 ? 's' : ''} guardado{savedCount !== 1 ? 's' : ''}</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(m => {
          const saved = results[m.id];
          const draft = drafts[m.id] ?? { home: '', away: '' };
          return (
            <div key={m.id} style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${saved ? T.lime + '55' : T.border}`, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: T.blue, background: T.blueSoft, padding: '2px 8px', borderRadius: 6 }}>{m.id.toUpperCase()}</span>
                <span style={{ fontSize: 10, color: T.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.group}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, marginBottom: 10 }}>{m.home.code} <span style={{ color: T.muted, fontWeight: 400 }}>vs</span> {m.away.code}</div>

              {saved ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: T.muted }}>Resultado:</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 800, color: T.limeDeep }}>{saved[0]} – {saved[1]}</span>
                  </div>
                  <button onClick={() => clearResult(m.id)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.rose}44`, background: '#FFF1F2', color: T.rose, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Borrar</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>Resultado:</span>
                  <input type="number" min={0} placeholder="0" value={draft.home}
                    onChange={e => setDrafts(prev => ({ ...prev, [m.id]: { ...prev[m.id], home: e.target.value } }))}
                    style={{ width: 44, padding: '6px 8px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 15, fontWeight: 800, textAlign: 'center', color: T.ink, fontFamily: 'inherit', outline: 'none' }}/>
                  <span style={{ color: T.muted, fontWeight: 600 }}>–</span>
                  <input type="number" min={0} placeholder="0" value={draft.away}
                    onChange={e => setDrafts(prev => ({ ...prev, [m.id]: { ...prev[m.id], away: e.target.value } }))}
                    style={{ width: 44, padding: '6px 8px', borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 15, fontWeight: 800, textAlign: 'center', color: T.ink, fontFamily: 'inherit', outline: 'none' }}/>
                  <button onClick={() => saveResult(m.id)} style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: 'none', background: T.ink, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Guardar</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ADMIN_GROUP_COLORS: Record<string, string> = {
  'Evolve':          '#A3E635',
  'BEPENSA Spirits': '#1AAFFF',
  'ADM':             '#F59E0B',
  'Disney':          '#0063E5',
  'Ruz':             '#8B5CF6',
  'Zuru':            '#22C55E',
  'AGEMEX':          '#EF4444',
  'Delongi':         '#F97316',
};
const ADMIN_GROUP_LOGOS: Record<string, string> = {
  'BEPENSA Spirits': '/logos/bepensa.png',
  'ADM':             '/logos/adm.svg',
  'Disney':          '/logos/disney.png',
  'Ruz':             '/logos/ruz.png',
  'Zuru':            '/logos/zuru.png',
  'AGEMEX':          '/logos/agemex.png',
  'Delongi':         '/logos/delongi.png',
};

function AdminGroupIcon({ group, size = 36 }: { group: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const col  = ADMIN_GROUP_COLORS[group] ?? T.blue;
  const logo = ADMIN_GROUP_LOGOS[group];
  const initials = group.trim().split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();

  if (group === 'Evolve') {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: T.bgInk, border: `2px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <EvolveMark size={size * 0.55} color={col}/>
      </div>
    );
  }
  if (logo && !failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: '#fff', border: `2px solid ${col}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
        <img src={logo} alt={group} onError={() => setFailed(true)} style={{ width: '80%', height: '80%', objectFit: 'contain' }}/>
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: size * 0.28, fontWeight: 800, color: '#fff' }}>
      {initials}
    </div>
  );
}

// ── Tab: Grupos ────────────────────────────────────────────────────────────────
function TabGrupos({ users, setUsers, onSelectGroup }: { users: AdminUser[]; setUsers: (u: AdminUser[]) => void; onSelectGroup: (g: string) => void }) {
  const groups = Array.from(new Set(users.map(u => u.group)));

  return (
    <div style={{ padding: '12px 14px 80px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {groups.map(g => {
          const members = users.filter(u => u.group === g);
          const col = ADMIN_GROUP_COLORS[g] ?? T.blue;
          const isEvolve = g === 'Evolve';
          return (
            <div
              key={g}
              onClick={() => onSelectGroup(g)}
              style={{
                background: '#fff',
                borderRadius: 16,
                border: `2px solid ${isEvolve ? T.lime : col + '44'}`,
                boxShadow: isEvolve ? `0 0 0 3px ${T.lime}20` : '0 1px 6px rgba(0,0,0,0.07)',
                padding: '14px 14px 12px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top: name + icon */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ flex: 1, paddingRight: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, lineHeight: 1.3 }}>{g}</div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>miembros</div>
                </div>
                <AdminGroupIcon group={g} size={38}/>
              </div>
              {/* Count */}
              <div style={{ fontSize: 32, fontWeight: 900, color: T.blue, lineHeight: 1, marginBottom: 8 }}>{members.length}</div>
              {/* Avg */}
              <div style={{ fontSize: 11, fontWeight: 600, color: T.slate, borderTop: `1px solid ${T.borderSoft}`, paddingTop: 8 }}>
                Prom: <span style={{ color: col, fontWeight: 700 }}>{avg(members)} pts</span>
              </div>
              {isEvolve && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: T.lime }}/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
