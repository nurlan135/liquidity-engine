import { create } from 'zustand';
import { formatInTimeZone } from 'date-fns-tz';
import type { BiasOutput, Candle, DealingRange, DOLTarget, IntradayCandle, RegimeOutput, RolloverFlag } from '@/src/lib/ict/types';
import { closedOnly, closedOnlyIntraday } from '@/src/lib/ict/types';
import { innerJoinOnTimestamp, type JoinCoverage } from '@/src/lib/ict/join';
import { ANCHOR_WINDOW, computePosition, computeRange } from '@/src/lib/ict/range';
import { computeBias } from '@/src/lib/ict/bias';
import { computePrimaryDOL } from '@/src/lib/ict/dol';
import { computeRegime } from '@/src/lib/ict/regime';
import { detectRollover } from '@/src/lib/ict/rollover';
import { computeLevels, type LevelsOutput } from '@/src/lib/ict/levels';
import { NY_TZ, aggregate1Hto4H } from '@/src/lib/ict/aggregate';
import { asiaRange, type AsiaRange } from '@/src/lib/ict/asia';
import { judasSwing, type JudasOutput } from '@/src/lib/ict/judas';
import { evaluateSMT, type SmtOutput } from '@/src/lib/ict/smt';
import { amdPhase, type AmdOutput } from '@/src/lib/ict/amd';
import { applyMitigation, describeDeliveryTransition, detectFVGs, detectTransition } from '@/src/lib/ict/fvg';
import type { FvgGap } from '@/src/lib/ict/fvg';
import {
  TRIGGER_DISP_MULT,
  TRIGGER_KZ_END_MIN,
  TRIGGER_KZ_START_MIN,
  TRIGGER_LOG_CAP,
  evaluateTrigger,
  nyDateOf,
  type FiringLogEntry,
  type TriggerOutput,
} from '@/src/lib/ict/trigger';

// Re-exported so consumers read the log shape from the store slice owner;
// the canonical definition stays beside the verdict in trigger.ts (moving it
// here would force trigger.ts to import from the store — a purity violation).
export type { FiringLogEntry } from '@/src/lib/ict/trigger';
import { deriveConvictionTier, type ConvictionTier } from '@/src/lib/confluence';
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

// D-13: intraday leg envelope. Same per-leg envelope shape as LegState but
// over epoch-row IntradayCandle rows per the Phase 6 epoch contract — never a
// merged stale boolean, never cross-leg data.
export interface IntradayLegState {
  candles: IntradayCandle[];
  contractHint: string;
  lastUpdatedISO: string | null;
  stale: boolean;
  source: string;
  lastError: string | null;
}

function emptyIntradayLeg(): IntradayLegState {
  return {
    candles: [],
    contractHint: '',
    lastUpdatedISO: null,
    stale: false,
    source: 'none',
    lastError: null,
  };
}

interface IntradayEnvelopeJson {
  candles: unknown;
  contractHint?: unknown;
  lastUpdatedISO?: unknown;
  stale?: unknown;
  source?: unknown;
}

interface ValidIntradayEnvelope {
  candles: IntradayCandle[];
  contractHint: string;
  lastUpdatedISO: string;
  stale: boolean;
  source: string;
}

function isValidIntradayCandle(c: unknown): c is IntradayCandle {
  if (typeof c !== 'object' || c === null) return false;
  const row = c as Record<string, unknown>;
  return (
    isFiniteNumber(row.time) &&
    isFiniteNumber(row.open) &&
    isFiniteNumber(row.high) &&
    isFiniteNumber(row.low) &&
    isFiniteNumber(row.close) &&
    (row.forming === undefined || typeof row.forming === 'boolean')
  );
}

// Per-leg intraday envelope guard (T-09-01): finite OHLC on every row,
// strictly ascending epoch times, non-empty contractHint, parseable ISO.
// A malformed leg is rejected without touching healthy legs.
function isValidIntradayEnvelope(env: IntradayEnvelopeJson): env is ValidIntradayEnvelope {
  if (!Array.isArray(env.candles) || env.candles.length < 1) return false;
  if (!env.candles.every(isValidIntradayCandle)) return false;
  if (typeof env.contractHint !== 'string' || env.contractHint.trim().length === 0) return false;
  if (typeof env.lastUpdatedISO !== 'string') return false;
  if (!Number.isFinite(new Date(env.lastUpdatedISO).getTime())) return false;
  if (typeof env.stale !== 'boolean') return false;
  if (typeof env.source !== 'string') return false;
  const times = (env.candles as IntradayCandle[]).map((c) => c.time);
  for (let i = 1; i < times.length; i++) {
    if (times[i] <= times[i - 1]) return false;
  }
  return true;
}

