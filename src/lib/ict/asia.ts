import { formatInTimeZone } from 'date-fns-tz';
import type { IntradayCandle } from '@/src/lib/ict/types';
import { closedOnlyIntraday } from '@/src/lib/ict/types';
import { NY_TZ } from '@/src/lib/ict/aggregate';

// ICT-12 (D-01/D-02/D-03/D-04): Asia Range from 1H NQ closed candles on the
// 20:00-00:00 NY wall-clock window (IANA per-candle resolution), wick-to-wick
// extremes, gaps skipped without interpolation. Session membership is per-candle
// NY wall-clock minutes — never a fixed UTC offset, never the Chicago display
// clock. Pure: caller-supplied rows plus a sessionDate string only — no clock
// reads, no store imports, no ES input, no comparison parameters.

/** Asia session start in NY wall-clock hours, inclusive (D-01). */
export const ASIA_START_NY_HOUR = 20;
/** Asia session end in NY wall-clock hours, exclusive (D-01/D-03). */
export const ASIA_END_NY_HOUR = 24;

export interface AsiaRange {
  high: number;
  low: number;
  height: number;
  sessionDate: string;
}

function hasFiniteOhlc(c: IntradayCandle): boolean {
  return (
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close)
  );
}

// T-08-01: the epoch field is part of the boundary. A row with a non-finite or
// non-positive time reaches formatInTimeZone (throw/Invalid Date) and poisons
// sort/dedupe. Kept as a separate predicate so the failure mode stays
// distinguishable from OHLC.
function hasValidTime(c: IntradayCandle): boolean {
  return Number.isFinite(c.time) && c.time > 0;
}

// Per-candle IANA wall-clock minutes since midnight (D-07 discipline, T-08-02).
// formatInTimeZone renders the explicit instant in NY_TZ, so the result is the
// true NY wall clock on every machine and every instant — including inside DST
// transition windows, where ms-plus-offset arithmetic drifts.
function nyMinutesOf(timeSec: number): number {
  const hour = Number(formatInTimeZone(timeSec * 1000, NY_TZ, 'H'));
  const minute = Number(formatInTimeZone(timeSec * 1000, NY_TZ, 'm'));
  return hour * 60 + minute;
}

function nyDateOf(timeSec: number): string {
  return formatInTimeZone(timeSec * 1000, NY_TZ, 'yyyy-MM-dd');
}

// The Asia Range for one 20:00 NY open date: rows whose NY calendar date equals
// sessionDate with wall-clock minutes at/after 20:00 (1200) and strictly before
// 00:00 (1440). The end edge is vacuous for same-date rows but pins D-03
// explicitly: post-midnight rows carry the next NY calendar date, so the date
// equality alone excludes the 00:00-02:00 wicks from the range.
// WR-02: sessionDate is a contract input, not a filter value. An
// undefined/null/malformed date must throw at the boundary instead of
// falling through to an honest-looking null (empty window).
function assertValidSessionDate(sessionDate: string): void {
  if (typeof sessionDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    throw new Error(
      `asiaRange requires a sessionDate in yyyy-MM-dd format, got ${String(sessionDate)}`,
    );
  }
  const [y, m, d] = sessionDate.split('-').map(Number);
  const roundTrip = new Date(Date.UTC(y, m - 1, d));
  if (
    roundTrip.getUTCFullYear() !== y ||
    roundTrip.getUTCMonth() !== m - 1 ||
    roundTrip.getUTCDate() !== d
  ) {
    throw new Error(
      `asiaRange requires a real calendar sessionDate, got ${String(sessionDate)}`,
    );
  }
}

export function asiaRange(rows: IntradayCandle[], sessionDate: string): AsiaRange | null {
  if (!Array.isArray(rows)) {
    throw new Error(`asiaRange requires an IntradayCandle array, got ${String(rows)}`);
  }
  assertValidSessionDate(sessionDate);
  const closed = closedOnlyIntraday(rows);
  const valid = closed.filter((r) => hasFiniteOhlc(r) && hasValidTime(r));

  // T-08-01: ascending sort plus timestamp dedupe (first row wins) on copies so
  // caller arrays are never mutated and out-of-order rows cannot misattribute
  // wick extremes.
  const sorted = [...valid].sort((a, b) => a.time - b.time);
  const seen = new Set<number>();
  const deduped: IntradayCandle[] = [];
  for (const r of sorted) {
    if (!seen.has(r.time)) {
      seen.add(r.time);
      deduped.push(r);
    }
  }

  // D-04: missing candles inside the window are skipped — the range is computed
  // from present closed candles, never interpolated.
  const inWindow = deduped.filter(
    (r) =>
      nyDateOf(r.time) === sessionDate &&
      nyMinutesOf(r.time) >= ASIA_START_NY_HOUR * 60 &&
      nyMinutesOf(r.time) < ASIA_END_NY_HOUR * 60,
  );

  // Honest degrade: an empty window returns null instead of throwing.
  if (inWindow.length === 0) {
    return null;
  }

  // D-02: wick-to-wick extremes (full candle highs/lows, raw OHLC).
  let high = inWindow[0].high;
  let low = inWindow[0].low;
  for (const r of inWindow) {
    if (r.high > high) high = r.high;
    if (r.low < low) low = r.low;
  }
  return { high, low, height: high - low, sessionDate };
}
