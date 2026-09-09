import { ANCHOR_WINDOW } from '@/src/lib/ict/range';
import { MIN_CANDLES_FULL } from '@/src/lib/ict/regime';
import type { Candle, DealingRange } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';

export type ThinTier = 'range-thin' | 'regime-degraded' | 'full';

function thinTier(closedCount: number): ThinTier {
  if (closedCount < ANCHOR_WINDOW) return 'range-thin';
  if (closedCount < MIN_CANDLES_FULL) return 'regime-degraded';
  return 'full';
}

export function thinTierCopy(tier: Exclude<ThinTier, 'full'>, closedCount: number): string {
  if (tier === 'range-thin') {
    return `Nazik tarixçə · ${closedCount} / ${ANCHOR_WINDOW} şam — ekstremumlar etibarsızdır, zonalar və səviyyələr ilkin göstərilir.`;
  }
  return `Sıxılma · ${closedCount} / ${MIN_CANDLES_FULL} şam — tarixçə tam deyil, zonalar və səviyyələr ilkin göstərilir.`;
}

export interface ThinTierResolution {
  tier: ThinTier;
  closedCount: number;
}

export function resolveThinTier(
  candles: Candle[],
  range: DealingRange | null,
): ThinTierResolution | null {
  try {
    if (range === null || range === undefined) return null;
    if (!Array.isArray(candles)) return null;
    const closedCount = closedOnly(candles).length;
    return { tier: thinTier(closedCount), closedCount };
  } catch {
    return null;
  }
}

type ThinBannerEntry = 'thin' | 'rollover';

export function thinBannerOrder(showThin: boolean, showRollover: boolean): ThinBannerEntry[] {
  const order: ThinBannerEntry[] = [];
  if (showThin) order.push('thin');
  if (showRollover) order.push('rollover');
  return order;
}
