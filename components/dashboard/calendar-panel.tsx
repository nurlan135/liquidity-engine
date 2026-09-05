'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/src/lib/store';
import { formatCountdown, isPreNews } from '@/src/lib/countdown';
import { isScenarioFixture, resolveScenario } from '@/src/lib/fixture-guard';
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

export function CalendarPanel() {
  const scenario = useDashboard((s) => s.scenario);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const snapshot = snapshotFor(scenario);
  if (!isScenarioFixture(snapshot)) {
    return (
      <Card data-slot="calendar-panel">
        <CardHeader>
          <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Təqvim</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base font-semibold">Məlumat yoxdur</p>
          <p className="text-xs">Ssenari məlumatı yoxlanışdan keçmədi.</p>
        </CardContent>
      </Card>
    );
  }

  const events = resolveScenario(snapshot, now);

  return (
    <Card data-slot="calendar-panel">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Təqvim</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div>
            <p className="text-base font-semibold">Yüksək təsirli xəbər yoxdur</p>
            <p className="text-xs">Təqvimdə yaxın günlərdə yüksək təsirli xəbər planlaşdırılmayıb.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {events.map((item) => {
              const countdown = formatCountdown(item.startsAt, now);
              const preNews = isPreNews(item.startsAt, now);
              return (
                <li key={item.event} className="flex flex-col gap-1">
                  <span className="text-xs">{item.event}</span>
                  <span className="font-mono text-xs">{countdown}</span>
                  {preNews ? (
                    <span data-slot="pre-news-flag" className="text-xs">{`XƏBƏR ÖNCƏSİ — ${item.event} ${countdown}`}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <div data-slot="interpretation">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em]">Tələ vs Həqiqi Çatdırılma</p>
          <p className="text-xs">{snapshot.interpretation}</p>
        </div>
      </CardContent>
    </Card>
  );
}
