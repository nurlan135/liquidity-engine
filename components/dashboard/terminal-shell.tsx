'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusStrip } from '@/components/dashboard/status-strip';
import { SentimentPanel } from '@/components/dashboard/sentiment-panel';
import { CalendarPanel } from '@/components/dashboard/calendar-panel';
import { Report } from '@/components/dashboard/report';
import { ExecutionProtocol } from '@/components/dashboard/execution-protocol';
import { LiquidityMap } from '@/components/dashboard/liquidity-map';
import { Module1 } from '@/components/dashboard/module-1';
import { Module3 } from '@/components/dashboard/module-3';
import { Module4 } from '@/components/dashboard/module-4';
import { SmtRow } from '@/components/dashboard/smt-row';
import { FiringLogPanel } from '@/components/dashboard/firing-log-panel';
import { TicketPanel } from '@/components/dashboard/ticket-panel';
import { FatalFlaw } from '@/components/dashboard/fatal-flaw';
import { toast } from '@/components/ui/toast';
import { deriveStatus, formatStripAge } from '@/src/lib/freshness';
import { formatSessionLine } from '@/src/lib/session-line';
import { useShallow } from 'zustand/react/shallow';
import { useDashboard } from '@/src/lib/store';
import { resolveThinTier, thinBannerOrder, thinTierCopy } from '@/src/lib/thin-tier';

// Chart loads only on the client via the use client shell (never page.tsx).
const NqChart = dynamic(() => import('@/components/charts/nq-chart').then((mod) => mod.NqChart), {
  ssr: false,
  loading: () => <div data-slot="chart-skeleton" className="min-h-[400px] animate-pulse" />,
});

// Locked Azerbaijani poll-failure copy: toasts never surface raw upstream text.
const POLL_FAILURE_COPY =
  'Canlı məlumat əlçatan deyil — son keş göstərilir. Yenilə sıxın; problem davam edərsə terminal avtomatik yenidən cəhd edəcək.';

