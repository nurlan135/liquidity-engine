// Phase 20 full capped pool overlay mapper (D-10, D-12, D-13, D-16).
// Wiring only: consumes the selectPools return read-only, never touches
// src/lib/ict beyond the LiquidityPool type, never trigger/flaw/ticket
// derivation (D-17, D-20). Follows the asiaLineInputs precedent —
// finite-guarded, throw naming the mapper. Colors are hardcoded literals
// per the RESEARCH prefer-literals ruling: never derive alpha from
// resolveCssVar, never read CSS at this layer.

import type { LiquidityPool } from '@/src/lib/ict/pools';

export interface PoolLineInput {
  price: number;
  color: string;
  title: string;
  lineStyle: 'Dashed';
  lineWidth: 1;
}

export interface PoolPriceLineOpts {
  dimmed?: boolean;
}

// Rank colors (D-10): rank-1 full brightness, rank-2 same hue at 50% alpha.
// Ghosts and dimmed envelopes resolve to muted gray (D-12, D-13).
const BSL_RANK_1 = '#00FF88';
const BSL_RANK_2 = 'rgba(0, 255, 136, 0.5)';
const SSL_RANK_1 = '#FF00FF';
const SSL_RANK_2 = 'rgba(255, 0, 255, 0.5)';
export const POOL_MUTED_GRAY = '#71717A';

// Nearest-2-per-side cap (D-16): counts ranked ACTIVE pools only.
export const MAX_ACTIVE_PER_SIDE = 2;

// Swept pools ride as ghosts outside the cap — still visible for retest
// context, never removed, never counted as fresh pain (D-12, D-16).
export function isGhost(pool: LiquidityPool): boolean {
  return pool.status === 'SWEPT';
}

// Per-side rank: 1-indexed position in the capped per-side ACTIVE list.
// Returns null for pools outside the cap or non-ACTIVE pools.
export function rankOf(pool: LiquidityPool, pools: LiquidityPool[]): number | null {
  if (pool.status !== 'ACTIVE') return null;
  const capped = pools.filter((p) => p.status === 'ACTIVE' && p.side === pool.side);
  const cappedSlice = capped.slice(0, MAX_ACTIVE_PER_SIDE);
  const rank = cappedSlice.indexOf(pool);
  return rank === -1 ? null : rank + 1;
}

// Line color for one pool at its rank (D-10, D-12, D-13): ghosts always
// muted; dimmed envelopes force every color to muted; rank-2 same hue at
// 50% alpha literals.
export function poolLineColor(
  pool: LiquidityPool,
  rank: number | null,
  dimmed: boolean,
): string {
  if (dimmed) return POOL_MUTED_GRAY;
  if (isGhost(pool)) return POOL_MUTED_GRAY;
  if (pool.side === 'BSL') {
    return rank === 2 ? BSL_RANK_2 : BSL_RANK_1;
  }
  return rank === 2 ? SSL_RANK_2 : SSL_RANK_1;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// Full mapper: at most 2 ACTIVE per side in ranked input order (max 8
// ACTIVE lines) plus every SWEPT pool as ghosts outside the cap. Titles
// are SIDE-rank-top/bottom. Non-finite bounds throw naming poolPriceLines.
export function poolPriceLines(
  pools: LiquidityPool[],
  opts?: PoolPriceLineOpts | ((side: 'BSL' | 'SSL') => string),
): PoolLineInput[] {
  const dimmed = typeof opts === 'object' && opts !== null ? (opts.dimmed ?? false) : false;
  const colorOverride = typeof opts === 'function' ? opts : null;

  const cappedBsl = pools.filter((p) => p.status === 'ACTIVE' && p.side === 'BSL').slice(0, MAX_ACTIVE_PER_SIDE);
  const cappedSsl = pools.filter((p) => p.status === 'ACTIVE' && p.side === 'SSL').slice(0, MAX_ACTIVE_PER_SIDE);
  const ghosts = pools.filter((p) => isGhost(p));

  const out: PoolLineInput[] = [];
  const emit = (pool: LiquidityPool, rank: number | null) => {
    if (!isFiniteNumber(pool.top) || !isFiniteNumber(pool.bottom)) {
      throw new Error(
        `poolPriceLines requires finite top and bottom, got ${String(pool.top)} ${String(pool.bottom)}`,
      );
    }
    const rankTag = rank === null ? 'ghost' : String(rank);
    const titleSide = pool.side;
    const color =
      colorOverride !== null
        ? colorOverride(pool.side)
        : poolLineColor(pool, rank, dimmed);
    out.push(
      { price: pool.top, color, title: `${titleSide}-${rankTag}-top`, lineStyle: 'Dashed', lineWidth: 1 },
      { price: pool.bottom, color, title: `${titleSide}-${rankTag}-bottom`, lineStyle: 'Dashed', lineWidth: 1 },
    );
  };

  cappedBsl.forEach((pool, i) => emit(pool, i + 1));
  cappedSsl.forEach((pool, i) => emit(pool, i + 1));
  ghosts.forEach((pool) => emit(pool, null));
  return out;
}

// Ghost-skip for STAND_ASIDE (D-15): ACTIVE pairs still render, ghosts drop.
// Removal is unconditional at the call site, so prior ghosts vanish.
export function withoutGhosts(pools: LiquidityPool[]): LiquidityPool[] {
  return pools.filter((p) => !isGhost(p));
}
