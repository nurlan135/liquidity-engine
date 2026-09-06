import { create } from 'zustand';
import type { BiasOutput, Candle, DealingRange, DOLTarget, IntradayCandle, RegimeOutput, RolloverFlag } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';
import { innerJoinOnTimestamp, type JoinCoverage } from '@/src/lib/ict/join';
import { ANCHOR_WINDOW, computePosition, computeRange } from '@/src/lib/ict/range';
import { computeBias } from '@/src/lib/ict/bias';
import { computePrimaryDOL } from '@/src/lib/ict/dol';
import { computeRegime } from '@/src/lib/ict/regime';
import { detectRollover } from '@/src/lib/ict/rollover';
import { computeLevels, type LevelsOutput } from '@/src/lib/ict/levels';
import { getAsOfBakuDate } from '@/src/lib/time';

export type ScenarioId = 'crowded-long' | 'crowded-short' | 'balanced';

interface EnvelopeJson {
  candles: unknown;
  contractHint?: unknown;
  lastUpdatedISO?: unknown;
  stale?: unknown;
  source?: unknown;
}

interface ValidLegEnvelope {
  candles: Candle[];
  contractHint: string;
  lastUpdatedISO: string;
  stale: boolean;
  source: string;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isValidCandle(c: unknown): c is Candle {
  if (typeof c !== 'object' || c === null) return false;
  const row = c as Record<string, unknown>;
  return (
    typeof row.date === 'string' &&
    isFiniteNumber(row.open) &&
    isFiniteNumber(row.high) &&
    isFiniteNumber(row.low) &&
    isFiniteNumber(row.close) &&
    (row.forming === undefined || typeof row.forming === 'boolean')
  );
}

// Client-side envelope guard: finite OHLC on every row, strictly ascending
// dates, minimum one row. Mirrors the server shape-guard contract. Applied
// per leg (D-06): a malformed leg is rejected without touching the healthy leg.
function isValidEnvelope(env: EnvelopeJson): env is ValidLegEnvelope {
  if (!Array.isArray(env.candles) || env.candles.length < 1) return false;
  if (!env.candles.every(isValidCandle)) return false;
  if (typeof env.contractHint !== 'string' || env.contractHint.trim().length === 0) return false;
  if (typeof env.lastUpdatedISO !== 'string') return false;
  if (!Number.isFinite(new Date(env.lastUpdatedISO).getTime())) return false;
  if (typeof env.stale !== 'boolean') return false;
  if (typeof env.source !== 'string') return false;
  const dates = (env.candles as Candle[]).map((c) => c.date);
  for (let i = 1; i < dates.length; i++) {
    if (dates[i] <= dates[i - 1]) return false;
  }
  return true;
}

// D-04/D-06: independent per-leg envelope. Each leg carries its own rows,
// freshness, and error — never a merged stale boolean, never cross-leg data.
export interface LegState {
  candles: Candle[];
  contractHint: string;
  lastUpdatedISO: string | null;
  stale: boolean;
  source: string;
  lastError: string | null;
}

function emptyLeg(): LegState {
  return {
    candles: [],
    contractHint: '',
    lastUpdatedISO: null,
    stale: false,
    source: 'none',
    lastError: null,
  };
}

export interface DashboardState {
  candles: Candle[];
  contractHint: string;
  lastUpdatedISO: string | null;
  stale: boolean;
  source: string;
  inFlight: boolean;
  scenario: ScenarioId;
  lastError: string | null;
  asOfBaku: string;
  // D-01/D-06: dual-leg state. nq mirrors the legacy top-level NQ fields;
  // es is fully independent. No merged stale boolean anywhere.
  nq: LegState;
  es: LegState;
  inFlightNQ: boolean;
  inFlightES: boolean;
  // D-13: join coverage diagnostics ride in the data for Phase 7 selectors.
  coverage: JoinCoverage;
  // D-01: last computed dual-poll offsets (ms) — state, not a module probe,
  // so tests read the same instance that started the timers.
  lastSchedule: DualPollSchedule | null;
  refresh: () => Promise<void>;
  refreshNQ: () => Promise<void>;
  refreshES: () => Promise<void>;
  startDualPoll: (now?: Date) => void;
  stopDualPoll: () => void;
  setScenario: (scenario: ScenarioId) => void;
  selectRange: () => DealingRange | null;
  selectLastClose: () => number | null;
  selectPosition: () => number | null;
  selectBias: () => BiasOutput | null;
  selectDOL: () => DOLTarget | null;
  selectRegime: () => RegimeOutput | null;
  selectLevels: () => LevelsOutput | null;
  selectRollover: () => RolloverFlag | null;
}

function closedCount(candles: Candle[]): number {
  return closedOnly(candles).length;
}

async function fetchLegEnvelope(url: string): Promise<ValidLegEnvelope> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`refresh failed with status ${res.status}`);
  }
  const json = (await res.json()) as EnvelopeJson;
  if (!isValidEnvelope(json)) {
    throw new Error('refresh rejected invalid envelope');
  }
  return json;
}

