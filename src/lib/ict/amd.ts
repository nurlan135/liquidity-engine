import { formatInTimeZone } from 'date-fns-tz';
import { NY_TZ } from '@/src/lib/ict/aggregate';
import type { AsiaRange } from '@/src/lib/ict/asia';
import type { JudasOutput } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';

// ICT-14 (D-12/D-13/D-14/D-15/D-16): AMD phase classifier fusing an AsiaRange,
// a JudasOutput, and a read-only SmtOutput. Time gives the skeleton and
// detector events give the promotions: Asia hours default to accumulation, a
// killzone sweep promotes to manipulation, post-displacement continuation
// promotes to distribution. SMT fuses as a regime tag only — its direction is
// read when unsuppressed and the input object is never mutated. NY hours render
// the honest unavailable marker instead of a time-only guess. Pure:
// caller-supplied detector outputs plus an injected asOf epoch only — no clock
// reads, no store imports, no candle validation (downstream of asia/judas,
// which already validated rows at their own boundaries).

/** NY session open in NY wall-clock minutes since midnight, inclusive (D-15). */
export const NY_SESSION_START_MIN = 570;
/** NY session close in NY wall-clock minutes since midnight, exclusive (D-15). */
export const NY_SESSION_END_MIN = 960;

/** Asia session start in NY wall-clock minutes since midnight, inclusive (D-13). */
const ASIA_SESSION_START_MIN = 1200;
/** Confirmation window in seconds: sweep instant plus 45 minutes (D-13). */
const CONFIRM_WINDOW_SEC = 2700;

export type AmdPhase = 'accumulation' | 'manipulation' | 'distribution';

export interface AmdInput {
  asia: AsiaRange | null;
  judas: JudasOutput | null;
  smt: SmtOutput | null;
  /** Injected evaluation instant in UTC epoch seconds — never a clock read. */
  asOf: number;
}

export interface AmdOutput {
  phase: AmdPhase;
  reason: string;
  inputs: {
    asia: AsiaRange | null;
    judas: JudasOutput | null;
    smt: SmtOutput | null;
  };
}

const REASON_ACCUMULATION = 'Asia Range Təmizlənməyib. London Judas Swing Gözlənilir.';
const REASON_EMPTY_RANGE =
  'Asia Range Təmizlənməyib — aralıq tapılmadı. London Judas Swing Gözlənilir.';
const REASON_CANDIDATE =
  'Asia Range Təmizlənib. London Judas Swing Gözlənilir — təsdiq gözlənilir.';
const REASON_CONFIRMED = 'Asia Range Təmizlənib. London Judas Swing Baş verib.';
const REASON_DISTRIBUTION =
  'Asia Range Təmizlənib. London Judas Swing Baş verib — davam mərhələsi.';
const REASON_NY_UNAVAILABLE = 'Gözlənilir — NY sessiyası v2.0-da ölçülmür.';
const SMT_AGREE_TAG = 'SMT razılaşır.';
const SMT_SUPPRESSED_TAG = 'SMT Gözlənilir.';

// Per-call IANA wall-clock minutes since midnight (D-07 discipline, shared with
// asia/judas). formatInTimeZone renders the explicit instant in NY_TZ, so the
// result is the true NY wall clock on every machine and every instant.
function nyMinutesOf(timeSec: number): number {
  const hour = Number(formatInTimeZone(timeSec * 1000, NY_TZ, 'H'));
  const minute = Number(formatInTimeZone(timeSec * 1000, NY_TZ, 'm'));
  return hour * 60 + minute;
}

// Gate 2 — Judas promotion (D-12/D-13): candidate, confirmed-in-window, and
// confirmed-past-window states lift the accumulation skeleton to manipulation
// or distribution. A confirmed sweep with an unusable sweepTime cannot prove
// the window elapsed, so it holds manipulation rather than promoting.
function promote(judas: JudasOutput | null | undefined, asOf: number): { phase: AmdPhase; reason: string } {
  if (judas === null || judas === undefined || !judas.candidate) {
    return { phase: 'accumulation', reason: REASON_ACCUMULATION };
  }
  if (
    judas.confirmed &&
    judas.sweepTime !== null &&
    judas.sweepTime !== undefined &&
    asOf > judas.sweepTime + CONFIRM_WINDOW_SEC
  ) {
    return { phase: 'distribution', reason: REASON_DISTRIBUTION };
  }
  if (judas.confirmed) {
    return { phase: 'manipulation', reason: REASON_CONFIRMED };
  }
  return { phase: 'manipulation', reason: REASON_CANDIDATE };
}

