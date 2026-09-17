// ICT-21 (D-01/D-02/D-21): pure firing-log band-verdict math for the Phase 21
// calibration review. Counts FIRE verdicts only (ARMED and WAIT never vote),
// adds the retained-overflow count conservatively as additional fires so the
// verdict never false-HOLDs on trimmed history, and divides by NY-week
// Mondays with a floor of one week (replay.test.ts summarizeReplay
// precedent). A null verdict means "no evidence yet" — the panel renders
// nothing over an empty log, never a confident HOLD. Pure: injected entries
// plus overflow plus session dates only — no clock reads, no store imports,
// deterministic for replay and render-path reads.

import type { FiringLogEntry } from '@/src/lib/ict/trigger';

/** Verbatim HOLD copy for an in-band week (UI-SPEC, test-pinned with toBe). */
export const CALIBRATION_HOLD_COPY = 'Atəş tempi 1–4/həftə bandında — TUTULDU';
/** Verbatim BREAK copy for an out-of-band week (UI-SPEC, test-pinned with toBe). */
export const CALIBRATION_BREAK_COPY =
  'Atəş tempi banddan kənar — QIRILDI — konstantlar yenidən ayarlanır';
/** Verbatim empty-log calibration body (UI-SPEC): verdict renders nothing until entries exist. */
export const CALIBRATION_EMPTY_COPY =
  'Kalibrləmə üçün kifayət qədər atəş qeydi yoxdur — jurnal dolduqca band qiymətləndiriləcək.';

export type CalibrationVerdict = 'IN-BAND' | 'OUT-OF-BAND';

export interface CalibrationSummary {
  /** FIRE-only retained fires plus conservative overflow fires. */
  fires: number;
  /** Unique NY-week Mondays over the session dates, floored at 1. */
  weeks: number;
  /** fires divided by weeks against the 1-4/week acceptance band. */
  firesPerWeek: number;
  /** Band verdict, or null when the log holds zero evidence. */
  verdict: CalibrationVerdict | null;
}

// Monday (yyyy-MM-dd) of the NY week holding the given NY session date.
// Integer UTC-calendar math — no clock reads, host-TZ independent
// (replay.test.ts mondayOfNyDate precedent).
function mondayOfNyDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const back = (day + 6) % 7;
  const monday = new Date(Date.UTC(y, m - 1, d - back));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
}

function assertValidEntries(entries: FiringLogEntry[] | null | undefined): void {
  if (!Array.isArray(entries)) {
    throw new Error(`summarizeFiringLog requires a FiringLogEntry array, got ${String(entries)}`);
  }
  for (const entry of entries) {
    if (
      entry === null ||
      entry === undefined ||
      typeof entry !== 'object' ||
      Array.isArray(entry) ||
      typeof (entry as FiringLogEntry).verdict !== 'string' ||
      typeof (entry as FiringLogEntry).sessionDate !== 'string'
    ) {
      throw new Error(
        `summarizeFiringLog requires FiringLogEntry objects with string verdict/sessionDate, got ${String(entry)}`,
      );
    }
  }
}

function assertValidOverflow(overflow: number): void {
  if (typeof overflow !== 'number' || !Number.isFinite(overflow) || !Number.isInteger(overflow) || overflow < 0) {
    throw new Error(`summarizeFiringLog requires a finite non-negative integer overflow count, got ${String(overflow)}`);
  }
}

function assertValidSessionDates(sessionDates: string[]): void {
  if (!Array.isArray(sessionDates)) {
    throw new Error(`summarizeFiringLog requires a sessionDates string array, got ${String(sessionDates)}`);
  }
  for (const date of sessionDates) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`summarizeFiringLog requires sessionDates in yyyy-MM-dd format, got ${String(date)}`);
    }
  }
}

export function summarizeFiringLog(
  entries: FiringLogEntry[],
  overflow: number,
  sessionDates: string[],
): CalibrationSummary {
  assertValidEntries(entries);
  assertValidOverflow(overflow);
  assertValidSessionDates(sessionDates);
  const log = entries as FiringLogEntry[];
  // FIRE-only counting (D-01): ARMED and WAIT entries never vote.
  const retainedFires = log.filter(
    (entry) => entry.verdict === 'FIRE_LONG' || entry.verdict === 'FIRE_SHORT',
  ).length;
  // Conservative overflow inclusion: trimmed history can only hide fires, so
  // every overflowed entry counts as a fire — the verdict never false-HOLDs.
  const fires = retainedFires + (overflow as number);
  const weeks = Math.max(1, new Set(sessionDates.map(mondayOfNyDate)).size);
  const firesPerWeek = fires / weeks;
  // Null on zero evidence: zero retained entries plus zero overflow renders
  // no verdict line, never a confident HOLD over an empty log.
  const verdict: CalibrationVerdict | null =
    log.length === 0 && overflow === 0
      ? null
      : firesPerWeek >= 1 && firesPerWeek <= 4
        ? 'IN-BAND'
        : 'OUT-OF-BAND';
  return { fires, weeks, firesPerWeek, verdict };
}
