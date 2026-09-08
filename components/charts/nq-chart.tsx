'use client';

import { useEffect, useRef } from 'react';import type { Candle } from '@/src/lib/ict/types';
import type { LevelsOutput } from '@/src/lib/ict/levels';
import type { JudasOutput } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
import { asiaLineInputs, levelLineInputs, mapCandlesToSeries, priceLineInputs } from '@/src/lib/chart-mapper';
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
  levels?: LevelsOutput | null;
  // Phase 9 overlays (D-05 through D-08): Asia extremes plus the Judas and
  // SMT detector outputs with their containing D1 bar dates, mapped at the
  // caller so marker time always equals a D1 candle date. Null means no
  // overlay input — the chart renders clean candles and never blocks.
  asiaHigh?: number | null;
  asiaLow?: number | null;
  judas?: JudasOutput | null;
  judasBarDate?: string | null;
  smt?: SmtOutput | null;
  smtBarDate?: string | null;
  overlayStale?: boolean;
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

// Phase 9 overlay marker row (lightweight-charts v5 plugin form): at most one
// pin per signal per bar per the UI-06 ordering predicate — Judas first, then
// SMT. Sweeper-leg detail lives in §3 prose, never on canvas (D-07).
interface OverlayMarker {
  time: string;
  position: 'aboveBar' | 'belowBar';
  shape: 'circle' | 'arrowUp' | 'arrowDown';
  color: string;
  text: string;
}

// Stale overlay color: muted gray matching the chart textColor (D-08).
const MUTED_GRAY = '#71717A';

// Build the marker array from resolved detector outputs: Judas first, then
// SMT. Null, unresolved, NO-SIGNAL, or suppressed inputs contribute nothing;
// empty input returns [] so the caller clears via an empty marker set.
function buildOverlayMarkers(
  judas: JudasOutput | null | undefined,
  judasBarDate: string | null | undefined,
  smt: SmtOutput | null | undefined,
  smtBarDate: string | null | undefined,
  overlayStale: boolean,
  accent: string,
): OverlayMarker[] {
  const markers: OverlayMarker[] = [];
  const tone = overlayStale ? MUTED_GRAY : accent;
  if (judas !== null && judas !== undefined && judasBarDate !== null && judasBarDate !== undefined) {
    if (judas.sweepSide === 'HIGH' || judas.sweepSide === 'LOW') {
      const confirmed = judas.confirmed === true;
      const candidate = judas.candidate === true && !confirmed;
      if (confirmed || candidate) {
        markers.push({
          time: judasBarDate,
          position: judas.sweepSide === 'HIGH' ? 'aboveBar' : 'belowBar',
          shape: 'circle',
          // Hollow-split candidate renders hollow-contrast: transparent fill
          // is unavailable on the marker shape, so the tone dulls to muted
          // gray while confirmed holds solid accent.
          color: confirmed ? tone : MUTED_GRAY,
          text: confirmed ? 'J' : 'J?',
        });
      }
    }
  }
  if (smt !== null && smt !== undefined && smtBarDate !== null && smtBarDate !== undefined) {
    if (!smt.suppressed && (smt.direction === 'BULLISH' || smt.direction === 'BEARISH')) {
      markers.push({
        time: smtBarDate,
        position: smt.direction === 'BULLISH' ? 'belowBar' : 'aboveBar',
        shape: smt.direction === 'BULLISH' ? 'arrowUp' : 'arrowDown',
        color: tone,
        text: 'S',
      });
    }
  }
  return markers;
}

