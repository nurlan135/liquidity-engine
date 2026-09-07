import { formatInTimeZone } from 'date-fns-tz';
import type { IntradayCandle } from '@/src/lib/ict/types';
import { closedOnlyIntraday } from '@/src/lib/ict/types';
import type { AsiaRange } from '@/src/lib/ict/asia';
import { NY_TZ } from '@/src/lib/ict/aggregate';

// ICT-13 (D-05/D-06/D-07/D-08/D-09/D-10/D-11/D-12): three-gate London Judas
// detector on 15M NQ rows plus an AsiaRange. Gate 1 is per-candle killzone
// membership, gate 2 is the Asia-extreme sweep, gate 3 is the close-based
// reversal with Asia-height displacement inside the confirmation window.
// Near-misses hold honestly: pre-killzone sweeps flag preRun (never
// promoted), displacement-free sweeps persist as candidates (never expired).
// Pure: caller-supplied rows plus an AsiaRange only — no clock reads, no
// store imports, no ES input, no rollover or SMT state (read-only rule).

/** Killzone open in NY wall-clock minutes since midnight, exclusive (D-07). */
export const KILLZONE_START_MIN = 120;
/** Killzone close in NY wall-clock minutes since midnight, exclusive (D-07). */
export const KILLZONE_END_MIN = 300;
/** Displacement seed as a multiple of Asia height (D-09, budget-tuned). */
export const DISP_MULT = 0.5;
/** Confirmation window in candles: the sweep plus the next 3 (D-10). */
export const CONFIRM_WINDOW = 4;
/** Epsilon for displacement boundary compares. */
export const TOL_EPS = 1e-9;

export type SweepSide = 'HIGH' | 'LOW';

export interface JudasOutput {
  candidate: boolean;
  confirmed: boolean;
  preRun: boolean;
  sweepSide: SweepSide | null;
  sweepTime: number | null;
  displacementMult: number;
}

function hasFiniteOhlc(c: IntradayCandle): boolean {
  return (
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close)
  );
}

// T-08-03: the epoch field is part of the boundary. A row with a non-finite
// or non-positive time reaches formatInTimeZone (throw/Invalid Date) and
// poisons sort/dedupe. Kept as a separate predicate so the failure mode
// stays distinguishable from OHLC.
function hasValidTime(c: IntradayCandle): boolean {
  return Number.isFinite(c.time) && c.time > 0;
}

// Per-candle IANA wall-clock minutes since midnight (D-07 discipline,
// T-08-04). formatInTimeZone renders the explicit instant in NY_TZ, so the
// result is the true NY wall clock on every machine and every instant —
// including inside DST transition windows, where ms-plus-offset arithmetic
// drifts. Resolved at call time with minute precision.
function nyMinutesOf(timeSec: number): number {
  const hour = Number(formatInTimeZone(timeSec * 1000, NY_TZ, 'H'));
  const minute = Number(formatInTimeZone(timeSec * 1000, NY_TZ, 'm'));
  return hour * 60 + minute;
}

function idle(): JudasOutput {
  return {
    candidate: false,
    confirmed: false,
    preRun: false,
    sweepSide: null,
    sweepTime: null,
    displacementMult: 0,
  };
}