// D-07/D-16: project daily Candle rows to IntradayCandle-shaped join input by
// mapping the business-day date string to UTC epoch seconds at midnight UTC
// while copying OHLC verbatim. Used solely for the join call — stored leg
// rows keep the date-string contract. The D1 anchor path never sees this.
function projectLegToIntraday(candles: Candle[]): IntradayCandle[] {
  const out: IntradayCandle[] = [];
  for (const c of candles) {
    const time = Math.floor(new Date(`${c.date}T00:00:00Z`).getTime() / 1000);
    if (!Number.isFinite(time)) continue;
    out.push({
      time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      ...(c.forming === true ? { forming: true as const } : {}),
    });
  }
  return out;
}

// T-06-02: coverage object guard — finite non-negative integers with joined
// bounded by the smaller leg. innerJoinOnTimestamp holds this by
// construction; the guard keeps a regressed join from poisoning the data.
function isValidCoverage(c: JoinCoverage): c is JoinCoverage {
  const vals = [c.nq, c.es, c.joined, c.dropped];
  if (!vals.every((v) => Number.isInteger(v) && v >= 0)) return false;
  return c.joined <= Math.min(c.nq, c.es);
}

const EMPTY_COVERAGE: JoinCoverage = { nq: 0, es: 0, joined: 0, dropped: 0 };

function computeCoverage(nqCandles: Candle[], esCandles: Candle[]): JoinCoverage {
  // D-14: warn, never refuse — the join always returns rows plus coverage;
  // the store keeps whatever valid counts it computes.
  const { coverage } = innerJoinOnTimestamp(
    projectLegToIntraday(nqCandles),
    projectLegToIntraday(esCandles),
  );
  if (!isValidCoverage(coverage)) return { ...EMPTY_COVERAGE };
  return coverage;
}

function legFromEnvelope(env: ValidLegEnvelope): LegState {
  return {
    candles: env.candles,
    contractHint: env.contractHint,
    lastUpdatedISO: env.lastUpdatedISO,
    stale: env.stale,
    source: env.source,
    lastError: null,
  };
}

// D-01/D-02/D-03: uniform 60s cadence, always-on dual timers. NQ fires at
// second 00, ES at second 30, each plus 5–10s jitter, offsets computed from
// the wall clock at start. No visibility gating, no Promise.all coupling.
const POLL_INTERVAL_MS = 60_000;

function staggerJitterMs(): number {
  return 5000 + Math.random() * 5000;
}

let nqTimeout: ReturnType<typeof setTimeout> | null = null;
let nqInterval: ReturnType<typeof setInterval> | null = null;
let esTimeout: ReturnType<typeof setTimeout> | null = null;
let esInterval: ReturnType<typeof setInterval> | null = null;

// Test-visible probe of the pending dual-timer schedule (offsets in ms).
// Production UI never reads this; the stagger test pins D-01 through it.
export interface DualPollSchedule {
  delayNQ: number;
  delayES: number;
}


function clearDualTimers(): void {
  if (nqTimeout !== null) {
    clearTimeout(nqTimeout);
    nqTimeout = null;
  }
  if (nqInterval !== null) {
    clearInterval(nqInterval);
    nqInterval = null;
  }
  if (esTimeout !== null) {
    clearTimeout(esTimeout);
    esTimeout = null;
  }
  if (esInterval !== null) {
    clearInterval(esInterval);
    esInterval = null;
  }
}

