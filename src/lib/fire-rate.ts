// Phase 21 fire-rate review surface (D-09/D-10): pure 7-day FIRE count plus
// band status plus locked UI-SPEC copy. Reads the live firingLog array only —
// no caching layer, no store import, no clock reads. Guard-first shape mirrors
// pool-prose distAtrOf: non-finite inputs degrade to the empty zero result,
// never a throw.

import type { FiringLogEntry } from '@/src/lib/ict/trigger';

/** Operator threshold band floor in fires/week (UI-SPEC interaction model). */
export const FIRE_THRESHOLD_MIN = 1;
/** Operator threshold band ceiling in fires/week. */
export const FIRE_THRESHOLD_MAX = 7;
/** Code default threshold — the known base preserved in code (D-08). */
export const FIRE_THRESHOLD_DEFAULT = 4;

/** Inclusive 7-day window in epoch seconds. */
export const FIRE_RATE_WINDOW_SEC = 7 * 24 * 60 * 60;

export type FireRateStatus = 'empty' | 'below' | 'in' | 'above';

export interface FireRateResult {
  count7d: number;
  status: FireRateStatus;
}

const EMPTY_RESULT: FireRateResult = { count7d: 0, status: 'empty' };

function isFireVerdict(verdict: FiringLogEntry['verdict']): boolean {
  return verdict === 'FIRE_LONG' || verdict === 'FIRE_SHORT';
}

/**
 * Count FIRE verdicts inside the inclusive 7-day epoch window ending at
 * `nowEpochSec`, then resolve the band status against `threshold`:
 * empty (no history) → below (history, zero fires) → in (1..threshold) →
 * above (threshold+1..). Non-finite `nowEpochSec` degrades to the empty
 * result; entries with non-finite or out-of-window `asOf` are skipped.
 */
export function countFireRate(
  entries: FiringLogEntry[],
  nowEpochSec: number,
  threshold: number,
): FireRateResult {
  if (!Number.isFinite(nowEpochSec)) return { ...EMPTY_RESULT };
  if (entries.length === 0) return { ...EMPTY_RESULT };
  const band = Number.isFinite(threshold) ? threshold : FIRE_THRESHOLD_DEFAULT;
  const windowStart = nowEpochSec - FIRE_RATE_WINDOW_SEC;
  let count7d = 0;
  for (const entry of entries) {
    if (!Number.isFinite(entry.asOf)) continue;
    if (entry.asOf < windowStart || entry.asOf > nowEpochSec) continue;
    if (isFireVerdict(entry.verdict)) count7d += 1;
  }
  if (count7d === 0) return { count7d, status: 'below' };
  if (count7d <= band) return { count7d, status: 'in' };
  return { count7d, status: 'above' };
}

/**
 * UI-SPEC locked literals verbatim (copywriting contract): band status is
 * copy-only, no color coding. Count interpolates into the fixed shape —
 * no singular split.
 */
export function fireRateCopy(result: FireRateResult): string {
  const { count7d, status } = result;
  switch (status) {
    case 'in':
      return `WHY NOW: ${count7d} fires / 7d — bandda`;
    case 'below':
      return `WHY NOW: ${count7d} fires / 7d — banddan aşağı (sakit həftə)`;
    case 'above':
      return `WHY NOW: ${count7d} fires / 7d — banddan yuxarı (qızğın həftə)`;
    case 'empty':
      return 'WHY NOW: 0 fires / 7d — hələ məlumat yoxdur';
  }
}
