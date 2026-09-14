'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/src/lib/store';
import { REPORT_SECTIONS, REGIME_BADGE, PRE_NEWS_BADGE, CONVICTION_LABEL } from '@/src/lib/report';
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

// Phase 9 §3 locked copy (D-01/D-03/D-04, UI-SPEC copywriting contract).
// Detector reasons render verbatim; these two fixed fallbacks fill only the
// null-selector and loading gaps per the UI-05 empty predicate.
const S3_EMPTY_COPY = 'Məlumat yoxdur';
const S3_NY_LINE = 'NY: Gözlənilir — v2.0-da ölçülmür.';

// SMT suppressed envelopes carry a machine reason; the owning sub-block shows
// it verbatim plus the locked tag (D-11).
function smtSuppressionReason(smt: { suppressed: true; reason: string }): string {
  return `${smt.reason} — SMT Gözlənilir.`;
}

// Live SMT prose: direction plus sweeper-leg plus window refs verbatim.
// Sweeper-leg (NQ/ES) detail lives here, never on canvas (D-07).
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

export function Report() {
  const lastUpdatedISO = useDashboard((s) => s.lastUpdatedISO);
  const scenario = useDashboard((s) => s.scenario);
  const selectPosition = useDashboard((s) => s.selectPosition);
  const selectRange4H = useDashboard((s) => s.selectRange4H);
  const selectBias = useDashboard((s) => s.selectBias);
  const selectDOL = useDashboard((s) => s.selectDOL);
  const selectRegime = useDashboard((s) => s.selectRegime);
  // Phase 9 §3 selectors: stable selector-function subscription with
  // derivation during render (selectLevels precedent — avoids useShallow
  // loops on fresh nested identities).
  const selectLiquidityPath = useDashboard((s) => s.selectLiquidityPath);
  const selectSMT = useDashboard((s) => s.selectSMT);
  const selectAMD = useDashboard((s) => s.selectAMD);
  const selectConfluence = useDashboard((s) => s.selectConfluence);
  // Phase 17 §§4-6 selectors: same stable-function subscription with
  // derivation during render (selectLevels precedent — avoids useShallow
  // loops on fresh nested identities). Math-free: panels print selector
  // prose only.
  const selectTrigger = useDashboard((s) => s.selectTrigger);
  const selectFatalFlaw = useDashboard((s) => s.selectFatalFlaw);
  const selectTicket = useDashboard((s) => s.selectTicket);

  const position = selectPosition();
  const range4H = selectRange4H();
  const biasOutput = selectBias();
  const dol = selectDOL();
  const regimeOutput = selectRegime();
  const liquidityPath = selectLiquidityPath();
  const smt = selectSMT();
  const amd = selectAMD();
  const tier = selectConfluence();
  const trigger = selectTrigger();
  const flaw = selectFatalFlaw();
  const ticket = selectTicket();

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
          // Phase 9 §3 live block (D-01 through D-04, D-09 through D-12):
          // conviction line plus three sub-blocks in fixed stable order with
          // per-block verbatim reasons, never a §3-level banner.
          if (section.index === 3) {
            const nqLeg = useDashboard.getState().nq;
            const nq1hLeg = useDashboard.getState().nq1h;
            const esLeg = useDashboard.getState().es;
            const liquidityReason =
              liquidityPath ?? nqLeg.lastError ?? S3_EMPTY_COPY;
            const smtReason =
              smt === null
                ? (esLeg.lastError ?? nqLeg.lastError ?? S3_EMPTY_COPY)
                : smt.suppressed
                  ? smtSuppressionReason(smt)
                  : smtLiveProse(smt);
            const amdReason = amd === null ? (nq1hLeg.lastError ?? S3_EMPTY_COPY) : amd.reason;
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
                ) : (
                  <div>
                    <div data-slot="s3-conviction" className="text-xs">
                      {CONVICTION_LABEL}
                      <span
                        className={
                          tier === 'yüksək inam'
                            ? 'text-xl font-semibold text-[var(--terminal-accent)]'
                            : 'text-xl font-semibold text-muted-foreground'
                        }
                      >
                        {tier}
                      </span>
                    </div>
                    <div data-slot="s3-liquidity-path">
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                        Likvidlik Yolu
                      </h4>
                      <p className="text-base">{liquidityReason}</p>
                    </div>
                    <div data-slot="s3-smt-status">
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                        SMT Statusu
                      </h4>
                      <p className="text-base">{smtReason}</p>
                      {smt !== null && !smt.suppressed && smt.direction === 'NO-SIGNAL' ? (
                        <p className="text-xs text-muted-foreground">SMT Gözlənilir.</p>
                      ) : null}
                    </div>
                    <div data-slot="s3-amd-timing">
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                        Sessiya AMD
                      </h4>
                      <p className="text-base">{amdReason}</p>
                      <div data-slot="s3-ny-line" className="text-xs text-muted-foreground opacity-45">
                        {S3_NY_LINE}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            );
          }
          // Phase 17 §§4-6 live blocks (TICK-04): copying the §3 branch shape —
          // leg lastError verbatim chain, lastUpdatedISO null skeleton versus
          // null-selector Məlumat yoxdur copy, data-slot report-section plus
          // per-block sub-slots mirroring the s3 idiom. Math-free: prints
          // selector prose only. Placed before the generic unavailable branch.
          if (section.index === 4) {
            const triggerLegError = useDashboard.getState().nq15m.lastError;
            const triggerReason = trigger !== null ? trigger.reason : (triggerLegError ?? S3_EMPTY_COPY);
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
                ) : trigger === null ? (
                  <p className="text-base font-semibold">{S3_EMPTY_COPY}</p>
                ) : (
                  <div data-slot="s4-trigger-protocol">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                      {`${trigger.verdict}${trigger.direction !== null ? ` · ${trigger.direction}` : ''}`}
                    </p>
                    <p className="text-base">{triggerReason}</p>
                  </div>
                )}
              </section>
            );
          }
          if (section.index === 5) {
            const ticketLegError = useDashboard.getState().nq.lastError;
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
                ) : ticket === null ? (
                  <p className="text-base font-semibold">{ticketLegError ?? S3_EMPTY_COPY}</p>
                ) : (
                  <div data-slot="s5-paper-ticket">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                      {`${ticket.verdict}${ticket.direction !== null ? ` · ${ticket.direction}` : ''}`}
                    </p>
                    <p className="text-base">{ticket.reason}</p>
                    {ticket.verdict === 'STAND_ASIDE' ? null : (
                      <div>
                        <p className="font-mono text-xl font-semibold tabular-nums">
                          {`Giriş ${ticket.entry === null ? '—' : ticket.entry.toFixed(2)} · Stop ${ticket.sl === null ? '—' : ticket.sl.toFixed(2)}`}
                        </p>
                        <p className="font-mono text-xs tabular-nums">
                          {`TP1 ${ticket.tp.tp1 === null ? '—' : ticket.tp.tp1.toFixed(2)} · TP2 ${ticket.tp.tp2 === null ? '—' : ticket.tp.tp2.toFixed(2)} · TP3 ${ticket.tp.tp3 === null ? '—' : ticket.tp.tp3.toFixed(2)} · R/R ${ticket.rr === null ? '—' : `1:${ticket.rr.toFixed(1)}`} · Ölçü ${ticket.sizeContracts === null ? '—' : ticket.sizeContracts} NQ`}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          }
          if (section.index === 6) {
            const flawLegError = useDashboard.getState().es.lastError;
            const flawReason = flaw !== null ? flaw.reason : (flawLegError ?? S3_EMPTY_COPY);
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
                ) : flaw === null ? (
                  <p className="text-base font-semibold">{flawReason}</p>
                ) : (
                  <div data-slot="s6-flaw-challenge">
                    <p className="text-base">{flaw.sentence}</p>
                    <p className="text-xs">{flaw.challenge}</p>
                  </div>
                )}
              </section>
            );
          }
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
                  <p className="text-xs" data-slot="s2-range-4h">
                    {range4H === null
                      ? '4H diapazon: Məlumat yoxdur'
                      : `4H diapazon: ${range4H.high} / ${range4H.low} (1H bloklardan)`}
                  </p>
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
