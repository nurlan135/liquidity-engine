'use client';

import { useEffect, useRef } from 'react';
import type { Candle } from '@/src/lib/ict/types';
import { mapCandlesToSeries, priceLineInputs } from '@/src/lib/chart-mapper';
import { zoneBands } from '@/src/lib/zone-bands';
import type { ZoneFillPrimitive } from '@/components/charts/zone-primitive';

export type NqChartStatus = 'live' | 'stale' | 'closed';

export interface NqChartProps {
  candles: Candle[];
  rangeHigh: number;
  rangeLow: number;
  eq: number;
  dolPrice: number;
  dolName: string;
  status: NqChartStatus;
  forming: boolean;
}

// Chart CSS variable names (values live in app/globals.css under .dark).
const VAR_UP = '--terminal-up';
const VAR_DOWN = '--terminal-down';
const VAR_ACCENT = '--terminal-accent';

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value === '' ? fallback : value;
}

export function NqChart({ candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, forming }: NqChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Unknown handles keep the module top free of heavy chart types; each use
  // site narrows through a minimal local structural type.
  const chartRef = useRef<{ remove: () => void } | null>(null);
  const seriesRef = useRef<unknown>(null);
  const eqLineRef = useRef<unknown>(null);
  const dolLineRef = useRef<unknown>(null);
  const zoneRef = useRef<ZoneFillPrimitive | null>(null);
  const propsRef = useRef({ candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, forming });
  propsRef.current = { candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, forming };

  // Create the chart once per container; lightweight-charts loads lazily so
  // the module top stays DOM free.
  useEffect(() => {
    let disposed = false;
    async function mount() {
      const el = containerRef.current;
      if (el === null) return;
      const { createChart, CandlestickSeries, LineStyle } = await import('lightweight-charts');
      const { attachZoneFill } = await import('@/components/charts/zone-primitive');
      if (disposed || containerRef.current === null) return;
      const up = readVar(VAR_UP, '#00FF88');
      const down = readVar(VAR_DOWN, '#FF00FF');
      const accent = readVar(VAR_ACCENT, '#00D9FF');
      const chart = createChart(el, {
        layout: { background: { color: 'transparent' }, textColor: '#71717A' },
      });
      const series = chart.addSeries(CandlestickSeries, {
        upColor: up,
        downColor: down,
        borderVisible: false,
        wickUpColor: up,
        wickDownColor: down,
      });
      chartRef.current = chart;
      seriesRef.current = series;
      // Push the current props through once mounted.
      const props = propsRef.current;
      const typed = series as {
        setData: (data: { time: string; open: number; high: number; low: number; close: number }[]) => void;
        createPriceLine: (opts: { price: number; color: string; lineWidth: number; lineStyle: unknown; title: string }) => unknown;
      };
      typed.setData(mapCandlesToSeries(props.candles));
      const inputs = priceLineInputs(props.eq, props.dolPrice);
      eqLineRef.current = typed.createPriceLine({
        price: inputs.eq,
        color: accent,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'EQ',
      });
      dolLineRef.current = typed.createPriceLine({
        price: inputs.dol,
        color: accent,
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        title: props.dolName,
      });
      // Attach the zone fill once; the getter always reads the latest props so
      // pan and zoom recompute from live scale coordinates on every draw.
      zoneRef.current = attachZoneFill(
        series as {
          attachPrimitive: (primitive: ZoneFillPrimitive) => void;
        },
        () => {
          const latest = propsRef.current;
          try {
            return zoneBands({
              high: latest.rangeHigh,
              low: latest.rangeLow,
              eq: latest.eq,
              window: 0,
              asOf: '',
              thinHistory: false,
            });
          } catch {
            return null;
          }
        },
      );
      zoneRef.current.opacityScale = props.status === 'stale' ? 0.5 : 1;
      zoneRef.current.updateBands();
    }
    void mount();
    return () => {
      disposed = true;
      void (async () => {
        const { detachZoneFill } = await import('@/components/charts/zone-primitive');
        const series = seriesRef.current as {
          detachPrimitive: (primitive: ZoneFillPrimitive) => void;
        } | null;
        if (series !== null && zoneRef.current !== null) {
          detachZoneFill(series, zoneRef.current);
        }
        zoneRef.current = null;
      })();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
      eqLineRef.current = null;
      dolLineRef.current = null;
    };
  }, []);

  // Push data and price-lines when inputs change; remove old lines first.
  useEffect(() => {
    const series = seriesRef.current as {
      setData: (data: { time: string; open: number; high: number; low: number; close: number }[]) => void;
    } | null;
    if (series === null) return;
    series.setData(mapCandlesToSeries(candles));
    // Re-create price-lines lazily to keep the module top DOM free.
    void (async () => {
      const { LineStyle } = await import('lightweight-charts');
      const live = seriesRef.current as {
        createPriceLine: (opts: { price: number; color: string; lineWidth: number; lineStyle: unknown; title: string }) => unknown;
        removePriceLine: (line: unknown) => void;
      } | null;
      if (live === null) return;
      if (eqLineRef.current !== null) live.removePriceLine(eqLineRef.current);
      if (dolLineRef.current !== null) live.removePriceLine(dolLineRef.current);
      const accent = readVar(VAR_ACCENT, '#00D9FF');
      const inputs = priceLineInputs(eq, dolPrice);
      eqLineRef.current = live.createPriceLine({
        price: inputs.eq,
        color: accent,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'EQ',
      });
      dolLineRef.current = live.createPriceLine({
        price: inputs.dol,
        color: accent,
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        title: dolName,
      });
    })();
    // Recompute zone geometry on range change; stale desaturates fills.
    if (zoneRef.current !== null) {
      zoneRef.current.opacityScale = status === 'stale' ? 0.5 : 1;
      zoneRef.current.updateBands();
    }
  }, [candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status]);

  const latest = candles.length > 0 ? candles[candles.length - 1] : null;

  return (
    <div data-slot="chart-block" data-overlay={status} className="relative min-h-[400px] w-full">
      <div
        ref={containerRef}
        data-slot="nq-chart"
        className="min-h-[400px] w-full"
        style={{
          // Terminal palette tokens; canvas colors resolve the same variables
          // through getComputedStyle at mount time.
          backgroundColor: 'var(--terminal-canvas)',
          ['--terminal-up' as string]: 'var(--terminal-up)',
          ['--terminal-down' as string]: 'var(--terminal-down)',
        }}
      />
      {status === 'stale' ? (
        <div data-slot="stale-badge" className="absolute top-2 right-2 rounded bg-[var(--terminal-stale-badge)] px-2 py-1 font-mono text-[11px] font-semibold tracking-widest text-muted-foreground">
          STALE
        </div>
      ) : null}
      {status === 'closed' ? (
        <div data-slot="closed-ribbon" className="absolute inset-x-0 top-2 flex justify-center">
          <span className="rounded bg-[var(--terminal-closed-ribbon)] px-3 py-1 font-mono text-[11px] font-semibold tracking-widest text-muted-foreground">
            MARKET CLOSED
          </span>
        </div>
      ) : null}
      {forming && latest !== null ? (
        <div data-slot="forming-row" className="flex items-center justify-between px-1 py-2 text-xs">
          <span className="font-mono tabular-nums">{latest.close}</span>
          <sup data-slot="forming-chip" className="text-[11px] text-muted-foreground">
            Formalaşan şam
          </sup>
        </div>
      ) : null}
      {candles.length === 0 ? (
        <div data-slot="chart-empty" className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <p className="text-base font-semibold">Məlumat yoxdur</p>
          <p className="text-xs text-muted-foreground">Hələlik şam məlumatı əlçatan deyil.</p>
        </div>
      ) : null}
    </div>
  );
}
