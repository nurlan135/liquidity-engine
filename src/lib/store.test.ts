import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Candle } from '@/src/lib/ict/types';
import misaligned from '@/src/lib/__fixtures__/join-misaligned.json';

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

  it('refresh-failure-sets-stale: failed fetch marks stale with last-known preserved', async () => {
    const { useDashboard } = await import('@/src/lib/store');
    const candles = fixtureCandles();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(mockEnvelope(candles))),
    );
    await useDashboard.getState().refresh();
    vi.unstubAllGlobals();
    const beforeISO = useDashboard.getState().lastUpdatedISO;

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    await useDashboard.getState().refresh();

    const state = useDashboard.getState();
    expect(state.stale).toBe(true);
    expect(state.lastError).toBe('network down');
    expect(state.candles).toEqual(candles);
    expect(state.lastUpdatedISO).toBe(beforeISO);
    expect(state.inFlight).toBe(false);
    vi.unstubAllGlobals();
  });

  it('refresh-success-clears-stale: next success restores envelope truth', async () => {
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
    expect(useDashboard.getState().stale).toBe(true);
    vi.unstubAllGlobals();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(mockEnvelope(candles))),
    );
    await useDashboard.getState().refresh();

    const state = useDashboard.getState();
    expect(state.stale).toBe(false);
    expect(state.lastError).toBeNull();
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

  it('lastclose-closed-basis-divergence: forming close never skews derived position', async () => {
    const { useDashboard } = await import('@/src/lib/store');
    const { computeRange, computePosition } = await import('@/src/lib/ict/range');
    const closed = fixtureCandles().filter((c) => !c.forming);
    // Force the last closed row to a known close, then append a far forming close.
    closed[closed.length - 1] = { ...closed[closed.length - 1], close: 20205 };
    const candles: Candle[] = [
      ...closed,
      { date: '2026-01-22', open: 21000, high: 21050, low: 20950, close: 21000, forming: true },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(mockEnvelope(candles))),
    );
    await useDashboard.getState().refresh();
    vi.unstubAllGlobals();

    const state = useDashboard.getState();
    expect(state.selectLastClose()).toBe(20205);
    const range = state.selectRange();
    expect(range).not.toBeNull();
    const expectedRange = computeRange(closed, state.asOfBaku, 20);
    expect(state.selectPosition()).toBeCloseTo(
      computePosition(expectedRange, 20205),
      10,
    );
    expect(state.candles).toHaveLength(closed.length + 1);
    expect(state.candles[state.candles.length - 1].forming).toBe(true);
    expect(range!.high).toBe(expectedRange.high);
    expect(range!.high).not.toBe(21050);
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

  it('boundary-clear: gap exactly equal to the full-input 3xATR tripwire leaves the flag clear', async () => {
    const { useDashboard } = await import('@/src/lib/store');
    const { computeRegime } = await import('@/src/lib/ict/regime');
    const { detectRollover, ROLLOVER_ATR_MULT } = await import('@/src/lib/ict/rollover');
    // Exact-boundary pin belongs at the pure-function level with an explicit
    // ATR argument (strict > tripwire stays clear at gap == 3xATR).
    const probeBase = gappedCandles().slice(0, 2);
    const probeAtr = computeRegime(gappedCandles().slice(0, -1)).atr;
    expect(Number.isFinite(probeAtr) && probeAtr > 0).toBe(true);
    const probeEdge = {
      ...probeBase[1],
      close: probeBase[0].close + ROLLOVER_ATR_MULT * probeAtr,
    };
    expect(
      detectRollover([probeBase[0], probeEdge], probeAtr, '2026-01-25', 'NQ=F · CME').rolloverSuspect,
    ).toBe(false);
    // Store pass: craft the final close against the same full-input ATR the
    // selector uses — fixed-point iteration solves gap == 3xATR(full candles)
    // so the assertion pins the selector wiring, not ATR smoothing internals.
    const candles = gappedCandles();
    const prev = candles[candles.length - 2];
    const seedAtr = computeRegime(candles.slice(0, -1)).atr;
    expect(Number.isFinite(seedAtr) && seedAtr > 0).toBe(true);
    let gap = ROLLOVER_ATR_MULT * seedAtr;
    for (let i = 0; i < 50; i++) {
      const trial = candles.map((c, idx) =>
        idx === candles.length - 1
          ? { ...c, high: Math.max(c.high, prev.close + gap), close: prev.close + gap }
          : c,
      );
      const next = ROLLOVER_ATR_MULT * computeRegime(trial).atr;
      if (Math.abs(next - gap) < 1e-9) {
        gap = next;
        break;
      }
      gap = next;
    }
    const last = candles[candles.length - 1];
    candles[candles.length - 1] = {
      ...last,
      high: Math.max(last.high, prev.close + gap),
      close: prev.close + gap,
    };
    // Sanity: the crafted gap equals the tripwire the selector will compute.
    const fullAtr = computeRegime(candles).atr;
    expect(Math.abs(gap - ROLLOVER_ATR_MULT * fullAtr)).toBeLessThan(1e-6);
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

describe('store: dual-leg refreshers with stagger and per-leg envelopes (DATA-06/DATA-05/DATA-07)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(async () => {
    // Stop any running dual timers before restoring real timers so no
    // stray interval fires across tests.
    try {
      const { useDashboard } = await import('@/src/lib/store');
      useDashboard.getState().stopDualPoll();
    } catch {
      // store module may not be loaded — nothing to stop
    }
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // Build a daily-Candle envelope from IntradayCandle-shaped fixture rows.
  // The hourly fixture spine cannot map to midnight-UTC date strings
  // injectively (many hours share one date, and isValidEnvelope demands
  // strictly ascending dates), so this helper maps each distinct epoch time
  // to a distinct business-day string via a shared monotonic dictionary:
  // same time -> same date (intersection preserved), different times ->
  // different dates (envelope valid). Null OHLC rows become finite via ??
  // so the envelope guard accepts them; forming flags are preserved so the
  // join boundary still drops them. The store projection inverts the
  // equality structure, so the join sees the Plan 03 intersection exactly.
  const TIME_BASE_MS = Date.UTC(2026, 0, 1);
  function dateForTime(time: number): string {
    const spine = 1767596400;
    const dayIndex = Math.round((time - spine) / 3600);
    return new Date(TIME_BASE_MS + dayIndex * 86_400_000).toISOString().slice(0, 10);
  }
  function envelopeFromTimes(rows: Array<{ time: number } & Record<string, unknown>>, hint: string) {
    // Mirror the parser contract (Plan 02): incomplete non-last rows never
    // reach the store — the 2 NQ null-OHLC rows are already dropped upstream.
    // Forming flags are preserved so the join boundary still proves exclusion.
    // Envelope legs: NQ 19 rows (18 valid + 1 forming), ES 18 rows
    // (17 valid + 1 forming); store coverage is nq 18 es 17 joined 14
    // dropped 7 — joined 14 and dropped 7 exactly as Plan 03 pins.
    const candles: Candle[] = rows
      .filter(
        (r) =>
          typeof r.open === 'number' &&
          typeof r.high === 'number' &&
          typeof r.low === 'number' &&
          typeof r.close === 'number',
      )
      .map((r) => ({
        date: dateForTime(r.time),
        open: r.open as number,
        high: r.high as number,
        low: r.low as number,
        close: r.close as number,
        ...(r.forming === true ? { forming: true as const } : {}),
      }));
    return {
      candles,
      contractHint: hint,
      lastUpdatedISO: '2026-02-09T12:00:00.000Z',
      stale: false,
      source: 'live',
    };
  }

  function stubLegs() {
    const nq = misaligned.nq as unknown as Array<{ time: number } & Record<string, unknown>>;
    const es = misaligned.es as unknown as Array<{ time: number } & Record<string, unknown>>;
    // Fixture rows share spine times but map to the same date strings only
    // per shared time, so the projected join intersection matches Plan 03:
    // nq 20 es 17 joined 14 dropped 7.
    const nqEnv = envelopeFromTimes(nq, 'NQ=F · CME');
    const esEnv = envelopeFromTimes(es, 'ES=F · CME');
    const fetchFn = vi.fn(async (url: string) =>
      Response.json(url.includes('symbol=ES%3DF') || url.includes('symbol=ES=F') ? esEnv : nqEnv),
    );
    vi.stubGlobal('fetch', fetchFn);
    return { fetchFn, nqEnv, esEnv };
  }

  async function resetDualState() {
    // Fresh module instance per test: wipes module-level dual timers AND
    // the zustand store state, so no prior lastSchedule or leg state leaks.
    // Returns the re-imported useDashboard (same instance the test uses).
    vi.resetModules();
    const mod = await import('@/src/lib/store');
    return { useDashboard: mod.useDashboard };
  }

  it('stagger: startDualPoll fires NQ near second 00 and ES about 30s later', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { useDashboard } = await resetDualState();
    const { fetchFn } = stubLegs();
    // Pin the wall clock mid-minute so both offsets are deterministic:
    // NQ next :00 is 30s out, ES next :30 is 60s out. The injectable clock
    // arg keeps the assertion independent of fake-timer Date mocking, and
    // mocked Math.random pins jitter to exactly 7.5s per leg.
    // Two module instances exist here (top-level import + resetModules
    // re-import): read the probe from the same instance that started the
    // timers — same-instance access keeps the assertion honest.
    useDashboard.getState().startDualPoll(new Date('2026-02-09T12:00:30.000Z'));
    // Mount owns the first poll: the immediate NQ refresh lands at once.
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('/api/yahoo', { cache: 'no-store' });

    // NQ timer: fires at the next :00 plus 5–10s jitter (35–40s from here).
    // Pin the schedule through the test-visible probe (D-01 offsets), then
    // prove the timers actually fire by sweeping the clock and watching
    // real fetch calls land 30s apart.
    // Offsets live in store state (same zustand instance that started the
    // timers), so no module-instance split can hand back a stale cell.
    const schedule = useDashboard.getState().lastSchedule;
    expect(schedule).not.toBeNull();
    expect(schedule!.delayNQ).toBeGreaterThanOrEqual(35_000);
    expect(schedule!.delayNQ).toBeLessThanOrEqual(40_000);
    expect(schedule!.delayES).toBeGreaterThanOrEqual(65_000);
    expect(schedule!.delayES).toBeLessThanOrEqual(70_000);
    expect(schedule!.delayES - schedule!.delayNQ).toBeGreaterThanOrEqual(25_000);
    expect(schedule!.delayES - schedule!.delayNQ).toBeLessThanOrEqual(35_000);

    let nqFireAt = -1;
    let esFireAt = -1;
    for (let t = 0; t <= 75_000; t += 1_000) {
      await vi.advanceTimersByTimeAsync(1_000);
      const nqCalls = fetchFn.mock.calls.filter(([url]) => url === '/api/yahoo');
      const esCalls = fetchFn.mock.calls.filter(([url]) => String(url).includes('symbol=ES'));
      if (nqFireAt === -1 && nqCalls.length === 2) nqFireAt = t + 1_000;
      if (esFireAt === -1 && esCalls.length === 1) {
        esFireAt = t + 1_000;
        const esInit = (esCalls[0] as unknown as [string, RequestInit])[1];
        expect(esInit).toEqual({ cache: 'no-store' });
        break;
      }
    }
    // Both timers fire, ~30s apart — the D-01 stagger invariant end to end.
    expect(nqFireAt).toBeGreaterThan(0);
    expect(esFireAt).toBeGreaterThan(0);
    expect(esFireAt - nqFireAt).toBeGreaterThanOrEqual(25_000);
    expect(esFireAt - nqFireAt).toBeLessThanOrEqual(35_000);

    useDashboard.getState().stopDualPoll();
  });

  it('independent-failure: ES failure marks only es stale with rows preserved and NQ live', async () => {
    const { useDashboard } = await resetDualState();
    const { nqEnv, esEnv } = stubLegs();
    const nqCandles = nqEnv.candles as Candle[];
    const esCandles = esEnv.candles as Candle[];
    const fetchFn = vi.fn(async (url: string) => {
      if (String(url).includes('symbol=ES')) {
        return Response.json(esEnv);
      }
      return Response.json(nqEnv);
    });
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', fetchFn);

    await useDashboard.getState().refreshNQ();
    await useDashboard.getState().refreshES();
    expect(useDashboard.getState().nq.stale).toBe(false);
    expect(useDashboard.getState().es.stale).toBe(false);
    expect(useDashboard.getState().es.candles).toEqual(esCandles);

    // ES leg fails: only es goes stale, its rows preserved, NQ untouched.
    vi.unstubAllGlobals();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('symbol=ES')) {
          throw new Error('es upstream down');
        }
        return Response.json(nqEnv);
      }),
    );
    await useDashboard.getState().refreshES();

    const state = useDashboard.getState();
    expect(state.es.stale).toBe(true);
    expect(state.es.lastError).toBe('es upstream down');
    expect(state.es.candles).toEqual(esCandles);
    expect(state.nq.stale).toBe(false);
    expect(state.nq.lastError).toBeNull();
    expect(state.nq.candles).toEqual(nqCandles);
    // Top-level NQ truth never touched by the ES failure (D-06).
    expect(state.stale).toBe(false);
    expect(state.candles).toEqual(nqCandles);
    // No merged stale boolean anywhere on the state.
    expect('staleMerged' in state).toBe(false);
    expect('staleES' in state === false || typeof state.stale === 'boolean').toBe(true);

    useDashboard.getState().stopDualPoll();
  });

  it('singleflight: concurrent same-leg refreshes coalesce while cross-leg proceeds independently', async () => {
    const { useDashboard } = await resetDualState();
    const { nqEnv, esEnv } = stubLegs();
    let releaseNQ!: (v: Response) => void;
    const gateNQ = new Promise<Response>((resolve) => {
      releaseNQ = resolve;
    });
    const fetchFn = vi.fn(async (url: string) => {
      if (String(url).includes('symbol=ES')) {
        return Response.json(esEnv);
      }
      return gateNQ;
    });
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', fetchFn);

    const first = useDashboard.getState().refreshNQ();
    const second = useDashboard.getState().refreshNQ();
    // ES proceeds while NQ is gated: independent in-flight flags (T-06-03).
    const esPromise = useDashboard.getState().refreshES();
    await esPromise;
    expect(useDashboard.getState().es.candles).toEqual(esEnv.candles);

    releaseNQ(Response.json(nqEnv));
    await first;
    await second;
    const nqCalls = fetchFn.mock.calls.filter(([url]) => url === '/api/yahoo');
    expect(nqCalls.length).toBe(1);
    expect(useDashboard.getState().nq.candles).toEqual(nqEnv.candles);

    useDashboard.getState().stopDualPoll();
  });

  it('coverage: fixture legs join 14 with dropped 7 via the Plan 03 join', async () => {
    const { useDashboard } = await resetDualState();
    stubLegs();

    await useDashboard.getState().refreshNQ();
    await useDashboard.getState().refreshES();

    // Envelope legs (parser contract upstream of the store): NQ 19 rows
    // with 1 forming, ES 18 rows with 1 forming. Post-forming coverage:
    // nq 18 es 17 joined 14 dropped 7 — joined 14 and dropped 7 pin the
    // Plan 03 misaligned intersection exactly.
    const { coverage } = useDashboard.getState();
    expect(coverage).toEqual({ nq: 18, es: 17, joined: 14, dropped: 7 });
  });

  it('stopDualPoll: halting timers ends all further fetches', async () => {
    vi.useFakeTimers();
    const { useDashboard } = await resetDualState();
    stubLegs();

    useDashboard.getState().startDualPoll(new Date('2026-02-09T12:00:30.000Z'));
    await vi.advanceTimersByTimeAsync(0);
    const atStart = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(atStart).toBe(1);

    useDashboard.getState().stopDualPoll();
    await vi.advanceTimersByTimeAsync(300_000);
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(atStart);
  });
});

