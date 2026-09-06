import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Candle } from '@/src/lib/ict/types';

// Build a deterministic 22-candle rising fixture (20 closed minimum + forming).
function fixtureCandles(): Candle[] {
  const candles: Candle[] = [];
  for (let i = 0; i < 21; i++) {
    const base = 20000 + i * 10;
    const day = String(i + 1).padStart(2, '0');
    candles.push({
      date: `2026-01-${day}`,
      open: base,
      high: base + 15,
      low: base - 12,
      close: base + 5,
    });
  }
  candles.push({
    date: '2026-01-22',
    open: 20210,
    high: 20210,
    low: 20210,
    close: 20210,
    forming: true,
  });
  return candles;
}

function mockEnvelope(candles: Candle[]) {
  return {
    candles,
    contractHint: 'NQ=F · CME',
    lastUpdatedISO: '2026-02-09T12:00:00.000Z',
    stale: false,
    source: 'live',
  };
}

describe('store: refresh writes envelope in one update', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('writes candles, lastUpdatedISO, stale false, and source in one update', async () => {
    const { useDashboard } = await import('@/src/lib/store');
    const candles = fixtureCandles();
    const envelope = mockEnvelope(candles);
    const fetchFn = vi.fn(async () =>
      Response.json(envelope),
    );
    vi.stubGlobal('fetch', fetchFn);

    await useDashboard.getState().refresh();

    const state = useDashboard.getState();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('/api/yahoo', { cache: 'no-store' });
    expect(state.candles).toEqual(candles);
    expect(state.lastUpdatedISO).toBe(envelope.lastUpdatedISO);
    expect(state.stale).toBe(false);
    expect(state.source).toBe('live');
    expect(state.contractHint).toBe('NQ=F · CME');
    expect(state.inFlight).toBe(false);
    expect(state.lastError).toBeNull();
    vi.unstubAllGlobals();
  });

  it('performs zero additional fetch calls while inFlight is true', async () => {
    const { useDashboard } = await import('@/src/lib/store');
    const candles = fixtureCandles();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(mockEnvelope(candles))),
    );

    useDashboard.setState({ inFlight: true });
    const before = useDashboard.getState().candles;
    await useDashboard.getState().refresh();

    expect(fetch).not.toHaveBeenCalled();
    expect(useDashboard.getState().candles).toEqual(before);
    expect(useDashboard.getState().inFlight).toBe(true);
    useDashboard.setState({ inFlight: false });
    vi.unstubAllGlobals();
  });

  it('keeps last-known candles and records lastError on failed fetch', async () => {
    const { useDashboard } = await import('@/src/lib/store');
    const candles = fixtureCandles();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(mockEnvelope(candles))),
    );
    await useDashboard.getState().refresh();
    vi.unstubAllGlobals();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    await useDashboard.getState().refresh();

    const state = useDashboard.getState();
    expect(state.candles).toEqual(candles);
    expect(state.lastError).toBe('network down');
    expect(state.inFlight).toBe(false);
    vi.unstubAllGlobals();
  });

  it('derives range with eq equal to (high + low) / 2 plus bias and DOL from ict', async () => {
    const { useDashboard } = await import('@/src/lib/store');
    const { computeRange } = await import('@/src/lib/ict/range');
    const candles = fixtureCandles().filter((c) => !c.forming);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(mockEnvelope(candles))),
    );
    await useDashboard.getState().refresh();
    vi.unstubAllGlobals();

    const state = useDashboard.getState();
    const range = state.selectRange();
    expect(range).not.toBeNull();
    expect(range!.eq).toBeCloseTo((range!.high + range!.low) / 2, 10);
    const expected = computeRange(candles, state.asOfBaku, 20);
    expect(range!.high).toBe(expected.high);
    expect(range!.low).toBe(expected.low);

    const bias = state.selectBias();
    expect(bias).not.toBeNull();
    expect(['BULLISH', 'BEARISH', 'COMPRESSION']).toContain(bias!.bias);

    const dol = state.selectDOL();
    expect(dol).not.toBeNull();
    expect(dol!.price).toBeGreaterThan(0);
    expect(dol!.name.length).toBeGreaterThan(0);
    expect([expected.high, expected.low]).toContain(dol!.price);
  });

  it('excludes the forming candle from the derived range but retains it in stored candles', async () => {
    const { useDashboard } = await import('@/src/lib/store');
    const candles = fixtureCandles();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(mockEnvelope(candles))),
    );
    await useDashboard.getState().refresh();
    vi.unstubAllGlobals();

    const state = useDashboard.getState();
    expect(state.candles).toHaveLength(22);
    expect(state.candles[state.candles.length - 1].forming).toBe(true);

    const range = state.selectRange();
    expect(range).not.toBeNull();
    // Last closed candle is 2026-01-21 with high 20215; forming high 20210 must not leak in.
    expect(range!.high).toBe(20215);
  });
});