// Gate 3 — SMT regime tag (D-14, T-08-05): a read-only suffix. Direction is
// read only when the envelope is unsuppressed; CORR_DECOUPLED and
// rollover-week suppression pass through to the reason instead of silencing
// the branch. The SMT object is only read, never written.
function smtTag(judas: JudasOutput | null | undefined, smt: SmtOutput | null | undefined): string {
  if (smt === null || smt === undefined) {
    return '';
  }
  if (smt.suppressed) {
    return ` ${SMT_SUPPRESSED_TAG}`;
  }
  if (judas !== null && judas !== undefined && judas.confirmed && judas.sweepSide !== null) {
    if (judas.sweepSide === 'HIGH' && smt.direction === 'BEARISH') {
      return ` ${SMT_AGREE_TAG}`;
    }
    if (judas.sweepSide === 'LOW' && smt.direction === 'BULLISH') {
      return ` ${SMT_AGREE_TAG}`;
    }
  }
  return '';
}

// AMD phase classification in fixed gate order — clock skeleton first, Judas
// promotion second, SMT regime tag third, NY unavailable branch last. Reason
// assembly is a deterministic sentence selection (one base sentence plus at
// most one SMT suffix), so section-3 prose can render reasons verbatim.
// WR-05: the JudasOutput envelope drives every promotion branch. A
// malformed judas (truthy-string flags, string sweepTime) previously slid
// through — `asOf > "abc" + 2700` string-concats to NaN and silently holds
// manipulation. Fail at the boundary like judasSwing does for its range.
function assertValidJudas(judas: AmdInput['judas']): void {
  if (judas === null || judas === undefined) {
    return;
  }
  if (typeof judas !== 'object' || Array.isArray(judas)) {
    throw new Error(`amdPhase requires a JudasOutput object or null, got ${String(judas)}`);
  }
  const j = judas as JudasOutput;
  if (typeof j.candidate !== 'boolean' || typeof j.confirmed !== 'boolean') {
    throw new Error(
      `amdPhase requires boolean judas candidate/confirmed, got candidate=${String(j.candidate)} confirmed=${String(j.confirmed)}`,
    );
  }
  if (j.sweepTime !== null && j.sweepTime !== undefined && (!Number.isFinite(j.sweepTime) || (j.sweepTime as number) <= 0)) {
    throw new Error(
      `amdPhase requires a finite positive judas sweepTime or null, got ${String(j.sweepTime)}`,
    );
  }
  if (j.sweepSide !== null && j.sweepSide !== undefined && j.sweepSide !== 'HIGH' && j.sweepSide !== 'LOW') {
    throw new Error(
      `amdPhase requires judas sweepSide HIGH, LOW, or null, got ${String(j.sweepSide)}`,
    );
  }
}

export function amdPhase(input: AmdInput): AmdOutput {
  if (input === null || input === undefined || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`amdPhase requires an input object, got ${String(input)}`);
  }
  const { asia, judas, smt, asOf } = input;
  if (!Number.isFinite(asOf) || (asOf as number) <= 0) {
    throw new Error(`amdPhase requires a finite positive asOf epoch, got ${String(asOf)}`);
  }
  assertValidJudas(judas);
  const epoch = asOf as number;
  const minutes = nyMinutesOf(epoch);

  // Gate 1 — clock skeleton plus the empty-range degraded branch (D-16): a
  // null AsiaRange can never promote, so it holds accumulation honestly.
  const base =
    asia === null || asia === undefined
      ? { phase: 'accumulation' as AmdPhase, reason: REASON_EMPTY_RANGE }
      : promote(judas, epoch);
  const reason = base.reason + smtTag(judas, smt);

  // Gate 4 — NY unavailable branch last (D-15): the prior phase is preserved
  // but the reason is replaced wholesale, never guessed from the clock alone.
  if (minutes >= NY_SESSION_START_MIN && minutes < NY_SESSION_END_MIN) {
    return {
      phase: base.phase,
      reason: REASON_NY_UNAVAILABLE,
      inputs: { asia: asia ?? null, judas: judas ?? null, smt: smt ?? null },
    };
  }
  return {
    phase: base.phase,
    reason,
    inputs: { asia: asia ?? null, judas: judas ?? null, smt: smt ?? null },
  };
}