export const useDashboard = create<DashboardState>()((set, get) => ({
  candles: [],
  contractHint: '',
  lastUpdatedISO: null,
  stale: false,
  source: 'none',
  inFlight: false,
  scenario: 'crowded-long',
  lastError: null,
  asOfBaku: getAsOfBakuDate(new Date(0)),
  nq: emptyLeg(),
  es: emptyLeg(),
  inFlightNQ: false,
  inFlightES: false,
  coverage: { ...EMPTY_COVERAGE },
  lastSchedule: null,

  refresh: async () => {
    // Client singleflight: coalesce parallel refresh calls, no torn writes.
    // Legacy NQ path — writes the exact NQ state as before and mirrors it
    // into the nq leg so both views stay coherent.
    if (get().inFlight || get().inFlightNQ) return;
    set({ inFlight: true, inFlightNQ: true });
    try {
      const json = await fetchLegEnvelope('/api/yahoo');
      set({
        candles: json.candles,
        contractHint: json.contractHint,
        lastUpdatedISO: json.lastUpdatedISO,
        stale: json.stale,
        source: json.source,
        asOfBaku: getAsOfBakuDate(new Date()),
        lastError: null,
        inFlight: false,
        inFlightNQ: false,
        nq: legFromEnvelope(json),
        coverage: computeCoverage(json.candles, get().es.candles),
      });
    } catch (err) {
      // Preserve last-known candles; mark the envelope stale immediately so the
      // badge reflects failure without waiting on the 120s age ramp. Success
      // path restores stale from the envelope on the next round.
      const message = err instanceof Error ? err.message : 'refresh failed';
      set({
        lastError: message,
        stale: true,
        inFlight: false,
        inFlightNQ: false,
        nq: { ...get().nq, stale: true, lastError: message },
      });
    }
  },

  refreshNQ: async () => {
    // Per-leg singleflight (T-06-03): same-leg concurrent calls coalesce;
    // the ES leg proceeds independently.
    if (get().inFlightNQ || get().inFlight) return;
    set({ inFlight: true, inFlightNQ: true });
    try {
      const json = await fetchLegEnvelope('/api/yahoo');
      set({
        candles: json.candles,
        contractHint: json.contractHint,
        lastUpdatedISO: json.lastUpdatedISO,
        stale: json.stale,
        source: json.source,
        asOfBaku: getAsOfBakuDate(new Date()),
        lastError: null,
        inFlight: false,
        inFlightNQ: false,
        nq: legFromEnvelope(json),
        coverage: computeCoverage(json.candles, get().es.candles),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'refresh failed';
      set({
        lastError: message,
        stale: true,
        inFlight: false,
        inFlightNQ: false,
        nq: { ...get().nq, stale: true, lastError: message },
      });
    }
  },

  refreshES: async () => {
    // D-06: independent failure — a failed ES leg marks only es stale and
    // preserves its last-known rows. Never writes NQ state, never
    // cross-substitutes, never touches the top-level NQ error.
    if (get().inFlightES) return;
    set({ inFlightES: true });
    try {
      const json = await fetchLegEnvelope('/api/yahoo?symbol=ES=F&interval=1d');
      set({
        es: legFromEnvelope(json),
        inFlightES: false,
        coverage: computeCoverage(get().nq.candles, json.candles),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'refresh failed';
      set({
        es: { ...get().es, stale: true, lastError: message },
        inFlightES: false,
      });
    }
  },

  startDualPoll: (nowArg?: Date) => {
    // Restart cleanly: exactly one pair of timers ever.
    get().stopDualPoll();
    // Optional injectable clock (tests pin fake-system time; production
    // passes nothing and reads the wall clock). Never Date.now() inside
    // selectors — this is orchestration, not src/lib/ict math.
    const now = nowArg ?? new Date();
    // UTC getters: the stagger grid (:00/:30) is a wall-clock-UTC grid, and
    // getSeconds() under a non-UTC TZ would shift the offsets off-grid.
    // getTime-derived fields (immune to any Date-method mocking): seconds
    // within the minute and millis within the second, straight from epoch.
    const epochMs = now.getTime();
    if (!Number.isFinite(epochMs)) throw new Error('startDualPoll read an invalid clock');
    // Positive modulo: epoch seconds are positive here, but % keeps the sign
    // of the dividend — floor the guard so a pre-1970 clock cannot push the
    // offsets off-grid.
    const totalSec = Math.floor(epochMs / 1000);
    const sec = ((totalSec % 60) + 60) % 60;
    const ms = epochMs - totalSec * 1000;
    const jitterNQ = staggerJitterMs();
    const jitterES = staggerJitterMs();
    const delayNQ = ((60 - sec) % 60) * 1000 - ms + jitterNQ;
    // At :30 the next ES :30 is a full 60s out (60s grid phase-locked to
    // :30), not 0s: (90 - sec) % 60 hits 0 at sec 30. (60 - sec + 30)
    // keeps the +30s phase without the zero-trap.
    const delayES = (((60 - sec) % 60) + 30) * 1000 - ms + jitterES;
    // The delay computation is recorded in the store state itself (same
    // zustand instance the test reads), so D-01 offsets are pinned without
    // a module-level probe cell.
    set({ lastSchedule: { delayNQ, delayES } });
    // Mount owns the first poll: NQ lands immediately on the bare path.
    void get().refreshNQ();
    nqTimeout = setTimeout(() => {
      void get().refreshNQ();
      nqInterval = setInterval(() => {
        void get().refreshNQ();
      }, POLL_INTERVAL_MS);
    }, Math.max(0, delayNQ));
    esTimeout = setTimeout(() => {
      void get().refreshES();
      esInterval = setInterval(() => {
        void get().refreshES();
      }, POLL_INTERVAL_MS);
    }, Math.max(0, delayES));
  },

  stopDualPoll: () => {
    clearDualTimers();
    set({ lastSchedule: null });
  },

  setScenario: (scenario: ScenarioId) => {
    set({ scenario });
  },

  // Selectors call src/lib/ict pure functions; no math is duplicated here.
  // The D1 NQ anchor path reads the raw NQ array exactly as before (D-07):
  // no join parameters, no ES inputs.
  selectRange: () => {
    const { candles, asOfBaku } = get();
    if (closedCount(candles) < 1) return null;
    return computeRange(candles, asOfBaku, ANCHOR_WINDOW);
  },

  selectLastClose: () => {
    const { candles } = get();
    const closed = closedOnly(candles);
    if (closed.length === 0) return null;
    return closed[closed.length - 1].close;
  },

  selectPosition: () => {
    const range = get().selectRange();
    const lastClose = get().selectLastClose();
    if (range === null || lastClose === null) return null;
    return computePosition(range, lastClose);
  },

  selectBias: () => {
    const { candles } = get();
    const range = get().selectRange();
    if (range === null) return null;
    const lastClose = get().selectLastClose();
    if (lastClose === null) return null;
    const position = computePosition(range, lastClose);
    const regime = computeRegime(candles).regime;
    return computeBias(position, regime, closedCount(candles));
  },

  selectDOL: () => {
    const range = get().selectRange();
    const bias = get().selectBias();
    const lastClose = get().selectLastClose();
    if (range === null || bias === null || lastClose === null) return null;
    return computePrimaryDOL(range, bias.bias, lastClose);
  },

  selectRegime: () => {
    const { candles } = get();
    if (candles.length === 0) return null;
    return computeRegime(candles);
  },

  selectLevels: () => {
    const range = get().selectRange();
    const lastClose = get().selectLastClose();
    if (range === null || lastClose === null) return null;
    return computeLevels(range, lastClose);
  },

  selectRollover: () => {
    const { candles, contractHint, asOfBaku } = get();
    if (candles.length === 0) return null;
    const { atr } = computeRegime(candles);
    if (!Number.isFinite(atr) || atr <= 0) return null;
    return detectRollover(candles, atr, asOfBaku, contractHint);
  },
}));
