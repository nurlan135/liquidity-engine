import { describe, expect, it } from 'vitest';
import {
  CALIBRATION_BREAK_COPY,
  CALIBRATION_EMPTY_COPY,
  CALIBRATION_HOLD_COPY,
  summarizeFiringLog,
} from '@/src/lib/ict/calibration';
import type { FiringLogEntry } from '@/src/lib/ict/trigger';

// ICT-21 (D-01/D-02/D-04, T-21-02): calibration helper pins beside the full
// parity suite. FIRE-only counting (ARMED and WAIT never vote), weeks as
// unique NY-week Mondays floored at 1, overflow counted conservatively as
// additional fires so a trimmed log can never false-HOLD, null verdict on
// zero entries plus zero overflow (the panel renders no verdict line), and
// the IN-BAND edges at exactly 1 and exactly 4 fires per week.

function fireEntry(
  sessionDate: string,
  asOf: number,
  verdict: 'FIRE_LONG' | 'FIRE_SHORT' = 'FIRE_LONG',
): FiringLogEntry {
  return {
    asOf,
    verdict,
    gates: { timing: true, purge: true, displacement: true },
    direction: 'LONG',
    reasonKey: verdict,
    sessionDate,
  };
}

function armedEntry(sessionDate: string, asOf: number): FiringLogEntry {
  return {
    asOf,
    verdict: 'ARMED',
    gates: { timing: true, purge: false, displacement: false },
    direction: null,
    reasonKey: 'ARMED_MISSING_PURGE',
    sessionDate,
  };
}

function waitEntry(sessionDate: string, asOf: number): FiringLogEntry {
  return {
    asOf,
    verdict: 'WAIT_FOR_MANIPULATION',
    gates: { timing: false, purge: false, displacement: false },
    direction: null,
    reasonKey: 'WAIT_FOR_MANIPULATION',
    sessionDate,
  };
}

