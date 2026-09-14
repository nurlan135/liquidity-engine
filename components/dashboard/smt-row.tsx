'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/src/lib/store';

const EMPTY_COPY = 'Məlumat yoxdur';

function smtSuppressionReason(smt: { suppressed: true; reason: string }): string {
  return `${smt.reason} — SMT Gözlənilir.`;
}

function smtLiveProse(smt: {
  direction: string;
  sweeperLeg: string | null;
  nqWindow: { start: string; end: string; extreme: number } | null;
  esWindow: { start: string; end: string; extreme: number } | null;
}): string {
  const windows =
    smt.nqWindow !== null && smt.esWindow !== null
      ? ` NQ ${smt.nqWindow.start}–${smt.nqWindow.end} ${smt.nqWindow.extreme} / ES ${smt.esWindow.start}–${smt.esWindow.end} ${smt.esWindow.extreme}.`
      : '';
  const sweeper = smt.sweeperLeg !== null ? ` Sweeper: ${smt.sweeperLeg}.` : '';
  return `SMT ${smt.direction}.${sweeper}${windows}`;
}

export function SmtRow() {
  const lastUpdatedISO = useDashboard((s) => s.lastUpdatedISO);
  const selectSMT = useDashboard((s) => s.selectSMT);
  const smt = selectSMT();

  return (
    <Card data-slot="smt-row">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">SMT</CardTitle>
      </CardHeader>
      <CardContent>
        {lastUpdatedISO === null ? (
          <div className="flex flex-col gap-3">
            <div className="h-3 animate-pulse" />
            <div className="h-3 animate-pulse" />
          </div>
        ) : smt === null ? (
          <p className="text-base font-semibold">{EMPTY_COPY}</p>
        ) : (
          <div>
            <p data-slot="smt-prose" className="text-base font-semibold">
              {smt.suppressed ? smtSuppressionReason(smt) : smtLiveProse(smt)}
            </p>
            {!smt.suppressed && smt.direction === 'NO-SIGNAL' ? (
              <p className="text-xs text-muted-foreground">SMT Gözlənilir.</p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
