'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusStrip } from '@/components/dashboard/status-strip';
import { SentimentPanel } from '@/components/dashboard/sentiment-panel';
import { CalendarPanel } from '@/components/dashboard/calendar-panel';
import { Report } from '@/components/dashboard/report';
import { toast } from '@/components/ui/toast';
import { deriveStatus } from '@/src/lib/freshness';
import { useDashboard } from '@/src/lib/store';

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
  const selectRange = useDashboard((s) => s.selectRange);
  const selectDOL = useDashboard((s) => s.selectDOL);

  const range = selectRange();
  const dol = selectDOL();
  const forming = candles.length > 0 && candles[candles.length - 1].forming === true;
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

  // Single poll owner: one refresh on mount, then every 60s (matching the
  // proxy TTL) only while the tab is visible; refresh singleflights in-flight
  // polls so the guarded Yenilə path shares the same cadence.
  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    }, 60_000);
    return () => clearInterval(id);
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
        <Button onClick={() => void refresh()} disabled={inFlight} data-slot="refresh-button">
          {inFlight ? <RefreshCw aria-hidden="true" className="animate-spin" /> : <RefreshCw aria-hidden="true" />}
          Yenilə
        </Button>
      </header>

      <StatusStrip />

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
            <CardHeader>
              <CardTitle>CHART — NQ=F D1</CardTitle>
            </CardHeader>
            <CardContent>
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
