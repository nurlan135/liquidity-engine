import { formatInTimeZone } from 'date-fns-tz';
import type { Candle, IntradayCandle } from '@/src/lib/ict/types';
import { closedOnlyIntraday } from '@/src/lib/ict/types';

// ICT-11 (D-12/D-13/D-14): NY-anchored 1H to 4H synthesis. Yahoo has no 4H
// interval, so 4H structure is synthesized from complete 1H blocks on the
// 18:00 ET futures-day grid. Blocks reuse the D1 Candle shape so computeRange
// and computeBias consume them unchanged. Pure: injected rows plus an asOf
// date string only — no clock reads, no store imports, raw OHLC only.

/** IANA anchor for the 18:00 ET daily-open grid (D-12). */
export const NY_TZ = 'America/New_York';
/** CME equity-index day boundary in NY wall-clock hours (D-12). */
export const DAY_OPEN_NY_HOUR = 18;
/** 1H constituents per 4H block; only complete blocks emit (D-13). */
export const BLOCK_SIZE = 4;

function hasFiniteOhlc(c: IntradayCandle): boolean {
  return (
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close)
  );
}

// WR-05: the epoch field is part of the boundary (T-07-01). A row with a
// non-finite or non-positive time reaches formatInTimeZone (throw/Invalid
// Date) and poisons seen/sort. Kept as a separate predicate so the failure
// mode stays distinguishable from OHLC.
function hasValidTime(c: IntradayCandle): boolean {
  return Number.isFinite(c.time) && c.time > 0;
}

// Per-candle IANA wall-clock resolution (D-12, prohibition: never a fixed UTC
// offset). formatInTimeZone renders the explicit instant in NY_TZ, so the
// result is the true NY wall clock on every machine and every instant —
// including inside DST transition windows, where ms-plus-offset arithmetic
// drifts (getTimezoneOffset interprets the Date's machine-local fields, so
// its answer near a transition depends on the host time zone).
function nyDateOf(timeSec: number): string {
  return formatInTimeZone(timeSec * 1000, NY_TZ, 'yyyy-MM-dd');
}

function nyHourOf(timeSec: number): number {
  return Number(formatInTimeZone(timeSec * 1000, NY_TZ, 'H'));
}

// Pure Gregorian calendar step-back on an ASCII yyyy-MM-dd date. Integer
// civil-date arithmetic (no Date construction) so day rollback stays exact
// across DST-short and DST-long days.
function daysFromCivil(y: number, m: number, d: number): number {
  const yAdj = m <= 2 ? y - 1 : y;
  const era = Math.floor((yAdj >= 0 ? yAdj : yAdj - 399) / 400);
  const yoe = yAdj - era * 400;
  const mp = (m + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function civilFromDays(z: number): [number, number, number] {
  const zAdj = z + 719468;
  const era = Math.floor((zAdj >= 0 ? zAdj : zAdj - 146096) / 146097);
  const doe = zAdj - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return [m <= 2 ? y + 1 : y, m, d];
}

function prevCalendarDay(ymd: string): string {
  const [ys, ms, ds] = ymd.split('-');
  const [y, m, d] = civilFromDays(daysFromCivil(Number(ys), Number(ms), Number(ds)) - 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}`;
}

// Anchor-day plus within-day block index for one 1H row. A row landing
// exactly on a block boundary belongs to the block starting there (floor
// semantics); it is never duplicated. Within-day index is the floor of the
// forward distance from 18:00 divided by BLOCK_SIZE, giving B1..B6.
function blockKey(timeSec: number): string {
  const date = nyDateOf(timeSec);
  const hour = nyHourOf(timeSec);
  const anchorDay = hour >= DAY_OPEN_NY_HOUR ? date : prevCalendarDay(date);
  const dist = (hour - DAY_OPEN_NY_HOUR + 24) % 24;
  const idx = Math.floor(dist / BLOCK_SIZE);
  return `${anchorDay}-B${idx + 1}`;
}

// D-13/D-14: bucket closed 1H rows into complete 4-candle blocks on the NY
// grid and emit each block as a Candle (first-open / max-high / min-low /
// last-close, chronological). Accepts UTC epoch-second IntradayCandle input
// only — never business-day strings. asOf (yyyy-MM-dd) is the injected right
// edge: rows whose NY calendar date sorts after it are excluded.
export function aggregate1Hto4H(rows: IntradayCandle[], asOf: string): Candle[] {
  // T-07-01: re-validate at the aggregate boundary rather than trusting the
  // caller (join.ts:55-58 forming-regress precedent). The forming 1H candle
  // renders on the chart but never enters blocks; non-finite OHLC never
  // reaches aggregation.
  const closed = closedOnlyIntraday(rows);
  const valid = closed.filter((r) => hasFiniteOhlc(r) && hasValidTime(r));

  // T-07-04: ascending sort plus timestamp dedupe (first row wins) before
  // grouping, so out-of-order rows cannot misattribute first-open/last-close.
  const sorted = [...valid].sort((a, b) => a.time - b.time);
  const seen = new Set<number>();
  const deduped: IntradayCandle[] = [];
  for (const r of sorted) {
    if (!seen.has(r.time)) {
      seen.add(r.time);
      deduped.push(r);
    }
  }

  const inScope = deduped.filter((r) => nyDateOf(r.time) <= asOf);

  const groups = new Map<string, IntradayCandle[]>();
  for (const r of inScope) {
    const key = blockKey(r.time);
    const g = groups.get(key);
    if (g) {
      g.push(r);
    } else {
      groups.set(key, [r]);
    }
  }

  // D-13 complete-blocks-only: a group emits iff it holds exactly
  // BLOCK_SIZE constituents after DST fall-back merging. The trailing
  // partial, DST-short (spring-forward) days, and maintenance-break gaps stay
  // absent — never synthesize filler rows.
  // WR-03: on the November fall-back Sunday the repeated 01:00 wall-clock
  // hour yields two distinct epoch rows in the same block (5 members). The
  // duplicate wall-clock hour is merged (first occurrence wins) so the valid
  // block still emits 4 constituents.
  const blocks: Candle[] = [];
  for (const [date, group] of groups) {
    let members = group;
    if (group.length > BLOCK_SIZE) {
      const seenWallClock = new Set<string>();
      const merged: IntradayCandle[] = [];
      for (const m of group) {
        // Wall-clock identity (NY date + hour) distinguishes the repeated
        // fall-back hour: same wall clock, different epoch instants.
        const wallClock = `${nyDateOf(m.time)}@${nyHourOf(m.time)}`;
        if (!seenWallClock.has(wallClock)) {
          seenWallClock.add(wallClock);
          merged.push(m);
        }
      }
      members = merged;
    }
    if (members.length !== BLOCK_SIZE) {
      continue;
    }
    let high = members[0].high;
    let low = members[0].low;
    for (const m of members) {
      if (m.high > high) high = m.high;
      if (m.low < low) low = m.low;
    }
    blocks.push({
      date,
      open: members[0].open,
      high,
      low,
      close: members[members.length - 1].close,
    });
  }
  return blocks;
}
