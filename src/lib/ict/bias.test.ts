import { describe, expect, it } from 'vitest';
import { ANCHOR_WINDOW, computeBias } from '@/src/lib/ict/bias';

describe('bias: top-down rules with mandatory rationale', () => {
  it('zero closed candles yields COMPRESSION with insufficient-history rationale', () => {
    const out = computeBias(0.3, 'expansion', 0);
    expect(out.bias).toBe('COMPRESSION');
    expect(out.rationale).toMatch(/insufficient history/i);
    expect(out.rationale).toMatch(/expansion/);
    expect(out.position).toBe(0.3);
    expect(out.regime).toBe('expansion');
  });

  it('thin history below ANCHOR_WINDOW degrades honestly even in discount', () => {
    const out = computeBias(0.1, 'compression', ANCHOR_WINDOW - 1);
    expect(out.bias).toBe('COMPRESSION');
    expect(out.rationale).toMatch(/insufficient history/i);
  });

  it('position inside the 0.48-0.52 buffer reads COMPRESSION naming position and regime', () => {
    for (const position of [0.48, 0.5, 0.52]) {
      const out = computeBias(position, 'expansion', ANCHOR_WINDOW);
      expect(out.bias).toBe('COMPRESSION');
      expect(out.rationale).toContain(String(position));
      expect(out.rationale).toMatch(/expansion/);
    }
  });

  it('position below 0.48 reads BULLISH with discount rationale and longs-only discipline', () => {
    const out = computeBias(0.25, 'compression', ANCHOR_WINDOW);
    expect(out.bias).toBe('BULLISH');
    expect(out.rationale).toMatch(/discount/i);
    expect(out.rationale).toMatch(/compression/);
    expect(out.rationale).toMatch(/longs only/);
  });

  it('position above 0.52 reads BEARISH with premium rationale and shorts-only discipline', () => {
    const out = computeBias(0.75, 'expansion', ANCHOR_WINDOW);
    expect(out.bias).toBe('BEARISH');
    expect(out.rationale).toMatch(/premium/i);
    expect(out.rationale).toMatch(/expansion/);
    expect(out.rationale).toMatch(/shorts only/);
  });

  it('every rationale is English ASCII naming regime', () => {
    const outputs = [
      computeBias(0.3, 'expansion', 0),
      computeBias(0.5, 'compression', ANCHOR_WINDOW),
      computeBias(0.2, 'expansion', ANCHOR_WINDOW),
      computeBias(0.8, 'compression', ANCHOR_WINDOW),
    ];
    for (const out of outputs) {
      expect(out.rationale.length).toBeGreaterThan(0);
      expect(/^[\x00-\x7F]*$/.test(out.rationale)).toBe(true);
      expect(out.rationale).toMatch(new RegExp(out.regime));
    }
  });

  it('same inputs always return identical bias and rationale text', () => {
    const first = computeBias(0.3, 'expansion', ANCHOR_WINDOW);
    const second = computeBias(0.3, 'expansion', ANCHOR_WINDOW);
    expect(second).toEqual(first);
  });
});
