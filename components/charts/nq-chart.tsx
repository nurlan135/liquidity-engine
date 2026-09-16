'use client';

import { useEffect, useRef } from 'react';import type { Candle } from '@/src/lib/ict/types';
import type { LevelsOutput } from '@/src/lib/ict/levels';
import type { JudasOutput } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
import { asiaLineInputs, levelLineInputs, mapCandlesToSeries, priceLineInputs } from '@/src/lib/chart-mapper';
import type { ThinTier } from '@/src/lib/thin-tier';
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
  thinTier?: ThinTier;
  // Phase 17 ticket-to-chart wiring (Plan 03/04 contract): terminal-shell
  // passes ticket truth through these exact optional prop names. Rendering
  // (T pin, entry/SL/TP lines, STAND ASIDE clearing) lands in Plan 04 —
  // this step only declares the surface so the shell compiles. Nulls on
  // STAND ASIDE or INVALIDATED clear via the empty-marker-set plus
  // unconditional-removal clearing paths.
  ticketVerdict?: 'EXECUTE_LONG' | 'EXECUTE_SHORT' | 'STAND_ASIDE' | null;
  ticketDirection?: 'LONG' | 'SHORT' | null;
  ticketEntry?: number | null;
  ticketSL?: number | null;
  ticketTP1?: number | null;
  ticketTP2?: number | null;
  ticketTP3?: number | null;
  fireBarDate?: string | null;
  // Phase 20 pool overlay (tracer single-pair slice): terminal-shell fans
  // the rank-1 ACTIVE BSL pool top/bottom plus degraded flags through
  // these optional nullable props beside the Asia props. Null means no
  // pool input — the chart renders clean candles and never blocks.
  // Expansion (nearest-2-per-side plus ghosts) lands in the next plan.
  poolBslTop?: number | null;
  poolBslBottom?: number | null;
  poolDegradedStale?: boolean;
  poolDegradedThin?: boolean;
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
// SMT, then the ticket trigger pin (J-S-T order per D-09). Null,
// unresolved, NO-SIGNAL, suppressed, or non-EXECUTE inputs contribute
// nothing; empty input returns [] so the caller clears via an empty marker
// set (D-10).
function buildOverlayMarkers(
  judas: JudasOutput | null | undefined,
  judasBarDate: string | null | undefined,
  smt: SmtOutput | null | undefined,
  smtBarDate: string | null | undefined,
  overlayStale: boolean,
  accent: string,
  ticketVerdict?: 'EXECUTE_LONG' | 'EXECUTE_SHORT' | 'STAND_ASIDE' | null,
  ticketDirection?: 'LONG' | 'SHORT' | null,
  fireBarDate?: string | null,
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
  // Ticket trigger pin (D-09): third in J-S-T order on the FIRE bar, EXECUTE
  // only. LONG pins below the bar (arrowUp), SHORT above (arrowDown), accent
  // tone with MUTED_GRAY stale fallback. STAND ASIDE, INVALIDATED, null, or
  // missing fireBarDate contribute nothing so the empty-marker-set path
  // clears the pin (D-10).
  if (
    (ticketVerdict === 'EXECUTE_LONG' || ticketVerdict === 'EXECUTE_SHORT') &&
    (ticketDirection === 'LONG' || ticketDirection === 'SHORT') &&
    fireBarDate !== null && fireBarDate !== undefined
  ) {
    markers.push({
      time: fireBarDate,
      position: ticketDirection === 'LONG' ? 'belowBar' : 'aboveBar',
      shape: ticketDirection === 'LONG' ? 'arrowUp' : 'arrowDown',
      color: tone,
      text: 'T',
    });
  }
  return markers;
}