export function NqChart({ candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, forming, levels = null, asiaHigh = null, asiaLow = null, judas = null, judasBarDate = null, smt = null, smtBarDate = null, overlayStale = false }: NqChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Unknown handles keep the module top free of heavy chart types; each use
  // site narrows through a minimal local structural type.
  const chartRef = useRef<{ remove: () => void } | null>(null);
  const seriesRef = useRef<unknown>(null);
  const eqLineRef = useRef<unknown>(null);
  const dolLineRef = useRef<unknown>(null);
  const q1LineRef = useRef<unknown>(null);
  const q3LineRef = useRef<unknown>(null);
  const oteBullLineRef = useRef<unknown>(null);
  const oteBearLineRef = useRef<unknown>(null);
  // Phase 9 Asia line pair refs (D-05): remove-then-create like EQ/DOL.
  const asiaHighLineRef = useRef<unknown>(null);
  const asiaLowLineRef = useRef<unknown>(null);
  // Phase 9 series-markers plugin handle (v5 createSeriesMarkers form only).
  const markersPluginRef = useRef<unknown>(null);
  const zoneRef = useRef<ZoneFillPrimitive | null>(null);
  const propsRef = useRef({ candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, forming, levels, asiaHigh, asiaLow, judas, judasBarDate, smt, smtBarDate, overlayStale });
  // Sync the latest props outside render so the zone-fill getter reads live
  // values without violating the react-hooks/refs render-phase rule.
  useEffect(() => {
    propsRef.current = { candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, forming, levels, asiaHigh, asiaLow, judas, judasBarDate, smt, smtBarDate, overlayStale };
  });

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
        autoSize: true,
        layout: { background: { color: 'transparent' }, textColor: '#71717A' },
        timeScale: { lockVisibleTimeRangeOnResize: true },
      });
      // Fallback when ResizeObserver is absent: autoSize stays inactive, so
      // size the chart once from the live container box (T-11-01 zero-guard).
      if (!chart.autoSizeActive()) {
        const fallbackWidth = el.clientWidth;
        const fallbackHeight = el.clientHeight;
        if (fallbackWidth > 0 && fallbackHeight > 0) {
          chart.resize(fallbackWidth, fallbackHeight);
        }
      }
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
      // Asia-H/Asia-L pair (D-05): dashed accent lines via the finite-guarded
      // asiaLineInputs — a guard throw or null props leaves both refs null so
      // no lines render and the chart never blocks. Stale legs desaturate to
      // muted gray while persisting per D-08.
      if (props.asiaHigh !== null && props.asiaHigh !== undefined && props.asiaLow !== null && props.asiaLow !== undefined) {
        try {
          const asiaInputs = asiaLineInputs(props.asiaHigh, props.asiaLow);
          const asiaColor = props.overlayStale ? MUTED_GRAY : accent;
          asiaHighLineRef.current = typed.createPriceLine({
            price: asiaInputs.asiaHigh,
            color: asiaColor,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'Asia-H',
          });
          asiaLowLineRef.current = typed.createPriceLine({
            price: asiaInputs.asiaLow,
            color: asiaColor,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'Asia-L',
          });
        } catch {
          asiaHighLineRef.current = null;
          asiaLowLineRef.current = null;
        }
      }
      // Overlay markers via the v5 plugin form (D-06/D-07): Judas first, then
      // SMT; empty input sets an empty array so candles render clean. Stale
      // persists desaturated with the STALE badge, never cleared (D-08).
      try {
        const { createSeriesMarkers } = await import('lightweight-charts');
        const plugin = (
          createSeriesMarkers as (
            series: unknown,
            markers: OverlayMarker[],
          ) => { setMarkers: (markers: OverlayMarker[]) => void }
        )(series, buildOverlayMarkers(props.judas, props.judasBarDate, props.smt, props.smtBarDate, props.overlayStale === true, accent));
        markersPluginRef.current = plugin;
      } catch {
        markersPluginRef.current = null;
      }
      // Quadrant/OTE lines annotate the proven selector path; null levels (or
      // a guard throw) render no new lines and never block the chart.
      if (props.levels !== null && props.levels !== undefined) {
        try {
          const levelInputs = levelLineInputs(props.levels);
          q1LineRef.current = typed.createPriceLine({
            price: levelInputs.q1,
            color: accent,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'Q1 0.25',
          });
          q3LineRef.current = typed.createPriceLine({
            price: levelInputs.q3,
            color: accent,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'Q3 0.75',
          });
          oteBullLineRef.current = typed.createPriceLine({
            price: levelInputs.oteBull,
            color: accent,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'OTE-B 0.62-0.79',
          });
          oteBearLineRef.current = typed.createPriceLine({
            price: levelInputs.oteBear,
            color: accent,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'OTE-S 0.62-0.79',
          });
        } catch {
          q1LineRef.current = null;
          q3LineRef.current = null;
          oteBullLineRef.current = null;
          oteBearLineRef.current = null;
        }
      }
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
      q1LineRef.current = null;
      q3LineRef.current = null;
      oteBullLineRef.current = null;
      oteBearLineRef.current = null;
      asiaHighLineRef.current = null;
      asiaLowLineRef.current = null;
      markersPluginRef.current = null;
    };
  }, []);

  // Push data and price-lines when inputs change; remove old lines first.
  useEffect(() => {
    const series = seriesRef.current as {
      setData: (data: { time: string; open: number; high: number; low: number; close: number }[]) => void;
    } | null;
    if (series === null || candles.length === 0) return;
    series.setData(mapCandlesToSeries(candles));
    // Re-create price-lines lazily to keep the module top DOM free.
    void (async () => {
      const { LineStyle, createSeriesMarkers } = await import('lightweight-charts');
      const live = seriesRef.current as {
        createPriceLine: (opts: { price: number; color: string; lineWidth: number; lineStyle: unknown; title: string }) => unknown;
        removePriceLine: (line: unknown) => void;
      } | null;
      if (live === null) return;
      if (eqLineRef.current !== null) live.removePriceLine(eqLineRef.current);
      if (dolLineRef.current !== null) live.removePriceLine(dolLineRef.current);
      if (q1LineRef.current !== null) live.removePriceLine(q1LineRef.current);
      if (q3LineRef.current !== null) live.removePriceLine(q3LineRef.current);
      if (oteBullLineRef.current !== null) live.removePriceLine(oteBullLineRef.current);
      if (oteBearLineRef.current !== null) live.removePriceLine(oteBearLineRef.current);
      if (asiaHighLineRef.current !== null) live.removePriceLine(asiaHighLineRef.current);
      if (asiaLowLineRef.current !== null) live.removePriceLine(asiaLowLineRef.current);
      q1LineRef.current = null;
      q3LineRef.current = null;
      oteBullLineRef.current = null;
      oteBearLineRef.current = null;
      asiaHighLineRef.current = null;
      asiaLowLineRef.current = null;
      const accent = readVar(VAR_ACCENT, '#00D9FF');
      const overlayTone = overlayStale ? MUTED_GRAY : accent;
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
      if (levels !== null && levels !== undefined) {
        try {
          const levelInputs = levelLineInputs(levels);
          q1LineRef.current = live.createPriceLine({
            price: levelInputs.q1,
            color: accent,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'Q1 0.25',
          });
          q3LineRef.current = live.createPriceLine({
            price: levelInputs.q3,
            color: accent,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'Q3 0.75',
          });
          oteBullLineRef.current = live.createPriceLine({
            price: levelInputs.oteBull,
            color: accent,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'OTE-B 0.62-0.79',
          });
          oteBearLineRef.current = live.createPriceLine({
            price: levelInputs.oteBear,
            color: accent,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'OTE-S 0.62-0.79',
          });
        } catch {
          q1LineRef.current = null;
          q3LineRef.current = null;
          oteBullLineRef.current = null;
          oteBearLineRef.current = null;
        }
      }
      // Asia pair follows the same remove-then-create cycle: guard-throw or
      // null props render no lines and never block the chart.
      if (asiaHigh !== null && asiaHigh !== undefined && asiaLow !== null && asiaLow !== undefined) {
        try {
          const asiaInputs = asiaLineInputs(asiaHigh, asiaLow);
          asiaHighLineRef.current = live.createPriceLine({
            price: asiaInputs.asiaHigh,
            color: overlayTone,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'Asia-H',
          });
          asiaLowLineRef.current = live.createPriceLine({
            price: asiaInputs.asiaLow,
            color: overlayTone,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'Asia-L',
          });
        } catch {
          asiaHighLineRef.current = null;
          asiaLowLineRef.current = null;
        }
      }
      // Marker refresh through the v5 plugin only (never the v4 series-dot
      // form): rebuild on every input change, clear via the empty array.
      try {
        const next = buildOverlayMarkers(judas, judasBarDate, smt, smtBarDate, overlayStale, accent);
        const plugin = markersPluginRef.current as {
          setMarkers: (markers: OverlayMarker[]) => void;
        } | null;
        if (plugin !== null) {
          plugin.setMarkers(next);
        } else {
          const liveSeries = seriesRef.current;
          if (liveSeries !== null) {
            markersPluginRef.current = (
              createSeriesMarkers as (
                series: unknown,
                markers: OverlayMarker[],
              ) => { setMarkers: (markers: OverlayMarker[]) => void }
            )(liveSeries, next);
          }
        }
      } catch {
        // Marker failures never block candles or price lines.
      }
    })();
    // Recompute zone geometry on range change; stale desaturates fills.
    if (zoneRef.current !== null) {
      zoneRef.current.opacityScale = status === 'stale' ? 0.5 : 1;
      zoneRef.current.updateBands();
    }
  }, [candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, levels, asiaHigh, asiaLow, judas, judasBarDate, smt, smtBarDate, overlayStale]);

  const latest = candles.length > 0 ? candles[candles.length - 1] : null;
  const hasAsiaLines = asiaHigh !== null && asiaHigh !== undefined && asiaLow !== null && asiaLow !== undefined;
  const hasJudasMarkers =
    judas !== null && judas !== undefined && (judas.confirmed === true || judas.candidate === true) &&
    (judas.sweepSide === 'HIGH' || judas.sweepSide === 'LOW') &&
    judasBarDate !== null && judasBarDate !== undefined;
  const hasSmtMarker =
    smt !== null && smt !== undefined && !smt.suppressed &&
    (smt.direction === 'BULLISH' || smt.direction === 'BEARISH') &&
    smtBarDate !== null && smtBarDate !== undefined;

  return (
    <div data-slot="chart-block" data-overlay={status} className="relative min-h-[400px] w-full">
      {hasAsiaLines ? <span data-slot="asia-lines" aria-hidden="true" className="hidden" /> : null}
      {hasJudasMarkers ? <span data-slot="judas-markers" aria-hidden="true" className="hidden" /> : null}
      {hasSmtMarker ? <span data-slot="smt-marker" aria-hidden="true" className="hidden" /> : null}
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
