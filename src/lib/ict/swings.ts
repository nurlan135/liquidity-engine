// Shared swing truth (Phase 19 D-12): strict-fractal swing predicates plus
// the k=2 window contract, single-owned here for SMT (cross-market pairing)
// and pools (single-market geometry). Moved verbatim from smt.ts with zero
// behavior change — smt.ts re-exports these, smt.test.ts stays green as the
// gate. Pure: array inputs only, no clock reads, no store imports.

// D-02: fractal swing parameter shared by both legs, pinned by test.
export const SWING_K = 2;
// D-02: trailing daily-bar window inside which swings are paired.
export const SWING_LOOKBACK = 60;

// Strict fractal swing high: high[i] is the strict maximum of its k
// neighbors each side. Equality means no swing.
export function isSwingHigh(highs: number[], i: number, k: number): boolean {
  if (!Number.isInteger(k) || k < 1) {
    throw new Error(`isSwingHigh requires a positive integer k, got ${k}`);
  }
  if (i < k || i + k >= highs.length) {
    return false;
  }
  for (let j = i - k; j <= i + k; j++) {
    if (j !== i && highs[j] >= highs[i]) {
      return false;
    }
  }
  return true;
}

// Strict fractal swing low: low[i] is the strict minimum of its k
// neighbors each side. Equality means no swing.
export function isSwingLow(lows: number[], i: number, k: number): boolean {
  if (!Number.isInteger(k) || k < 1) {
    throw new Error(`isSwingLow requires a positive integer k, got ${k}`);
  }
  if (i < k || i + k >= lows.length) {
    return false;
  }
  for (let j = i - k; j <= i + k; j++) {
    if (j !== i && lows[j] <= lows[i]) {
      return false;
    }
  }
  return true;
}
