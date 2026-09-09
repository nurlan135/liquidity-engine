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
  const nq1hStale = useDashboard((s) => s.nq1h.stale);
  const nq15mStale = useDashboard((s) => s.nq15m.stale);
  const esStale = useDashboard((s) => s.es.stale);
  const asia = selectAsia();
  const judas = selectJudas();
  const smt = selectSMT();
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

      <p data-slot="join-coverage" className="px-4 font-mono text-[11px] text-muted-foreground tabular-nums">
        NQ {coverage.nq} / ES {coverage.es} / joined {coverage.joined}
      </p>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_1fr_320px]">
        <div className="overflow-auto">
          <SentimentPanel />
          <Card data-slot="liquidity-map" className="pointer-events-none relative opacity-45">
            <span className="absolute top-0 right-0 text-[11px] font-semibold uppercase tracking-[0.1em]">
              UNAVAILABLE
            </span>
            <CardHeader>
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Likvidlik Xəritəsi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs">BSL/SSL xəritəsi əlçatan deyil.</p>
            </CardContent>
          </Card>
          <Card data-slot="module-1" className="pointer-events-none relative opacity-45">
            <span className="absolute top-0 right-0 text-[11px] font-semibold uppercase tracking-[0.1em]">
              UNAVAILABLE
            </span>
            <CardHeader>
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Modul 1</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs">Sentiment mühəndisliyi paneli əlçatan deyil.</p>
            </CardContent>
          </Card>
          <Card data-slot="module-3" className="pointer-events-none relative opacity-45">
            <span className="absolute top-0 right-0 text-[11px] font-semibold uppercase tracking-[0.1em]">
              UNAVAILABLE
            </span>
            <CardHeader>
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Modul 3</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs">SMT ardıcıllığı paneli əlçatan deyil.</p>
            </CardContent>
          </Card>
          <Card data-slot="module-4" className="pointer-events-none relative opacity-45">
            <span className="absolute top-0 right-0 text-[11px] font-semibold uppercase tracking-[0.1em]">
              UNAVAILABLE
            </span>
            <CardHeader>
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Modul 4</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs">İcra protokolu paneli əlçatan deyil.</p>
            </CardContent>
          </Card>
          <Card data-slot="smt-row" className="pointer-events-none relative opacity-45">
            <span className="absolute top-0 right-0 text-[11px] font-semibold uppercase tracking-[0.1em]">
              UNAVAILABLE
            </span>
            <CardHeader>
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">SMT</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs">Kross-market SMT siqnalı əlçatan deyil.</p>
            </CardContent>
          </Card>
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

          <Card data-slot="execution-protocol" className="pointer-events-none relative opacity-45">
            <span className="absolute top-0 right-0 text-[11px] font-semibold uppercase tracking-[0.1em]">
              UNAVAILABLE
            </span>
            <CardHeader>
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">İcra Protokolu</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs">WHY NOW icra protokolu əlçatan deyil.</p>
            </CardContent>
          </Card>

          <Report />
        </div>

        <div className="overflow-auto">
          <Card data-slot="ticket" className="pointer-events-none relative opacity-45">
            <span className="absolute top-0 right-0 text-[11px] font-semibold uppercase tracking-[0.1em]">
              UNAVAILABLE
            </span>
            <CardHeader>
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Əmr Bileti</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs">İnstitusional bilet əlçatan deyil.</p>
            </CardContent>
          </Card>
          <CalendarPanel />
          <Card data-slot="fatal-flaw" className="pointer-events-none relative opacity-45">
            <span className="absolute top-0 right-0 text-[11px] font-semibold uppercase tracking-[0.1em]">
              UNAVAILABLE
            </span>
            <CardHeader>
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em]">Fatal Flaw</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs">Fatal flaw yoxlanışı əlçatan deyil.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