describe('calibration: summarizeFiringLog helper pins (FIRE-only, weeks, overflow, empty)', () => {
  it('counts FIRE entries only — ARMED and WAIT never vote', () => {
    const entries = [
      fireEntry('2026-08-04', 1000),
      armedEntry('2026-08-04', 1001),
      waitEntry('2026-08-04', 1002),
    ];
    const out = summarizeFiringLog(entries, 0, ['2026-08-04']);
    expect(out.fires).toBe(1);
    expect(out.weeks).toBe(1);
    expect(out.firesPerWeek).toBe(1);
    expect(out.verdict).toBe('IN-BAND');
  });

  it('counts both FIRE directions while ARMED_ALREADY_FIRED echoes stay silent', () => {
    const entries = [
      fireEntry('2026-08-04', 1000, 'FIRE_LONG'),
      fireEntry('2026-08-05', 1001, 'FIRE_SHORT'),
      armedEntry('2026-08-05', 1002),
    ];
    const out = summarizeFiringLog(entries, 0, ['2026-08-04', '2026-08-05']);
    expect(out.fires).toBe(2);
    expect(out.verdict).toBe('IN-BAND');
  });

  it('derives weeks as unique NY-week Mondays floored at 1', () => {
    // Same NY week twice (Mon 2026-08-03 week: Mon + Tue) → 1 week.
    const sameWeek = summarizeFiringLog(
      [fireEntry('2026-08-03', 1000), fireEntry('2026-08-04', 1001)],
      0,
      ['2026-08-03', '2026-08-04'],
    );
    expect(sameWeek.weeks).toBe(1);
    expect(sameWeek.firesPerWeek).toBe(2);
    // Empty sessionDates still floors at 1 week (no division by zero).
    const floored = summarizeFiringLog([fireEntry('2026-08-03', 1000)], 0, []);
    expect(floored.weeks).toBe(1);
    expect(floored.firesPerWeek).toBe(1);
  });

  it('counts four NY weeks across the 20-session population calendar', () => {
    const dates = [
      '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07',
      '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14',
      '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21',
      '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28',
    ];
    const out = summarizeFiringLog([fireEntry('2026-08-04', 1000)], 0, dates);
    expect(out.weeks).toBe(4);
    expect(out.firesPerWeek).toBe(0.25);
  });

  it('counts overflow conservatively as additional fires (never false-HOLDs)', () => {
    // Empty retained log plus 2 overflowed entries: fires 2, verdict IN-BAND
    // — trimmed history can only hide fires, so overflow votes toward fires.
    const overflowed = summarizeFiringLog([], 2, ['2026-08-04']);
    expect(overflowed.fires).toBe(2);
    expect(overflowed.verdict).toBe('IN-BAND');
    // Overflow pushes an in-band week out of band: 3 retained + 3 overflow
    // over 1 week = 6/week → OUT-OF-BAND.
    const pushed = summarizeFiringLog(
      [fireEntry('2026-08-04', 1000), fireEntry('2026-08-04', 1001), fireEntry('2026-08-04', 1002)],
      3,
      ['2026-08-04'],
    );
    expect(pushed.fires).toBe(6);
    expect(pushed.firesPerWeek).toBe(6);
    expect(pushed.verdict).toBe('OUT-OF-BAND');
  });

  it('yields a null verdict on zero entries plus zero overflow (no confident HOLD)', () => {
    const out = summarizeFiringLog([], 0, []);
    expect(out.fires).toBe(0);
    expect(out.weeks).toBe(1);
    expect(out.firesPerWeek).toBe(0);
    expect(out.verdict).toBeNull();
  });

  it('pins the IN-BAND edge at exactly 1 fire per week', () => {
    const out = summarizeFiringLog([fireEntry('2026-08-04', 1000)], 0, ['2026-08-04']);
    expect(out.firesPerWeek).toBe(1);
    expect(out.verdict).toBe('IN-BAND');
  });

  it('pins the IN-BAND edge at exactly 4 fires per week', () => {
    const entries = [
      fireEntry('2026-08-04', 1000),
      fireEntry('2026-08-04', 1001),
      fireEntry('2026-08-04', 1002),
      fireEntry('2026-08-04', 1003),
    ];
    const out = summarizeFiringLog(entries, 0, ['2026-08-04']);
    expect(out.firesPerWeek).toBe(4);
    expect(out.verdict).toBe('IN-BAND');
  });

  it('breaks out of band just outside the edges (below 1 and above 4)', () => {
    const zero = summarizeFiringLog([armedEntry('2026-08-04', 1000)], 0, ['2026-08-04']);
    expect(zero.firesPerWeek).toBe(0);
    expect(zero.verdict).toBe('OUT-OF-BAND');
    const five = summarizeFiringLog(
      [
        fireEntry('2026-08-04', 1000),
        fireEntry('2026-08-04', 1001),
        fireEntry('2026-08-04', 1002),
        fireEntry('2026-08-04', 1003),
        fireEntry('2026-08-04', 1004),
      ],
      0,
      ['2026-08-04'],
    );
    expect(five.firesPerWeek).toBe(5);
    expect(five.verdict).toBe('OUT-OF-BAND');
  });

  it('pins the verbatim UI-SPEC copy constants with toBe', () => {
    expect(CALIBRATION_HOLD_COPY).toBe('Atəş tempi 1–4/həftə bandında — TUTULDU');
    expect(CALIBRATION_BREAK_COPY).toBe(
      'Atəş tempi banddan kənar — QIRILDI — konstantlar yenidən ayarlanır',
    );
    expect(CALIBRATION_EMPTY_COPY).toBe(
      'Kalibrləmə üçün kifayət qədər atəş qeydi yoxdur — jurnal dolduqca band qiymətləndiriləcək.',
    );
  });

  it('throws got-string errors on malformed envelopes while null entries degrade honestly', () => {
    expect(() =>
      summarizeFiringLog('malformed' as unknown as FiringLogEntry[], 0, ['2026-08-04']),
    ).toThrow('got');
    expect(() => summarizeFiringLog([], -1, ['2026-08-04'])).toThrow('got');
    expect(() => summarizeFiringLog([], 0, ['08-04'] as string[])).toThrow('got');
    // The store's appendFiringLog already filters WAIT and
    // ARMED_ALREADY_FIRED before the retained set ever reaches the helper;
    // a WAIT-only retained set still summarizes honestly (0 fires).
    const waits = summarizeFiringLog([waitEntry('2026-08-04', 1000)], 0, ['2026-08-04']);
    expect(waits.fires).toBe(0);
    expect(waits.verdict).toBe('OUT-OF-BAND');
  });
});
