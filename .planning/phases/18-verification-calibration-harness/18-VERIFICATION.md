# Phase 18 Verification: Verification + Calibration Harness

**Verified:** 2026-09-15
**Status:** GOAL ACHIEVED — all 3 success criteria TRUE

## Goal

Users can trust the execution layer's rates and cross-cutting honesty — fire band, kill rate, reason parity, stale degradation all proven on integrated pieces.

## Success Criteria

1. **Replay monotonicity (VERF-01)** — TRUE. `src/lib/ict/replay.test.ts`: 20-session population replays green with pinned transition table, cause asserts, determinism pin, calibration summary JSON. 8/8 tests pass.
2. **Reason parity (VERF-02)** — TRUE. `src/lib/ict/parity.test.ts`: five contradiction rules over shared snapshot triple, NY-hours AMD exemption, suppressed-SMT pair asserts, ARMED-or-better sweep with zero contradictions. 11/11 tests pass.
3. **Stale degradation (VERF-03)** — TRUE. `src/lib/ict/stale-drill.test.ts`: full leg matrix (4 single + all-stale + thin-tier) with flaw-first routing and leg provenance, zero EXECUTE on stale inputs. 6/6 tests pass.

## Verification Runs

- Harness files: 3 passed, 25/25 tests green (2026-09-15)
- Full suite: 38 files, 420/420 tests green including banned-word and purity guards, zero new installs

## Plans

| Plan | Requirement | Commits | Status |
|------|-------------|---------|--------|
| 18-01 replay | VERF-01 | 918d9fe, 112c3a9, 482212e | complete |
| 18-02 parity | VERF-02 | a9da06f, 0b37854, 3930235 | complete |
| 18-03 stale drill | VERF-03 | 636fede, 7a863c5, 3df13d7 | complete |

---
*Phase: 18-verification-calibration-harness*
