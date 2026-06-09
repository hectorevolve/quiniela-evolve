/**
 * GET /api/public/report
 *
 * Public endpoint — no authentication required.
 * Returns an Excel file with two sheets:
 *   1. "Por grupo"  — registered users (survey completed) + users with ≥1 prediction, per group
 *   2. "Resumen"    — single-row totals
 *
 * Share URL: https://quiniela-evolve.vercel.app/api/public/report
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/server-session';
import * as XLSX from 'xlsx';

const PAGE = 1000;

export async function GET() {
  const admin = getAdminClient();

  // ── 1. Fetch all profiles ─────────────────────────────────────────────────
  const allProfiles: { id: string; survey_completed: boolean | null; survey_completed_at: string | null; group_name: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, survey_completed, survey_completed_at, group_name')
      .order('created_at')
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;
    allProfiles.push(...(data as typeof allProfiles));
    if (data.length < PAGE) break;
  }

  // ── 2. Fetch all predictions (user_id only) ───────────────────────────────
  const predUserIds = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from('predictions')
      .select('user_id')
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;
    (data as { user_id: string }[]).forEach(r => predUserIds.add(r.user_id));
    if (data.length < PAGE) break;
  }

  // ── 3. Aggregate by group ─────────────────────────────────────────────────
  const groups = new Map<string, { registered: number; withPreds: number }>();

  for (const p of allProfiles) {
    const g = p.group_name ?? '(sin grupo)';
    if (!groups.has(g)) groups.set(g, { registered: 0, withPreds: 0 });
    const row = groups.get(g)!;

    // Only count users who actually submitted the survey form
    // (survey_completed_at is set exclusively by the survey submit endpoint)
    if (p.survey_completed_at) row.registered++;
    if (predUserIds.has(p.id)) row.withPreds++;
  }

  // ── 4. Build workbook ─────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

  // Sheet 1 — Por grupo (sorted by registered desc)
  const groupRows = [...groups.entries()]
    .sort((a, b) => b[1].registered - a[1].registered)
    .map(([name, { registered, withPreds }]) => ({
      'Grupo':                             name,
      'Encuesta contestada':               registered,
      'Con al menos 1 predicción':         withPreds,
    }));

  const ws1 = XLSX.utils.json_to_sheet(groupRows);

  // Column widths
  ws1['!cols'] = [{ wch: 28 }, { wch: 26 }, { wch: 26 }];

  XLSX.utils.book_append_sheet(wb, ws1, 'Por grupo');

  // Sheet 2 — Resumen
  const totalRegistered = [...groups.values()].reduce((s, r) => s + r.registered, 0);
  const totalWithPreds  = [...groups.values()].reduce((s, r) => s + r.withPreds, 0);

  const ws2 = XLSX.utils.aoa_to_sheet([
    ['Reporte Quiniela Torneo 2026'],
    ['Generado:', dateStr],
    [],
    ['Total encuestas contestadas:',           totalRegistered],
    ['Total con al menos 1 predicción:',       totalWithPreds],
    ['Total grupos activos:',                  groups.size],
  ]);
  ws2['!cols'] = [{ wch: 42 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');

  // ── 5. Return Excel file ──────────────────────────────────────────────────
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const filename = `reporte_quiniela_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  });
}
