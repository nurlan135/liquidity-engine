import { create } from 'zustand';
import type { BiasOutput, Candle, DealingRange, DOLTarget, RegimeOutput } from '@/src/lib/ict/types';
import { closedOnly } from '@/src/lib/ict/types';
import { ANCHOR_WINDOW, computePosition, computeRange } from '@/src/lib/ict/range';
import { computeBias } from '@/src/lib/ict/bias';
import { computePrimaryDOL } from '@/src/lib/ict/dol';
import { computeRegime } from '@/src/lib/ict/regime';
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
// dates, minimum one row. Mirrors the server shape-guard contract.
function isValidEnvelope(env: EnvelopeJson): env is {
  candles: Candle[];
  contractHint: string;
  lastUpdatedISO: string;
  stale: boolean;
  source: string;
} {
  if (!Array.isArray(env.candles) || env.candles.length < 1) return false;
  if (!env.candles.every(isValidCandle)) return false;
  if (typeof env.contractHint !== 'string') return false;
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
  refresh: () => Promise<void>;
  setScenario: (scenario: ScenarioId) => void;
  selectRange: () => DealingRange | null;
  selectLastClose: () => number | null;
  selectPosition: () => number | null;
  selectBias: () => BiasOutput | null;
  selectDOL: () => DOLTarget | null;
  selectRegime: () => RegimeOutput | null;
  selectLevels: () => LevelsOutput | null;
}

function closedCount(candles: Candle[]): number {
  return closedOnly(candles).length;
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

  refresh: async () => {
    // Client singleflight: coalesce parallel refresh calls, no torn writes.
    if (get().inFlight) return;
    set({ inFlight: true });
    try {
      const res = await fetch('/api/yahoo', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`refresh failed with status ${res.status}`);
      }
      const json = (await res.json()) as EnvelopeJson;
      if (!isValidEnvelope(json)) {
        throw new Error('refresh rejected invalid envelope');
      }
      set({
        candles: json.candles,
        contractHint: json.contractHint,
        lastUpdatedISO: json.lastUpdatedISO,
        stale: json.stale,
        source: json.source,
        asOfBaku: getAsOfBakuDate(new Date()),
        lastError: null,
        inFlight: false,
      });
    } catch (err) {
      // Preserve last-known candles; record the error and release the guard.
      set({
        lastError: err instanceof Error ? err.message : 'refresh failed',
        inFlight: false,
      });
    }
  },

  setScenario: (scenario: ScenarioId) => {
    set({ scenario });
  },

  // Selectors call src/lib/ict pure functions; no math is duplicated here.
  selectRange: () => {
    const { candles, asOfBaku } = get();
    if (closedCount(candles) < 1) return null;
    return computeRange(candles, asOfBaku, ANCHOR_WINDOW);
  },

  selectLastClose: () => {
    const { candles } = get();
    if (candles.length === 0) return null;
    return candles[candles.length - 1].close;
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
}));
