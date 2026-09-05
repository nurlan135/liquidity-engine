import { describe, expect, it } from 'vitest';
import crowdedLong from '@/src/lib/fixtures/crowded-long.json';
import crowdedShort from '@/src/lib/fixtures/crowded-short.json';
import balanced from '@/src/lib/fixtures/balanced.json';
import {
  SCENARIO_IDS,
  isScenarioFixture,
  resolveScenario,
  type ScenarioFixture,
} from '@/src/lib/fixture-guard';
import { trueAvg } from '@/src/lib/sentiment';

function asFixture(json: unknown): ScenarioFixture {
  expect(isScenarioFixture(json)).toBe(true);
  return json as ScenarioFixture;
}

describe('scenario fixtures', () => {
  it('crowded-long: guard accepts and trueAvg returns crowded LONG at or above 60', () => {
    const fixture = asFixture(crowdedLong);
    expect(SCENARIO_IDS).toContain(fixture.id);
    const result = trueAvg(fixture.sentiment.brokers);
    expect(result.crowded).toBe('LONG');
    expect(result.buy).toBeGreaterThanOrEqual(60);
  });

  it('crowded-short: crowded SHORT; balanced: crowded null', () => {
    const shortFixture = asFixture(crowdedShort);
    const shortResult = trueAvg(shortFixture.sentiment.brokers);
    expect(shortResult.crowded).toBe('SHORT');
    expect(shortResult.sell).toBeGreaterThanOrEqual(60);

    const balancedFixture = asFixture(balanced);
    const balancedResult = trueAvg(balancedFixture.sentiment.brokers);
    expect(balancedResult.crowded).toBeNull();
    expect(balancedResult.buy).toBeLessThan(60);
    expect(balancedResult.sell).toBeLessThan(60);
  });

  it('guard rejects rows that do not sum to 100 and non-finite percentages', () => {
    const valid = asFixture(crowdedLong);
    const badSum = {
      ...valid,
      sentiment: {
        ...valid.sentiment,
        brokers: [
          ...valid.sentiment.brokers.slice(0, 2),
          { broker: 'BadRow', longPct: 60, shortPct: 39 },
        ],
      },
    };
    expect(isScenarioFixture(badSum)).toBe(false);

    const nonFinite = {
      ...valid,
      sentiment: {
        ...valid.sentiment,
        brokers: [
          ...valid.sentiment.brokers.slice(0, 2),
          { broker: 'BadRow', longPct: NaN, shortPct: 50 },
        ],
      },
    };
    expect(isScenarioFixture(nonFinite)).toBe(false);
  });

  it('resolver anchors startsAt ISO to the injected now with no clock inside', () => {
    const now = new Date('2026-09-05T12:00:00.000Z');
    for (const json of [crowdedLong, crowdedShort, balanced]) {
      const fixture = asFixture(json);
      const resolved = resolveScenario(fixture, now);
      expect(resolved).toHaveLength(fixture.calendar.events.length);
      for (let i = 0; i < resolved.length; i++) {
        const expected = new Date(
          now.getTime() + fixture.calendar.events[i].startsAtOffsetHours * 3_600_000,
        ).toISOString();
        expect(resolved[i].startsAt).toBe(expected);
      }
    }
  });

  it('every snapshot carries non-empty interpretation prose and only high impact events', () => {
    for (const json of [crowdedLong, crowdedShort, balanced]) {
      const fixture = asFixture(json);
      expect(typeof fixture.interpretation).toBe('string');
      expect(fixture.interpretation.trim().length).toBeGreaterThan(0);
      expect(fixture.calendar.events.length).toBeGreaterThan(0);
      for (const event of fixture.calendar.events) {
        expect(event.impact).toBe('high');
      }
    }
  });
});
