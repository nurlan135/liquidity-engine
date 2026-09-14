'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/src/lib/store';

// Phase 17 fatal-flaw thin panel (TICK-04): math-free invalidation status —
// verdict plus flaw sentence plus challenge, all verbatim from the selector.
// Replaces the UNAVAILABLE fatal-flaw card one-to-one, keeping the exact
// data-slot. INVALIDATED carries neutral styling (Phase 16 lock): no
// red/green direction tone, the reason carries the verdict.

const EMPTY_COPY = 'Məlumat yoxdur';

export function FatalFlaw() {
  const lastUpdatedISO = useDashboard((s) => s.lastUpdatedISO);
  const selectFatalFlaw = useDashboard((s) => s.selectFatalFlaw);
  const flaw = selectFatalFlaw();
  const verdict =
    flaw === null ? null : flaw.invalidated ? 'INVALIDATED' : flaw.downgraded ? 'DOWNGRADED' : 'TƏMİZ';

  return (
    <Card data-slot="fatal-flaw">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Fatal Flaw</CardTitle>
      </CardHeader>
      <CardContent>
        {lastUpdatedISO === null ? (
          <div className="flex flex-col gap-3">
            <div className="h-3 animate-pulse" />
            <div className="h-3 animate-pulse" />
          </div>
        ) : flaw === null || verdict === null ? (
          <p className="text-base font-semibold">{EMPTY_COPY}</p>
        ) : (
          <div>
            <p
              data-slot="flaw-verdict"
              className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
            >
              {verdict}
            </p>
            <p data-slot="flaw-reason" className="text-base font-semibold">
              {flaw.reason}
            </p>
            <p data-slot="flaw-sentence" className="text-xs">
              {flaw.sentence}
            </p>
            <p data-slot="flaw-challenge" className="text-xs">
              {flaw.challenge}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
