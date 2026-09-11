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

// Phase 9 intraday builders: epoch-row IntradayCandle rows plus a matching
// envelope. Times land in the 20:00+ NY Asia window of one NY calendar date
// so selectAsia maps sessionDate deterministically.
const INTRA_BASE = Date.UTC(2026, 1, 10, 1, 30, 0) / 1000;

function intradayRows(count: number, start: number = INTRA_BASE, step = 3600): import('@/src/lib/ict/types').IntradayCandle[] {
  const rows: import('@/src/lib/ict/types').IntradayCandle[] = [];
  for (let i = 0; i < count; i++) {
    const base = 20000 + i * 10;
    rows.push({
      time: start + i * step,
      open: base,
      high: base + 15,
      low: base - 12,
      close: base + 5,
    });
  }
  return rows;
}

function mockIntradayEnvelope(
  rows: import('@/src/lib/ict/types').IntradayCandle[],
  hint: string,
) {
  return {
    candles: rows,
    contractHint: hint,
    lastUpdatedISO: '2026-02-09T12:00:00.000Z',
    stale: false,
    source: 'live',
  };
}

function stubFourLegs(
  nqCandles: Candle[] = fixtureCandles().filter((c) => !c.forming),
  esCandles: Candle[] = fixtureCandles().filter((c) => !c.forming),
  // 4 hourly rows 20:30–23:30 ET on one NY date: the latest row maps
  // sessionDate to 2026-02-09 and every row sits inside the Asia window.
  h1 = intradayRows(4),
  m15 = intradayRows(8, INTRA_BASE, 900),
) {
  const nqEnv = mockEnvelope(nqCandles);
  const esEnv = { ...mockEnvelope(esCandles), contractHint: 'ES=F · CME' };
  const h1Env = mockIntradayEnvelope(h1, 'NQ=F · 1H');
  const m15Env = mockIntradayEnvelope(m15, 'NQ=F · 15M');
  const fetchFn = vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes('interval=15m')) return Response.json(m15Env);
    if (u.includes('interval=1h')) return Response.json(h1Env);
    if (u.includes('symbol=ES')) return Response.json(esEnv);
    return Response.json(nqEnv);
  });
  vi.stubGlobal('fetch', fetchFn);
  return { fetchFn, nqEnv, esEnv, h1Env, m15Env };
}