describe('store: selectRollover flags rollover-week envelopes (ICT-07a)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // 35 closed candles on a 10pt-step trend (closed count clears the
  // MIN_CANDLES_FULL=34 regime-ATR floor) with the final close lifted by 250.
  function gappedCandles(): Candle[] {
    const candles: Candle[] = [];
    const start = Date.UTC(2026, 0, 5);
    for (let i = 0; i < 35; i++) {
      const date = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
      const base = 20000 + i * 10;
      candles.push({
        date,
        open: base,
        high: base + 15,
        low: base - 12,
        close: base + 5,
      });
    }
    const last = candles[candles.length - 1];
    candles[candles.length - 1] = {
      ...last,
      high: last.high + 250,
      close: last.close + 250,
    };
    return candles;
  }

  it('gapped-flags: gapped fixture returns suspect true with hint and rollover-week warning', async () => {
    const { useDashboard } = await import('@/src/lib/store');
    const candles = gappedCandles();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(mockEnvelope(candles))),
    );
    await useDashboard.getState().refresh();
    vi.unstubAllGlobals();

    useDashboard.setState({ asOfBaku: '2026-03-19' });

    const flag = useDashboard.getState().selectRollover();
    expect(flag).not.toBeNull();
    expect(flag!.rolloverSuspect).toBe(true);
    expect(flag!.contractHint).toBe('NQ=F · CME');
    expect(flag!.proximityWarning).toMatch(/rollover week/i);
  });

  it('boundary-clear: gap exactly equal to 3xATR leaves the flag clear', async () => {
    const { useDashboard } = await import('@/src/lib/store');
    const { computeRegime } = await import('@/src/lib/ict/regime');
    // Full-history trend for a finite ATR, then craft the final close so the
    // close-to-close gap equals exactly 3xATR (strict > tripwire stays clear).
    const candles = gappedCandles();
    const atr = computeRegime(candles.slice(0, -1)).atr;
    expect(Number.isFinite(atr) && atr > 0).toBe(true);
    const prev = candles[candles.length - 2];
    const last = candles[candles.length - 1];
    candles[candles.length - 1] = {
      ...last,
      high: Math.max(last.high, prev.close + 3 * atr),
      close: prev.close + 3 * atr,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(mockEnvelope(candles))),
    );
    await useDashboard.getState().refresh();
    vi.unstubAllGlobals();

    useDashboard.setState({ asOfBaku: '2026-01-25' });

    const flag = useDashboard.getState().selectRollover();
    expect(flag).not.toBeNull();
    expect(flag!.rolloverSuspect).toBe(false);
  });

  it('thin-history-null: about 5 closed candles degrade to null without throwing', async () => {
    const { useDashboard } = await import('@/src/lib/store');
    const candles = fixtureCandles().filter((c) => !c.forming).slice(0, 5);
    expect(candles).toHaveLength(5);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(mockEnvelope(candles))),
    );
    await useDashboard.getState().refresh();
    vi.unstubAllGlobals();

    let flag: unknown = 'unset';
    expect(() => {
      flag = useDashboard.getState().selectRollover();
    }).not.toThrow();
    expect(flag).toBeNull();
  });

  it('empty-null: empty candles return null without throwing', async () => {
    const { useDashboard } = await import('@/src/lib/store');
    useDashboard.setState({ candles: [], contractHint: 'NQ=F · CME', asOfBaku: '2026-03-19' });

    let flag: unknown = 'unset';
    expect(() => {
      flag = useDashboard.getState().selectRollover();
    }).not.toThrow();
    expect(flag).toBeNull();
  });

  it('hint-passthrough: returned hint equals the seeded envelope hint exactly', async () => {
    const { useDashboard } = await import('@/src/lib/store');
    const candles = gappedCandles();
    const envelope = { ...mockEnvelope(candles), contractHint: 'NQ=F · CME CUSTOM' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(envelope)),
    );
    await useDashboard.getState().refresh();
    vi.unstubAllGlobals();

    useDashboard.setState({ asOfBaku: '2026-01-25' });

    const flag = useDashboard.getState().selectRollover();
    expect(flag).not.toBeNull();
    expect(flag!.contractHint).toBe('NQ=F · CME CUSTOM');
  });

  it('proximity-pair: near date warns while far date stays null', async () => {
    const { useDashboard } = await import('@/src/lib/store');

    const seed = async () => {
      const candles = gappedCandles();
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => Response.json(mockEnvelope(candles))),
      );
      await useDashboard.getState().refresh();
      vi.unstubAllGlobals();
    };

    await seed();
    useDashboard.setState({ asOfBaku: '2026-03-19' });
    const near = useDashboard.getState().selectRollover();
    expect(near).not.toBeNull();
    expect(near!.proximityWarning).toMatch(/rollover week/i);

    await seed();
    useDashboard.setState({ asOfBaku: '2026-01-25' });
    const far = useDashboard.getState().selectRollover();
    expect(far).not.toBeNull();
    expect(far!.proximityWarning).toBeNull();
  });
});

