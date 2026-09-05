import type { Candle, RolloverFlag } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';

export const ROLLOVER_ATR_MULT = 3;
const PROXIMITY_DAYS = 10;

function thirdFriday(year: number, monthIndex: number): Date {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const offset = (5 - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, monthIndex, 1 + offset + 14));
}

const ROLLOVER_MONTHS = [2, 5, 8, 11];

export function isNearRolloverWeek(asOf: string): boolean {
  const anchor = new Date(`${asOf}T00:00:00Z`);
  if (Number.isNaN(anchor.getTime())) {
    return false;
  }
  const years = [anchor.getUTCFullYear() - 1, anchor.getUTCFullYear(), anchor.getUTCFullYear() + 1];
  for (const year of years) {
    for (const monthIndex of ROLLOVER_MONTHS) {
      const friday = thirdFriday(year, monthIndex);
      const diffDays = Math.abs(anchor.getTime() - friday.getTime()) / 86400000;
      if (diffDays <= PROXIMITY_DAYS) {
        return true;
      }
    }
  }
  return false;
}

export function detectRollover(
  candles: Candle[],
  atr: number,
  asOf: string,
  contractHint: string,
): RolloverFlag {
  const closed = closedOnly(candles);
  const tripwire = ROLLOVER_ATR_MULT * atr;
  let rolloverSuspect = false;
  for (let i = 1; i < closed.length; i++) {
    if (Math.abs(closed[i].close - closed[i - 1].close) > tripwire) {
      rolloverSuspect = true;
      break;
    }
  }
  const proximityWarning = isNearRolloverWeek(asOf)
    ? `Near quarterly rollover week (third Friday of Mar/Jun/Sep/Dec) at ${asOf}: treat gaps as contract-roll artifacts first.`
    : null;
  return { rolloverSuspect, contractHint, proximityWarning };
}