// Phase 15 trigger fixture: a live London LOW sweep that fires FIRE_LONG
// end to end. Asia 2026-02-08 20:00-23:00 1H rows anchor high 20045 / low
// 19988; twelve 15M rows span the 02:00-05:00 NY killzone on 2026-02-09 with
// a 03:00 LOW sweep (low 19968) plus a 03:15 reversal close (20028, 40/57
// displacement); the shared epoch pins 03:00 NY via nq1h lastUpdatedISO; D1
// NQ rows carry one unmitigated BULLISH gap (top 20025, bottom 20010,
// originDate 2026-01-21 — the entry handle). ES mirrors NQ so SMT
// suppresses CORR_DECOUPLED honestly without blocking FIRE.
async function seedTriggerFire(
  useDashboard: typeof import('@/src/lib/store')['useDashboard'],
) {
  const { fromZonedTime } = await import('date-fns-tz');
  const NY = 'America/New_York';
  const epoch = (s: string) => Math.floor(fromZonedTime(s, NY).getTime() / 1000);
  const asiaDate = '2026-02-08';
  const fireDate = '2026-02-09';

  const h1 = [
    `${asiaDate} 20:00:00`,
    `${asiaDate} 21:00:00`,
    `${asiaDate} 22:00:00`,
    `${asiaDate} 23:00:00`,
  ].map((s, i) => ({
    time: epoch(s),
    open: 20000 + i * 10,
    high: 20000 + i * 10 + 15,
    low: 20000 + i * 10 - 12,
    close: 20000 + i * 10 + 5,
  }));
  const asiaLow = 20000 - 12;

  const quiet15 = (s: string) => ({
    time: epoch(s),
    open: 20010,
    high: 20018,
    low: 20004,
    close: 20013,
  });
  const m15 = [
    quiet15(`${fireDate} 02:00:00`),
    quiet15(`${fireDate} 02:15:00`),
    quiet15(`${fireDate} 02:30:00`),
    quiet15(`${fireDate} 02:45:00`),
    // 03:00 LOW sweep: low pierces strictly below the Asia low.
    {
      time: epoch(`${fireDate} 03:00:00`),
      open: 20010,
      high: 20040,
      low: asiaLow - 20,
      close: 19995,
    },
    // 03:15 reversal: closes back through the low with 40/57 displacement.
    {
      time: epoch(`${fireDate} 03:15:00`),
      open: 20060,
      high: 20068,
      low: 20054,
      close: asiaLow + 40,
    },
    quiet15(`${fireDate} 03:30:00`),
    quiet15(`${fireDate} 03:45:00`),
    quiet15(`${fireDate} 04:00:00`),
    quiet15(`${fireDate} 04:15:00`),
    quiet15(`${fireDate} 04:30:00`),
    quiet15(`${fireDate} 04:45:00`),
  ];

  const candle = (date: string, price: number, overrides: Record<string, unknown> = {}) => ({
    date,
    open: price,
    high: price + 15,
    low: price - 12,
    close: price + 5,
    ...overrides,
  });
  const prev = candle('2026-01-20', 20000);
  const mid = candle('2026-01-21', 20010);
  const next = candle('2026-01-22', 20060, { low: prev.high + 10 });
  const tail = candle('2026-01-23', 20100);
  const nq = [prev, mid, next, tail];
  const es = nq.map((c) => ({ ...c }));

  // Shared epoch pins 03:00 NY (EST, UTC-5) — inside the killzone window.
  const iso = '2026-02-09T08:00:00.000Z';
  const envelope = (candles: unknown[], hint: string) => ({
    candles,
    contractHint: hint,
    lastUpdatedISO: iso,
    stale: false,
    source: 'live',
  });
  const h1Env = envelope(h1, 'NQ=F · 1H');
  const m15Env = envelope(m15, 'NQ=F · 15M');
  const nqEnv = envelope(nq, 'NQ=F · CME');
  const esEnv = envelope(es, 'ES=F · CME');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('interval=15m')) return Response.json(m15Env);
      if (u.includes('interval=1h')) return Response.json(h1Env);
      if (u.includes('symbol=ES')) return Response.json(esEnv);
      return Response.json(nqEnv);
    }),
  );
  await useDashboard.getState().refreshNQ();
  await useDashboard.getState().refreshES();
  await useDashboard.getState().refreshNQ1H();
  await useDashboard.getState().refreshNQ15M();
  vi.unstubAllGlobals();
}

describe('store: refresh writes envelope in one update', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // G-09-flake-1: dynamic store re-import after vi.resetModules() can exceed
  // the 15s default under full-suite parallel worker contention (import-bound,
  // observed 15574ms once). Generous per-test timeout; assertion unchanged.
  it('writes candles, lastUpdatedISO, stale false, and source in one update', { timeout: 60_000 }, async () => {
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
    // Mount owns the first poll: the immediate NQ refresh lands at once plus
    // the two immediate intraday refreshes (Phase 9 D-13 fire-first behavior).
    // The stubLegs mock answers any URL with a daily envelope, so exactly 3
    // calls land (NQ + nq1h + nq15m) while the :30/:45 timers stay pending.
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn).toHaveBeenCalledTimes(3);
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
      // Phase 9: only the bare '/api/yahoo' URL counts as an NQ call here
      // (intraday URLs carry interval=1h/15m, the ES URL carries symbol=ES).
      // Immediate intraday refreshes fail the legacy daily envelope guard and
      // never fetch — the NQ timer fire is the second bare-URL call.
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
    // Mount owns the first poll: the immediate NQ refresh lands at once plus
    // the two immediate intraday refreshes (D-13 fire-first behavior).
    const atStart = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(atStart).toBe(3);

    useDashboard.getState().stopDualPoll();
    await vi.advanceTimersByTimeAsync(300_000);
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(atStart);
  });
});

