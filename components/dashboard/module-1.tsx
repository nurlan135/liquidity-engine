'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/src/lib/store';
import { isScenarioFixture } from '@/src/lib/fixture-guard';
import { trueAvg } from '@/src/lib/sentiment';
import crowdedLong from '@/src/lib/fixtures/crowded-long.json';
import crowdedShort from '@/src/lib/fixtures/crowded-short.json';
import balanced from '@/src/lib/fixtures/balanced.json';

const SNAPSHOTS = {
  'crowded-long': crowdedLong,
  'crowded-short': crowdedShort,
  balanced,
} as const;

function snapshotFor(scenario: string) {
  if (scenario === 'crowded-short') return SNAPSHOTS['crowded-short'];
  if (scenario === 'balanced') return SNAPSHOTS.balanced;
  return SNAPSHOTS['crowded-long'];
}

const EMPTY_COPY = 'Məlumat yoxdur';

export function Module1() {
  const lastUpdatedISO = useDashboard((s) => s.lastUpdatedISO);
  const scenario = useDashboard((s) => s.scenario);
  const snapshot = snapshotFor(scenario);
  const valid = isScenarioFixture(snapshot);

  return (
    <Card data-slot="module-1">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Modul 1</CardTitle>
      </CardHeader>
      <CardContent>
        {lastUpdatedISO === null ? (
          <div className="flex flex-col gap-3">
            <div className="h-3 animate-pulse" />
            <div className="h-3 animate-pulse" />
          </div>
        ) : !valid ? (
          <p className="text-base font-semibold">{EMPTY_COPY}</p>
        ) : (
          (() => {
            const avg = trueAvg(snapshot.sentiment.brokers);
            return (
              <div>
                <p data-slot="module1-average" className="font-mono text-xs tabular-nums">
                  {`Həqiqi Ortalama: BUY ${avg.buy}% / SELL ${avg.sell}%`}
                </p>
                {avg.crowded !== null ? (
                  <p
                    data-slot="module1-crowded"
                    className="text-[11px] font-semibold uppercase tracking-[0.1em]"
                  >
                    {`İZDİHAMLI ${avg.crowded} ${avg.crowded === 'LONG' ? avg.buy : avg.sell}%`}
                  </p>
                ) : (
                  <p data-slot="module1-crowded" className="text-xs text-muted-foreground">
                    İzdiham yoxdur — balanslı.
                  </p>
                )}
              </div>
            );
          })()
        )}
      </CardContent>
    </Card>
  );
}
