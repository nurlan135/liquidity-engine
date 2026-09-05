'use client';

import dynamic from 'next/dynamic';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusStrip } from '@/components/dashboard/status-strip';
import { useDashboard } from '@/src/lib/store';

// Chart loads only on the client via the use client shell (never page.tsx).
const NqChart = dynamic(() => import('@/components/charts/nq-chart').then((mod) => mod.NqChart), {
  ssr: false,
  loading: () => <div data-slot="chart-skeleton" className="min-h-[400px] animate-pulse" />,
});

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

  return (
    <div data-slot="terminal-shell" className="flex min-h-full flex-col gap-3 p-4">
      <header data-slot="terminal-header" className="flex items-center justify-between rounded-xl px-4 py-3">
        <span className="font-mono text-sm font-semibold tracking-widest">LIQUIDITY ENGINE // NQ=F</span>
        <Button onClick={() => void refresh()} disabled={inFlight} data-slot="refresh-button">
          <RefreshCw aria-hidden="true" />
          Yenilə
        </Button>
      </header>

      <StatusStrip />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_1fr_320px]">
        <Card data-slot="panel-left">
          <CardHeader>
            <CardTitle>Likvidlik</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs">Ssenari: izdihamlı-long</p>
          </CardContent>
        </Card>

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
              <div data-slot="chart-block">
                {forming ? <span data-slot="forming-chip">Formalaşan şam</span> : null}
                <NqChart
                  candles={candles}
                  eq={range.eq}
                  dolPrice={dol.price}
                  dolName={dol.name}
                  overlay={stale ? 'stale' : 'live'}
                />
              </div>
            ) : (
              <div data-slot="chart-empty">
                <p className="text-base font-semibold">Məlumat yoxdur</p>
                <p className="text-xs">Hələlik şam məlumatı əlçatan deyil. Yenilə düyməsini sıxın və ya 60 saniyə gözləyin.</p>
                <Button onClick={() => void refresh()} disabled={inFlight}>
                  Yenilə
                </Button>
              </div>
            )}
            {lastError !== null ? <p data-slot="chart-error" className="text-xs">{lastError}</p> : null}
          </CardContent>
        </Card>

        <Card data-slot="panel-right">
          <CardHeader>
            <CardTitle>Təqvim</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs">Yüksək təsirli xəbər yoxdur</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