// Three-gate London Judas evaluation. The first chronological sweep wins:
// HIGH when the candle high strictly exceeds the Asia high, LOW when the
// candle low strictly goes below the Asia low. A single candle that pierces
// both extremes resolves deterministically: the side with the larger
// penetration distance (high - asiaHigh vs asiaLow - low) wins, with exact
// ties preferring HIGH, so the same input always yields the same sweepSide.
// A sweep outside the strict
// killzone (minutes at or below 120, or at or above 300) returns preRun
// with preRun and candidate mutually exclusive (D-08). A sweep inside the
// killzone sets candidate (gates 1+2) and confirms only when a candle in
// the sweep-plus-next-3 window closes back through the swept extreme with
// displacement at or above dispMult times Asia height (D-09/D-10/D-11);
// otherwise the sweep persists as a candidate (D-12). Asia height is the
// only displacement denominator — never ATR, never fixed points.
export function judasSwing(
  rows: IntradayCandle[],
  range: AsiaRange,
  dispMult: number = DISP_MULT,
): JudasOutput {
  if (!Array.isArray(rows)) {
    throw new Error(`judasSwing requires an IntradayCandle array, got ${String(rows)}`);
  }
  const asiaHigh = (range as AsiaRange | null | undefined)?.high;
  const asiaLow = (range as AsiaRange | null | undefined)?.low;
  if (!Number.isFinite(asiaHigh) || !Number.isFinite(asiaLow)) {
    throw new Error(
      `judasSwing requires a finite AsiaRange, got high=${String(asiaHigh)} low=${String(asiaLow)}`,
    );
  }
  const height = (asiaHigh as number) - (asiaLow as number);
  if (!(height > 0)) {
    throw new Error(`judasSwing requires a positive Asia height, got ${String(height)}`);
  }
  if (!Number.isFinite(dispMult) || !(dispMult > 0)) {
    throw new Error(`judasSwing requires a finite positive dispMult, got ${String(dispMult)}`);
  }

  // T-08-03: forming exclusion first, then finite-OHLC plus
  // finite-positive-time drop, ascending sort, timestamp dedupe (first row
  // wins) on copies so caller arrays are never mutated and sweep-first
  // ordering holds.
  const closed = closedOnlyIntraday(rows);
  const valid = closed.filter((r) => hasFiniteOhlc(r) && hasValidTime(r));
  const sorted = [...valid].sort((a, b) => a.time - b.time);
  const seen = new Set<number>();
  const deduped: IntradayCandle[] = [];
  for (const r of sorted) {
    if (!seen.has(r.time)) {
      seen.add(r.time);
      deduped.push(r);
    }
  }

  if (deduped.length === 0) {
    return idle();
  }

  let sweepIndex = -1;
  let sweepSide: SweepSide | null = null;
  for (let i = 0; i < deduped.length; i++) {
    const r = deduped[i];
    // WR-01: a wide-range candle can pierce both extremes in one print.
    // Resolve by penetration distance so the larger violation wins; exact
    // ties prefer HIGH for determinism.
    const highPierced = r.high > (asiaHigh as number);
    const lowPierced = r.low < (asiaLow as number);
    if (highPierced && lowPierced) {
      const highPen = r.high - (asiaHigh as number);
      const lowPen = (asiaLow as number) - r.low;
      sweepIndex = i;
      sweepSide = lowPen > highPen ? 'LOW' : 'HIGH';
      break;
    }
    if (highPierced) {
      sweepIndex = i;
      sweepSide = 'HIGH';
      break;
    }
    if (lowPierced) {
      sweepIndex = i;
      sweepSide = 'LOW';
      break;
    }
  }

  if (sweepIndex === -1 || sweepSide === null) {
    return idle();
  }

  const sweep = deduped[sweepIndex];
  const minutes = nyMinutesOf(sweep.time);

  // T-08-04: strict inequality on both killzone edges. A pre-killzone (or
  // post-killzone) sweep surfaces as a preRun analyst flag and is never
  // promoted to a candidate.
  if (minutes <= KILLZONE_START_MIN || minutes >= KILLZONE_END_MIN) {
    return {
      candidate: false,
      confirmed: false,
      preRun: true,
      sweepSide,
      sweepTime: sweep.time,
      displacementMult: 0,
    };
  }

  // Gate 3 over the sweep candle plus the next 3 rows (D-10): HIGH confirms
  // when any in-window candle closes at or below the Asia high with Asia
  // high minus that close at or above dispMult times Asia height (D-09,
  // D-11); LOW mirrors. displacementMult reports the realized maximum
  // in-window close distance beyond the swept extreme divided by Asia
  // height, floored at zero.
  const threshold = dispMult * height;
  const window = deduped.slice(sweepIndex, sweepIndex + CONFIRM_WINDOW);
  let confirmed = false;
  let maxDist = 0;
  for (const w of window) {
    if (sweepSide === 'HIGH') {
      const dist = (asiaHigh as number) - w.close;
      if (dist > maxDist) maxDist = dist;
      if (w.close <= (asiaHigh as number) && dist + TOL_EPS >= threshold) {
        confirmed = true;
      }
    } else {
      const dist = w.close - (asiaLow as number);
      if (dist > maxDist) maxDist = dist;
      if (w.close >= (asiaLow as number) && dist + TOL_EPS >= threshold) {
        confirmed = true;
      }
    }
  }

  return {
    candidate: true,
    confirmed,
    preRun: false,
    sweepSide,
    sweepTime: sweep.time,
    displacementMult: Math.max(0, maxDist) / height,
  };
}
