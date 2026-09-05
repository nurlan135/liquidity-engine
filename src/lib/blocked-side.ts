// Blocked-side derivation: which trading side stands down per bias direction.
// Pure: no I/O, no clock. English identifiers; locked English chip BLOCKED untouched.

import type { BiasDirection } from '@/src/lib/ict/types';

export type BlockedSide = 'LONG' | 'SHORT' | 'BOTH' | 'NONE';

export const BLOCKED_PREMIUM_LABEL = 'BLOCKED — premium';

export const BLOCKED_DISCOUNT_LABEL = 'BLOCKED — discount';

export interface BlockedSideResult {
  blocked: BlockedSide;
  strike: boolean;
  label: string;
}

// BULLISH strikes the SHORT row (premium side blocked); BEARISH strikes the
// LONG row (discount side blocked); COMPRESSION dims both rows with no strike
// since the rationale string already states both sides stand down.
export function deriveBlockedSide(bias: BiasDirection): BlockedSideResult {
  if (bias === 'BULLISH') {
    return { blocked: 'SHORT', strike: true, label: BLOCKED_PREMIUM_LABEL };
  }
  if (bias === 'BEARISH') {
    return { blocked: 'LONG', strike: true, label: BLOCKED_DISCOUNT_LABEL };
  }
  return { blocked: 'BOTH', strike: false, label: '' };
}
