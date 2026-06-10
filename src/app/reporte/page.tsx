/**
 * /reporte — Public visual participation report.
 * Server component — fresh data on every request, no auth required.
 */
import { getAdminClient } from '@/lib/server-session';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

const GROUP_COLORS: Record<string, string> = {
  'Evolve':             '#A3E635',
  'BEPENSA Spirits':    '#1AAFFF',
  'ADM':                '#F59E0B',
  'Spin Master':        '#1AAFFF',
  'SPIN MASTER':        '#1AAFFF',
  'Disney':             '#0063E5',
  'Ruz':                '#EC4899',
  'RUZ FIJOS':          '#EC4899',
  'Zuru':               '#8B5CF6',
  'AJEMEX':             '#EF4444',
  'Hanes':              '#14B8A6',
  'NICKELODEON':        '#F97316',
  'BEPESA-LAMADRILEÑA': '#06B6D4',
  'MULTIMARCA':         '#84CC16',
  'Juguetimax':         '#F43F5E',
};
const defaultColor = '#94A3B8';

type GroupRow = {
  name: string;
  color: string;
  registered: number;
  survey: number;
  predictions: number;
};

async function getData(): Promise<GroupRow[]> {
  const admin = getAdminClient();
  const PAGE  = 1000;

  const allProfiles: { id: string; group_name: string | null; survey_completed_at: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await admin.from('profiles').select('id, group_name, survey_completed_at').range(from, from + PAGE - 1);
    if (!data?.length) break;
    allProfiles.push(...(data as typeof allProfiles));
    if (data.length < PAGE) break;
  }

  const predUserIds = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data } = await admin.from('predictions').select('user_id').range(from, from + PAGE - 1);
    if (!data?.length) break;
    (data as { user_id: string }[]).forEach(r => predUserIds.add(r.user_id));
    if (data.length < PAGE) break;
  }

  const map = new Map<string, { registered: number; survey: number; predictions: number }>();
  for (const p of allProfiles) {
    const g = (p.group_name ?? '(sin grupo)').trim();
    if (!map.has(g)) map.set(g, { registered: 0, survey: 0, predictions: 0 });
    const row = map.get(g)!;
    row.registered++;
    if (p.survey_completed_at) row.survey++;
    if (predUserIds.has(p.id)) row.predictions++;
  }

  return [...map.entries()]
    .map(([name, v]) => ({ name, color: GROUP_COLORS[name] ?? defaultColor, ...v }))
    .filter(r => r.registered > 0)
    .sort((a, b) => b.survey - a.survey || b.registered - a.registered);
}

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

export default async function ReportePage() {
  const rows = await getData();
  const totalRegistered  = rows.reduce((s, r) => s + r.registered,  0);
  const totalSurvey      = rows.reduce((s, r) => s + r.survey,      0);
  const totalPredictions = rows.reduce((s, r) => s + r.predictions, 0);

  const now = new Date().toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#64748b', marginBottom: 4 }}>
            Quiniela Evolve · Torneo 2026
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            Reporte de Participación
          </h1>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>Actualizado: {now}</div>
        </div>
        <PrintButton />
      </div>

      {/* Summary KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 32 }}>
        {[
          { label: 'Grupos activos',        value: rows.length,       color: '#6366f1' },
          { label: 'Cuentas creadas',        value: totalRegistered,   color: '#3b82f6' },
          { label: 'Encuesta contestada',    value: totalSurvey,       color: '#f59e0b' },
          { label: 'Con predicciones',       value: totalPredictions,  color: '#22c55e' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.07)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 34, fontWeight: 800, color, lineHeight: 1 }}>{value.toLocaleString('es-MX')}</div>
          </div>
        ))}
      </div>

      {/* Group cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {rows.map(row => (
          <div key={row.name} className="group-card" style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.07)', borderLeft: `4px solid ${row.color}` }}>

            {/* Group header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{row.name}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f8fafc', padding: '3px 10px', borderRadius: 20, border: '1px solid #e2e8f0' }}>
                {row.registered} cuentas
              </span>
            </div>

            {/* Encuesta bar */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Encuesta contestada</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                  {row.survey} <span style={{ fontWeight: 400, color: '#94a3b8' }}>({pct(row.survey, row.registered)}%)</span>
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: '#e2e8f0' }}>
                <div style={{ height: '100%', borderRadius: 99, background: row.color, width: `${pct(row.survey, row.registered)}%` }} />
              </div>
            </div>

            {/* Predicciones bar */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Con al menos 1 predicción</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                  {row.predictions} <span style={{ fontWeight: 400, color: '#94a3b8' }}>({pct(row.predictions, row.registered)}%)</span>
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: '#e2e8f0' }}>
                <div style={{ height: '100%', borderRadius: 99, background: '#22c55e', width: `${pct(row.predictions, row.registered)}%` }} />
              </div>
            </div>

            {/* Footer row */}
            <div style={{ paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                <b style={{ color: '#f59e0b' }}>{pct(row.survey, row.registered)}%</b> encuesta
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                <b style={{ color: '#22c55e' }}>{pct(row.predictions, row.registered)}%</b> predicciones
              </span>
              {row.registered - row.survey > 0 && (
                <span style={{ fontSize: 11, color: '#ef4444', marginLeft: 'auto', fontWeight: 600 }}>
                  {row.registered - row.survey} pendientes
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 40, textAlign: 'center', fontSize: 11, color: '#cbd5e1' }}>
        quiniela-evolve.vercel.app · datos en tiempo real
      </div>
    </div>
  );
}
