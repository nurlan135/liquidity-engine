'use client';

import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from 'cn';
import { useDashboard } from '@/src/lib/store';
import { deriveStatus, formatStripAge } from '@/src/lib/freshness';

const TICK_MS = 10_000;

// D-04: per-leg age segment with the existing vocabulary — no new status
// enum. Each leg derives independently via deriveStatus + formatStripAge
// (D-06: one stale leg never rewrites the other). The paired line renders
// NQ <age> · ES <age> using the strip's seconds/minute copy: LIVE legs show
// `NQ 12s`, STALE legs show the locked `STALE · … — son keş göstərilir`
// copy inline, CLOSED legs show the ribbon.
function safeDerive(stale: boolean, lastUpdatedISO: string, now: Date) {
  try {
    return deriveStatus({ stale, lastUpdatedISO }, now);
  } catch {
    return null;
  }
}

function segmentFor(symbol: 'NQ' | 'ES', lastUpdatedISO: string | null, derived: { state: string; ageSec: number } | null): string {
  if (lastUpdatedISO === null) return `${symbol} …`;
  if (derived === null) return `${symbol} STALE`;
  if (derived.state === 'CLOSED') return `${symbol} BAĞLI`;
  if (derived.state === 'STALE') return `${symbol} ${formatStripAge('STALE', derived.ageSec)}`;
  return `${symbol} ${formatStripAge('LIVE', derived.ageSec)}`;
}

export function StatusStrip() {
  const { stale, lastUpdatedISO, nq, es } = useDashboard(
    useShallow((s) => ({ stale: s.stale, lastUpdatedISO: s.lastUpdatedISO, nq: s.nq, es: s.es })),
  );
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Dual-leg truth available: render the paired age line with per-leg
  // deriveStatus. Falls back to the legacy single-leg copy only when neither
  // leg has landed (keeps the loading branch and weekend ribbon semantics).
  const dualReady = nq.lastUpdatedISO !== null || es.lastUpdatedISO !== null;

  if (!dualReady) {
    if (lastUpdatedISO === null) {
      return (
        <section data-slot="status-strip" data-freshness="loading" className={cn('rounded-xl px-4 py-2 font-mono text-xs text-muted-foreground')}>
          <span>Yüklənir…</span>
        </section>
      );
    }
  }

  if (dualReady) {
    // Per-leg segments derive independently (D-04/D-06): one stale leg never
    // rewrites the other leg's segment.
    const nqDerived = nq.lastUpdatedISO !== null ? safeDerive(nq.stale, nq.lastUpdatedISO, now) : null;
    const esDerived = es.lastUpdatedISO !== null ? safeDerive(es.stale, es.lastUpdatedISO, now) : null;
    const nqSeg = segmentFor('NQ', nq.lastUpdatedISO, nqDerived);
    const esSeg = segmentFor('ES', es.lastUpdatedISO, esDerived);
    // Weekend ribbon: either leg CLOSED keeps the locked Azerbaijani copy.
    const weekendCopy =
      nqDerived?.state === 'CLOSED' || esDerived?.state === 'CLOSED'
        ? formatStripAge('CLOSED', 0)
        : null;
    // Overall freshness: worst of the two legs (STALE if either is STALE).
    // Reuses the per-leg derivations above — no second derive pass.
    let freshness = 'live';
    const states: string[] = [];
    if (nqDerived !== null) states.push(nqDerived.state);
    if (esDerived !== null) states.push(esDerived.state);
    if (states.includes('CLOSED')) freshness = 'closed';
    else if (states.includes('STALE')) freshness = 'stale';
    else if (states.length === 0) freshness = 'stale';
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
          {weekendCopy ?? `${nqSeg} · ${esSeg}`}
        </span>
      </section>
    );
  }

  let copy: string;
  let freshness: string;
  try {
    const { state, ageSec } = deriveStatus({ stale, lastUpdatedISO: lastUpdatedISO! }, now);
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
