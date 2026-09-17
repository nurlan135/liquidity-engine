'use client';

import { useEffect, useRef } from 'react';import type { Candle } from '@/src/lib/ict/types';
import type { LevelsOutput } from '@/src/lib/ict/levels';
import type { JudasOutput } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';
import type { PoolSide } from '@/src/lib/ict/pools';
import { asiaLineInputs, levelLineInputs, mapCandlesToSeries, poolLineInputs, priceLineInputs, shouldCreatePoolLines, ticketLineInputs } from '@/src/lib/chart-mapper';
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
  // Phase 20 pool overlay (tracer single-pair slice plus nearest-2-per-side
  // expansion): terminal-shell fans the BSL and SSL pools through these
  // optional nullable arrays beside the Asia props, each entry carrying a
  // { top, bottom } zone. Null (or a missing entry) means no pool input — the
  // chart renders clean candles and never blocks. At most two entries per
  // side render (nearest-2-per-side, counting ranked ACTIVE pools only);
  // swept ghosts ride outside the cap in their own arrays. The scalar
  // rank-1 BSL pair props stay as the Phase 01 contract surface while the
  // shell fans the full arrays beside them.
  poolBslTop?: number | null;
  poolBslBottom?: number | null;
  poolBslPairs?: Array<{ top: number; bottom: number }> | null;
  poolSslPairs?: Array<{ top: number; bottom: number }> | null;
  poolBslGhosts?: Array<{ top: number; bottom: number }> | null;
  poolSslGhosts?: Array<{ top: number; bottom: number }> | null;
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

