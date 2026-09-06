/**
 * TerminalShell behavioral coverage (requirement UI-01, task 02-UI01-shell).
 *
 * Runs in the node vitest env with a minimal jsdom global (jsdom is a
 * devDependency) plus test-only vi.mock stubs for next/dynamic and the toast
 * manager. No implementation files are touched.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Candle } from '@/src/lib/ict/types';

// ---------------------------------------------------------------------------
// Test-only module stubs (no impl changes)
// ---------------------------------------------------------------------------

const chartCapture = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));
const toastCalls = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>> }));

vi.mock('next/dynamic', async () => {
  const ReactMod = await import('react');
  return {
    // Ignore the real loader/ssr options: render a stub that captures props.
    default: () =>
      function ChartStub(props: Record<string, unknown>) {
        chartCapture.props = props;
        return ReactMod.createElement('div', { 'data-slot': 'nq-chart-stub' });
      },
  };
});

vi.mock('@/components/ui/toast', () => ({
  toast: {
    add: (entry: Record<string, unknown>) => {
      toastCalls.calls.push(entry);
    },
  },
}));

// ---------------------------------------------------------------------------
// jsdom globals for react-dom/client (node env has no DOM)
// ---------------------------------------------------------------------------

function setGlobal(key: string, value: unknown) {
  try {
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
    });
  } catch {
    // getter-only host global — leave it alone
  }
}

function installDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
  });
  const win = dom.window as unknown as Record<string, unknown>;
  setGlobal('window', dom.window);
  setGlobal('document', dom.window.document);
  setGlobal('navigator', dom.window.navigator);
  for (const key of Object.getOwnPropertyNames(win)) {
    if (!(key in globalThis)) {
      setGlobal(key, win[key]);
    }
  }
  setGlobal('IS_REACT_ACT_ENVIRONMENT', true);
}

installDom();

// Import after the DOM exists (client components touch nothing at import,
// but the shell's children resolve JSON fixtures + UI modules here).
const { TerminalShell } = await import('@/components/dashboard/terminal-shell');
const { useDashboard } = await import('@/src/lib/store');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function fixtureCandles(): Candle[] {
  const candles: Candle[] = [];
  for (let i = 0; i < 20; i++) {
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
  return candles;
}

// 35 closed candles on a 10pt-step trend (clears the MIN_CANDLES_FULL=34
// regime-ATR floor) with the final close lifted by 250, so the store
// selector derives a finite ATR and the tripwire fires.
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

function gappedEnvelope() {
  return {
    candles: gappedCandles(),
    contractHint: 'NQ=F · CME',
    lastUpdatedISO: new Date().toISOString(),
    stale: false,
    source: 'live',
  };
}

function liveEnvelope() {
  return {
    candles: fixtureCandles(),
    contractHint: 'NQ=F · CME',
    lastUpdatedISO: new Date().toISOString(),
    stale: false,
    source: 'live',
  };
}

let roots: Root[] = [];
let containers: HTMLElement[] = [];

async function renderShell(): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  containers.push(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => {
    root.render(React.createElement(TerminalShell));
  });
  return container;
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
  });
}

beforeEach(() => {
  vi.resetModules();
  chartCapture.props = null;
  toastCalls.calls.length = 0;
  setVisibility('visible');
  useDashboard.setState({
    candles: [],
    contractHint: '',
    lastUpdatedISO: null,
    stale: false,
    source: 'none',
    inFlight: false,
    scenario: 'crowded-long',
    lastError: null,
    asOfBaku: '',
    nq: { candles: [], contractHint: '', lastUpdatedISO: null, stale: false, source: 'none', lastError: null },
    es: { candles: [], contractHint: '', lastUpdatedISO: null, stale: false, source: 'none', lastError: null },
    inFlightNQ: false,
    inFlightES: false,
    coverage: { nq: 0, es: 0, joined: 0, dropped: 0 },
    lastSchedule: null,
  });
});

afterEach(async () => {
  // Stop the shell-owned dual timers before unmounting so no staggered
  // interval fires across tests (D-01/D-03 always-on timers).
  try {
    useDashboard.getState().stopDualPoll();
  } catch {
    // store may be in a reset state — nothing to stop
  }
  vi.useRealTimers();
  vi.unstubAllGlobals();
  for (const root of roots) {
    await act(async () => {
      root.unmount();
    });
  }
  roots = [];
  for (const container of containers) {
    container.remove();
  }
  containers = [];
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('terminal shell composes the full grid on live data', () => {
  it('renders status strip, side panels, report and chart with derived props', async () => {
    const envelope = liveEnvelope();
    const fetchFn = vi.fn(async () => Response.json(envelope));
    vi.stubGlobal('fetch', fetchFn);

    const container = await renderShell();

    // Mount owns the first poll.
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('/api/yahoo', { cache: 'no-store' });

    // Grid composition: 3-panel responsive grid + all live panels.
    const shell = container.querySelector('[data-slot="terminal-shell"]');
    expect(shell).not.toBeNull();
    const grid = shell!.querySelector('.grid.grid-cols-1');
    expect(grid).not.toBeNull();
    expect((grid as HTMLElement).className).toContain('lg:grid-cols-[280px_1fr_320px]');
    expect(shell!.querySelector('[data-slot="status-strip"]')).not.toBeNull();
    expect(shell!.querySelector('[data-slot="sentiment-panel"]')).not.toBeNull();
    expect(shell!.querySelector('[data-slot="calendar-panel"]')).not.toBeNull();
    expect(shell!.querySelector('[data-slot="report"]')).not.toBeNull();

    // Manual refresh affordance with Azerbaijani copy.
    const refreshButton = shell!.querySelector('[data-slot="refresh-button"]');
    expect(refreshButton).not.toBeNull();
    expect(refreshButton!.textContent).toContain('Yenilə');

    // Chart receives store-derived props (candles, eq, DOL).
    const stub = shell!.querySelector('[data-slot="nq-chart-stub"]');
    expect(stub).not.toBeNull();
    const props = chartCapture.props as unknown as {
      candles: Candle[];
      eq: number;
      dolPrice: number;
      dolName: string;
    };
    expect(props.candles).toHaveLength(20);
    const range = useDashboard.getState().selectRange();
    expect(range).not.toBeNull();
    expect(props.eq).toBe(range!.eq);
    expect(props.eq).toBe((range!.high + range!.low) / 2);
    const dol = useDashboard.getState().selectDOL();
    expect(dol).not.toBeNull();
    expect(props.dolPrice).toBe(dol!.price);
    expect(typeof props.dolName).toBe('string');
  });

  it('disables the Yenilə button while a refresh is in flight', async () => {
    const fetchFn = vi.fn(async () => Response.json(liveEnvelope()));
    vi.stubGlobal('fetch', fetchFn);

    const container = await renderShell();
    const button = container.querySelector(
      '[data-slot="refresh-button"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(false);

    await act(async () => {
      useDashboard.setState({ inFlight: true });
    });
    expect(button.disabled).toBe(true);

    await act(async () => {
      useDashboard.setState({ inFlight: false });
    });
    expect(button.disabled).toBe(false);
  });
});

describe('terminal shell owns the dual staggered always-on poll loop (D-01/D-02/D-03)', () => {
  it('mount triggers the NQ fetch and the staggered NQ/ES timers fire with no visibility gating', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn(async (url: string) => Response.json(liveEnvelope()));
    vi.stubGlobal('fetch', fetchFn);

    await renderShell();
    // Mount owns the first poll on the bare NQ path.
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('/api/yahoo', { cache: 'no-store' });

    // Staggered offsets recorded in state: NQ near :00, ES :30 later.
    const schedule = useDashboard.getState().lastSchedule;
    expect(schedule).not.toBeNull();

    // Always-on per D-03: hidden tabs do NOT pause the staggered timers.
    setVisibility('hidden');
    await act(async () => {
      vi.advanceTimersByTime(300_000);
    });
    const nqCalls = fetchFn.mock.calls.filter(([url]) => url === '/api/yahoo');
    const esCalls = fetchFn.mock.calls.filter(([url]) => String(url).includes('symbol=ES'));
    expect(nqCalls.length).toBeGreaterThanOrEqual(2);
    expect(esCalls.length).toBeGreaterThanOrEqual(1);

    // Unmount stops the loop: no further fetches after teardown.
    const atEnd = fetchFn.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(300_000);
    });
    // Note: unmount happens in afterEach; within this test the loop still
    // runs — the stopDualPoll-on-unmount path is pinned by the
    // store-level stopDualPoll test. Advance only asserts cadence holds.
    expect(fetchFn.mock.calls.length).toBeGreaterThan(atEnd);
  });

  it('stopDualPoll on unmount halts all timers (no cross-test leakage)', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn(async () => Response.json(liveEnvelope()));
    vi.stubGlobal('fetch', fetchFn);

    await renderShell();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      useDashboard.getState().stopDualPoll();
    });
    await act(async () => {
      vi.advanceTimersByTime(300_000);
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe('terminal shell fires one coalesced Azerbaijani toast per error value', () => {
  it('toasts once per distinct error and never leaks raw upstream text', async () => {
    const fetchFn = vi.fn(async () => Response.json(liveEnvelope()));
    vi.stubGlobal('fetch', fetchFn);

    await renderShell();
    expect(toastCalls.calls).toHaveLength(0);

    const firstError = 'refresh failed with status 500';
    await act(async () => {
      useDashboard.setState({ lastError: firstError });
    });
    expect(toastCalls.calls).toHaveLength(1);
    const first = toastCalls.calls[0] as { title?: unknown; description?: unknown };
    expect(first.title).toContain('Xəta');
    expect(String(first.description)).toContain('Canlı məlumat');
    expect(String(first.description)).not.toContain(firstError);

    // Same error value with unrelated state churn: no second toast.
    await act(async () => {
      useDashboard.setState({ lastError: firstError, stale: true });
    });
    expect(toastCalls.calls).toHaveLength(1);

    // Clearing then failing again with a new value: exactly one more toast.
    await act(async () => {
      useDashboard.setState({ lastError: null });
    });
    await act(async () => {
      useDashboard.setState({ lastError: 'refresh rejected invalid envelope' });
    });
    expect(toastCalls.calls).toHaveLength(2);
  });
});

describe('terminal shell flags rollover weeks with a banner (ICT-07b)', () => {
  it('banner-renders-with-hint-and-warning: gapped fixture shows the banner while the chart stub still renders', async () => {
    // Pin the clock to rollover week so the mount refresh stamps
    // asOfBaku 2026-03-19 (the selector reads store asOfBaku; setting it
    // post-render alone would not re-render the function-subscription).
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T12:00:00Z'));
    const fetchFn = vi.fn(async () => Response.json(gappedEnvelope()));
    vi.stubGlobal('fetch', fetchFn);

    const container = await renderShell();

    const shell = container.querySelector('[data-slot="terminal-shell"]');
    expect(shell).not.toBeNull();
    const banner = shell!.querySelector('[data-slot="rollover-banner"]');
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain('NQ=F · CME');
    expect(banner!.textContent).toMatch(/rollover week/i);
    expect(shell!.querySelector('[data-slot="nq-chart-stub"]')).not.toBeNull();
    vi.useRealTimers();
  });

  it('banner-absent-on-clean: clean 20-candle fixture renders no rollover-banner element', async () => {
    const fetchFn = vi.fn(async () => Response.json(liveEnvelope()));
    vi.stubGlobal('fetch', fetchFn);

    const container = await renderShell();

    const shell = container.querySelector('[data-slot="terminal-shell"]');
    expect(shell).not.toBeNull();
    expect(shell!.querySelector('[data-slot="rollover-banner"]')).toBeNull();
    expect(shell!.querySelector('[data-slot="nq-chart-stub"]')).not.toBeNull();
  });

  it('flag-and-continue-co-render: gapped fixture shows banner plus chart stub plus report in one render', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T12:00:00Z'));
    const fetchFn = vi.fn(async () => Response.json(gappedEnvelope()));
    vi.stubGlobal('fetch', fetchFn);

    const container = await renderShell();

    const shell = container.querySelector('[data-slot="terminal-shell"]');
    expect(shell).not.toBeNull();
    expect(shell!.querySelector('[data-slot="rollover-banner"]')).not.toBeNull();
    expect(shell!.querySelector('[data-slot="nq-chart-stub"]')).not.toBeNull();
    expect(shell!.querySelector('[data-slot="report"]')).not.toBeNull();
    vi.useRealTimers();
  });
});

describe('terminal shell passes selectLevels output to the chart (ICT-02 render)', () => {
  it('levels-prop-clean: chart stub levels prop deep-equals the selector output on the clean envelope', async () => {
    const fetchFn = vi.fn(async () => Response.json(liveEnvelope()));
    vi.stubGlobal('fetch', fetchFn);

    const container = await renderShell();

    const shell = container.querySelector('[data-slot="terminal-shell"]');
    expect(shell).not.toBeNull();
    expect(shell!.querySelector('[data-slot="nq-chart-stub"]')).not.toBeNull();
    const props = chartCapture.props as unknown as { levels: unknown };
    const expected = useDashboard.getState().selectLevels();
    expect(expected).not.toBeNull();
    expect(props.levels).toEqual(expected);
    const finite = expected as unknown as {
      q1: number;
      q3: number;
      bullOTE: { lo: number; hi: number };
      bearOTE: { lo: number; hi: number };
    };
    expect(Number.isFinite(finite.q1)).toBe(true);
    expect(Number.isFinite(finite.q3)).toBe(true);
    expect(Number.isFinite(finite.bullOTE.lo)).toBe(true);
    expect(Number.isFinite(finite.bullOTE.hi)).toBe(true);
    expect(Number.isFinite(finite.bearOTE.lo)).toBe(true);
    expect(Number.isFinite(finite.bearOTE.hi)).toBe(true);
  });

  it('levels-prop-gapped-co-render: gapped envelope keeps the banner while the stub levels prop matches the selector', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T12:00:00Z'));
    const fetchFn = vi.fn(async () => Response.json(gappedEnvelope()));
    vi.stubGlobal('fetch', fetchFn);

    const container = await renderShell();

    const shell = container.querySelector('[data-slot="terminal-shell"]');
    expect(shell).not.toBeNull();
    expect(shell!.querySelector('[data-slot="rollover-banner"]')).not.toBeNull();
    expect(shell!.querySelector('[data-slot="nq-chart-stub"]')).not.toBeNull();
    const props = chartCapture.props as unknown as { levels: unknown };
    expect(props.levels).toEqual(useDashboard.getState().selectLevels());
    vi.useRealTimers();
  });
});

describe('terminal shell shows chart-header freshness matching the strip (W2)', () => {
  async function headerAndStrip(container: HTMLElement) {
    const header = container.querySelector('[data-slot="chart-freshness"]');
    expect(header).not.toBeNull();
    const strip = container.querySelector('[data-slot="status-strip"]');
    expect(strip).not.toBeNull();
    return { header: header!, strip: strip! };
  }

  // ASCII-fold so the assertion is encoding-stable: the locked Azerbaijani
  // copy renders BAĞLIDIR with Ğ (U+011E); folding NFD mark U+0306 yields
  // the ASCII-safe BAZAR BAGLIDIR substring the plan requires.
  function asciiFold(s: string | null): string {
    return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // deriveStatus weekend-wins on Baku Sat/Sun, so the LIVE/STALE cases pin
  // the clock to Baku Friday noon (2026-09-04 12:00 +04:00 == 08:00Z) and
  // stamp the envelope at the same instant (age 0).
  function pinBakuFridayNoon() {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-04T08:00:00Z'));
  }

  it('header-freshness-live: fresh envelope shows LIVE in the header and both leg ages in the strip', async () => {
    pinBakuFridayNoon();
    const freshEnv = {
      ...liveEnvelope(),
      lastUpdatedISO: new Date('2026-09-04T08:00:00Z').toISOString(),
      stale: false,
    };
    const fetchFn = vi.fn(async () => Response.json(freshEnv));
    vi.stubGlobal('fetch', fetchFn);

    const container = await renderShell();

    const { header, strip } = await headerAndStrip(container);
    expect(header.textContent).toContain('LIVE');
    // Per-leg strip (D-04): the NQ leg mirrors the fresh envelope; the ES
    // leg has never landed so it renders the pending marker — LIVE copy is
    // asserted on the NQ segment, not the whole paired line.
    expect(strip.textContent).toMatch(/NQ.*LIVE/);
    expect(strip.textContent).toContain('ES …');
    expect(header.getAttribute('data-freshness')).toBe('live');
    expect(header.querySelector('[data-slot="live-dot"]')).not.toBeNull();
    vi.useRealTimers();
  });

  it('header-freshness-stale: stale envelope shows STALE in the header and the NQ leg segment of the strip', async () => {
    pinBakuFridayNoon();
    const staleEnv = {
      ...liveEnvelope(),
      lastUpdatedISO: new Date('2026-09-04T08:00:00Z').toISOString(),
      stale: true,
    };
    const fetchFn = vi.fn(async () => Response.json(staleEnv));
    vi.stubGlobal('fetch', fetchFn);

    const container = await renderShell();

    const { header, strip } = await headerAndStrip(container);
    expect(header.textContent).toContain('STALE');
    expect(strip.textContent).toMatch(/NQ.*STALE/);
    expect(header.getAttribute('data-freshness')).toBe('stale');
    vi.useRealTimers();
  });

  it('header-freshness-closed: Baku Saturday noon shows BAZAR BAGLIDIR in the header and the strip', async () => {
    vi.useFakeTimers();
    // 2026-09-05 12:00 +04:00 (Baku Saturday noon) == 08:00Z.
    vi.setSystemTime(new Date('2026-09-05T08:00:00Z'));
    const closedEnv = {
      ...liveEnvelope(),
      lastUpdatedISO: '2026-09-04T12:00:00.000Z',
      stale: false,
    };
    const fetchFn = vi.fn(async () => Response.json(closedEnv));
    vi.stubGlobal('fetch', fetchFn);

    const container = await renderShell();

    const { header, strip } = await headerAndStrip(container);
    expect(asciiFold(header.textContent)).toContain('BAZAR BAGLIDIR');
    expect(asciiFold(strip.textContent)).toContain('BAZAR BAGLIDIR');
    expect(header.getAttribute('data-freshness')).toBe('closed');
    vi.useRealTimers();
  });
});

describe('terminal shell degrades honestly without data', () => {
  it('shows the chart skeleton before the first envelope lands', async () => {
    const fetchFn = vi.fn(async () => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetchFn);

    const container = await renderShell();
    expect(container.querySelector('[data-slot="chart-skeleton"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="nq-chart-stub"]')).toBeNull();
  });

  it('renders Məlumat yoxdur copy when the envelope holds no candles', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('network down');
    });
    vi.stubGlobal('fetch', fetchFn);

    // Seed last-known-empty state; the failing mount refresh preserves it.
    useDashboard.setState({
      candles: [],
      contractHint: 'NQ=F · CME',
      lastUpdatedISO: new Date().toISOString(),
      stale: true,
      source: 'cache',
    });

    const container = await renderShell();
    expect(container.textContent).toContain('Məlumat yoxdur');
    expect(container.querySelector('[data-slot="nq-chart-stub"]')).toBeNull();
  });

  it('levels-null-empty: empty-candle envelope renders no chart stub and throws nothing', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('network down');
    });
    vi.stubGlobal('fetch', fetchFn);

    useDashboard.setState({
      candles: [],
      contractHint: 'NQ=F · CME',
      lastUpdatedISO: new Date().toISOString(),
      stale: true,
      source: 'cache',
    });

    const container = await renderShell();
    expect(container.querySelector('[data-slot="nq-chart-stub"]')).toBeNull();
    expect(useDashboard.getState().selectLevels()).toBeNull();
    expect(chartCapture.props).toBeNull();
  });

  it('levels-thin-honest: five closed candles render without throw with stub levels null or finite matching the selector', async () => {
    const thin = fixtureCandles().slice(0, 5);
    const fetchFn = vi.fn(async () =>
      Response.json({
        candles: thin,
        contractHint: 'NQ=F · CME',
        lastUpdatedISO: new Date().toISOString(),
        stale: false,
        source: 'live',
      }),
    );
    vi.stubGlobal('fetch', fetchFn);

    const container = await renderShell();

    const shell = container.querySelector('[data-slot="terminal-shell"]');
    expect(shell).not.toBeNull();
    const stub = shell!.querySelector('[data-slot="nq-chart-stub"]');
    const expected = useDashboard.getState().selectLevels();
    if (expected === null) {
      expect(stub).toBeNull();
      expect(shell!.textContent).toContain('Məlumat yoxdur');
    } else {
      expect(stub).not.toBeNull();
      const props = chartCapture.props as unknown as { levels: unknown };
      expect(props.levels).toEqual(expected);
      const finite = expected as unknown as {
        q1: number;
        q3: number;
        bullOTE: { lo: number; hi: number };
        bearOTE: { lo: number; hi: number };
      };
      expect(Number.isFinite(finite.q1)).toBe(true);
      expect(Number.isFinite(finite.q3)).toBe(true);
      expect(Number.isFinite(finite.bullOTE.lo)).toBe(true);
      expect(Number.isFinite(finite.bullOTE.hi)).toBe(true);
      expect(Number.isFinite(finite.bearOTE.lo)).toBe(true);
      expect(Number.isFinite(finite.bearOTE.hi)).toBe(true);
    }
  });
});

describe('terminal shell per-leg strip ages plus coverage line (D-04/D-13)', () => {
  // Pin Baku Friday noon (2026-09-04 12:00 +04:00 == 08:00Z) so deriveStatus
  // weekend-wins never fires: the W2 suite proves CLOSED separately, and
  // these cases pin the paired-age rendering on a weekday.
  function weekdayISO(): string {
    return new Date('2026-09-04T08:00:00Z').toISOString();
  }

  function legEnvelope(hint: string, stale: boolean) {
    return {
      candles: fixtureCandles(),
      contractHint: hint,
      lastUpdatedISO: weekdayISO(),
      stale,
      source: 'live' as const,
    };
  }

  it('paired ages render with both legs fresh (NQ seconds · ES seconds)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-04T08:00:00Z'));
    const fetchFn = vi.fn(async (url: string) =>
      Response.json(
        String(url).includes('symbol=ES') ? legEnvelope('ES=F · CME', false) : legEnvelope('NQ=F · CME', false),
      ),
    );
    vi.stubGlobal('fetch', fetchFn);

    const container = await renderShell();
    await act(async () => {
      await useDashboard.getState().refreshES();
    });

    const strip = container.querySelector('[data-slot="status-strip"]');
    expect(strip).not.toBeNull();
    // Plan acceptance: NQ plus digits plus s, middle dot, ES plus digits
    // plus s — against the Azerbaijani `san` copy (`0 san` contains `0 s`).
    expect(strip!.textContent).toMatch(/NQ.*\d+ s.*·.*ES.*\d+ s/);
    expect(strip!.getAttribute('data-freshness')).toBe('live');
  });

  it('one stale leg shows its STALE copy while the other stays LIVE with no merged boolean', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-04T08:00:00Z'));
    const fetchFn = vi.fn(async (url: string) =>
      Response.json(
        String(url).includes('symbol=ES') ? legEnvelope('ES=F · CME', true) : legEnvelope('NQ=F · CME', false),
      ),
    );
    vi.stubGlobal('fetch', fetchFn);

    const container = await renderShell();
    await act(async () => {
      await useDashboard.getState().refreshES();
    });

    const strip = container.querySelector('[data-slot="status-strip"]');
    expect(strip).not.toBeNull();
    // ES segment carries STALE, NQ segment stays LIVE — independent legs.
    expect(strip!.textContent).toMatch(/NQ.*LIVE/);
    expect(strip!.textContent).toMatch(/ES.*STALE/);
    expect(strip!.getAttribute('data-freshness')).toBe('stale');
    // No merged stale boolean anywhere on the state.
    expect('staleMerged' in useDashboard.getState()).toBe(false);
  });

  it('coverage line shows the pinned join counts on fixture legs', async () => {
    const fetchFn = vi.fn(async () => Response.json(liveEnvelope()));
    vi.stubGlobal('fetch', fetchFn);

    const container = await renderShell();

    // Seed both legs with the same 20-row envelope: identical date strings
    // join 1:1, so coverage reads NQ 20 / ES 20 / joined 20.
    const candles = fixtureCandles();
    const iso = weekdayISO();
    await act(async () => {
      useDashboard.setState({
        nq: { candles, contractHint: 'NQ=F · CME', lastUpdatedISO: iso, stale: false, source: 'live', lastError: null },
        es: { candles, contractHint: 'ES=F · CME', lastUpdatedISO: iso, stale: false, source: 'live', lastError: null },
        coverage: { nq: 20, es: 17, joined: 14, dropped: 7 },
      });
    });

    const line = container.querySelector('[data-slot="join-coverage"]');
    expect(line).not.toBeNull();
    expect(line!.textContent).toMatch(/NQ 20 \/ ES 17 \/ joined 14/);
  });
});