export function NqChart({ candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, forming, levels = null, asiaHigh = null, asiaLow = null, judas = null, judasBarDate = null, smt = null, smtBarDate = null, overlayStale = false, thinTier = 'full', ticketVerdict = null, ticketDirection = null, ticketEntry = null, ticketSL = null, ticketTP1 = null, ticketTP2 = null, ticketTP3 = null, fireBarDate = null, poolBslTop = null, poolBslBottom = null, poolDegradedStale = false, poolDegradedThin = false }: NqChartProps) {
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
  // Phase 17 ticket price lines (D-09): Entry/SL/TP1/TP2/TP3 remove-then-create like the Asia pair.
  const entryLineRef = useRef<unknown>(null);
  const slLineRef = useRef<unknown>(null);
  const tp1LineRef = useRef<unknown>(null);
  const tp2LineRef = useRef<unknown>(null);
  const tp3LineRef = useRef<unknown>(null);
  // Phase 20 pool BSL rank-1 pair refs: remove-then-create like the Asia
  // pair; nulled on unmount and on every update cycle before re-creation.
  const poolBslTopLineRef = useRef<unknown>(null);
  const poolBslBottomLineRef = useRef<unknown>(null);
  // Phase 9 series-markers plugin handle (v5 createSeriesMarkers form only).
  const markersPluginRef = useRef<unknown>(null);
  const zoneRef = useRef<ZoneFillPrimitive | null>(null);
  const propsRef = useRef({ candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, forming, levels, asiaHigh, asiaLow, judas, judasBarDate, smt, smtBarDate, overlayStale, thinTier, ticketVerdict, ticketDirection, ticketEntry, ticketSL, ticketTP1, ticketTP2, ticketTP3, fireBarDate, poolBslTop, poolBslBottom, poolDegradedStale, poolDegradedThin });
  // Sync the latest props outside render so the zone-fill getter reads live
  // values without violating the react-hooks/refs render-phase rule.
  useEffect(() => {
    propsRef.current = { candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, forming, levels, asiaHigh, asiaLow, judas, judasBarDate, smt, smtBarDate, overlayStale, thinTier, ticketVerdict, ticketDirection, ticketEntry, ticketSL, ticketTP1, ticketTP2, ticketTP3, fireBarDate, poolBslTop, poolBslBottom, poolDegradedStale, poolDegradedThin };
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
      // Thin-history dimming (D-05/D-06/D-10): single muted treatment for both
      // thin tiers; stale plus thin never compound. Tier derivation sits in
      // try/catch so a failure renders the full-strength chart (rule 5).
      let dimmed = false;
      try {
        dimmed = props.thinTier !== undefined && props.thinTier !== 'full';
      } catch {
        dimmed = false;
      }
      const levelColor = dimmed ? MUTED_GRAY : accent;
      const inputs = priceLineInputs(props.eq, props.dolPrice);
      eqLineRef.current = typed.createPriceLine({
        price: inputs.eq,
        color: levelColor,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'EQ',
      });
      dolLineRef.current = typed.createPriceLine({
        price: inputs.dol,
        color: levelColor,
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
      // Phase 20 pool BSL rank-1 pair: dashed width-1 lines through the
      // remove-then-create ref cycle following the Asia mount precedent
      // (D-09). Tracer single-pair slice: one BSL top/bottom pair from the
      // shell fan-out. Colors resolve from the up-terminal token (NOT
      // accent); degraded (stale/thin) desaturates to muted gray (D-13).
      // Finite-guarded inputs with per-leg try/catch that nulls only the
      // failing leg (T-20-02); a null selector leaves zero lines (D-14).
      // Created after Asia and before ticket legs (D-11) so ticket stays
      // on top and pools sit above zones.
      if (props.poolBslTop !== null && props.poolBslTop !== undefined && props.poolBslBottom !== null && props.poolBslBottom !== undefined) {
        const poolDegraded = props.poolDegradedStale === true || props.poolDegradedThin === true;
        const poolColor = poolDegraded ? MUTED_GRAY : up;
        try {
          const poolInputs = asiaLineInputs(props.poolBslTop, props.poolBslBottom);
          try {
            poolBslTopLineRef.current = typed.createPriceLine({
              price: poolInputs.asiaHigh,
              color: poolColor,
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              title: 'BSL-1-top',
            });
          } catch {
            poolBslTopLineRef.current = null;
          }
          try {
            poolBslBottomLineRef.current = typed.createPriceLine({
              price: poolInputs.asiaLow,
              color: poolColor,
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              title: 'BSL-1-bottom',
            });
          } catch {
            poolBslBottomLineRef.current = null;
          }
        } catch {
          poolBslTopLineRef.current = null;
          poolBslBottomLineRef.current = null;
        }
      }
      // Overlay markers via the v5 plugin form (D-06/D-07 plus Phase 17 T
      // pin): Judas first, then SMT, then the ticket trigger pin; empty
      // input sets an empty array so candles render clean. Stale persists
      // desaturated with the STALE badge, never cleared (D-08).
      try {
        const { createSeriesMarkers } = await import('lightweight-charts');
        const plugin = (
          createSeriesMarkers as (
            series: unknown,
            markers: OverlayMarker[],
          ) => { setMarkers: (markers: OverlayMarker[]) => void }
        )(series, buildOverlayMarkers(props.judas, props.judasBarDate, props.smt, props.smtBarDate, props.overlayStale === true, accent, props.ticketVerdict, props.ticketDirection, props.fireBarDate));
        markersPluginRef.current = plugin;
      } catch {
        markersPluginRef.current = null;
      }
      // Ticket Entry/SL/TP1/TP2/TP3 lines (D-09): per-leg create like the
      // Asia pair — EXECUTE verdict only. Each leg renders independently:
      // null or non-finite legs (legal on a partial TP ladder) are skipped,
      // finite legs still render. A create throw nulls only that leg; the
      // chart never blocks. Stale legs desaturate to muted gray.
      if (props.ticketVerdict === 'EXECUTE_LONG' || props.ticketVerdict === 'EXECUTE_SHORT') {
        const ticketColor = props.overlayStale ? MUTED_GRAY : accent;
        const ticketLegs = [
          { ref: entryLineRef, price: props.ticketEntry, title: 'Entry', style: LineStyle.Dashed },
          { ref: slLineRef, price: props.ticketSL, title: 'SL', style: LineStyle.Solid },
          { ref: tp1LineRef, price: props.ticketTP1, title: 'TP1', style: LineStyle.Dashed },
          { ref: tp2LineRef, price: props.ticketTP2, title: 'TP2', style: LineStyle.Dashed },
          { ref: tp3LineRef, price: props.ticketTP3, title: 'TP3', style: LineStyle.Dashed },
        ];
        for (const leg of ticketLegs) {
          if (typeof leg.price !== 'number' || !Number.isFinite(leg.price)) continue;
          try {
            leg.ref.current = typed.createPriceLine({
              price: leg.price,
              color: ticketColor,
              lineWidth: 1,
              lineStyle: leg.style,
              title: leg.title,
            });
          } catch {
            leg.ref.current = null;
          }
        }
      }
      // Quadrant/OTE lines annotate the proven selector path; null levels (or
      // a guard throw) render no new lines and never block the chart.
      if (props.levels !== null && props.levels !== undefined) {
        try {
          const levelInputs = levelLineInputs(props.levels);
          q1LineRef.current = typed.createPriceLine({
            price: levelInputs.q1,
            color: levelColor,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'Q1 0.25',
          });
          q3LineRef.current = typed.createPriceLine({
            price: levelInputs.q3,
            color: levelColor,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'Q3 0.75',
          });
          oteBullLineRef.current = typed.createPriceLine({
            price: levelInputs.oteBull,
            color: levelColor,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'OTE-B 0.62-0.79',
          });
          oteBearLineRef.current = typed.createPriceLine({
            price: levelInputs.oteBear,
            color: levelColor,
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
            });
          } catch {
            return null;
          }
        },
      );
      zoneRef.current.opacityScale = props.status === 'stale' || dimmed ? 0.5 : 1;
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
      entryLineRef.current = null;
      slLineRef.current = null;
      tp1LineRef.current = null;
      tp2LineRef.current = null;
      tp3LineRef.current = null;
      poolBslTopLineRef.current = null;
      poolBslBottomLineRef.current = null;
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
      // Ticket lines remove unconditionally first (D-10): skipping creation
      // alone leaves ghost what-if levels after a verdict flip to STAND ASIDE.
      if (entryLineRef.current !== null) live.removePriceLine(entryLineRef.current);
      if (slLineRef.current !== null) live.removePriceLine(slLineRef.current);
      if (tp1LineRef.current !== null) live.removePriceLine(tp1LineRef.current);
      if (tp2LineRef.current !== null) live.removePriceLine(tp2LineRef.current);
      if (tp3LineRef.current !== null) live.removePriceLine(tp3LineRef.current);
      // Pool lines remove unconditionally (D-14): skipping creation alone
      // leaves stale pool lines after a null-selector flip.
      if (poolBslTopLineRef.current !== null) live.removePriceLine(poolBslTopLineRef.current);
      if (poolBslBottomLineRef.current !== null) live.removePriceLine(poolBslBottomLineRef.current);
      q1LineRef.current = null;
      q3LineRef.current = null;
      oteBullLineRef.current = null;
      oteBearLineRef.current = null;
      asiaHighLineRef.current = null;
      asiaLowLineRef.current = null;
      entryLineRef.current = null;
      slLineRef.current = null;
      tp1LineRef.current = null;
      tp2LineRef.current = null;
      tp3LineRef.current = null;
      poolBslTopLineRef.current = null;
      poolBslBottomLineRef.current = null;
      const accent = readVar(VAR_ACCENT, '#00D9FF');
      const up = readVar(VAR_UP, '#00FF88');
      const overlayTone = overlayStale ? MUTED_GRAY : accent;
      // Thin-history dimming (D-05/D-06/D-10): mirrors the mount effect; a
      // tier-derivation failure renders the full-strength chart (rule 5).
      let dimmed = false;
      try {
        dimmed = thinTier !== undefined && thinTier !== 'full';
      } catch {
        dimmed = false;
      }
      const levelColor = dimmed ? MUTED_GRAY : accent;
      const inputs = priceLineInputs(eq, dolPrice);
      eqLineRef.current = live.createPriceLine({
        price: inputs.eq,
        color: levelColor,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'EQ',
      });
      dolLineRef.current = live.createPriceLine({
        price: inputs.dol,
        color: levelColor,
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        title: dolName,
      });
      if (levels !== null && levels !== undefined) {
        try {
          const levelInputs = levelLineInputs(levels);
          q1LineRef.current = live.createPriceLine({
            price: levelInputs.q1,
            color: levelColor,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'Q1 0.25',
          });
          q3LineRef.current = live.createPriceLine({
            price: levelInputs.q3,
            color: levelColor,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'Q3 0.75',
          });
          oteBullLineRef.current = live.createPriceLine({
            price: levelInputs.oteBull,
            color: levelColor,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            title: 'OTE-B 0.62-0.79',
          });
          oteBearLineRef.current = live.createPriceLine({
            price: levelInputs.oteBear,
            color: levelColor,
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
      // Phase 20 pool BSL rank-1 pair (D-09/D-11): created after Asia and
      // before ticket legs so ticket stays on top and pools sit above
      // zones. No verdict gate — render whenever pool props are non-null;
      // null leaves zero lines after the unconditional removal above
      // (D-14). Degraded (stale/thin flags or chart-level stale) uses
      // MUTED_GRAY (D-13); per-leg try/catch nulls only the failing leg
      // (T-20-02).
      if (poolBslTop !== null && poolBslTop !== undefined && poolBslBottom !== null && poolBslBottom !== undefined) {
        const poolDegraded = overlayStale || poolDegradedStale === true || poolDegradedThin === true;
        const poolColor = poolDegraded ? MUTED_GRAY : up;
        try {
          const poolInputs = asiaLineInputs(poolBslTop, poolBslBottom);
          try {
            poolBslTopLineRef.current = live.createPriceLine({
              price: poolInputs.asiaHigh,
              color: poolColor,
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              title: 'BSL-1-top',
            });
          } catch {
            poolBslTopLineRef.current = null;
          }
          try {
            poolBslBottomLineRef.current = live.createPriceLine({
              price: poolInputs.asiaLow,
              color: poolColor,
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              title: 'BSL-1-bottom',
            });
          } catch {
            poolBslBottomLineRef.current = null;
          }
        } catch {
          poolBslTopLineRef.current = null;
          poolBslBottomLineRef.current = null;
        }
      }
      // Ticket Entry/SL/TP1/TP2/TP3 lines (D-09): remove-then-create like the
      // Asia pair. EXECUTE verdict only; each leg renders independently —
      // null or non-finite legs (legal on a partial TP ladder) are skipped
      // while finite legs still render. Removal already happened
      // unconditionally above, so STAND ASIDE and INVALIDATED leave zero
      // ticket lines (D-10, Pitfall 6). A create throw nulls only that leg.
      if (ticketVerdict === 'EXECUTE_LONG' || ticketVerdict === 'EXECUTE_SHORT') {
        const ticketLegs = [
          { ref: entryLineRef, price: ticketEntry, title: 'Entry', style: LineStyle.Dashed },
          { ref: slLineRef, price: ticketSL, title: 'SL', style: LineStyle.Solid },
          { ref: tp1LineRef, price: ticketTP1, title: 'TP1', style: LineStyle.Dashed },
          { ref: tp2LineRef, price: ticketTP2, title: 'TP2', style: LineStyle.Dashed },
          { ref: tp3LineRef, price: ticketTP3, title: 'TP3', style: LineStyle.Dashed },
        ];
        for (const leg of ticketLegs) {
          if (typeof leg.price !== 'number' || !Number.isFinite(leg.price)) continue;
          try {
            leg.ref.current = live.createPriceLine({
              price: leg.price,
              color: overlayTone,
              lineWidth: 1,
              lineStyle: leg.style,
              title: leg.title,
            });
          } catch {
            leg.ref.current = null;
          }
        }
      }
      // Marker refresh through the v5 plugin only (never the v4 series-dot
      // form): rebuild on every input change, clear via the empty array.
      try {
        const next = buildOverlayMarkers(judas, judasBarDate, smt, smtBarDate, overlayStale, accent, ticketVerdict, ticketDirection, fireBarDate);
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
    // Recompute zone geometry on range change; stale or thin desaturates
    // fills through one muted treatment, never compounded (D-10).
    if (zoneRef.current !== null) {
      let refreshDimmed = false;
      try {
        refreshDimmed = thinTier !== undefined && thinTier !== 'full';
      } catch {
        refreshDimmed = false;
      }
      zoneRef.current.opacityScale = status === 'stale' || refreshDimmed ? 0.5 : 1;
      zoneRef.current.updateBands();
    }
  }, [candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, levels, asiaHigh, asiaLow, judas, judasBarDate, smt, smtBarDate, overlayStale, thinTier, ticketVerdict, ticketDirection, ticketEntry, ticketSL, ticketTP1, ticketTP2, ticketTP3, fireBarDate, poolBslTop, poolBslBottom, poolDegradedStale, poolDegradedThin]);

  const latest = candles.length > 0 ? candles[candles.length - 1] : null;
  const hasAsiaLines = asiaHigh !== null && asiaHigh !== undefined && asiaLow !== null && asiaLow !== undefined;
  const hasPoolLines = poolBslTop !== null && poolBslTop !== undefined && poolBslBottom !== null && poolBslBottom !== undefined;
  const hasJudasMarkers =
    judas !== null && judas !== undefined && (judas.confirmed === true || judas.candidate === true) &&
    (judas.sweepSide === 'HIGH' || judas.sweepSide === 'LOW') &&
    judasBarDate !== null && judasBarDate !== undefined;
  const hasSmtMarker =
    smt !== null && smt !== undefined && !smt.suppressed &&
    (smt.direction === 'BULLISH' || smt.direction === 'BEARISH') &&
    smtBarDate !== null && smtBarDate !== undefined;
  const hasTicketPin =
    (ticketVerdict === 'EXECUTE_LONG' || ticketVerdict === 'EXECUTE_SHORT') &&
    (ticketDirection === 'LONG' || ticketDirection === 'SHORT') &&
    fireBarDate !== null && fireBarDate !== undefined;

  return (
    <div data-slot="chart-block" data-overlay={status} className="relative min-h-[400px] w-full">
      {hasAsiaLines ? <span data-slot="asia-lines" aria-hidden="true" className="hidden" /> : null}
      {hasJudasMarkers ? <span data-slot="judas-markers" aria-hidden="true" className="hidden" /> : null}
      {hasSmtMarker ? <span data-slot="smt-marker" aria-hidden="true" className="hidden" /> : null}
      {hasTicketPin ? <span data-slot="ticket-pin" aria-hidden="true" className="hidden" /> : null}
      {hasPoolLines ? <span data-slot="pool-lines" aria-hidden="true" className="hidden" /> : null}
      <div
        ref={containerRef}
        data-slot="nq-chart"
        data-thin-tier={thinTier}
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
