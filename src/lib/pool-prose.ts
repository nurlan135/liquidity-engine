// Phase 20 rank-1 Pain Threshold prose (D-01, D-04, D-19).
// Wiring only: consumes the selectPools return read-only. No pool math,
// no trigger/ticket derivation (D-17, D-20). ATR comes from the same
// computeATR over the same nq candles the scorer uses — no independent
// distance invention (D-19).

import type { Candle } from '@/src/lib/ict/types';
import type { LiquidityPool } from '@/src/lib/ict/pools';
import { computeATR } from '@/src/lib/ict/regime';

// Inline hedge fragment (D-04, S1-03): lives inside the rank-1 sentence,
// never a separate footer element.
export const HEDGE_FRAGMENT = '(proyeksiya — k=2 D1 fraktal; dəqiq stop qiyməti deyil)';

// Null-selector empty copy (D-08): never last-known/cached pools.
export const NO_POOLS_COPY = 'Məlumat yoxdur';

// No-pools body line (D-05): distinct line when the selector is healthy
// but zero ACTIVE pools exist.
export const EMPTY_POOLS_BODY = 'Aktiv hovuz yoxdur — D1 k=2 fraktal təsdiqlənmədi.';

// Fixed Azerbaijani sub-block label (D-03).
export const PAIN_THRESHOLD_LABEL = 'Ağrı Həddi';

// Rank-1 pool: the pools array is already rank-ordered by evaluatePools,
// so the first element is rank-1. Returns null on empty input.
export function rank1Of(pools: LiquidityPool[]): LiquidityPool | null {
  if (pools.length === 0) return null;
  return pools[0];
}

function poolMid(pool: LiquidityPool): number {
  return (pool.top + pool.bottom) / 2;
}

// ATR-unit distance of a pool mid from lastClose. Pure arithmetic over a
// caller-supplied ATR — zero/non-finite ATR guards to null.
export function distAtrOf(pool: LiquidityPool, lastClose: number, atr: number): number | null {
  if (!Number.isFinite(atr) || atr <= 0) return null;
  if (!Number.isFinite(lastClose)) return null;
  return Math.abs(poolMid(pool) - lastClose) / atr;
}

// Rank-1 distance from the same candle set the scorer uses: last ATR value
// over the given candles plus the last finite close. Returns null when the
// series cannot supply a finite ATR or close.
export function rankDistAtr(pool: LiquidityPool, candles: Candle[]): number | null {
  const series = computeATR(candles);
  if (series.length === 0) return null;
  const atr = series[series.length - 1];
  if (candles.length === 0) return null;
  const lastClose = candles[candles.length - 1].close;
  return distAtrOf(pool, lastClose, atr);
}

// Rank-1 sentence (D-01): side plus zone bounds plus ATR distance plus
// swept status plus inline hedge. SWEPT callers render the result in the
// muted tone; the token itself stays verbatim (D-02).
export function formatRank1Sentence(pool: LiquidityPool, distAtr: number | null): string {
  const side = pool.side;
  const bounds = `${pool.top.toFixed(2)} / ${pool.bottom.toFixed(2)}`;
  const distance = distAtr === null ? '—' : `${distAtr.toFixed(1)} ATR`;
  return `${side} ${bounds} · ${distance} · ${pool.status} ${HEDGE_FRAGMENT}`;
}
