// Shape guard plus resolver for the local scenario fixture snapshots.
// Pure: the clock enters resolveScenario only through the injected now
// parameter, defaulting to the current instant at the boundary.

import type { BrokerQuote } from '@/src/lib/sentiment';

export const SCENARIO_IDS = ['crowded-long', 'crowded-short', 'balanced'] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

export interface FixtureCalendarEvent {
  event: string;
  impact: 'high';
  startsAtOffsetHours: number;
}

export interface ScenarioFixture {
  id: ScenarioId;
  label: string;
  sentiment: {
    symbol: string;
    brokers: BrokerQuote[];
  };
  calendar: {
    events: FixtureCalendarEvent[];
  };
  interpretation: string;
}

export interface ResolvedEvent {
  event: string;
  impact: 'high';
  startsAt: string;
}

const ROW_SUM_TOLERANCE = 0.01;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isValidBrokerRow(row: unknown): row is BrokerQuote {
  if (!isRecord(row)) return false;
  if (typeof row.broker !== 'string' || row.broker.length === 0) return false;
  if (!isFiniteNumber(row.longPct) || row.longPct < 0 || row.longPct > 100) return false;
  if (!isFiniteNumber(row.shortPct) || row.shortPct < 0 || row.shortPct > 100) return false;
  return Math.abs(row.longPct + row.shortPct - 100) <= ROW_SUM_TOLERANCE;
}

function isValidCalendarEvent(row: unknown): row is FixtureCalendarEvent {
  if (!isRecord(row)) return false;
  if (typeof row.event !== 'string' || row.event.length === 0) return false;
  if (row.impact !== 'high') return false;
  return isFiniteNumber(row.startsAtOffsetHours);
}

// Hand-rolled shape guard: rejects malformed rows before render so fixture
// output never crashes a panel on bad committed JSON.
export function isScenarioFixture(v: unknown): v is ScenarioFixture {
  if (!isRecord(v)) return false;
  if (!SCENARIO_IDS.includes(v.id as ScenarioId)) return false;
  if (typeof v.label !== 'string' || v.label.length === 0) return false;
  if (typeof v.interpretation !== 'string' || v.interpretation.trim().length === 0) return false;
  if (!isRecord(v.sentiment)) return false;
  if (typeof v.sentiment.symbol !== 'string' || v.sentiment.symbol.length === 0) return false;
  if (!Array.isArray(v.sentiment.brokers) || v.sentiment.brokers.length === 0) return false;
  if (!v.sentiment.brokers.every(isValidBrokerRow)) return false;
  if (!isRecord(v.calendar)) return false;
  if (!Array.isArray(v.calendar.events)) return false;
  return v.calendar.events.every(isValidCalendarEvent);
}

// Turns hour offsets into ISO countdown targets anchored at the injected now.
// Offsets keep countdowns fresh forever regardless of when the file loads.
export function resolveScenario(fixture: ScenarioFixture, now: Date = new Date()): ResolvedEvent[] {
  return fixture.calendar.events.map((e) => ({
    event: e.event,
    impact: e.impact,
    startsAt: new Date(now.getTime() + e.startsAtOffsetHours * 3_600_000).toISOString(),
  }));
}