describe('store: four-leg stagger plus intraday refusal (Phase 9 D-13/D-14/D-15)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(async () => {
    try {
      const { useDashboard } = await import('@/src/lib/store');
      useDashboard.getState().stopDualPoll();
    } catch {
      // store module may not be loaded — nothing to stop
    }
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function resetDualState() {
    vi.resetModules();
    const mod = await import('@/src/lib/store');
    return { useDashboard: mod.useDashboard };
  }

  it('four-leg stagger: startDualPoll pins :00/:15/:30/:45 offsets within jitter', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { useDashboard } = await resetDualState();
    stubFourLegs();

    // Wall clock at second 30: NQ next :00 is 30s out, nq1h next :15 is 45s
    // out, ES next :30 is 60s out, nq15m next :45 is 75s out — each plus the
    // pinned 7.5s jitter (Math.random mocked to 0.5).
    useDashboard.getState().startDualPoll(new Date('2026-02-09T12:00:30.000Z'));
    await vi.advanceTimersByTimeAsync(0);

    const schedule = useDashboard.getState().lastSchedule;
    expect(schedule).not.toBeNull();
    expect(schedule!.delayNQ).toBeGreaterThanOrEqual(35_000);
    expect(schedule!.delayNQ).toBeLessThanOrEqual(40_000);
    expect(schedule!.delayNQ1H).toBeGreaterThanOrEqual(50_000);
    expect(schedule!.delayNQ1H).toBeLessThanOrEqual(55_000);
    expect(schedule!.delayES).toBeGreaterThanOrEqual(65_000);
    expect(schedule!.delayES).toBeLessThanOrEqual(70_000);
    expect(schedule!.delayNQ15M).toBeGreaterThanOrEqual(80_000);
    expect(schedule!.delayNQ15M).toBeLessThanOrEqual(85_000);

    useDashboard.getState().stopDualPoll();
  });

  it('independent-failure: failed 15m refresh marks only nq15m stale with nq1h live', async () => {
    const { useDashboard } = await resetDualState();
    const h1 = intradayRows(4);
    const m15 = intradayRows(8, INTRA_BASE, 900);
    const h1Env = mockIntradayEnvelope(h1, 'NQ=F · 1H');
    const m15Env = mockIntradayEnvelope(m15, 'NQ=F · 15M');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        String(url).includes('interval=15m') ? Response.json(m15Env) : Response.json(h1Env),
      ),
    );
    await useDashboard.getState().refreshNQ1H();
    await useDashboard.getState().refreshNQ15M();
    expect(useDashboard.getState().nq1h.stale).toBe(false);
    expect(useDashboard.getState().nq15m.stale).toBe(false);

    vi.unstubAllGlobals();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('interval=15m')) {
          throw new Error('15m upstream down');
        }
        return Response.json(h1Env);
      }),
    );
    await useDashboard.getState().refreshNQ15M();

    const state = useDashboard.getState();
    expect(state.nq15m.stale).toBe(true);
    expect(state.nq15m.lastError).toBe('15m upstream down');
    expect(state.nq15m.candles).toEqual(m15);
    expect(state.nq1h.stale).toBe(false);
    expect(state.nq1h.lastError).toBeNull();
    expect(state.nq1h.candles).toEqual(h1);

    useDashboard.getState().stopDualPoll();
  });

  it('stale-refusal: stale nq1h forces selectAsia null, stale ES forces selectSMT null', async () => {
    const { useDashboard } = await resetDualState();
    stubFourLegs();
    await useDashboard.getState().refreshNQ();
    await useDashboard.getState().refreshES();
    await useDashboard.getState().refreshNQ1H();
    await useDashboard.getState().refreshNQ15M();

    expect(useDashboard.getState().selectAsia()).not.toBeNull();

    // Stale nq1h refuses Asia (and downstream Judas) while SMT stays live.
    useDashboard.setState({
      nq1h: { ...useDashboard.getState().nq1h, stale: true, lastError: 'intraday stale' },
    });
    expect(useDashboard.getState().selectAsia()).toBeNull();
    expect(useDashboard.getState().selectJudas()).toBeNull();
    expect(useDashboard.getState().nq1h.lastError).toBe('intraday stale');

    // Stale ES refuses SMT while the nq1h leg itself stays live.
    useDashboard.setState({
      nq1h: { ...useDashboard.getState().nq1h, stale: false },
      es: { ...useDashboard.getState().es, stale: true, lastError: 'es stale' },
    });
    expect(useDashboard.getState().selectSMT()).toBeNull();
    expect(useDashboard.getState().es.lastError).toBe('es stale');

    useDashboard.getState().stopDualPoll();
  });

  it('asia-fallback: empty newest session falls back to the last completed Asia window', async () => {
    const { useDashboard } = await resetDualState();
    // Yesterday's completed 20:00-23:00 + today's morning rows (no 20:00 yet).
    // fromZonedTime interprets wall time in NY_TZ (asia.test.ts precedent).
    const { fromZonedTime } = await import('date-fns-tz');
    const epoch = (s: string) => Math.floor(fromZonedTime(s, 'America/New_York').getTime() / 1000);
    const mk = (time: number, i: number) => ({
      time,
      open: 20000 + i * 10,
      high: 20000 + i * 10 + 15,
      low: 20000 + i * 10 - 12,
      close: 20000 + i * 10 + 5,
    });
    const h1 = [
      mk(epoch('2026-02-08 20:00:00'), 0),
      mk(epoch('2026-02-08 21:00:00'), 1),
      mk(epoch('2026-02-08 22:00:00'), 2),
      mk(epoch('2026-02-08 23:00:00'), 3),
      mk(epoch('2026-02-09 06:00:00'), 4),
      mk(epoch('2026-02-09 07:00:00'), 5),
    ];
    const h1Env = mockIntradayEnvelope(h1, 'NQ=F · 1H');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(h1Env)));
    await useDashboard.getState().refreshNQ1H();

    const asia = useDashboard.getState().selectAsia();
    expect(asia).not.toBeNull();
    expect(asia!.sessionDate).toBe('2026-02-08');
    expect(asia!.high).toBe(20000 + 3 * 10 + 15);
    expect(asia!.low).toBe(20000 - 12);

    useDashboard.getState().stopDualPoll();
  });

  it('empty-refusal: empty legs force nulls without throwing', async () => {
    const { useDashboard } = await resetDualState();

    let asia: unknown = 'unset';
    let judas: unknown = 'unset';
    let smt: unknown = 'unset';
    let amd: unknown = 'unset';
    let path: unknown = 'unset';
    expect(() => {
      asia = useDashboard.getState().selectAsia();
      judas = useDashboard.getState().selectJudas();
      smt = useDashboard.getState().selectSMT();
      amd = useDashboard.getState().selectAMD(1770500000);
      path = useDashboard.getState().selectLiquidityPath();
    }).not.toThrow();
    expect(asia).toBeNull();
    expect(judas).toBeNull();
    expect(smt).toBeNull();
    expect(amd).not.toBeNull();
    expect(path).toBeNull();
    // Confluence never nulls — empty inputs cap at base tier (D-11).
    expect(useDashboard.getState().selectConfluence()).toBe('standart');

    useDashboard.getState().stopDualPoll();
  });

  it('all-degraded: every leg stale yields all selectors null plus base-tier confluence', async () => {
    const { useDashboard } = await resetDualState();
    stubFourLegs();
    await useDashboard.getState().refreshNQ();
    await useDashboard.getState().refreshES();
    await useDashboard.getState().refreshNQ1H();
    await useDashboard.getState().refreshNQ15M();

    useDashboard.setState({
      nq: { ...useDashboard.getState().nq, stale: true, lastError: 'nq down' },
      es: { ...useDashboard.getState().es, stale: true, lastError: 'es down' },
      nq1h: { ...useDashboard.getState().nq1h, stale: true, lastError: '1h down' },
      nq15m: { ...useDashboard.getState().nq15m, stale: true, lastError: '15m down' },
    });

    const state = useDashboard.getState();
    expect(state.selectSMT()).toBeNull();
    expect(state.selectAsia()).toBeNull();
    expect(state.selectJudas()).toBeNull();
    expect(state.selectAMD(1770500000)).not.toBeNull();
    expect(state.selectLiquidityPath()).toBeNull();
    // Worst case keeps three renderable reasons and never collapses (D-02):
    // each owning leg carries its reason verbatim.
    expect(state.nq.lastError).toBe('nq down');
    expect(state.es.lastError).toBe('es down');
    expect(state.nq1h.lastError).toBe('1h down');
    expect(state.selectConfluence()).toBe('standart');

    useDashboard.getState().stopDualPoll();
  });

  it('range4h-live: seeded 1H window yields a 4H range from NY-anchored blocks', async () => {
    const { useDashboard } = await resetDualState();
    // 16 hourly rows 20:30–11:30 ET across one NY date boundary: 4 complete
    // 4-candle blocks (B1 18:00–22:00 … B4 06:00–10:00) with a trailing
    // partial the aggregate drops.
    const rows = intradayRows(16);
    stubFourLegs(
      fixtureCandles().filter((c) => !c.forming),
      fixtureCandles().filter((c) => !c.forming),
      rows,
    );
    await useDashboard.getState().refreshNQ1H();

    const range4H = useDashboard.getState().selectRange4H();
    expect(range4H).not.toBeNull();
    // Rising fixture: first block opens 20000, last block closes 20155.
    expect(range4H!.high).toBeGreaterThan(range4H!.low);
    expect(range4H!.window).toBe(20);
    expect(typeof range4H!.asOf).toBe('string');

    useDashboard.getState().stopDualPoll();
  });

  it('trigger-stale: stale nq15m or nq1h forces selectTrigger null', async () => {
    const { useDashboard } = await resetDualState();
    stubFourLegs();
    await useDashboard.getState().refreshNQ();
    await useDashboard.getState().refreshES();
    await useDashboard.getState().refreshNQ1H();
    await useDashboard.getState().refreshNQ15M();

    useDashboard.setState({
      nq15m: { ...useDashboard.getState().nq15m, stale: true, lastError: '15m stale' },
    });
    expect(useDashboard.getState().selectTrigger()).toBeNull();
    expect(useDashboard.getState().nq15m.lastError).toBe('15m stale');

    useDashboard.setState({
      nq15m: { ...useDashboard.getState().nq15m, stale: false },
      nq1h: { ...useDashboard.getState().nq1h, stale: true, lastError: '1h stale' },
    });
    expect(useDashboard.getState().selectTrigger()).toBeNull();
    expect(useDashboard.getState().nq1h.lastError).toBe('1h stale');

    useDashboard.getState().stopDualPoll();
  });

  it('trigger-empty: empty legs force selectTrigger null without throwing', async () => {
    const { useDashboard } = await resetDualState();

    let trigger: unknown = 'unset';
    expect(() => {
      trigger = useDashboard.getState().selectTrigger();
    }).not.toThrow();
    expect(trigger).toBeNull();

    useDashboard.getState().stopDualPoll();
  });

  it('trigger-coherence: selectTrigger shares its epoch with selectAMD on the same poll', async () => {
    const { useDashboard } = await resetDualState();
    stubFourLegs();
    await useDashboard.getState().refreshNQ();
    await useDashboard.getState().refreshES();
    await useDashboard.getState().refreshNQ1H();
    await useDashboard.getState().refreshNQ15M();

    // Same state, back-to-back: the trigger-carried AMD snapshot equals the
    // direct selectAMD derivation — both read sharedEpoch, never torn clocks.
    const trigger = useDashboard.getState().selectTrigger();
    expect(trigger).not.toBeNull();
    expect(trigger!.inputs.amd).toEqual(useDashboard.getState().selectAMD());

    // Epoch sensitivity: the selector genuinely consumes the shared epoch —
    // the same detector inputs read timing false both before and after the
    // nq1h clock moves, but the carried AMD snapshot follows the epoch: at
    // 12:00Z (07:00 NY) amdPhase holds its clock-skeleton branch, and only an
    // epoch change can move the trigger-carried snapshot with it.
    const { fromZonedTime } = await import('date-fns-tz');
    const before = useDashboard.getState().selectTrigger();
    expect(before).not.toBeNull();
    expect(before!.gates.timing).toBe(false);
    const morning = new Date(fromZonedTime('2026-02-09 10:00:00', 'America/New_York')).toISOString();
    useDashboard.setState({
      nq1h: { ...useDashboard.getState().nq1h, lastUpdatedISO: morning },
    });
    const after = useDashboard.getState().selectTrigger();
    expect(after).not.toBeNull();
    expect(after!.gates.timing).toBe(false);
    // The carried AMD snapshot tracks the moved epoch — both snapshots equal
    // their same-poll direct selectAMD derivation, so trigger can never
    // desync from selectAMD on time.
    expect(after!.inputs.amd).toEqual(useDashboard.getState().selectAMD());

    useDashboard.getState().stopDualPoll();
  });

  // The seed decouples correlation with four daily rows so evaluateSMT
  // returns suppressed CORR_DECOUPLED while the trigger still fires because
  // SMT is a read-only agree-tag that never blocks FIRE.
  it('flaw-soft-live-smt: SMT-suppressed FIRE downgrades to SOFT ARMED live through selectFatalFlaw', async () => {
    const { useDashboard } = await resetDualState();
    await seedTriggerFire(useDashboard);
    const { REASON_BY_KEY } = await import('@/src/lib/ict/invalidation');

    // First derivation on this poll: never pre-call selectTrigger — the
    // first selectTrigger consumes the session FIRE into ARMED_ALREADY_FIRED
    // and the SOFT FIRING gate would then force clean (D-12).
    const flaw = useDashboard.getState().selectFatalFlaw();
    expect(flaw).not.toBeNull();
    expect(flaw!.downgraded).toBe(true);
    expect(flaw!.invalidated).toBe(false);
    expect(flaw!.flawClass).toBe('SOFT');
    expect(flaw!.reasonKey).toBe('SMT_SUPPRESSED');
    expect(flaw!.carriedArmedReason).toBe('FIRE_LONG');
    expect(flaw!.unblock.length).toBeGreaterThan(0);
    expect(flaw!.unblock).toContain('0.70');
    expect(flaw!.reason).toBe(REASON_BY_KEY['SMT_SUPPRESSED']);

    useDashboard.getState().stopDualPoll();
  });

  it('flaw-stale: stale nq15m forces selectFatalFlaw null without throwing', async () => {
    const { useDashboard } = await resetDualState();
    await seedTriggerFire(useDashboard);

    // Live London confirmed-sweep state derives a flaw verdict, never throws.
    let live: unknown = 'unset';
    expect(() => {
      live = useDashboard.getState().selectFatalFlaw();
    }).not.toThrow();
    expect(live).not.toBeNull();

    // Stale legs force the trigger null too — the selector refuses with null,
    // never a SOFT downgrade on no trigger (flaw purity at the boundary).
    useDashboard.setState({
      nq15m: { ...useDashboard.getState().nq15m, stale: true, lastError: '15m stale' },
    });
    expect(useDashboard.getState().selectTrigger()).toBeNull();
    let staleFlaw: unknown = 'unset';
    expect(() => {
      staleFlaw = useDashboard.getState().selectFatalFlaw();
    }).not.toThrow();
    expect(staleFlaw).toBeNull();

    useDashboard.getState().stopDualPoll();
  });

  it('flaw-coherence: back-to-back selectFatalFlaw calls share one epoch with the trigger', async () => {
    const { useDashboard } = await resetDualState();
    await seedTriggerFire(useDashboard);

    // Consume the session FIRE first so both flaw derivations below read the
    // same ARMED-after-fire trigger — back-to-back on one poll, never torn.
    const trigger = useDashboard.getState().selectTrigger();
    expect(trigger).not.toBeNull();
    expect(trigger!.verdict).toBe('FIRE_LONG');

    const first = useDashboard.getState().selectFatalFlaw();
    const second = useDashboard.getState().selectFatalFlaw();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    // Same state, back-to-back: byte-identical flaw outputs.
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));

    // One time truth: the flaw asOf equals the shared epoch pinned by the
    // seed (2026-02-09T08:00:00Z via nq1h lastUpdatedISO) — no second clock
    // read, never re-derived inside the selector.
    const expectedEpoch = Math.floor(new Date('2026-02-09T08:00:00.000Z').getTime() / 1000);
    expect(first!.asOf).toBe(expectedEpoch);
    expect(second!.asOf).toBe(expectedEpoch);

    // Trigger verdict context rides along: a downgrade resume key or clean
    // NONE — and §6 strings attach to every output including clean verdicts.
    const carriesContext = first!.carriedArmedReason !== null || first!.reasonKey === 'NONE';
    expect(carriesContext).toBe(true);
    expect(first!.reason.length).toBeGreaterThan(0);
    expect(first!.sentence.length).toBeGreaterThan(0);
    expect(first!.challenge.length).toBeGreaterThan(0);

    useDashboard.getState().stopDualPoll();
  });

  it('trigger-fire: live London LOW sweep fires FIRE_LONG and appends one log entry', async () => {
    const { useDashboard } = await resetDualState();
    await seedTriggerFire(useDashboard);

    const out = useDashboard.getState().selectTrigger();
    expect(out).not.toBeNull();
    expect(out!.verdict).toBe('FIRE_LONG');
    expect(out!.direction).toBe('LONG');
    expect(out!.reasonKey).toBe('FIRE_LONG');
    expect(out!.reason).toBe(
      'WHY NOW LONG: Asia Range Təmizlənib. London Judas Swing Baş verib — displacement təsdiqlidir, giriş FVG hazırdır.',
    );
    expect(out!.gates).toEqual({ timing: true, purge: true, displacement: true });
    expect(out!.entryFvg).not.toBeNull();
    expect(out!.entryFvg!.polarity).toBe('BULLISH');

    const state = useDashboard.getState();
    expect(state.firingLog).toHaveLength(1);
    expect(state.firingLog[0].verdict).toBe('FIRE_LONG');
    expect(state.firingLog[0].gates).toEqual({ timing: true, purge: true, displacement: true });
    expect(state.firingLog[0].direction).toBe('LONG');
    expect(state.firingLog[0].reasonKey).toBe('FIRE_LONG');
    expect(state.firingLog[0].sessionDate).toBe('2026-02-09');
    expect(typeof state.firingLog[0].asOf).toBe('number');

    // Same-session repeat poll downgrades to already-fired ARMED with no
    // second append — the cooldown holds end to end.
    const repeat = useDashboard.getState().selectTrigger();
    expect(repeat).not.toBeNull();
    expect(repeat!.verdict).toBe('ARMED');
    expect(repeat!.reasonKey).toBe('ARMED_ALREADY_FIRED');
    expect(useDashboard.getState().firingLog).toHaveLength(1);

    useDashboard.getState().stopDualPoll();
  });

  it('trigger-cap: 51 ARMED appends cap at 50 with oldest dropped and overflow counted', async () => {
    const { useDashboard } = await resetDualState();

    const armed = (asOf: number) => ({
      verdict: 'ARMED' as const,
      direction: 'LONG' as const,
      reasonKey: 'ARMED_MISSING_TIMING' as const,
      reason: 'x',
      gates: { timing: false, purge: true, displacement: true },
      entryFvg: null,
      inputs: { judas: null, amd: null, smt: null },
    });
    for (let i = 0; i < 51; i++) {
      useDashboard.getState().appendFiringLog(armed(1000 + i), 1000 + i);
    }

    const state = useDashboard.getState();
    expect(state.firingLog).toHaveLength(50);
    expect(state.firingLogOverflow).toBe(1);
    // Oldest dropped: the surviving head is the second append (fvg.ts
    // trailing-slice idiom — active.slice(-FVG_MAP_BOUND) precedent).
    expect(state.firingLog[0].asOf).toBe(1001);
    expect(state.firingLog[49].asOf).toBe(1050);

    useDashboard.getState().stopDualPoll();
  });

  it('trigger-serializer: firingLogToJson holds entries plus thresholds plus exportedAt', async () => {
    const { firingLogToJson } = await import('@/src/lib/store');
    const { useDashboard } = await resetDualState();
    await seedTriggerFire(useDashboard);
    useDashboard.getState().selectTrigger();

    const json = firingLogToJson(useDashboard.getState().firingLog, '2026-02-09T08:00:00.000Z');
    const parsed = JSON.parse(json);
    expect(parsed.thresholds).toEqual({
      TRIGGER_DISP_MULT: 0.5,
      TRIGGER_KZ_START_MIN: 120,
      TRIGGER_KZ_END_MIN: 300,
    });
    expect(parsed.exportedAt).toBe('2026-02-09T08:00:00.000Z');
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].verdict).toBe('FIRE_LONG');
    expect(parsed.entries[0].sessionDate).toBe('2026-02-09');
    // Payload carries verdicts plus gate booleans only — no account, risk,
    // position, or P&L fields cross the calibration seam (T-15-07).
    expect(parsed.entries[0]).not.toHaveProperty('account');
    expect(parsed.entries[0]).not.toHaveProperty('risk');
    expect(parsed.entries[0]).not.toHaveProperty('position');

    useDashboard.getState().stopDualPoll();
  });

  it('range4h-refusal: stale or empty nq1h forces selectRange4H null without throwing', async () => {
    const { useDashboard } = await resetDualState();
    let live: unknown = 'unset';
    let stale: unknown = 'unset';
    let empty: unknown = 'unset';
    expect(() => {
      live = useDashboard.getState().selectRange4H();
    }).not.toThrow();
    expect(live).toBeNull();

    stubFourLegs();
    await useDashboard.getState().refreshNQ1H();
    useDashboard.setState({
      nq1h: { ...useDashboard.getState().nq1h, stale: true, lastError: '1h down' },
    });
    expect(() => {
      stale = useDashboard.getState().selectRange4H();
    }).not.toThrow();
    expect(stale).toBeNull();
    expect(useDashboard.getState().nq1h.lastError).toBe('1h down');

    useDashboard.setState({ nq1h: { ...useDashboard.getState().nq1h, stale: false, candles: [] } });
    expect(() => {
      empty = useDashboard.getState().selectRange4H();
    }).not.toThrow();
    expect(empty).toBeNull();

    useDashboard.getState().stopDualPoll();
  });
});

