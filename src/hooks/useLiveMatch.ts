'use client';
import { useEffect, useState } from 'react';
import type { LiveMatch } from '@/lib/data';

const POLL_LIVE_MS = 15_000;
const POLL_IDLE_MS = 300_000;

const MOCK: LiveMatch | null = null;

export function useLiveMatch(override?: LiveMatch | null) {
  const [liveMatch, setLiveMatch] = useState<LiveMatch | null>(
    override !== undefined ? override : MOCK
  );

  // Decompose the object into primitives so the effect dependency doesn't
  // fire on every render when the caller passes a new object literal.
  const hasOverride = override !== undefined;
  const matchId    = override?.matchId;
  const homeScore  = override?.homeScore;
  const awayScore  = override?.awayScore;
  const minute     = override?.minute;
  const status     = override?.status;
  const duration   = override?.duration;

  useEffect(() => {
    if (hasOverride) {
      setLiveMatch({ matchId: matchId!, homeScore: homeScore!, awayScore: awayScore!, minute: minute ?? null, status: status ?? 'IN_PLAY', duration: duration ?? 'REGULAR' });
      return;
    }
    if (MOCK !== null) { setLiveMatch(MOCK); return; }

    let timer: ReturnType<typeof setTimeout>;
    const fetchLive = async () => {
      try {
        const res  = await fetch('/api/live', { cache: 'no-store' });
        const data = await res.json() as { live: LiveMatch | null };
        setLiveMatch(data.live ?? null);
        timer = setTimeout(fetchLive, data.live ? POLL_LIVE_MS : POLL_IDLE_MS);
      } catch {
        timer = setTimeout(fetchLive, POLL_IDLE_MS);
      }
    };
    fetchLive();
    return () => clearTimeout(timer);
  }, [hasOverride, matchId, homeScore, awayScore, minute, status, duration]);

  return liveMatch;
}
