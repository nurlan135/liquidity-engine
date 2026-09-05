// Blocked-side derivation tests: which side stands down per bias direction.
// English identifiers; locked English chips BLOCKED untouched.

import { describe, expect, it } from 'vitest';
import {
  BLOCKED_DISCOUNT_LABEL,
  BLOCKED_PREMIUM_LABEL,
  deriveBlockedSide,
} from '@/src/lib/blocked-side';

describe('blocked-side', () => {
  it('blocks SHORT with the premium label on BULLISH', () => {
    const result = deriveBlockedSide('BULLISH');
    expect(result.blocked).toBe('SHORT');
    expect(result.strike).toBe(true);
    expect(result.label).toBe(BLOCKED_PREMIUM_LABEL);
  });

  it('blocks LONG with the discount label on BEARISH', () => {
    const result = deriveBlockedSide('BEARISH');
    expect(result.blocked).toBe('LONG');
    expect(result.strike).toBe(true);
    expect(result.label).toBe(BLOCKED_DISCOUNT_LABEL);
  });

  it('stands both sides down with no strike on COMPRESSION', () => {
    const result = deriveBlockedSide('COMPRESSION');
    expect(result.blocked).toBe('BOTH');
    expect(result.strike).toBe(false);
    expect(result.label).toBe('');
  });
});
