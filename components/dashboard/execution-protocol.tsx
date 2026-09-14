'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/src/lib/store';

// Phase 17 execution-protocol thin panel (TICK-04): math-free trigger status —
// verdict plus direction plus gates plus the verbatim reason. Replaces the
// UNAVAILABLE execution-protocol card one-to-one, keeping the exact data-slot.
// Stable selector-function subscription with derivation during render (never
// useShallow on nested output, report.tsx selectLevels precedent).

const EMPTY_COPY = 'Məlumat yoxdur';

export function ExecutionProtocol() {
  const lastUpdatedISO = useDashboard((s) => s.lastUpdatedISO);
  const selectTrigger = useDashboard((s) => s.selectTrigger);
  const trigger = selectTrigger();

  return (
    <Card data-slot="execution-protocol">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">İcra Protokolu</CardTitle>
      </CardHeader>
      <CardContent>
        {lastUpdatedISO === null ? (
          <div className="flex flex-col gap-3">
            <div className="h-3 animate-pulse" />
            <div className="h-3 animate-pulse" />
          </div>
        ) : trigger === null ? (
          <p className="text-base font-semibold">{EMPTY_COPY}</p>
        ) : (
          <div>
            <p
              data-slot="execution-verdict"
              className="text-[11px] font-semibold uppercase tracking-[0.1em]"
            >
              {trigger.verdict}
              {trigger.direction !== null ? ` · ${trigger.direction}` : null}
            </p>
            <p data-slot="execution-reason" className="text-base font-semibold">
              {trigger.reason}
            </p>
            <p data-slot="execution-gates" className="font-mono text-xs tabular-nums">
              {`GATES timing ${trigger.gates.timing ? '✓' : '✕'} · purge ${trigger.gates.purge ? '✓' : '✕'} · displacement ${trigger.gates.displacement ? '✓' : '✕'}`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
