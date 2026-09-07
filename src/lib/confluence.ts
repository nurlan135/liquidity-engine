import type { JudasOutput } from '@/src/lib/ict/judas';
import type { SmtOutput } from '@/src/lib/ict/smt';

// ICT-15 (D-09/D-11/D-12): selector-level conviction tiers derived from a
// JudasOutput plus an SmtOutput by agreement count. Confirmed Judas plus
// aligned unsuppressed SMT is the only two-agreement state and derives the
// highest tier; every neighbor (candidate, misaligned, suppressed, null,
// NO-SIGNAL) caps at the base tier, so absence of signal never masquerades
// as disagreement (D-11) and candidates score zero (D-12). Discrete tier
// words only — nothing numeric, nothing percentage-like (no-fake-precision
// rule). Selector-level scoring lives here, never inside src/lib/ict, so
// ict purity holds. Pure: no clock reads, no store imports.

/** Discrete conviction tiers as display-ready words — never numbers. */
export type ConvictionTier = 'standart' | 'yüksək inam';

/**
 * Derive the conviction tier from Judas plus SMT agreement. Returns
 * 'yüksək inam' only when judas is non-null with confirmed true and smt is
 * non-null, unsuppressed, and direction-aligned with the sweep side (HIGH
 * sweep with BEARISH, LOW sweep with BULLISH — the amd.ts smtTag agreement
 * read verbatim). Returns 'standart' otherwise. Total over null inputs:
 * never throws, never returns null.
 */
export function deriveConvictionTier(
  judas: JudasOutput | null,
  smt: SmtOutput | null,
): ConvictionTier {
  if (judas === null || judas === undefined) {
    return 'standart';
  }
  if (!judas.confirmed) {
    return 'standart';
  }
  if (smt === null || smt === undefined) {
    return 'standart';
  }
  if (smt.suppressed) {
    return 'standart';
  }
  if (judas.sweepSide === 'HIGH' && smt.direction === 'BEARISH') {
    return 'yüksək inam';
  }
  if (judas.sweepSide === 'LOW' && smt.direction === 'BULLISH') {
    return 'yüksək inam';
  }
  return 'standart';
}
