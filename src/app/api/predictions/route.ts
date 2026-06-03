import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/server-session';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get('matchId');
  if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('predictions')
    .select('home_score, away_score')
    .eq('match_id', matchId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate into buckets
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = `${row.home_score},${row.away_score}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const buckets = Array.from(counts.entries())
    .map(([k, count]) => {
      const [home, away] = k.split(',').map(Number);
      return { home, away, count };
    })
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ total: data?.length ?? 0, buckets });
}
