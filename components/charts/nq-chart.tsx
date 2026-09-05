'use client';

import { useEffect, useRef } from 'react';
import type { Candle } from '@/src/lib/ict/types';
import { mapCandlesToSeries, priceLineInputs } from '@/src/lib/chart-mapper';

export interface NqChartProps {
  candles: Candle[];
  eq: number;
  dolPrice: number;
  dolName: string;
  overlay: string;
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

export function NqChart({ candles, eq, dolPrice, dolName, overlay }: NqChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Unknown handles keep the module top free of heavy chart types; each use
  // site narrows through a minimal local structural type.
  const chartRef = useRef<{ remove: () => void } | null>(null);
  const seriesRef = useRef<unknown>(null);
  const eqLineRef = useRef<unknown>(null);
  const dolLineRef = useRef<unknown>(null);
  const propsRef = useRef({ candles, eq, dolPrice, dolName, overlay });
  propsRef.current = { candles, eq, dolPrice, dolName, overlay };

  // Create the chart once per container; lightweight-charts loads lazily so
  // the module top stays DOM free.
  useEffect(() => {
    let disposed = false;
    async function mount() {
      const el = containerRef.current;
      if (el === null) return;
      const { createChart, CandlestickSeries, LineStyle } = await import('lightweight-charts');
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
    }
    void mount();
    return () => {
      disposed = true;
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
  }, [candles, eq, dolPrice, dolName]);

  return (
    <div
      ref={containerRef}
      data-slot="nq-chart"
      data-overlay={overlay}
      className="min-h-[400px] w-full"
      style={{
        // Terminal palette tokens; canvas colors resolve the same variables
        // through getComputedStyle at mount time.
        backgroundColor: 'var(--terminal-canvas)',
        ['--terminal-up' as string]: 'var(--terminal-up)',
        ['--terminal-down' as string]: 'var(--terminal-down)',
      }}
    />
  );
}
