'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/src/lib/store';

const EMPTY_COPY = 'Məlumat yoxdur';

function fmt(value: number): string {
  return value.toFixed(2);
}

function positionLabel(position: number): string {
  if (position < 0.48) return 'Discount';
  if (position > 0.52) return 'Premium';
  return 'Ekvilibrium';
}

export function LiquidityMap() {
  const lastUpdatedISO = useDashboard((s) => s.lastUpdatedISO);
  const selectLevels = useDashboard((s) => s.selectLevels);
  const selectDOL = useDashboard((s) => s.selectDOL);
  const levels = selectLevels();
  const dol = selectDOL();

  return (
    <Card data-slot="liquidity-map">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Likvidlik Xəritəsi</CardTitle>
      </CardHeader>
      <CardContent>
        {lastUpdatedISO === null ? (
          <div className="flex flex-col gap-3">
            <div className="h-3 animate-pulse" />
            <div className="h-3 animate-pulse" />
          </div>
        ) : levels === null ? (
          <p className="text-base font-semibold">{EMPTY_COPY}</p>
        ) : (
          <div>
            <p data-slot="liquidity-position" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
              {positionLabel(levels.position)}
            </p>
            <p data-slot="liquidity-eq" className="font-mono text-xl font-semibold tabular-nums">
              {`EQ ${fmt(levels.eq)}`}
            </p>
            <p data-slot="liquidity-quarters" className="font-mono text-xs tabular-nums">
              {`Q1 ${fmt(levels.q1)} · Q3 ${fmt(levels.q3)}`}
            </p>
            <p data-slot="liquidity-ote" className="font-mono text-xs tabular-nums">
              {`OTE bull ${fmt(levels.bullOTE.lo)}–${fmt(levels.bullOTE.hi)} · bear ${fmt(levels.bearOTE.lo)}–${fmt(levels.bearOTE.hi)}`}
            </p>
            {dol !== null ? (
              <p data-slot="liquidity-dol" className="font-mono text-xs tabular-nums">
                {`DOL ${dol.name} ${fmt(dol.price)}`}
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
