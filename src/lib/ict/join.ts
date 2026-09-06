import type { IntradayCandle } from './types';

// D-13: coverage diagnostics ride alongside every join result. Counts are
// row cardinalities only — no prices or timestamps leak beyond joined rows.
export interface JoinCoverage {
  /** NQ rows entering the join after the forming-boundary drop (D-15). */
  nq: number;
  /** ES rows entering the join after the forming-boundary drop (D-15). */
  es: number;
  /** Timestamp-shared pairs emitted. */
  joined: number;
  /**
   * Valid post-filter rows with no counterpart on the other leg.
   * Counted on the valid-row basis only: pre-join-dropped rows (non-finite
   * OHLC, forming) are already excluded from nq/es, so they are not
   * double-counted here. Invariant: dropped = (nqValid - joined) +
   * (esValid - joined), where nqValid/esValid are the finite-OHLC subsets.
   */
  dropped: number;
}

export interface JoinedRow {
  /** Shared UTC epoch-seconds timestamp. One row per shared timestamp. */
  time: number;
  nq: IntradayCandle;
  es: IntradayCandle;
}

export interface JoinResult {
  joined: JoinedRow[];
  coverage: JoinCoverage;
}

function hasFiniteOhlc(c: IntradayCandle): boolean {
  return (
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close)
  );
}

// D-07: timestamp inner-join on numeric epoch time only — never index zipping,
// so misaligned rows can never be compared. Pure: no wall-clock reads, no I/O.
// Works on its own intersected working copy; the D1 NQ anchor path
// (range.ts / computeRange callers) is untouched and unaffected.
export function innerJoinOnTimestamp(
  nq: IntradayCandle[],
  es: IntradayCandle[],
): JoinResult {
  // D-15 / T-06-05: re-validate at the join boundary rather than trusting the
  // parser layer. Forming rows drop first (a regressed parser flagging nothing
  // still cannot leak a self-updating candle into comparisons), then
  // non-finite OHLC rows.
  const nqClosed = nq.filter((c) => !c.forming);
  const esClosed = es.filter((c) => !c.forming);
  const nqValid = nqClosed.filter(hasFiniteOhlc);
  const esValid = esClosed.filter(hasFiniteOhlc);

  const esByTime = new Map<number, IntradayCandle>();
  for (const c of esValid) {
    if (!esByTime.has(c.time)) {
      esByTime.set(c.time, c);
    }
  }

  // DATA-04: one row per shared timestamp, deterministic ascending output.
  const seen = new Set<number>();
  const joined: JoinedRow[] = [];
  for (const n of nqValid) {
    if (seen.has(n.time)) {
      continue;
    }
    const e = esByTime.get(n.time);
    if (e !== undefined) {
      seen.add(n.time);
      joined.push({ time: n.time, nq: n, es: e });
    }
  }
  joined.sort((a, b) => a.time - b.time);

  // D-14: warn, never refuse — rows plus coverage are always returned.
  return {
    joined,
    coverage: {
      nq: nqClosed.length,
      es: esClosed.length,
      joined: joined.length,
      dropped: nqValid.length + esValid.length - 2 * joined.length,
    },
  };
}