export function TerminalShell() {
  const candles = useDashboard((s) => s.candles);
  const lastUpdatedISO = useDashboard((s) => s.lastUpdatedISO);
  const stale = useDashboard((s) => s.stale);
  const inFlight = useDashboard((s) => s.inFlight);
  const lastError = useDashboard((s) => s.lastError);
  const refresh = useDashboard((s) => s.refresh);
  const startDualPoll = useDashboard((s) => s.startDualPoll);
  const stopDualPoll = useDashboard((s) => s.stopDualPoll);
  // D-13: coverage diagnostics ride in the data; the shell surfaces the
  // dev-only debug line from the store field. Hidden in production UI via
  // muted styling, always present in data.
  const coverage = useDashboard(useShallow((s) => s.coverage));
  // Derived-value subscriptions (StatusStrip useShallow precedent): re-render
  // on any input change (candles / contractHint / asOfBaku), not just on
  // selector-function identity. useShallow keeps the per-render fresh
  // objects from retriggering an update loop.
  const range = useDashboard(useShallow((s) => s.selectRange()));
  const dol = useDashboard(useShallow((s) => s.selectDOL()));
  const rollover = useDashboard(useShallow((s) => s.selectRollover()));
  // Levels carry nested OTE pocket objects, so a useShallow subscription
  // never settles (fresh pocket identity per call retriggers the update
  // loop). Subscribe to the stable selector function and derive during
  // render instead; the range/dol/rollover subscriptions above already
  // re-render on every selectLevels input change (candles/asOfBaku move
  // together in refresh), so the derived value never goes stale.
  const selectLevels = useDashboard((s) => s.selectLevels);
  const levels = selectLevels();
  // Phase 9 §3 overlay selectors: same stable-function derivation during
  // render. Asia extremes, Judas plus its containing D1 bar date, SMT plus
  // its windowEnd date, and overlay staleness flow into the NqChart props.
  // Bar-date mapping happens here at the caller so marker time always equals
  // a D1 candle date (T-09-03). Judas sweepTime is an epoch; the containing
  // bar is the latest D1 candle at or before the sweep instant. SMT
  // windowEnd is already a D1 date string.
  const selectAsia = useDashboard((s) => s.selectAsia);
  const selectJudas = useDashboard((s) => s.selectJudas);
  const selectSMT = useDashboard((s) => s.selectSMT);
  const selectTicketShell = useDashboard((s) => s.selectTicket);
  const nq1hStale = useDashboard((s) => s.nq1h.stale);
  const nq15mStale = useDashboard((s) => s.nq15m.stale);
  const esStale = useDashboard((s) => s.es.stale);
  const asia = selectAsia();
  const judas = selectJudas();
  const smt = selectSMT();
  // Phase 17 ticket-to-chart wiring (D-10): the same stable-function
  // derivation during render as the overlay selectors above. The shell fans
  // ticket truth out once — to the TicketPanel (via its own subscription)
  // and to the chart via the Plan 04 optional prop names below. Nulls on
  // STAND ASIDE or null ticket clear pins and lines via the
  // empty-marker-set plus unconditional-removal clearing paths.
  const ticket = selectTicketShell();
  const isTicketExecute =
    ticket !== null && (ticket.verdict === 'EXECUTE_LONG' || ticket.verdict === 'EXECUTE_SHORT');
  const ticketVerdict = ticket?.verdict ?? null;
  const ticketDirection = ticket?.direction ?? null;
  const ticketEntry = isTicketExecute ? (ticket?.entry ?? null) : null;
  const ticketSL = isTicketExecute ? (ticket?.sl ?? null) : null;
  const ticketTP1 = isTicketExecute ? (ticket?.tp.tp1 ?? null) : null;
  const ticketTP2 = isTicketExecute ? (ticket?.tp.tp2 ?? null) : null;
  const ticketTP3 = isTicketExecute ? (ticket?.tp.tp3 ?? null) : null;
  // Phase 20 pool-to-chart wiring (D-16/D-18/D-19/D-21): the same
  // stable-function derivation during render as the overlay selectors
  // above. Derive during render the full pool prop set from the single
  // selection return: nearest-2-per-side counting ranked ACTIVE pools only
  // (first two ACTIVE BSL plus first two ACTIVE SSL in selector return
  // order; equal-distance ties at the cut line resolve by return order —
  // the array arrives rank-ordered, and return order is the deterministic
  // stable tiebreak), swept pools collected separately as ghosts riding
  // outside the cap and never counted toward it. Statuses consume verbatim
  // with zero recomputed swept-ness; thin flags through (not nulled), stale
  // arrives as null so the chart clears via the unconditional-removal path.
  // No verdict gate and no bar-date loop — pools are D1-NQ geometry
  // attaching by price. Null selection fans out to all-null pool props so
  // no last-known pools survive a null return (D-14).
  const selectPoolsShell = useDashboard((s) => s.selectPools);
  const poolsSelection = selectPoolsShell();
  const poolActiveBsl =
    poolsSelection === null ? [] : poolsSelection.pools.filter((p) => p.side === 'BSL' && p.status === 'ACTIVE').slice(0, 2);
  const poolActiveSsl =
    poolsSelection === null ? [] : poolsSelection.pools.filter((p) => p.side === 'SSL' && p.status === 'ACTIVE').slice(0, 2);
  const poolGhostBsl =
    poolsSelection === null ? [] : poolsSelection.pools.filter((p) => p.side === 'BSL' && p.status === 'SWEPT');
  const poolGhostSsl =
    poolsSelection === null ? [] : poolsSelection.pools.filter((p) => p.side === 'SSL' && p.status === 'SWEPT');
  const poolBslPairs = poolActiveBsl.map((p) => ({ top: p.top, bottom: p.bottom }));
  const poolSslPairs = poolActiveSsl.map((p) => ({ top: p.top, bottom: p.bottom }));
  const poolBslGhosts = poolGhostBsl.map((p) => ({ top: p.top, bottom: p.bottom }));
  const poolSslGhosts = poolGhostSsl.map((p) => ({ top: p.top, bottom: p.bottom }));
  // Tracer pair backwards-compat: the scalar rank-1 BSL pair props keep the
  // Phase 01 contract — rank-1 is the first ACTIVE BSL in selector return
  // order (D-18); null when the selection is null or carries no ACTIVE BSL.
  const rank1Bsl = poolActiveBsl.length > 0 ? poolActiveBsl[0] : null;
  const poolBslTop = rank1Bsl?.top ?? null;
  const poolBslBottom = rank1Bsl?.bottom ?? null;
  const poolDegradedStale = false;
  const poolDegradedThin = poolsSelection?.degraded.thin ?? false;
  // fireBarDate: containing D1 bar for the ticket asOf epoch — the same
  // containing-bar loop as judasBarDate above, never judasBarDate itself
  // for the T pin (Pitfall 6). Null on STAND ASIDE so the T pin clears.
  let fireBarDate: string | null = null;
  if (isTicketExecute && ticket !== null && candles.length > 0) {
    let best: string | null = null;
    for (const c of candles) {
      const barEpoch = Math.floor(new Date(`${c.date}T00:00:00Z`).getTime() / 1000);
      if (Number.isFinite(barEpoch) && barEpoch <= ticket.asOf) {
        best = c.date;
      }
    }
    fireBarDate = best ?? candles[candles.length - 1].date;
  }
  const overlayStale = nq1hStale || nq15mStale || esStale;
  let judasBarDate: string | null = null;
  if (judas !== null && judas.sweepTime !== null && candles.length > 0) {
    let best: string | null = null;
    for (const c of candles) {
      const barEpoch = Math.floor(new Date(`${c.date}T00:00:00Z`).getTime() / 1000);
      if (Number.isFinite(barEpoch) && barEpoch <= judas.sweepTime) {
        best = c.date;
      }
    }
    judasBarDate = best ?? candles[candles.length - 1].date;
  }
  const smtBarDate =
    smt !== null && !smt.suppressed && smt.esWindow !== null ? smt.esWindow.end : null;
  // Header clocks tick locally every 10s (StatusStrip precedent); the poll
  // loop stays the single store writer — this state never touches the store.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  const forming = candles.length > 0 && candles[candles.length - 1].forming === true;
  // Thin-history honesty (Phase 13): tier derives during render from the
  // range + closed candles; a throw in derivation degrades silently to
  // no-banner + full-strength chart and never blanks candles.
  const thinResolution = resolveThinTier(candles, range);
  const thinTierValue = thinResolution?.tier ?? 'full';
  const thinClosedCount = thinResolution?.closedCount ?? 0;
  const showRolloverBanner =
    rollover !== null && (rollover.rolloverSuspect || rollover.proximityWarning !== null);
  // D-04 + skeleton guard: 1+ candles with a derived non-full tier and a
  // resolved envelope; zero candles / skeleton / null range render zero
  // banner DOM.
  const showThinBanner =
    lastUpdatedISO !== null &&
    candles.length >= 1 &&
    range !== null &&
    thinResolution !== null &&
    thinTierValue !== 'full';
  const thinBlock = showThinBanner ? (
    <div
      data-slot="thin-history-banner"
      role="status"
      data-tier={thinTierValue}
      data-closed-count={thinClosedCount}
      className="rounded px-3 py-2 font-mono text-[11px] tracking-widest text-muted-foreground"
    >
      {thinTierCopy(thinTierValue, thinClosedCount)}
    </div>
  ) : null;
  const rolloverBlock =
    showRolloverBanner && rollover !== null ? (
      <div data-slot="rollover-banner" role="status" className="rounded px-3 py-2 font-mono text-[11px] tracking-widest text-muted-foreground">
        {rollover.rolloverSuspect
          ? `ROLLOVER SUSPECT · ${rollover.contractHint} — range may span a contract roll; levels held on current extremes.`
          : `ROLLOVER WATCH · ${rollover.contractHint}`}
        {rollover.proximityWarning !== null ? <span>{` ${rollover.proximityWarning}`}</span> : null}
      </div>
    ) : null;
  // Chart overlay state derives from the same envelope truth as the strip:
  // weekend envelopes keep last closed candles with the closed ribbon.
  let chartStatus: 'live' | 'stale' | 'closed' = stale ? 'stale' : 'live';
  if (lastUpdatedISO !== null) {
    try {
      const derived = deriveStatus({ stale, lastUpdatedISO }, new Date()).state;
      chartStatus = derived === 'CLOSED' ? 'closed' : derived === 'STALE' ? 'stale' : 'live';
    } catch {
      chartStatus = 'stale';
    }
  }
  // Header freshness copy derives from the same envelope truth as the strip
  // (D-06): deriveStatus + formatStripAge against the shared 10s now tick —
  // never a second interval, never bespoke staleness math. Falls back to the
  // strip's loading/stale copy when the envelope is absent or unparseable.
  let headerCopy: string;
  let headerFreshness: 'live' | 'stale' | 'closed' | 'loading';
  if (lastUpdatedISO === null) {
    headerCopy = 'Yüklənir…';
    headerFreshness = 'loading';
  } else {
    try {
      const { state, ageSec } = deriveStatus({ stale, lastUpdatedISO }, now);
      headerCopy = formatStripAge(state, ageSec);
      headerFreshness = state.toLowerCase() as 'live' | 'stale' | 'closed';
    } catch {
      headerCopy = 'Canlı məlumat əlçatan deyil — son keş göstərilir.';
      headerFreshness = 'stale';
    }
  }

  // Dual poll owner (D-01/D-03): startDualPoll on mount, stopDualPoll on
  // unmount. Mount still owns the first NQ poll; the staggered always-on
  // timers replace the single visibility-gated 60s loop. The manual Yenilə
  // button stays wired to the NQ refresh path.
  useEffect(() => {
    startDualPoll();
    return () => stopDualPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One coalesced toast per error value: concurrent poll failures never stack.
  const toastedError = useRef<string | null>(null);
  useEffect(() => {
    if (lastError === null) {
      toastedError.current = null;
      return;
    }
    if (toastedError.current === lastError) return;
    toastedError.current = lastError;
    toast.add({ title: 'Xəta', description: POLL_FAILURE_COPY, type: 'error' });
  }, [lastError]);

  return (
    <div data-slot="terminal-shell" className="flex min-h-full flex-col gap-3 p-4">
      <header data-slot="terminal-header" className="flex items-center justify-between rounded-xl px-4 py-3">
        <span className="font-mono text-sm font-semibold tracking-widest">LIQUIDITY ENGINE // NQ=F</span>
        {/* Clock text differs between SSR and hydration by design (live
            operator clock) — silence the expected mismatch so React does not
            log a recoverable #418 on every load. */}
        <span data-slot="session-line" suppressHydrationWarning className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {formatSessionLine(now)}
        </span>
        <Button onClick={() => void refresh()} disabled={inFlight} data-slot="refresh-button">
          {inFlight ? <RefreshCw aria-hidden="true" className="animate-spin" /> : <RefreshCw aria-hidden="true" />}
          Yenilə
        </Button>
      </header>

      <StatusStrip />

      {/* Phase 17 PAPER banner (TICK-03/D-06): terminal-top non-dismissible
          KAĞIZ PAPER strip rendered on every frame, independent of envelope
          truth — placed above StatusStrip outside the scrolled grid so it
          stays visible when the ticket panel scrolls away. */}
      <div
        data-slot="paper-banner"
        role="status"
        className="rounded px-4 py-2 font-mono text-[11px] tracking-widest"
      >
        KAĞIZ / PAPER
      </div>

      <p data-slot="join-coverage" className="px-4 font-mono text-[11px] text-muted-foreground tabular-nums">
        NQ {coverage.nq} / ES {coverage.es} / joined {coverage.joined}
      </p>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_1fr_320px]">
        <div className="overflow-auto">
          <SentimentPanel />
          <LiquidityMap />
          <Module1 />
          <Module3 />
          <Module4 />
          <SmtRow />
          <FiringLogPanel />
        </div>

        <div className="overflow-auto">
          <Card data-slot="panel-center">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle>CHART — NQ=F D1</CardTitle>
              <span
                data-slot="chart-freshness"
                data-freshness={headerFreshness}
                className="font-mono text-[11px] tracking-widest text-muted-foreground tabular-nums"
              >
                {headerFreshness === 'live' ? (
                  <span data-slot="live-dot" aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--terminal-accent)]" />
                ) : null}
                {headerCopy}
              </span>
            </CardHeader>
            <CardContent>
              {(() => {
                const order = thinBannerOrder(showThinBanner, showRolloverBanner);
                const nodes = order.map((entry) =>
                  entry === 'thin' ? (
                    <Fragment key="thin">{thinBlock}</Fragment>
                  ) : (
                    <Fragment key="rollover">{rolloverBlock}</Fragment>
                  ),
                );
                if (order.length === 2) {
                  return <div className="flex flex-col gap-2">{nodes}</div>;
                }
                return <Fragment>{nodes}</Fragment>;
              })()}
              {lastUpdatedISO === null ? (
                <div data-slot="chart-skeleton" className="min-h-[400px] animate-pulse" />
              ) : candles.length === 0 ? (
                <div data-slot="chart-empty">
                  <p className="text-base font-semibold">Məlumat yoxdur</p>
                  <p className="text-xs">Hələlik şam məlumatı əlçatan deyil. Yenilə düyməsini sıxın və ya 60 saniyə gözləyin.</p>
                  <Button onClick={() => void refresh()} disabled={inFlight}>
                    Yenilə
                  </Button>
                </div>
              ) : range !== null && dol !== null ? (
                <NqChart
                  candles={candles}
                  rangeHigh={range.high}
                  rangeLow={range.low}
                  eq={range.eq}
                  dolPrice={dol.price}
                  dolName={dol.name}
                  status={chartStatus}
                  forming={forming}
                  levels={levels}
                  asiaHigh={asia?.high ?? null}
                  asiaLow={asia?.low ?? null}
                  judas={judas}
                  judasBarDate={judasBarDate}
                  smt={smt}
                  smtBarDate={smtBarDate}
                  overlayStale={overlayStale}
                  thinTier={thinTierValue}
                  ticketVerdict={ticketVerdict}
                  ticketDirection={ticketDirection}
                  ticketEntry={ticketEntry}
                  ticketSL={ticketSL}
                  ticketTP1={ticketTP1}
                  ticketTP2={ticketTP2}
                  ticketTP3={ticketTP3}
                  fireBarDate={fireBarDate}
                  poolBslTop={poolBslTop}
                  poolBslBottom={poolBslBottom}
                  poolBslPairs={poolBslPairs}
                  poolSslPairs={poolSslPairs}
                  poolBslGhosts={poolBslGhosts}
                  poolSslGhosts={poolSslGhosts}
                  poolDegradedStale={poolDegradedStale}
                  poolDegradedThin={poolDegradedThin}
                />
              ) : (
                <div data-slot="chart-empty">
                  <p className="text-base font-semibold">Məlumat yoxdur</p>
                  <p className="text-xs">Hələlik şam məlumatı əlçatan deyil. Yenilə düyməsini sıxın və ya 60 saniyə gözləyin.</p>
                  <Button onClick={() => void refresh()} disabled={inFlight}>
                    Yenilə
                  </Button>
                </div>
              )}
              {lastError !== null ? <p data-slot="chart-error" className="text-xs">{POLL_FAILURE_COPY}</p> : null}
            </CardContent>
          </Card>

          {/* Phase 17 panel swap (TICK-04/D-04): the locked UNAVAILABLE
              execution-protocol card is replaced one-to-one by the live
              ExecutionProtocol panel, keeping the exact data-slot. The
              locked UNAVAILABLE chip stays untouched elsewhere. */}
          <ExecutionProtocol />

          <Report />
        </div>

        <div className="overflow-auto">
          {/* Phase 17 panel swap (TICK-04/D-04): the locked UNAVAILABLE
              ticket card is replaced one-to-one by the live TicketPanel,
              keeping the exact data-slot. */}
          <TicketPanel />
          <CalendarPanel />
          {/* Phase 17 panel swap (TICK-04/D-04): the locked UNAVAILABLE
              fatal-flaw card is replaced one-to-one by the live FatalFlaw
              panel, keeping the exact data-slot. */}
          <FatalFlaw />
        </div>
      </div>
    </div>
  );
}