export function NqChart({ candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, forming, levels = null, asiaHigh = null, asiaLow = null, judas = null, judasBarDate = null, smt = null, smtBarDate = null, overlayStale = false, thinTier = 'full', ticketVerdict = null, ticketDirection = null, ticketEntry = null, ticketSL = null, ticketTP1 = null, ticketTP2 = null, ticketTP3 = null, fireBarDate = null, poolBslTop = null, poolBslBottom = null, poolBslPairs = null, poolSslPairs = null, poolBslGhosts = null, poolSslGhosts = null, poolDegradedStale = false, poolDegradedThin = false }: NqChartProps) {
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
  // Phase 20 pool overlay (tracer pair + nearest-2-per-side expansion):
  // remove-then-create like the Asia pair. Max 8 ACTIVE lines (nearest-2
  // per side × top/bottom) plus swept ghost refs riding outside the cap
  // per D-16 — fixed per-pair refs beside the tracer pair so every ref
  // clears by the same unconditional-removal cycle. Ghost refs stay visible
  // until the clearing paths null them (D-12); all refs null on unmount
  // and on every update cycle before re-creation.
  const poolBslTopLineRef = useRef<unknown>(null);
  const poolBslBottomLineRef = useRef<unknown>(null);
  const poolBsl2TopLineRef = useRef<unknown>(null);
  const poolBsl2BottomLineRef = useRef<unknown>(null);
  const poolSslTopLineRef = useRef<unknown>(null);
  const poolSslBottomLineRef = useRef<unknown>(null);
  const poolSsl2TopLineRef = useRef<unknown>(null);
  const poolSsl2BottomLineRef = useRef<unknown>(null);
  // Phase 20 swept ghost refs (D-12): dimmed MUTED_GRAY pairs that stay
  // visible for retest context, never removed except through the shared
  // unconditional-removal clearing path (D-14/D-15).
  const ghostBslTopLineRefs = useRef<unknown[]>([]);
  const ghostBslBottomLineRefs = useRef<unknown[]>([]);
  const ghostSslTopLineRefs = useRef<unknown[]>([]);
  const ghostSslBottomLineRefs = useRef<unknown[]>([]);
  // Phase 9 series-markers plugin handle (v5 createSeriesMarkers form only).
  const markersPluginRef = useRef<unknown>(null);
  const zoneRef = useRef<ZoneFillPrimitive | null>(null);
  const propsRef = useRef({ candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, forming, levels, asiaHigh, asiaLow, judas, judasBarDate, smt, smtBarDate, overlayStale, thinTier, ticketVerdict, ticketDirection, ticketEntry, ticketSL, ticketTP1, ticketTP2, ticketTP3, fireBarDate, poolBslTop, poolBslBottom, poolBslPairs, poolSslPairs, poolBslGhosts, poolSslGhosts, poolDegradedStale, poolDegradedThin });
  // Sync the latest props outside render so the zone-fill getter reads live
  // values without violating the react-hooks/refs render-phase rule.
  useEffect(() => {
    propsRef.current = { candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, forming, levels, asiaHigh, asiaLow, judas, judasBarDate, smt, smtBarDate, overlayStale, thinTier, ticketVerdict, ticketDirection, ticketEntry, ticketSL, ticketTP1, ticketTP2, ticketTP3, fireBarDate, poolBslTop, poolBslBottom, poolBslPairs, poolSslPairs, poolBslGhosts, poolSslGhosts, poolDegradedStale, poolDegradedThin };
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
      // Phase 20 pool overlay (D-09/D-10/D-11): dashed width-1 pairs through
      // the remove-then-create ref cycle following the Asia mount precedent.
      // Nearest-2-per-side capped pairs: BSL legs resolve the up-terminal
      // tone, SSL legs the down-terminal tone (NOT accent); rank-1 pairs
      // render full brightness and rank-2 pairs the same hue at 50% alpha
      // (defined inline beside the suite twin). Swept ghosts render dimmed
      // MUTED_GRAY and stay visible (D-12); degraded (stale/thin) ACTIVE
      // legs desaturate to muted gray under the uniform discipline (D-13).
      // Finite-guarded inputs with per-leg try/catch that nulls only the
      // failing leg (T-20-06); a null selector leaves zero lines (D-14). A
      // STAND_ASIDE verdict gates the whole creation region — pools and
      // ghosts — while the unconditional-removal paths above still clear,
      // so the update cycle cannot re-create ghosts after removal (D-15).
      // Created after Asia and before ticket legs (D-11) so ticket stays
      // on top and pools sit above zones.
      if (shouldCreatePoolLines(props.ticketVerdict)) {
        const poolUp = up;
        const poolDown = down;
        const poolUpDim = 'rgba(0,255,136,0.5)';
        const poolDownDim = 'rgba(255,0,255,0.5)';
        const mountPoolPairs = (
          pairs: Array<{ top: number; bottom: number }> | null | undefined,
          side: PoolSide,
          degraded: boolean,
          refs: Array<{ top: React.MutableRefObject<unknown>; bottom: React.MutableRefObject<unknown> }>,
          titles: string[],
        ) => {
          if (pairs === null || pairs === undefined) return;
          const capped = pairs.slice(0, 2);
          for (let i = 0; i < capped.length; i++) {
            if (i >= refs.length) break;
            const zone = capped[i];
            if (zone === null || zone === undefined) continue;
            const rankColor = degraded ? MUTED_GRAY : side === 'BSL' ? (i === 0 ? poolUp : poolUpDim) : (i === 0 ? poolDown : poolDownDim);
            try {
              const poolInputs = poolLineInputs(zone.top, zone.bottom);
              try {
                refs[i].top.current = typed.createPriceLine({
                  price: poolInputs.top,
                  color: rankColor,
                  lineWidth: 1,
                  lineStyle: LineStyle.Dashed,
                  title: titles[i * 2],
                });
              } catch {
                refs[i].top.current = null;
              }
              try {
                refs[i].bottom.current = typed.createPriceLine({
                  price: poolInputs.bottom,
                  color: rankColor,
                  lineWidth: 1,
                  lineStyle: LineStyle.Dashed,
                  title: titles[i * 2 + 1],
                });
              } catch {
                refs[i].bottom.current = null;
              }
            } catch {
              refs[i].top.current = null;
              refs[i].bottom.current = null;
            }
          }
        };
        const ghostBottomPool = (list: Array<{ top: number; bottom: number }> | null | undefined): Array<{ top: number; bottom: number }> => {
          const out: Array<{ top: number; bottom: number }> = [];
          if (list === null || list === undefined) return out;
          for (const zone of list) {
            if (
              zone !== null &&
              zone !== undefined &&
              typeof zone.top === 'number' &&
              Number.isFinite(zone.top) &&
              typeof zone.bottom === 'number' &&
              Number.isFinite(zone.bottom)
            ) {
              out.push(zone);
            }
          }
          return out;
        };
        const mountGhostPairs = (
          pairs: Array<{ top: number; bottom: number }> | null | undefined,
          side: PoolSide,
          topRefs: React.MutableRefObject<unknown[]>,
          bottomRefs: React.MutableRefObject<unknown[]>,
        ) => {
          const finite = ghostBottomPool(pairs);
          for (let i = 0; i < finite.length; i++) {
            const zone = finite[i];
            try {
              const ghostInputs = poolLineInputs(zone.top, zone.bottom);
              try {
                const topHandle = typed.createPriceLine({
                  price: ghostInputs.top,
                  color: MUTED_GRAY,
                  lineWidth: 1,
                  lineStyle: LineStyle.Dashed,
                  title: side === 'BSL' ? `BSL-G${i + 1}-top` : `SSL-G${i + 1}-top`,
                });
                topRefs.current.push(topHandle);
              } catch {
                // Ghost-leg create throws stay local — the leg stays absent.
              }
              try {
                const bottomHandle = typed.createPriceLine({
                  price: ghostInputs.bottom,
                  color: MUTED_GRAY,
                  lineWidth: 1,
                  lineStyle: LineStyle.Dashed,
                  title: side === 'BSL' ? `BSL-G${i + 1}-bottom` : `SSL-G${i + 1}-bottom`,
                });
                bottomRefs.current.push(bottomHandle);
              } catch {
                // Ghost-leg create throws stay local — the leg stays absent.
              }
            } catch {
              // Guard throw (non-finite zone) renders no lines for that ghost.
            }
          }
        };
        // Tracer pair backwards-compat: when the shell fans only the scalar
        // rank-1 BSL pair (no arrays), mount it as the BSL-1 pair so the
        // Phase 01 contract keeps rendering exactly one pair. Ghosts always
        // mount dimmed MUTED_GRAY beside either path (D-12).
        const degradedMount =
          props.poolDegradedStale === true || props.poolDegradedThin === true || props.overlayStale === true || (props.thinTier !== undefined && props.thinTier !== 'full');
        if (
          (props.poolBslPairs === null || props.poolBslPairs === undefined) &&
          (props.poolSslPairs === null || props.poolSslPairs === undefined) &&
          props.poolBslTop !== null && props.poolBslTop !== undefined &&
          props.poolBslBottom !== null && props.poolBslBottom !== undefined
        ) {
          mountPoolPairs(
            [{ top: props.poolBslTop, bottom: props.poolBslBottom }],
            'BSL',
            degradedMount,
            [{ top: poolBslTopLineRef, bottom: poolBslBottomLineRef }],
            ['BSL-1-top', 'BSL-1-bottom'],
          );
        } else {
          mountPoolPairs(props.poolBslPairs, 'BSL', degradedMount, [
            { top: poolBslTopLineRef, bottom: poolBslBottomLineRef },
            { top: poolBsl2TopLineRef, bottom: poolBsl2BottomLineRef },
          ], ['BSL-1-top', 'BSL-1-bottom', 'BSL-2-top', 'BSL-2-bottom']);
          mountPoolPairs(props.poolSslPairs, 'SSL', degradedMount, [
            { top: poolSslTopLineRef, bottom: poolSslBottomLineRef },
            { top: poolSsl2TopLineRef, bottom: poolSsl2BottomLineRef },
          ], ['SSL-1-top', 'SSL-1-bottom', 'SSL-2-top', 'SSL-2-bottom']);
        }
        mountGhostPairs(props.poolBslGhosts, 'BSL', ghostBslTopLineRefs, ghostBslBottomLineRefs);
        mountGhostPairs(props.poolSslGhosts, 'SSL', ghostSslTopLineRefs, ghostSslBottomLineRefs);
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
        // Phase 21 buffered ticket lines (D-07): the legs thread through
        // the ticketLineInputs guard so buffered SL/TP values validate
        // before line creation — moved lines, EXECUTE-only rendering, and
        // unchanged z-order (after Asia, before pools) all hold. A guard
        // throw renders no ticket lines and never blocks the chart.
        let ticketLegs: Array<{ ref: { current: unknown }; price: number | null; title: string; style: unknown }> | null = null;
        try {
          const inputs = ticketLineInputs(
            props.ticketEntry ?? null,
            props.ticketSL ?? null,
            props.ticketTP1 ?? null,
            props.ticketTP2 ?? null,
            props.ticketTP3 ?? null,
          );
          ticketLegs = [
            { ref: entryLineRef, price: inputs.entry, title: 'Entry', style: LineStyle.Dashed },
            { ref: slLineRef, price: inputs.sl, title: 'SL', style: LineStyle.Solid },
            { ref: tp1LineRef, price: inputs.tp1, title: 'TP1', style: LineStyle.Dashed },
            { ref: tp2LineRef, price: inputs.tp2, title: 'TP2', style: LineStyle.Dashed },
            { ref: tp3LineRef, price: inputs.tp3, title: 'TP3', style: LineStyle.Dashed },
          ];
        } catch {
          ticketLegs = null;
        }
        if (ticketLegs === null) {
          entryLineRef.current = null;
          slLineRef.current = null;
          tp1LineRef.current = null;
          tp2LineRef.current = null;
          tp3LineRef.current = null;
        } else for (const leg of ticketLegs) {
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
      poolBsl2TopLineRef.current = null;
      poolBsl2BottomLineRef.current = null;
      poolSslTopLineRef.current = null;
      poolSslBottomLineRef.current = null;
      poolSsl2TopLineRef.current = null;
      poolSsl2BottomLineRef.current = null;
      ghostBslTopLineRefs.current = [];
      ghostBslBottomLineRefs.current = [];
      ghostSslTopLineRefs.current = [];
      ghostSslBottomLineRefs.current = [];
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
      // Pool lines remove unconditionally (D-14/T-20-07): skipping creation
      // alone leaves stale pool lines after a null-selector flip, and the
      // STAND_ASIDE path clears ghosts through this same unconditional
      // removal shared with the ticket cycle (D-15).
      for (const ref of [poolBslTopLineRef, poolBslBottomLineRef, poolBsl2TopLineRef, poolBsl2BottomLineRef, poolSslTopLineRef, poolSslBottomLineRef, poolSsl2TopLineRef, poolSsl2BottomLineRef]) {
        if (ref.current !== null) live.removePriceLine(ref.current);
      }
      for (const arr of [ghostBslTopLineRefs, ghostBslBottomLineRefs, ghostSslTopLineRefs, ghostSslBottomLineRefs]) {
        for (const handle of arr.current) {
          if (handle !== null) live.removePriceLine(handle);
        }
      }
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
      poolBsl2TopLineRef.current = null;
      poolBsl2BottomLineRef.current = null;
      poolSslTopLineRef.current = null;
      poolSslBottomLineRef.current = null;
      poolSsl2TopLineRef.current = null;
      poolSsl2BottomLineRef.current = null;
      ghostBslTopLineRefs.current = [];
      ghostBslBottomLineRefs.current = [];
      ghostSslTopLineRefs.current = [];
      ghostSslBottomLineRefs.current = [];
      const accent = readVar(VAR_ACCENT, '#00D9FF');
      const up = readVar(VAR_UP, '#00FF88');
      const down = readVar(VAR_DOWN, '#FF00FF');
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
      // Phase 20 pool overlay (D-09/D-10/D-11/D-13/D-15): created after
      // Asia and before ticket legs so ticket stays on top and pools sit
      // above zones. The whole refresh region — both pool refresh calls plus
      // both ghost refresh calls — runs only when the verdict gate allows;
      // STAND_ASIDE leaves zero lines after the unconditional removal above
      // (D-15), null leaves zero lines (D-14). Degraded (stale/thin flags or
      // chart-level stale/thin) uses MUTED_GRAY under the uniform halved
      // discipline (D-13); per-leg try/catch nulls only the failing leg
      // (T-20-06). Rank pairs mount through the same inline twin as mount
      // (titles {SIDE}-{rank}-{leg}, BSL up tone / SSL down tone, rank-1
      // full / rank-2 same hue halved).
      if (shouldCreatePoolLines(ticketVerdict)) {
        const poolUp = up;
        const poolDown = down;
        const poolUpDim = 'rgba(0,255,136,0.5)';
        const poolDownDim = 'rgba(255,0,255,0.5)';
        const refreshPoolPairs = (
          pairs: Array<{ top: number; bottom: number }> | null | undefined,
          side: PoolSide,
          degraded: boolean,
          refs: Array<{ top: React.MutableRefObject<unknown>; bottom: React.MutableRefObject<unknown> }>,
          titles: string[],
        ) => {
          if (pairs === null || pairs === undefined) return;
          const capped = pairs.slice(0, 2);
          for (let i = 0; i < capped.length; i++) {
            if (i >= refs.length) break;
            const zone = capped[i];
            if (zone === null || zone === undefined) continue;
            const rankColor = degraded ? MUTED_GRAY : side === 'BSL' ? (i === 0 ? poolUp : poolUpDim) : (i === 0 ? poolDown : poolDownDim);
            try {
              const poolInputs = poolLineInputs(zone.top, zone.bottom);
              try {
                refs[i].top.current = live.createPriceLine({
                  price: poolInputs.top,
                  color: rankColor,
                  lineWidth: 1,
                  lineStyle: LineStyle.Dashed,
                  title: titles[i * 2],
                });
              } catch {
                refs[i].top.current = null;
              }
              try {
                refs[i].bottom.current = live.createPriceLine({
                  price: poolInputs.bottom,
                  color: rankColor,
                  lineWidth: 1,
                  lineStyle: LineStyle.Dashed,
                  title: titles[i * 2 + 1],
                });
              } catch {
                refs[i].bottom.current = null;
              }
            } catch {
              refs[i].top.current = null;
              refs[i].bottom.current = null;
            }
          }
        };
        const ghostBottomPoolRefresh = (list: Array<{ top: number; bottom: number }> | null | undefined): Array<{ top: number; bottom: number }> => {
          const out: Array<{ top: number; bottom: number }> = [];
          if (list === null || list === undefined) return out;
          for (const zone of list) {
            if (
              zone !== null &&
              zone !== undefined &&
              typeof zone.top === 'number' &&
              Number.isFinite(zone.top) &&
              typeof zone.bottom === 'number' &&
              Number.isFinite(zone.bottom)
            ) {
              out.push(zone);
            }
          }
          return out;
        };
        const refreshGhostPairs = (
          pairs: Array<{ top: number; bottom: number }> | null | undefined,
          side: PoolSide,
          topRefs: React.MutableRefObject<unknown[]>,
          bottomRefs: React.MutableRefObject<unknown[]>,
        ) => {
          const finite = ghostBottomPoolRefresh(pairs);
          for (let i = 0; i < finite.length; i++) {
            const zone = finite[i];
            try {
              const ghostInputs = poolLineInputs(zone.top, zone.bottom);
              try {
                const topHandle = live.createPriceLine({
                  price: ghostInputs.top,
                  color: MUTED_GRAY,
                  lineWidth: 1,
                  lineStyle: LineStyle.Dashed,
                  title: side === 'BSL' ? `BSL-G${i + 1}-top` : `SSL-G${i + 1}-top`,
                });
                topRefs.current.push(topHandle);
              } catch {
                // Ghost-leg create throws stay local — the leg stays absent.
              }
              try {
                const bottomHandle = live.createPriceLine({
                  price: ghostInputs.bottom,
                  color: MUTED_GRAY,
                  lineWidth: 1,
                  lineStyle: LineStyle.Dashed,
                  title: side === 'BSL' ? `BSL-G${i + 1}-bottom` : `SSL-G${i + 1}-bottom`,
                });
                bottomRefs.current.push(bottomHandle);
              } catch {
                // Ghost-leg create throws stay local — the leg stays absent.
              }
            } catch {
              // Guard throw (non-finite zone) renders no lines for that ghost.
            }
          }
        };
        const degradedRefresh =
          overlayStale || poolDegradedStale === true || poolDegradedThin === true || dimmed;
        if (
          (poolBslPairs === null || poolBslPairs === undefined) &&
          (poolSslPairs === null || poolSslPairs === undefined) &&
          poolBslTop !== null && poolBslTop !== undefined &&
          poolBslBottom !== null && poolBslBottom !== undefined
        ) {
          refreshPoolPairs(
            [{ top: poolBslTop, bottom: poolBslBottom }],
            'BSL',
            degradedRefresh,
            [{ top: poolBslTopLineRef, bottom: poolBslBottomLineRef }],
            ['BSL-1-top', 'BSL-1-bottom'],
          );
        } else {
          refreshPoolPairs(poolBslPairs, 'BSL', degradedRefresh, [
            { top: poolBslTopLineRef, bottom: poolBslBottomLineRef },
            { top: poolBsl2TopLineRef, bottom: poolBsl2BottomLineRef },
          ], ['BSL-1-top', 'BSL-1-bottom', 'BSL-2-top', 'BSL-2-bottom']);
          refreshPoolPairs(poolSslPairs, 'SSL', degradedRefresh, [
            { top: poolSslTopLineRef, bottom: poolSslBottomLineRef },
            { top: poolSsl2TopLineRef, bottom: poolSsl2BottomLineRef },
          ], ['SSL-1-top', 'SSL-1-bottom', 'SSL-2-top', 'SSL-2-bottom']);
        }
        refreshGhostPairs(poolBslGhosts, 'BSL', ghostBslTopLineRefs, ghostBslBottomLineRefs);
        refreshGhostPairs(poolSslGhosts, 'SSL', ghostSslTopLineRefs, ghostSslBottomLineRefs);
      }
      // Ticket Entry/SL/TP1/TP2/TP3 lines (D-09, Phase 21 D-07): the
      // legs thread through the ticketLineInputs guard so buffered SL/TP
      // values validate before line creation — moved lines, EXECUTE-only
      // rendering, and unchanged z-order (after Asia, before pools) all
      // hold. A guard throw renders no ticket lines and never blocks the
      // chart.
      if (ticketVerdict === 'EXECUTE_LONG' || ticketVerdict === 'EXECUTE_SHORT') {
        // Phase 21 buffered ticket lines (D-07): legs thread through the
        // ticketLineInputs guard so buffered SL/TP values validate before
        // line creation — a guard throw renders no ticket lines and never
        // blocks the chart.
        let guarded: { entry: number; sl: number; tp1: number; tp2: number | null; tp3: number | null } | null = null;
        try {
          guarded = ticketLineInputs(ticketEntry, ticketSL, ticketTP1, ticketTP2, ticketTP3);
        } catch {
          guarded = null;
        }
        if (guarded === null) {
          entryLineRef.current = null;
          slLineRef.current = null;
          tp1LineRef.current = null;
          tp2LineRef.current = null;
          tp3LineRef.current = null;
        } else {
          const directLegs = [
            { ref: entryLineRef, price: guarded.entry, title: 'Entry', style: LineStyle.Dashed },
            { ref: slLineRef, price: guarded.sl, title: 'SL', style: LineStyle.Solid },
            { ref: tp1LineRef, price: guarded.tp1, title: 'TP1', style: LineStyle.Dashed },
            { ref: tp2LineRef, price: guarded.tp2, title: 'TP2', style: LineStyle.Dashed },
            { ref: tp3LineRef, price: guarded.tp3, title: 'TP3', style: LineStyle.Dashed },
          ];
          for (const leg of directLegs) {
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
  }, [candles, rangeHigh, rangeLow, eq, dolPrice, dolName, status, levels, asiaHigh, asiaLow, judas, judasBarDate, smt, smtBarDate, overlayStale, thinTier, ticketVerdict, ticketDirection, ticketEntry, ticketSL, ticketTP1, ticketTP2, ticketTP3, fireBarDate, poolBslTop, poolBslBottom, poolBslPairs, poolSslPairs, poolBslGhosts, poolSslGhosts, poolDegradedStale, poolDegradedThin]);

  const latest = candles.length > 0 ? candles[candles.length - 1] : null;
  const hasAsiaLines = asiaHigh !== null && asiaHigh !== undefined && asiaLow !== null && asiaLow !== undefined;
  const hasScalarPoolPair = poolBslTop !== null && poolBslTop !== undefined && poolBslBottom !== null && poolBslBottom !== undefined;
  const hasPoolPairArrays = (poolBslPairs !== null && poolBslPairs !== undefined && poolBslPairs.length > 0) || (poolSslPairs !== null && poolSslPairs !== undefined && poolSslPairs.length > 0);
  const hasPoolGhosts = (poolBslGhosts !== null && poolBslGhosts !== undefined && poolBslGhosts.length > 0) || (poolSslGhosts !== null && poolSslGhosts !== undefined && poolSslGhosts.length > 0);
  // Phase 20 D-15: the sentinel stays honest when creation is gated — under
  // STAND_ASIDE the effects create zero pool or ghost lines, so the slot
  // reports none even while the shell fans verdict-free pool props.
  const poolLinesAllowed = shouldCreatePoolLines(ticketVerdict);
  const hasPoolLines = poolLinesAllowed && (hasScalarPoolPair || hasPoolPairArrays || hasPoolGhosts);
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
