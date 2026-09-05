'use client';

import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from 'cn';
import { useDashboard } from '@/src/lib/store';
import { deriveStatus, formatStripAge } from '@/src/lib/freshness';

const TICK_MS = 10_000;

export function StatusStrip() {
  const { stale, lastUpdatedISO } = useDashboard(
    useShallow((s) => ({ stale: s.stale, lastUpdatedISO: s.lastUpdatedISO })),
  );
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (lastUpdatedISO === null) {
    return (
      <section data-slot="status-strip" data-freshness="loading" className={cn('rounded-xl px-4 py-2 font-mono text-xs text-muted-foreground')}>
        <span>Yüklənir…</span>
      </section>
    );
  }

  let copy: string;
  let freshness: string;
  try {
    const { state, ageSec } = deriveStatus({ stale, lastUpdatedISO }, now);
    copy = formatStripAge(state, ageSec);
    freshness = state.toLowerCase();
  } catch {
    copy = 'Canlı məlumat əlçatan deyil — son keş göstərilir.';
    freshness = 'stale';
  }
  const isLive = freshness === 'live';

  return (
    <section
      data-slot="status-strip"
      data-freshness={freshness}
      className={cn(
        'rounded-xl px-4 py-2 font-mono text-xs',
        isLive ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <span className="tabular-nums">
        {isLive ? <span data-slot="live-dot" aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--terminal-accent)]" /> : null}
        {copy}
      </span>
    </section>
  );
}
