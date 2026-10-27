// Phase 20 thin single-BSL pool overlay mapper (D-09, D-11).
// Wiring only: consumes the selectPools return read-only, never touches
// src/lib/ict or trigger/ticket derivation (D-17, D-20). Follows the
// asiaLineInputs precedent — finite-guarded, throw naming the mapper.

import type { LiquidityPool } from '@/src/lib/ict/pools';

export interface PoolLineInput {
  price: number;
  color: string;
  title: string;
  lineStyle: 'Dashed';
  lineWidth: 1;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// Thin slice (tracer): at most the first BSL ACTIVE pool as a top/bottom
// pair. Empty input yields no lines; swept/non-BSL pools are skipped in
// this slice (full capped overlay with ghosts lands in plan 20-02).
export function poolPriceLines(
  pools: LiquidityPool[],
  resolveColor: (side: 'BSL' | 'SSL') => string,
): PoolLineInput[] {
  const rank1 = pools.find((p) => p.side === 'BSL' && p.status === 'ACTIVE');
  if (rank1 === undefined) return [];
  if (!isFiniteNumber(rank1.top) || !isFiniteNumber(rank1.bottom)) {
    throw new Error(
      `poolPriceLines requires finite top and bottom, got ${String(rank1.top)} ${String(rank1.bottom)}`,
    );
  }
  const color = resolveColor('BSL');
  return [
    { price: rank1.top, color, title: 'BSL-1-top', lineStyle: 'Dashed', lineWidth: 1 },
    { price: rank1.bottom, color, title: 'BSL-1-bottom', lineStyle: 'Dashed', lineWidth: 1 },
  ];
}
