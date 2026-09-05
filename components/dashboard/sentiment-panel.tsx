'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard, type ScenarioId } from '@/src/lib/store';
import { isScenarioFixture } from '@/src/lib/fixture-guard';
import { trueAvg } from '@/src/lib/sentiment';
import crowdedLong from '@/src/lib/fixtures/crowded-long.json';
import crowdedShort from '@/src/lib/fixtures/crowded-short.json';
import balanced from '@/src/lib/fixtures/balanced.json';
import { cn } from 'cn';

const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: 'crowded-long', label: 'izdihamlı-long' },
  { id: 'crowded-short', label: 'izdihamlı-short' },
  { id: 'balanced', label: 'balanslı' },
];

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

export function SentimentPanel() {
  const scenario = useDashboard((s) => s.scenario);
  const setScenario = useDashboard((s) => s.setScenario);

  const snapshot = snapshotFor(scenario);
  if (!isScenarioFixture(snapshot)) {
    return (
      <Card data-slot="sentiment-panel">
        <CardHeader>
          <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Sentiment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base font-semibold">Məlumat yoxdur</p>
          <p className="text-xs">Ssenari məlumatı yoxlanışdan keçmədi.</p>
        </CardContent>
      </Card>
    );
  }

  const avg = trueAvg(snapshot.sentiment.brokers);
  const activeId = snapshot.id;

  return (
    <Card data-slot="sentiment-panel">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Sentiment</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left font-semibold">Broker</th>
              <th className="text-right font-semibold">Long</th>
              <th className="text-right font-semibold">Short</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.sentiment.brokers.map((row) => (
              <tr key={row.broker}>
                <td>{row.broker}</td>
                <td className="text-right font-mono">{row.longPct}%</td>
                <td className="text-right font-mono">{row.shortPct}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="font-mono">
                {`Həqiqi Ortalama (Insta/FiboGroup xaric): BUY ${avg.buy}% / SELL ${avg.sell}%`}
              </td>
            </tr>
          </tfoot>
        </table>

        {avg.crowded !== null ? (
          <span data-slot="crowded-flag" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
            {`İZDİHAMLI ${avg.crowded} ${avg.crowded === 'LONG' ? avg.buy : avg.sell}%`}
          </span>
        ) : null}

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">Ssenari</span>
          {SCENARIOS.map((option) => (
            <Button
              key={option.id}
              size="sm"
              variant={option.id === activeId ? 'default' : 'outline'}
              onClick={() => setScenario(option.id)}
              className={cn(option.id === activeId && 'is-active')}
              data-active={option.id === activeId}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