async function fetchIntradayEnvelope(url: string): Promise<ValidIntradayEnvelope> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`refresh failed with status ${res.status}`);
  }
  const json = (await res.json()) as IntradayEnvelopeJson;
  if (!isValidIntradayEnvelope(json)) {
    throw new Error('refresh rejected invalid envelope');
  }
  return json;
}

function intradayLegFromEnvelope(env: ValidIntradayEnvelope): IntradayLegState {
  return {
    candles: env.candles,
    contractHint: env.contractHint,
    lastUpdatedISO: env.lastUpdatedISO,
    stale: env.stale,
    source: env.source,
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
  // D-13: intraday legs — nq1h (1H) feeds Asia, nq15m (15M) feeds Judas.
  nq1h: IntradayLegState;
  nq15m: IntradayLegState;
  inFlightNQ1H: boolean;
  inFlightNQ15M: boolean;
  // D-13: join coverage diagnostics ride in the data for Phase 7 selectors.
  coverage: JoinCoverage;
  // D-01: last computed dual-poll offsets (ms) — state, not a module probe,
  // so tests read the same instance that started the timers.
  lastSchedule: DualPollSchedule | null;
  refresh: () => Promise<void>;
  refreshNQ: () => Promise<void>;
  refreshES: () => Promise<void>;
  refreshNQ1H: () => Promise<void>;
  refreshNQ15M: () => Promise<void>;
  startDualPoll: (now?: Date) => void;
  stopDualPoll: () => void;
  setScenario: (scenario: ScenarioId) => void;
  selectRange: () => DealingRange | null;
  selectRange4H: () => DealingRange | null;
  selectLastClose: () => number | null;
  selectPosition: () => number | null;
  selectBias: () => BiasOutput | null;
  selectDOL: () => DOLTarget | null;
  selectRegime: () => RegimeOutput | null;
  selectLevels: () => LevelsOutput | null;
  selectRollover: () => RolloverFlag | null;
  selectSMT: () => SmtOutput | null;
  selectAsia: () => AsiaRange | null;
  selectJudas: () => JudasOutput | null;
  selectAMD: (asOf?: number) => AmdOutput | null;
  selectTrigger: () => TriggerOutput | null;
  firingLog: FiringLogEntry[];
  firingLogOverflow: number;
  appendFiringLog: (out: TriggerOutput, asOf: number) => void;
  selectConfluence: () => ConvictionTier;
  selectLiquidityPath: () => string | null;
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
let nq1hTimeout: ReturnType<typeof setTimeout> | null = null;
let nq1hInterval: ReturnType<typeof setInterval> | null = null;
let nq15mTimeout: ReturnType<typeof setTimeout> | null = null;
let nq15mInterval: ReturnType<typeof setInterval> | null = null;

// Test-visible probe of the pending dual-timer schedule (offsets in ms).
// Production UI never reads this; the stagger test pins D-01 through it.
// D-14: four-leg grid — NQ at :00, nq1h at :15, ES at :30, nq15m at :45.
export interface DualPollSchedule {
  delayNQ: number;
  delayES: number;
  delayNQ1H: number;
  delayNQ15M: number;
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
  if (nq1hTimeout !== null) {
    clearTimeout(nq1hTimeout);
    nq1hTimeout = null;
  }
  if (nq1hInterval !== null) {
    clearInterval(nq1hInterval);
    nq1hInterval = null;
  }
  if (nq15mTimeout !== null) {
    clearTimeout(nq15mTimeout);
    nq15mTimeout = null;
  }
  if (nq15mInterval !== null) {
    clearInterval(nq15mInterval);
    nq15mInterval = null;
  }
}

// Phase 15 calibration export (D-08): pure serializer over firing-log
// entries. Output holds entries plus the threshold versions the reviews map
// fires to plus the caller-supplied exportedAt ISO — no account, risk,
// position, or P&L fields, no prices beyond entry FVG bounds. Unit-testable
// without rendering. No Blob, createObjectURL, or anchor code: the Phase 17
// download click consumes this string without reshaping (the seam).
export interface FiringLogCalibration {
  entries: FiringLogEntry[];
  thresholds: {
    TRIGGER_DISP_MULT: number;
    TRIGGER_KZ_START_MIN: number;
    TRIGGER_KZ_END_MIN: number;
  };
  exportedAt: string;
}

export function firingLogToJson(entries: FiringLogEntry[], exportedAt: string): string {
  const payload: FiringLogCalibration = {
    entries: entries.map((entry) => ({
      asOf: entry.asOf,
      verdict: entry.verdict,
      gates: { ...entry.gates },
      direction: entry.direction,
      reasonKey: entry.reasonKey,
      sessionDate: entry.sessionDate,
    })),
    thresholds: {
      TRIGGER_DISP_MULT,
      TRIGGER_KZ_START_MIN,
      TRIGGER_KZ_END_MIN,
    },
    exportedAt,
  };
  return JSON.stringify(payload);
}

// Phase 15: single time truth for selectAMD plus selectTrigger. Extracted
// from the selectAMD epoch IIFE: nq1h lastUpdatedISO with a Date fallback at
// the caller boundary only (ict/ never reads clocks), so both selectors can
// never disagree on time — no torn reads, no duplication.
function sharedEpoch(get: () => DashboardState): number {
  const iso = get().nq1h.lastUpdatedISO;
  const parsed = iso === null ? NaN : new Date(iso).getTime();
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : Math.floor(new Date().getTime() / 1000);
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
  nq1h: emptyIntradayLeg(),
  nq15m: emptyIntradayLeg(),
  inFlightNQ1H: false,
  inFlightNQ15M: false,
  coverage: { ...EMPTY_COVERAGE },
  lastSchedule: null,
  firingLog: [],
  firingLogOverflow: 0,

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

  refreshNQ1H: async () => {
    // D-13/D-15: independent intraday refresher copying the refreshES shape —
    // own singleflight flag, own leg stale plus lastError on failure, never
    // writing sibling legs, coverage recompute untouched.
    if (get().inFlightNQ1H) return;
    set({ inFlightNQ1H: true });
    try {
      const json = await fetchIntradayEnvelope('/api/yahoo?symbol=NQ=F&interval=1h');
      set({
        nq1h: intradayLegFromEnvelope(json),
        inFlightNQ1H: false,
        asOfBaku: getAsOfBakuDate(new Date()),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'refresh failed';
      set({
        nq1h: { ...get().nq1h, stale: true, lastError: message },
        inFlightNQ1H: false,
      });
    }
  },

  refreshNQ15M: async () => {
    // D-13/D-15: 15M mirror of refreshNQ1H — independent failure isolates to
    // the nq15m leg only.
    if (get().inFlightNQ15M) return;
    set({ inFlightNQ15M: true });
    try {
      const json = await fetchIntradayEnvelope('/api/yahoo?symbol=NQ=F&interval=15m');
      set({
        nq15m: intradayLegFromEnvelope(json),
        inFlightNQ15M: false,
        asOfBaku: getAsOfBakuDate(new Date()),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'refresh failed';
      set({
        nq15m: { ...get().nq15m, stale: true, lastError: message },
        inFlightNQ15M: false,
      });
    }
  },

  startDualPoll: (nowArg?: Date) => {
    // Restart cleanly: exactly one timer pair per leg, four legs total.
    get().stopDualPoll();
    // Optional injectable clock (tests pin fake-system time; production
    // passes nothing and reads the wall clock). Never Date.now() inside
    // selectors — this is orchestration, not src/lib/ict math.
    const now = nowArg ?? new Date();
    // UTC getters: the stagger grid (:00/:15/:30/:45) is a wall-clock-UTC
    // grid, and getSeconds() under a non-UTC TZ would shift the offsets
    // off-grid. getTime-derived fields (immune to any Date-method mocking):
    // seconds within the minute and millis within the second, straight from
    // epoch.
    const epochMs = now.getTime();
    if (!Number.isFinite(epochMs)) throw new Error('startDualPoll read an invalid clock');
    // Positive modulo: epoch seconds are positive here, but % keeps the sign
    // of the dividend — floor the guard so a pre-1970 clock cannot push the
    // offsets off-grid.
    const totalSec = Math.floor(epochMs / 1000);
    const sec = ((totalSec % 60) + 60) % 60;
    const ms = epochMs - totalSec * 1000;
    const jitterNQ = staggerJitterMs();
    const jitterNQ1H = staggerJitterMs();
    const jitterES = staggerJitterMs();
    const jitterNQ15M = staggerJitterMs();
    const delayNQ = ((60 - sec) % 60) * 1000 - ms + jitterNQ;
    // At :30 the next ES :30 is a full 60s out (60s grid phase-locked to
    // :30), not 0s: (90 - sec) % 60 hits 0 at sec 30. (60 - sec + 30)
    // keeps the +30s phase without the zero-trap.
    const delayES = (((60 - sec) % 60) + 30) * 1000 - ms + jitterES;
    // nq1h rides the :15 phase, nq15m the :45 phase — same +phase form as
    // delayES so the grid never hits the zero-trap at its own second.
    const delayNQ1H = (((60 - sec) % 60) + 15) * 1000 - ms + jitterNQ1H;
    const delayNQ15M = (((60 - sec) % 60) + 45) * 1000 - ms + jitterNQ15M;
    // The delay computation is recorded in the store state itself (same
    // zustand instance the test reads), so D-01 offsets are pinned without
    // a module-level probe cell.
    set({ lastSchedule: { delayNQ, delayES, delayNQ1H, delayNQ15M } });
    // Mount owns the first poll: NQ lands immediately on the bare path.
    void get().refreshNQ();
    void get().refreshNQ1H();
    void get().refreshNQ15M();
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
    nq1hTimeout = setTimeout(() => {
      void get().refreshNQ1H();
      nq1hInterval = setInterval(() => {
        void get().refreshNQ1H();
      }, POLL_INTERVAL_MS);
    }, Math.max(0, delayNQ1H));
    nq15mTimeout = setTimeout(() => {
      void get().refreshNQ15M();
      nq15mInterval = setInterval(() => {
        void get().refreshNQ15M();
      }, POLL_INTERVAL_MS);
    }, Math.max(0, delayNQ15M));
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

  // ICT-11 closure: 4H dealing range from NY-anchored 1H blocks. Same
  // refuse-with-reason envelope as the other selectors: stale or empty nq1h
  // refuses null (reason rides in nq1h.lastError), and too-few-blocks
  // (aggregate emits complete blocks only, so a thin window yields []) also
  // refuses null instead of throwing. asOf is the latest closed 1H row's NY
  // calendar date — injected from data, never Date.now.
  selectRange4H: () => {
    const { nq1h, asOfBaku } = get();
    if (nq1h.stale) return null;
    if (nq1h.candles.length === 0) return null;
    try {
      const closed = closedOnlyIntraday(nq1h.candles);
      if (closed.length === 0) return null;
      const sorted = [...closed].sort((a, b) => a.time - b.time);
      const latest = sorted[sorted.length - 1];
      const asOf = formatInTimeZone(latest.time * 1000, NY_TZ, 'yyyy-MM-dd');
      const blocks = aggregate1Hto4H(nq1h.candles, asOf);
      if (blocks.length === 0) return null;
      return computeRange(blocks, asOfBaku, ANCHOR_WINDOW);
    } catch {
      return null;
    }
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

  // Phase 9 §3 selectors: each refuses null on stale or empty legs (D-01,
  // D-15) with the owning leg lastError carrying the reason the render layer
  // reads verbatim. Every detector call sits in try/catch so selectors never
  // throw on bad data. Null means degraded — never a throw into render.
  selectSMT: () => {
    const { nq, es, asOfBaku } = get();
    if (nq.stale || es.stale) return null;
    if (nq.candles.length === 0 || es.candles.length === 0) return null;
    try {
      return evaluateSMT(nq.candles, es.candles, asOfBaku);
    } catch {
      return null;
    }
  },

  selectAsia: () => {
    const { nq1h } = get();
    if (nq1h.stale) return null;
    const closed = closedOnlyIntraday(nq1h.candles);
    if (closed.length === 0) return null;
    try {
      const sorted = [...closed].sort((a, b) => a.time - b.time);
      // Candidate session dates, newest first: the latest candle's NY date,
      // then the distinct earlier NY dates in the data (bounded walk — at
      // most 8 back so a sparse leg cannot scan unbounded history). The
      // newest date's Asia window is often still empty in the morning (the
      // 20:00 open is hours away), so fall back to the most recent completed
      // session instead of returning null. Asia killzone is 20:00-23:45 NY
      // wall-clock (edbc70a): this increases overlay frequency by design,
      // returning the last completed session rather than a morning gap.
      const dates: string[] = [];
      for (let i = sorted.length - 1; i >= 0 && dates.length < 8; i--) {
        const d = formatInTimeZone(sorted[i].time * 1000, NY_TZ, 'yyyy-MM-dd');
        if (dates[dates.length - 1] !== d) dates.push(d);
      }
      for (const sessionDate of dates) {
        const range = asiaRange(nq1h.candles, sessionDate);
        if (range !== null) return range;
      }
      return null;
    } catch {
      return null;
    }
  },

  selectJudas: () => {
    const { nq15m } = get();
    if (nq15m.stale) return null;
    const closed = closedOnlyIntraday(nq15m.candles);
    if (closed.length === 0) return null;
    try {
      const asia = get().selectAsia();
      if (asia === null) return null;
      return judasSwing(nq15m.candles, asia);
    } catch {
      return null;
    }
  },

  selectAMD: (asOf?: number) => {
    try {
      const asia = get().selectAsia();
      const judas = get().selectJudas();
      const smt = get().selectSMT();
      const epoch = asOf ?? sharedEpoch(get);
      return amdPhase({ asia, judas, smt, asOf: epoch });
    } catch {
      return null;
    }
  },

  // Phase 15 WHY NOW trigger: one poll-driven path from detectors through
  // evaluateTrigger to the firing log. Refuse-with-null on stale or empty
  // intraday legs; degraded detector outputs yield honest WAIT via
  // evaluateTrigger (null only on the throw path). FVG derives inline from
  // the same nq.candles the selectLiquidityPath precedent uses; empty or
  // stale maps to fvg null so the displacement gate fails honestly.
  selectTrigger: () => {
    const { nq, nq1h, nq15m } = get();
    if (nq1h.stale || nq15m.stale) return null;
    if (closedOnlyIntraday(nq1h.candles).length === 0) return null;
    if (closedOnlyIntraday(nq15m.candles).length === 0) return null;
    try {
      const epoch = sharedEpoch(get);
      const judas = get().selectJudas();
      const smt = get().selectSMT();
      const amd = get().selectAMD(epoch);
      let fvg: FvgGap[] | null = null;
      if (!nq.stale && closedOnly(nq.candles).length > 0) {
        try {
          fvg = applyMitigation(detectFVGs(nq.candles), nq.candles);
        } catch {
          fvg = null;
        }
      }
      const sessionDate = nyDateOf(epoch);
      const alreadyFired = get().firingLog.some(
        (entry) =>
          entry.sessionDate === sessionDate &&
          (entry.verdict === 'FIRE_LONG' || entry.verdict === 'FIRE_SHORT'),
      );
      const out = evaluateTrigger({ judas, amd, smt, fvg, asOf: epoch, alreadyFired });
      // appendFiringLog owns the WAIT skip, the FIRE session dedup, and the
      // already-fired downgrade-repeat skip — call it on every derived
      // verdict so the selector never re-implements log policy.
      get().appendFiringLog(out, epoch);
      return out;
    } catch {
      return null;
    }
  },

  // Phase 15 firing log (D-06/D-07/D-08): appends ARMED-or-better only,
  // dedups FIRE per NY-date session, drops oldest beyond TRIGGER_LOG_CAP
  // with an overflow counter (fvg.ts trailing-slice idiom). Already-fired
  // ARMED downgrade repeats never append: the log already holds the session
  // FIRE they echo, so appending would spam one entry per 60s poll without
  // adding calibration signal.
  appendFiringLog: (out, asOf) => {
    if (out.verdict === 'WAIT_FOR_MANIPULATION') return;
    if (out.reasonKey === 'ARMED_ALREADY_FIRED') return;
    const sessionDate = nyDateOf(asOf);
    const { firingLog } = get();
    const isFire = out.verdict === 'FIRE_LONG' || out.verdict === 'FIRE_SHORT';
    if (
      isFire &&
      firingLog.some(
        (entry) =>
          entry.sessionDate === sessionDate &&
          (entry.verdict === 'FIRE_LONG' || entry.verdict === 'FIRE_SHORT'),
      )
    ) {
      return;
    }
    const entry: FiringLogEntry = {
      asOf,
      verdict: out.verdict,
      gates: { ...out.gates },
      direction: out.direction,
      reasonKey: out.reasonKey,
      sessionDate,
    };
    const next = [...firingLog, entry];
    if (next.length > TRIGGER_LOG_CAP) {
      const overflow = next.length - TRIGGER_LOG_CAP;
      set({
        firingLog: next.slice(-TRIGGER_LOG_CAP),
        firingLogOverflow: get().firingLogOverflow + overflow,
      });
    } else {
      set({ firingLog: next });
    }
  },

  // Sixth selector beside the five named in PATTERNS: FVG delivery prose
  // needs the same refuse-with-reason envelope so components stay math-free.
  selectLiquidityPath: () => {
    const { nq, asOfBaku } = get();
    if (nq.stale) return null;
    if (nq.candles.length === 0) return null;
    try {
      const gaps = detectFVGs(nq.candles);
      const active = applyMitigation(gaps, nq.candles);
      return describeDeliveryTransition(detectTransition(active, nq.candles, asOfBaku));
    } catch {
      return null;
    }
  },

  selectConfluence: () => {
    try {
      return deriveConvictionTier(get().selectJudas(), get().selectSMT());
    } catch {
      // D-11: confluence never returns null — worst case is base tier.
      return 'standart';
    }
  },
}));
