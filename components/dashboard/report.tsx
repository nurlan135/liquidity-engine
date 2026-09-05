'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/src/lib/store';
import { REPORT_SECTIONS, REGIME_BADGE, PRE_NEWS_BADGE } from '@/src/lib/report';
import { deriveBlockedSide } from '@/src/lib/blocked-side';
import { isScenarioFixture, resolveScenario } from '@/src/lib/fixture-guard';
import { isPreNews } from '@/src/lib/countdown';
import crowdedLong from '@/src/lib/fixtures/crowded-long.json';
import crowdedShort from '@/src/lib/fixtures/crowded-short.json';
import balanced from '@/src/lib/fixtures/balanced.json';
import { cn } from 'cn';

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

// Position label from dealing-range position with the 0.48/0.52 buffer.
function positionLabel(position: number): string {
  if (position < 0.48) return 'Discount';
  if (position > 0.52) return 'Premium';
  return 'Ekvilibrium';
}

export function Report() {
  const lastUpdatedISO = useDashboard((s) => s.lastUpdatedISO);
  const scenario = useDashboard((s) => s.scenario);
  const selectPosition = useDashboard((s) => s.selectPosition);
  const selectBias = useDashboard((s) => s.selectBias);
  const selectDOL = useDashboard((s) => s.selectDOL);
  const selectRegime = useDashboard((s) => s.selectRegime);

  const position = selectPosition();
  const biasOutput = selectBias();
  const dol = selectDOL();
  const regimeOutput = selectRegime();

  const preNews = useMemo(() => {
    const snapshot = snapshotFor(scenario);
    if (!isScenarioFixture(snapshot)) return false;
    const now = new Date();
    return resolveScenario(snapshot, now).some((item) => isPreNews(item.startsAt, now));
  }, [scenario]);

  const bias = biasOutput?.bias ?? null;
  const blocked = bias === null ? null : deriveBlockedSide(bias);
  const biasTone =
    bias === 'BULLISH'
      ? 'text-[var(--terminal-up)]'
      : bias === 'BEARISH'
        ? 'text-[var(--terminal-down)]'
        : 'text-muted-foreground';

  return (
    <Card data-slot="report">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          {bias === null ? '# NQ=F | HTF BIAS' : `# NQ=F | HTF BIAS: ${bias}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {REPORT_SECTIONS.map((section) => {
          if (section.state === 'unavailable') {
            return (
              <section
                key={section.index}
                data-slot="report-section"
                className="pointer-events-none relative opacity-45"
              >
                <span className="absolute top-0 right-0 text-[11px] font-semibold uppercase tracking-[0.1em]">
                  UNAVAILABLE
                </span>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                  {section.title}
                </h3>
              </section>
            );
          }

          return (
            <section key={section.index} data-slot="report-section">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                {section.title}
              </h3>
              {lastUpdatedISO === null ? (
                <div className="flex flex-col gap-3">
                  <div className="h-3 animate-pulse" />
                  <div className="h-3 animate-pulse" />
                  <div className="h-3 animate-pulse" />
                </div>
              ) : biasOutput === null || dol === null || regimeOutput === null || position === null ? (
                <p className="text-base font-semibold">Məlumat yoxdur</p>
              ) : (
                <div>
                  <p className="text-xs">
                    {preNews ? PRE_NEWS_BADGE : REGIME_BADGE[regimeOutput.regime]}
                  </p>
                  <p className={cn('text-xl font-semibold', biasTone)}>{biasOutput.bias}</p>
                  <p className="text-xs">{`Mövqe: ${positionLabel(position)}`}</p>
                  <p className="text-xs">Çatdırılma dövrü: D1</p>
                  <p className="text-xs">
                    {`Alqoritmin əsas hədəfi: ${dol.name} `}
                    <span className="font-mono">{dol.price}</span>
                  </p>
                  <p className="text-xs">{biasOutput.rationale}</p>
                  {blocked === null || blocked.blocked === 'BOTH' ? (
                    <div className="opacity-45">
                      <p className="text-xs">LONG</p>
                      <p className="text-xs">SHORT</p>
                    </div>
                  ) : blocked.blocked === 'LONG' ? (
                    <div>
                      <p className="text-xs text-[var(--terminal-down)] line-through">
                        {`LONG — ${blocked.label}`}
                      </p>
                      <p className="text-xs">SHORT</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs">LONG</p>
                      <p className="text-xs text-[var(--terminal-down)] line-through">
                        {`SHORT — ${blocked.label}`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
